# DocuMind — RAG Document Intelligence Platform

> **DocuMind** is a production-grade, retrieval-augmented generation (RAG) platform where users upload PDF, TXT, or DOCX files and interact with them in a real-time streaming chat interface. Every answer is strictly grounded in the document's own indexed text and backed by interactive, page-specific source citations.

---

## ⚡ Key Features

- **Strictly Grounded RAG Answers**: Claude 3.5 Sonnet generates answers exclusively from top-k retrieved text chunks—preventing model hallucination.
- **Interactive Source Citations**: Every cited claim features a pill badge (`cited · page X`). Clicking or hovering opens an in-app popover displaying the exact source excerpt and vector chunk metadata.
- **Multi-Format Document Ingestion**: Native text extraction for **PDFs** (`pdf-parse`), **Word documents** (`mammoth`), and **plain text files** (`TXT`).
- **High-Dimensional Vector Indexing**: Text is split into sliding-window chunks (~500 tokens with ~50 token overlap) and embedded via Voyage AI (`voyage-3`, 1024 dimensions).
- **In-Database Vector Similarity Search**: Similarity search performed directly in PostgreSQL via the `pgvector` extension (`IVFFlat` indexing, cosine distance operator `<=>`).
- **Server-Sent Events (SSE) Streaming**: Real-time answer streaming token-by-token using Fetch `ReadableStream`.
- **Production Dashboard Experience**: Real-time document status updates, document search, status filters (`All`, `Ready`, `Indexing`), library analytics, and markdown chat export.

---

