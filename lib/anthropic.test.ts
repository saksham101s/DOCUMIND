import { describe, expect, it } from "vitest";
import { parseCitations } from "./anthropic";

const chunks = [
  { id: "a", content: "Alpha text", chunk_index: 0, page_number: 1, similarity: 0.9 },
  { id: "b", content: "Beta ".repeat(60), chunk_index: 1, page_number: 4, similarity: 0.8 },
];

describe("parseCitations", () => {
  it("maps bracket numbers to chunks, deduped and in order", () => {
    const citations = parseCitations("See [2] and [1], again [2].", chunks);
    expect(citations.map((c) => c.chunk_id)).toEqual(["a", "b"]);
    expect(citations[1]!.page_number).toBe(4);
  });

  it("ignores out-of-range references and truncates long excerpts", () => {
    const citations = parseCitations("Bad [0] [3], good [2].", chunks);
    expect(citations).toHaveLength(1);
    expect(citations[0]!.excerpt.endsWith("…")).toBe(true);
    expect(citations[0]!.excerpt.length).toBe(201);
  });
});
