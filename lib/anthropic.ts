import Anthropic from "@anthropic-ai/sdk";
import type { RetrievedChunk } from "./retrieval";

export const CHAT_MODEL = "claude-sonnet-4-6";

export type CitationRef = {
  chunk_id: string;
  page_number: number | null;
  excerpt: string;
};

export type StreamChatOptions = {
  question: string;
  chunks: RetrievedChunk[];
  onToken: (text: string) => void;
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

function buildContextBlock(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (chunk, i) =>
        `[${i + 1}] (chunk_id: ${chunk.id}, page: ${chunk.page_number ?? "unknown"})\n${chunk.content}`,
    )
    .join("\n\n---\n\n");
}

function buildSystemPrompt(): string {
  return `You are DocuMind, a document Q&A assistant. Answer ONLY using the provided source excerpts.
Rules:
- If the excerpts do not contain enough information, say so plainly and do not invent facts.
- Write in clear, direct prose (sentence case, no filler).
- When you use information from a source, cite it inline with bracket numbers like [1] or [2] matching the excerpt labels.
- Do not cite excerpts you did not use.`;
}

/**
 * Stream a grounded answer from Claude. Returns the full text and parsed citations.
 */
export async function streamGroundedAnswer({
  question,
  chunks,
  onToken,
}: StreamChatOptions): Promise<{ content: string; citations: CitationRef[] }> {
  const anthropic = getClient();
  const context = buildContextBlock(chunks);

  const stream = anthropic.messages.stream({
    model: CHAT_MODEL,
    max_tokens: 2048,
    system: buildSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `Source excerpts:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  let fullText = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;
      onToken(event.delta.text);
    }
  }

  const citations = parseCitations(fullText, chunks);
  return { content: fullText, citations };
}

/** Map [1], [2] references in the answer to chunk metadata. */
export function parseCitations(
  answer: string,
  chunks: RetrievedChunk[],
): CitationRef[] {
  const used = new Set<number>();
  const pattern = /\[(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(answer)) !== null) {
    const index = Number(match[1]) - 1;
    if (index >= 0 && index < chunks.length) {
      used.add(index);
    }
  }

  return [...used]
    .sort((a, b) => a - b)
    .map((index) => {
      const chunk = chunks[index]!;
      const excerpt =
        chunk.content.length > 200
          ? `${chunk.content.slice(0, 200)}…`
          : chunk.content;
      return {
        chunk_id: chunk.id,
        page_number: chunk.page_number,
        excerpt,
      };
    });
}
