import { describe, expect, it } from "vitest";
import { cosineSimilarity, rankChunksBySimilarity } from "./retrieval";

describe("cosineSimilarity", () => {
  it("returns 1 for identical vectors", () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1);
  });

  it("returns 0 for orthogonal vectors", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe("rankChunksBySimilarity", () => {
  const query = [1, 0, 0];

  const chunks = [
    { id: "a", embedding: [1, 0, 0], content: "exact match" },
    { id: "b", embedding: [0.7, 0.7, 0], content: "partial match" },
    { id: "c", embedding: [0, 1, 0], content: "unrelated" },
  ];

  it("ranks chunks by similarity descending", () => {
    const ranked = rankChunksBySimilarity(query, chunks, 3);
    expect(ranked.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(ranked[0]!.similarity).toBeGreaterThan(ranked[1]!.similarity);
    expect(ranked[1]!.similarity).toBeGreaterThan(ranked[2]!.similarity);
  });

  it("limits results to topK", () => {
    const ranked = rankChunksBySimilarity(query, chunks, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]!.id).toBe("a");
    expect(ranked[1]!.id).toBe("b");
  });
});
