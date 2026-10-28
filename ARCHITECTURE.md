# DocuMind — Architecture

> Living document. Update it whenever structure, data flow, or a key decision changes.
> Last updated: 2026-10-28

## 1. What it is

A RAG ("chat with your document") web app. A user signs in, uploads a PDF / DOCX / TXT,
the server extracts text → chunks it → embeds chunks with Voyage → stores vectors in
Postgres (pgvector). The user then chats with **one document at a time**; each question is
embedded, the top‑5 most similar chunks are retrieved, and Claude streams an answer that cites
chunks as `[1]`, `[2]`, which the UI renders as clickable citation pills.

## 2. Stack

| Concern | Tech | Where |
|---|---|---|
| Framework | Next.js **16.4** App Router, React 19, TS strict | `app/` |
| Styling | Tailwind v4 (`@config` → `tailwind.config.ts`), custom colors `ink`, `paper`, `marker`, `rule`, `muted` | `app/globals.css` |
| Auth | Clerk (`@clerk/nextjs` v7) — modal sign-in, no `/sign-in` route | `proxy.ts`, `lib/auth.ts` |
| DB | Postgres + pgvector via `pg` Pool (Supabase pooler) | `lib/db.ts`, `db/schema.sql` |
| File storage | Supabase Storage bucket `documents` via `@supabase/storage-js` | `lib/storage.ts` |
| Embeddings | Voyage AI `voyage-3` (1024‑dim), REST `fetch` | `lib/embeddings.ts` |
| LLM | Anthropic SDK, model `claude-sonnet-4-6`, streaming | `lib/anthropic.ts` |
| Tests | Vitest (`lib/**/*.test.ts`, node env) | `vitest.config.ts` |

Next 16 note: middleware is now **`proxy.ts`** (not `middleware.ts`). Route `params` are a
`Promise` and must be awaited. Read `node_modules/next/dist/docs/` before using unfamiliar APIs
(see `AGENTS.md`).

## 3. Directory map

```
app/
  layout.tsx                 Root layout: fonts (Inter, Fraunces, IBM Plex Mono), <ClerkProvider>
  page.tsx                   Public landing page (Navbar + DocumentMockup + marketing sections)
  dashboard/page.tsx         Protected shell → <DashboardClient/>
  documents/[id]/page.tsx    Server component: owner check, "not ready" state, → <ChatPanel/>
  api/documents/route.ts     GET list (user's docs) · POST upload + synchronous ingestion
  api/documents/[id]/route.ts GET one · DELETE (storage best-effort, then DB cascade)
  api/chat/route.ts          GET history (latest chat for doc) · POST question → SSE stream
components/
  DashboardClient.tsx        Fetch docs, poll every 3s while any queued/processing, search + filter tabs, stats
  UploadDropzone.tsx         Drag/drop + picker, fake progress stages, POST /api/documents
  DocumentCard.tsx           Card, status badge, delete confirm modal; links to chat when ready
  ChatPanel.tsx              History load, SSE reader, starter prompts, copy, markdown export, mini formatter
  CitationTag.tsx            "cited · page N" pill with excerpt popover
  Navbar.tsx, DocumentMockup.tsx  Landing-page UI
lib/
  auth.ts           requireDbUser(): Clerk userId → users row (upsert on first visit); AuthError
  db.ts             Singleton Pool, URL sanity checks/auto-encode '@' in password, SSL for cloud hosts, friendly errors
  text-extract.ts   getExtension / isAllowedFile / extractText (txt, docx via mammoth, pdf via pdf-parse v2|v1)
  chunking.ts       chunkText(): ~500 "tokens" (4 chars/token), 50 overlap, break at \n\n/\n/". "/space; per-page when pages given
  embeddings.ts     embedTexts (input_type=document), embedQuery (input_type=query), toVectorLiteral
  process-document.ts  status processing → extract → chunk → embed in batches of 32 → multi-row INSERT → status ready|error
  retrieval.ts      retrieveChunks(docId, q, k=5) via `embedding <=> $1::vector`; cosineSimilarity/rank helpers for tests
  anthropic.ts      streamGroundedAnswer() + parseCitations() ([n] → chunk metadata, excerpt ≤200 chars)
  storage.ts        uploadDocumentFile (path userId/docId/safeName, upsert) · deleteDocumentFiles
db/
  schema.sql        Fresh-install DDL
  migrations/       Incremental fixes for existing DBs (001_fix_retrieval_indexes.sql)
proxy.ts            Clerk middleware; protects /dashboard(.*) and /documents(.*) pages (APIs self-check)
```

## 4. Data model (`db/schema.sql`)

```
users(id, clerk_user_id UNIQUE, email)
  └─< documents(id, user_id, filename, file_url, status queued|processing|ready|error, page_count, error_message)
        ├─< document_chunks(id, document_id, content, embedding VECTOR(1024), chunk_index, page_number)
        └─< chats(id, user_id, document_id, title)
              └─< messages(id, chat_id, role user|assistant, content, citations JSONB[{chunk_id,page_number,excerpt}])
```
All FKs `ON DELETE CASCADE` — deleting a document removes chunks, chats, messages.
Indexes: `document_chunks(document_id)` (exact per-document vector scan — no global ANN index, by design),
plus lookup indexes on documents/chats/messages.

## 5. Request flows

### Upload (`POST /api/documents`, multipart `file`)
1. `requireDbUser()` → 401 if signed out.
2. Validate: size ≤ 25MB (413), extension pdf/txt/docx + matching MIME or octet-stream (400).
3. Upload bytes to Supabase Storage → public URL.
4. `INSERT documents (status 'queued')`.
5. `processDocument()` **synchronously in the request** → status `processing` → `ready` / `error`.
6. Return the row (201). On processing failure → 500 with message; row stays with status `error`.

### Chat (`POST /api/chat`, JSON `{documentId, message, chatId?}`)
1. Auth + document must belong to user and be `ready`.
2. `retrieveChunks()` (embeds question, top‑5 by cosine distance). 0 chunks → 422.
3. Verify `chatId` belongs to user+document (404 otherwise), or create a new chat titled from the question.
4. Insert user message.
5. SSE response: `event: meta {chatId}` → many `event: token {text}` → `event: done {citations}`
   (or `event: error {message}`). Assistant message + citations persisted before `done`.

### History (`GET /api/chat?documentId=…[&chatId=…]`)
Returns the latest chat (or the requested one, if owned) and its messages. UI only ever uses one
chat per document (latest).

## 6. Security model
- Every API handler calls `requireDbUser()` and scopes SQL by `user_id` (documents) or verified
  chat ownership (chats/messages). `proxy.ts` only gates pages.
- Storage uses the **service role key** server-side only. `file_url` is a *public* URL format — if the
  bucket is private these URLs won't open (nothing in the UI uses them today).

## 7. Environment variables (`.env.local`)
`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`, `VOYAGE_API_KEY`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` (**currently missing**),
`GEMINI_API_KEY` (present but **unused by code**).

## 8. Known limits / design trade-offs
- Ingestion is synchronous inside the upload request (long PDFs can hit platform timeouts). The
  `queued`/`processing` statuses + dashboard polling are ready for a background worker later.
- Token counts are approximated as 4 chars/token.
- One chat thread per document in the UI; no multi-document chat; no conversation memory passed
  to the model (each question answered independently from retrieved chunks).
- Markdown rendering in ChatPanel is a tiny hand-rolled formatter (paragraphs, bullet lists, **bold**).
