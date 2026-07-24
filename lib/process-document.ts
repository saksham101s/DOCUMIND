import { chunkText } from "./chunking";
import { embedTexts, toVectorLiteral } from "./embeddings";
import { query } from "./db";
import { extractText } from "./text-extract";

const EMBED_BATCH_SIZE = 32;

/** Download, chunk, embed, and persist a document's text after upload. */
export async function processDocument(
  documentId: string,
  buffer: Buffer,
  filename: string,
): Promise<void> {
  await setDocumentStatus(documentId, "processing");

  try {
    const extracted = await extractText(buffer, filename);
    if (!extracted.text.trim()) {
      throw new Error("No readable text found in this file.");
    }

    const chunks = chunkText(extracted.text, extracted.pages ?? undefined);
    if (chunks.length === 0) {
      throw new Error("Could not split the document into searchable sections.");
    }

    // Embed in batches to stay within API limits.
    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const embeddings = await embedTexts(batch.map((c) => c.content));

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j]!;
        const embedding = embeddings[j]!;
        await query(
          `INSERT INTO document_chunks (document_id, content, embedding, chunk_index, page_number)
           VALUES ($1, $2, $3::vector, $4, $5)`,
          [
            documentId,
            chunk.content,
            toVectorLiteral(embedding),
            chunk.chunkIndex,
            chunk.pageNumber,
          ],
        );
      }
    }

    await query(
      `UPDATE documents
       SET status = 'ready', page_count = $2, error_message = NULL
       WHERE id = $1`,
      [documentId, extracted.pageCount],
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Processing failed unexpectedly.";
    await setDocumentStatus(documentId, "error", message);
    throw err;
  }
}

async function setDocumentStatus(
  documentId: string,
  status: string,
  errorMessage?: string,
): Promise<void> {
  await query(
    `UPDATE documents SET status = $2, error_message = $3 WHERE id = $1`,
    [documentId, status, errorMessage ?? null],
  );
}
