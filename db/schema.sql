-- DocuMind database schema (PostgreSQL + pgvector)
-- Run against your Railway / Supabase Postgres instance.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | processing | ready | error
  page_count INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding VECTOR(1024),
  chunk_index INT NOT NULL,
  page_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retrieval is always scoped to one document (a few hundred chunks), so an
-- exact scan via the document_id index is fast and has perfect recall. A global
-- IVFFlat index would scan 1 of 100 lists and then filter by document_id,
-- often returning fewer than top-k (or zero) chunks. See ISSUES_RESOLVED.md.
CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx
  ON document_chunks (document_id);

CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user | assistant
  content TEXT NOT NULL,
  citations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chats_document_user_idx ON chats (document_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages (chat_id, created_at);
