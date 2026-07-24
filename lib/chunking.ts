/** Approximate tokens as characters (OpenAI rule-of-thumb: ~4 chars per token). */
export const CHARS_PER_TOKEN = 4;

export type TextChunk = {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
};

export type ChunkOptions = {
  /** Target chunk size in tokens (default 500). */
  chunkSize?: number;
  /** Overlap between consecutive chunks in tokens (default 50). */
  overlap?: number;
};

/**
 * Split document text into overlapping chunks sized for embedding + retrieval.
 * Page boundaries are preserved when `pages` is provided (one string per page).
 */
export function chunkText(
  text: string,
  pages?: string[],
  options: ChunkOptions = {},
): TextChunk[] {
  const chunkSize = options.chunkSize ?? 500;
  const overlap = options.overlap ?? 50;

  const maxChars = chunkSize * CHARS_PER_TOKEN;
  const overlapChars = overlap * CHARS_PER_TOKEN;

  if (pages && pages.length > 0) {
    return chunkByPages(pages, maxChars, overlapChars);
  }

  return chunkPlainText(text.trim(), maxChars, overlapChars);
}

function chunkPlainText(
  text: string,
  maxChars: number,
  overlapChars: number,
): TextChunk[] {
  if (!text) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);

    // Prefer breaking at paragraph or sentence boundaries inside the window.
    if (end < text.length) {
      const window = text.slice(start, end);
      const breakAt = findBreakPoint(window);
      if (breakAt > maxChars * 0.5) {
        end = start + breakAt;
      }
    }

    const content = text.slice(start, end).trim();
    if (content) {
      chunks.push({ content, chunkIndex: index, pageNumber: null });
      index += 1;
    }

    if (end >= text.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}

function chunkByPages(
  pages: string[],
  maxChars: number,
  overlapChars: number,
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let index = 0;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageText = pages[pageIdx]?.trim();
    if (!pageText) continue;

    const pageNumber = pageIdx + 1;
    let start = 0;

    while (start < pageText.length) {
      let end = Math.min(start + maxChars, pageText.length);

      if (end < pageText.length) {
        const window = pageText.slice(start, end);
        const breakAt = findBreakPoint(window);
        if (breakAt > maxChars * 0.5) {
          end = start + breakAt;
        }
      }

      const content = pageText.slice(start, end).trim();
      if (content) {
        chunks.push({ content, chunkIndex: index, pageNumber });
        index += 1;
      }

      if (end >= pageText.length) break;
      start = Math.max(end - overlapChars, start + 1);
    }
  }

  return chunks;
}

/** Pick the latest natural break (paragraph, line, sentence, word) in a window. */
function findBreakPoint(window: string): number {
  const candidates = [
    window.lastIndexOf("\n\n"),
    window.lastIndexOf("\n"),
    window.lastIndexOf(". "),
    window.lastIndexOf(" "),
  ];
  return Math.max(...candidates);
}
