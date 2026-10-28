# DocuMind — Issues Log

> Every issue found, how it was found, and how it was resolved. Append new entries; don't delete old ones.
> Status: ✅ fixed · ⚠️ open (needs owner action / decision)

## Audit run — 2026-10-28

Checks run: `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm audit`,
live connectivity probes (Postgres, Supabase Storage, Voyage), and a `next start` smoke test.

Baseline: tsc ✅ · tests 7/7 ✅ · build ✅ · **lint 7 errors + 1 warning** · **audit 12 vulns (1 critical)**.
After fixes: tsc ✅ · tests **10/10** ✅ · build ✅ · lint **0** · audit **0**.

---

### ⚠️ OPEN-1 — Supabase project unreachable (DB + Storage down)
- **Found by:** connectivity probe. `DATABASE_URL` → `XX000 tenant/user postgres.<ref> not found`;
  `SUPABASE_URL` hostname does **not resolve in DNS** (ENOTFOUND).
- **Cause:** the Supabase project referenced in `.env.local` is paused, deleted, or the ref is wrong.
  Nothing in code can fix this.
- **To resolve:** restore the project in the Supabase dashboard (or create a new one), then update
  `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; run `db/schema.sql`; create the
  `documents` storage bucket. For an existing DB also run `db/migrations/001_fix_retrieval_indexes.sql`.

### ⚠️ OPEN-2 — `ANTHROPIC_API_KEY` missing (chat cannot answer)
- **Found by:** env check. `.env.local` has `GEMINI_API_KEY` but no `ANTHROPIC_API_KEY`; `lib/anthropic.ts`
  only uses Anthropic.
- **Interim fix:** `getClient()` now throws a clear `ANTHROPIC_API_KEY is not set` error (surfaced in
  the chat UI via the SSE `error` event) instead of an opaque SDK auth failure.
- **To resolve:** add `ANTHROPIC_API_KEY`, **or** decide to switch the LLM provider to Gemini (owner decision).

### ⚠️ OPEN-3 — Node 20 deprecation
- supabase libs warn that Node ≤20 is deprecated. Recommend Node 22 LTS. (No longer *breaks* — see FIX-2.)

---

### ✅ FIX-1 — Security: chat IDOR (read/write other users' chats)
- **File:** `app/api/chat/route.ts`
- **Problem:** `GET` and `POST` trusted a client-supplied `chatId` without checking ownership. Any signed-in
  user could read another user's messages (`GET ?documentId=<own>&chatId=<victim>`) or append messages to
  another user's chat.
- **Fix:** both handlers now verify `chats.id = chatId AND document_id = documentId AND user_id = me`; else 404.

### ✅ FIX-2 — Supabase Storage crashed on Node 20
- **File:** `lib/storage.ts`, `package.json`
- **Problem:** `createClient()` from `@supabase/supabase-js` also boots Realtime, which throws
  `Node.js detected but native WebSocket not found` on Node < 22 → every upload/delete would 500.
- **Fix:** use `StorageClient` from `@supabase/storage-js` (added as a direct dependency) — storage only,
  no WebSocket. Same `.from(bucket).upload/getPublicUrl/list/remove` API.

### ✅ FIX-3 — Wrong citation page numbers for PDFs with blank pages
- **File:** `lib/text-extract.ts` (+ regression test in `lib/chunking.test.ts`)
- **Problem:** page texts were `.filter(Boolean)`-ed, so a blank page shifted every following page number
  down by one (citation "page 3" was really page 4).
- **Fix:** keep blank pages as `""`; `chunkByPages` already skips empty pages, so index+1 = real page.

### ✅ FIX-4 — Vector retrieval could return 0 / too few chunks
- **Files:** `db/schema.sql`, new `db/migrations/001_fix_retrieval_indexes.sql`
- **Problem:** an IVFFlat index (`lists = 100`) was created on an empty table (bad centroids) and queried
  with default `probes = 1` while filtering `WHERE document_id = …`. pgvector applies the filter *after*
  scanning one list, so a document's chunks were often missed → "No indexed content found" / weak answers.
- **Fix:** drop the global ANN index; add a btree index on `document_chunks(document_id)`. Search is always
  per-document (hundreds of rows) so an exact scan is fast with perfect recall. Also added lookup indexes
  for documents/chats/messages. Revisit (HNSW + iterative scans) only if cross-document search is added.

### ✅ FIX-5 — Critical Next.js vulnerabilities + 11 others
- **Problem:** `next@16.2.11` in the range of several critical/high advisories (RCE, SSRF, cache poisoning);
  transitive highs in xmldom, brace-expansion, js-yaml, nanoid, vite, zod, vitest.
- **Fix:** `next` + `eslint-config-next` → `16.4.3`, `vitest` → `4.1.12`; `npm audit fix` crashed with an
  npm bug (`reading 'edgesOut'`), so the lockfile was regenerated (`rm package-lock.json && npm install`).
  Result: `found 0 vulnerabilities`; build + tests green.

### ✅ FIX-6 — Upload size limit not enforced
- **File:** `app/api/documents/route.ts`
- **Problem:** UI says "up to 25MB" but server accepted anything.
- **Fix:** `MAX_UPLOAD_BYTES = 25MB` → 413 with a friendly message.

### ✅ FIX-7 — Chat created / user message saved even when retrieval found nothing
- **File:** `app/api/chat/route.ts`
- **Fix:** retrieve chunks **before** creating the chat and inserting the user message.

### ✅ FIX-8 — Document delete failed if storage cleanup failed
- **File:** `app/api/documents/[id]/route.ts`
- **Fix:** storage cleanup is now best-effort (`.catch` + log); DB delete always runs.

### ✅ FIX-9 — Slow ingestion: one DB round trip per chunk
- **File:** `lib/process-document.ts`
- **Fix:** one multi-row `INSERT` per embedding batch (32 chunks) instead of 32 inserts.

### ✅ FIX-10 — `/documents/[id]` redirected to a non-existent `/sign-in` on *any* error
- **File:** `app/documents/[id]/page.tsx`
- **Problem:** DB errors were swallowed and turned into a redirect to `/sign-in` (404 — Clerk uses modals).
- **Fix:** redirect to `/` only on `AuthError`; rethrow other errors so they surface.

### ✅ FIX-11 — Upload dropzone UX bugs
- **File:** `components/UploadDropzone.tsx`
- Same file couldn't be re-selected after an error (input value not reset) → reset `e.target.value`.
- Progress timers leaked when `fetch` threw → cleared in `finally`.
- A file that failed processing (status `error`) didn't appear until reload → list refreshes in `finally`.

### ✅ FIX-12 — Lint errors (7) + warning
- `ChatPanel.tsx`: setState-in-effect (history load rewritten as a cancellable effect), impure `Date.now()`
  temp ids → `useRef` counter, unused `useCallback` import.
- `DashboardClient.tsx`: initial fetch deferred via `queueMicrotask`.
- `lib/db.ts`, `lib/text-extract.ts`: `any` removed / narrowly disabled for pdf-parse's dual export shape.
- `app/api/chat/route.ts`: unused `assistantContent` removed.

### ✅ FIX-13 — Misleading model label
- `ChatPanel.tsx` said "Claude 3.5 Sonnet"; code uses `claude-sonnet-4-6`. Label → "Claude Sonnet".

### ✅ Added tests
- `lib/anthropic.test.ts` — `parseCitations` mapping, dedupe, out-of-range refs, excerpt truncation.
- `lib/chunking.test.ts` — blank-page page-number regression.

---

## Noted, not changed (low priority / needs decision)
- Ingestion runs synchronously inside the upload request — long PDFs may time out on serverless hosts.
- `file_url` uses `getPublicUrl` — broken link if the bucket is private (unused in UI today).
- ChatPanel renders numbered lists as bullets; tiny formatter (no code blocks, headings, links).
- No rate limiting on `/api/chat` or uploads (Voyage/Anthropic cost exposure).
- Model `claude-sonnet-4-6` is older; newer Sonnet models exist — owner choice.
- `@supabase/supabase-js` is now unused by code (kept in `package.json` in case it's wanted later).
- `vitest` / `@types/*` live in `dependencies` rather than `devDependencies`.
- README still mentions "Claude 3.5 Sonnet" and IVFFlat in places.