## 🛠 Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (App Router) | React 19, TypeScript, Server Components |
| **Styling & Design System** | [Tailwind CSS v4](https://tailwindcss.com/) | Custom Dark Mode (`ink`, `marker`, `paper`), Glassmorphic UI |
| **Authentication** | [Clerk Auth](https://clerk.com/) | Protected routes (`/dashboard`, `/documents/*`), Middleware guard |
| **Database & Vectors** | [PostgreSQL](https://www.postgresql.org/) + [`pgvector`](https://github.com/pgvector/pgvector) | 1024-dimension vector embeddings with `IVFFlat` cosine index |
| **Embeddings API** | [Voyage AI](https://www.voyageai.com/) | `voyage-3` (asymmetric `document` vs `query` input types) |
| **LLM Inference** | [Anthropic Claude 3.5 Sonnet](https://www.anthropic.com/) | `@anthropic-ai/sdk`, streaming SSE response generation |
| **Object Storage** | [Supabase Storage](https://supabase.com/) | Document file storage (`documents` bucket) |
| **Testing** | [Vitest](https://vitest.dev/) | Unit testing for chunking boundaries & similarity ranking |

---

## 📐 System Architecture & Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant NextApp as Next.js Route Handler
    participant Storage as Supabase Storage
    participant DB as PostgreSQL (pgvector)
    participant EmbedAPI as Voyage AI (voyage-3)
    participant LLM as Anthropic Claude 3.5

    title Document Ingestion & RAG Pipeline

    rect rgb(26, 30, 41)
    note right of User: Phase 1: Upload & Ingestion Pipeline
    User->>NextApp: POST /api/documents (PDF / DOCX / TXT)
    NextApp->>Storage: Upload raw file buffer
    NextApp->>DB: INSERT INTO documents (status: 'queued')
    NextApp->>NextApp: Extract text & page splits (pdf-parse / mammoth)
    NextApp->>NextApp: Chunk text (~500 tokens, ~50 overlap)
    NextApp->>EmbedAPI: Generate embeddings (input_type: 'document')
    EmbedAPI-->>NextApp: 1024-dim vectors
    NextApp->>DB: INSERT INTO document_chunks (content, embedding, page_number)
    NextApp->>DB: UPDATE documents (status: 'ready')
    end

    rect rgb(18, 21, 28)
    note right of User: Phase 2: Vector Retrieval & Streaming RAG Chat
    User->>NextApp: POST /api/chat { documentId, question }
    NextApp->>EmbedAPI: Embed query string (input_type: 'query')
    EmbedAPI-->>NextApp: Query vector
    NextApp->>DB: Cosine Similarity Search (1 - (embedding <=> query_vec)) LIMIT 5
    DB-->>NextApp: Top-5 matching chunks + page numbers
    NextApp->>LLM: Stream prompt (chunks + question + citation rules)
    LLM-->>NextApp: Streaming tokens [1], [2]...
    NextApp-->>User: SSE Event Stream (tokens & meta)
    NextApp->>DB: INSERT INTO messages (content, citations)
    end
```

---

## 🗄 Database Schema

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users mapped from Clerk Auth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents uploaded by users
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | processing | ready | error
  page_count INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Searchable document text chunks & vector embeddings
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1024), -- Voyage-3 output dimension
  chunk_index INT NOT NULL,
  page_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Chat sessions
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation message pairs & citation metadata
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user | assistant
  content TEXT NOT NULL,
  citations JSONB, -- Array of { chunk_id, page_number, excerpt }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📂 Project Structure

```
documind/
├── app/
│   ├── globals.css              # Custom Tailwind v4 theme & highlight-mark utility
│   ├── layout.tsx                # Root layout with Google Fonts (Fraunces, Inter, IBM Plex Mono)
│   ├── page.tsx                  # Public landing page & features preview
│   ├── dashboard/
│   │   └── page.tsx              # Protected dashboard (document list + upload dropzone)
│   ├── documents/[id]/
│   │   └── page.tsx              # Protected chat workspace for a specific document
│   └── api/
│       ├── documents/
│       │   ├── route.ts          # GET document list, POST file upload & ingestion pipeline
│       │   └── [id]/route.ts     # GET single document, DELETE document (cascade)
│       └── chat/
│           └── route.ts          # POST streaming RAG chat endpoint (SSE stream)
├── components/
│   ├── Navbar.tsx                # Responsive header with Clerk authentication controls
│   ├── DocumentMockup.tsx        # Hero interactive document preview card
│   ├── UploadDropzone.tsx        # Drag-and-drop file upload with progress indicator
│   ├── DocumentCard.tsx          # Document library card with custom delete modal & status badge
│   ├── ChatPanel.tsx             # Real-time SSE chat panel with prompt chips & Markdown formatting
│   └── CitationTag.tsx           # Citation tag pill with interactive excerpt popover modal
├── lib/
│   ├── db.ts                     # PostgreSQL singleton connection pool (`pg`)
│   ├── auth.ts                   # Clerk session resolver & user record synchronization
│   ├── text-extract.ts           # Text extraction engine (PDF, DOCX, TXT)
│   ├── chunking.ts               # Overlapping sliding-window text chunker (~500 tokens / 50 overlap)
│   ├── embeddings.ts             # Voyage AI client wrapper (`voyage-3`, 1024-dim)
│   ├── process-document.ts       # Document ingestion orchestration pipeline
│   ├── retrieval.ts              # In-database pgvector similarity search & cosine calculation
│   └── anthropic.ts              # Claude 3.5 Sonnet client & grounded SSE streaming helper
├── proxy.ts                      # Next.js 16 Clerk authentication middleware guard
├── db/schema.sql                 # PostgreSQL DDL schema & vector index definition
├── vitest.config.ts              # Vitest test runner configuration
└── package.json
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ and `npm`
- PostgreSQL database instance with `pgvector` enabled (e.g. Railway, Supabase, or local Postgres)
- Clerk account for authentication
- Voyage AI API key for embeddings
- Anthropic API key for Claude 3.5 inference
- Supabase account for file storage (`documents` bucket)

### 2. Clone & Install
```bash
git clone https://github.com/your-username/documind.git
cd documind
npm install
```

### 3. Environment Variables
Copy `.env.example` to create `.env.local`:
```bash
cp .env.example .env.local
```

Populate `.env.local`:
```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-api03-...

# PostgreSQL Database (with pgvector extension)
DATABASE_URL=postgresql://postgres:password@localhost:5432/documind

# Voyage AI Embeddings API
VOYAGE_API_KEY=pa-...

# Supabase Object Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 4. Database Setup
Apply the schema to your PostgreSQL database:
```bash
psql $DATABASE_URL -f db/schema.sql
```
*Note for Supabase users:* Ensure `vector` extension is enabled in your database dashboard extensions tab before running `db/schema.sql`. Create a storage bucket named `documents`.

### 5. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). Click **Get Started**, upload a document, and start asking questions!

---

## 🧪 Testing & Quality Assurance

DocuMind maintains unit test suites covering the core RAG algorithmic components:

```bash
# Run unit tests
npm test

# Run TypeScript type check
npx tsc --noEmit

# Run production build
npm run build
```

---

## 🎯 Technical Interview Discussion Topics

If reviewing this codebase for technical evaluations or interviews, the following design decisions highlight key engineering trade-offs made in DocuMind:

1. **Asymmetric Embedding Model Selection (`voyage-3`)**:
   - Voyage AI embeddings provide superior retrieval performance over standard models for long-form document text.
   - `input_type: "document"` is used during ingestion to format chunks for storage, while `input_type: "query"` is used for asymmetric user question embeddings during search.

2. **In-Database Vector Retrieval (`pgvector`) vs External Vector DB**:
   - Storing vector embeddings directly in PostgreSQL using `pgvector` eliminates multi-database sync overhead.
   - Vector search queries (`1 - (embedding <=> $1::vector)`) execute inside the same transaction boundary as user document security rules (`WHERE document_id = $1`).

3. **Context Loss Prevention via Overlapping Sliding Window**:
   - Fixed-size token chunking (~500 tokens with ~50 token overlap) guarantees that key sentences near chunk boundaries are not lost during similarity search.
   - Page boundaries are preserved when available in source documents for accurate page citation tags.

4. **Streaming SSE Event Protocol**:
   - Claude responses are streamed in real time using Server-Sent Events (SSE) via standard Fetch `ReadableStream`, providing an instant user interface experience without blocking on full LLM generation.

---

## 📜 License

Private portfolio project. Built for software engineering portfolio evaluation.
