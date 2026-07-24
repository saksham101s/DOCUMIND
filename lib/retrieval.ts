import { query } from "./db";
import { embedQuery, toVectorLiteral } from "./embeddings";

export type RetrievedChunk = {
  id: string;
  content: string;
  chunk_index: number;
  page_number: number | null;
  similarity: number;
};

export type RankedChunk = RetrievedChunk & { rank: number };

/**
 * Cosine similarity between two equal-length vectors.
 * Exported for unit tests — production search uses pgvector in Postgres.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/** Rank chunks by cosine similarity to a query embedding (in-memory, for tests). */
export function rankChunksBySimilarity(
  queryEmbedding: number[],
  chunks: Array<{ id: string; embedding: number[]; content: string; page_number?: number | null }>,
  topK = 5,
): RankedChunk[] {
  return chunks
    .map((chunk, idx) => ({
      id: chunk.id,
      content: chunk.content,
      chunk_index: idx,
      page_number: chunk.page_number ?? null,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .map((chunk, rank) => ({ ...chunk, rank: rank + 1 }));
}

/** Vector similarity search scoped to a single document. */
export async function retrieveChunks(
  documentId: string,
  question: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedQuery(question);
  const vector = toVectorLiteral(queryEmbedding);

  const rows = await query<RetrievedChunk>(
    `SELECT
       id,
       content,
       chunk_index,
       page_number,
       1 - (embedding <=> $1::vector) AS similarity
     FROM document_chunks
     WHERE document_id = $2
       AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vector, documentId, topK],
  );

  return rows;
}
