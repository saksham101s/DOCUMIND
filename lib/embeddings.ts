const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const DEFAULT_MODEL = "voyage-3";

export type EmbeddingResult = {
  embedding: number[];
  index: number;
};

/** Generate embeddings for one or more text inputs via Voyage AI. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set");
  }
  if (texts.length === 0) return [];

  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: DEFAULT_MODEL,
      input_type: "document",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage embedding failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as {
    data: EmbeddingResult[];
  };

  return json.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

/** Embed a single query string (uses query input type for asymmetric retrieval). */
export async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set");
  }

  const response = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [text],
      model: DEFAULT_MODEL,
      input_type: "query",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage query embedding failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as { data: EmbeddingResult[] };
  return json.data[0]?.embedding ?? [];
}

/** Format a number array for pgvector insertion. */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
