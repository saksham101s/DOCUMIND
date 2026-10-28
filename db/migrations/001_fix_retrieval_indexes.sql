-- Run once against an existing database created from the old schema.sql:
--   psql "$DATABASE_URL" -f db/migrations/001_fix_retrieval_indexes.sql
-- Safe to re-run.

DROP INDEX IF EXISTS document_chunks_embedding_idx;

CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks (document_id);
CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chats_document_user_idx ON chats (document_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages (chat_id, created_at);
