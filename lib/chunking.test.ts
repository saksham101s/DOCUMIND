import { describe, expect, it } from "vitest";
import { chunkText, CHARS_PER_TOKEN } from "./chunking";

describe("chunkText", () => {
  it("splits long plain text into sized chunks with overlap", () => {
    const paragraph = "Word ".repeat(600).trim();
    const chunks = chunkText(paragraph, undefined, {
      chunkSize: 100,
      overlap: 20,
    });

    expect(chunks.length).toBeGreaterThan(1);

    const maxChars = 100 * CHARS_PER_TOKEN;
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(maxChars + 50);
    }

    // Consecutive chunks should share overlapping text.
    const first = chunks[0]!.content;
    const second = chunks[1]!.content;
    const tail = first.slice(-20 * CHARS_PER_TOKEN);
    expect(second.includes(tail.slice(0, 20))).toBe(true);
  });

  it("respects page boundaries when pages are provided", () => {
    const pages = ["Page one content here.", "Page two different content."];
    const chunks = chunkText("", pages, { chunkSize: 500, overlap: 0 });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]!.pageNumber).toBe(1);
    expect(chunks[1]!.pageNumber).toBe(2);
    expect(chunks[0]!.content).toContain("Page one");
    expect(chunks[1]!.content).toContain("Page two");
  });

  it("returns empty array for blank input", () => {
    expect(chunkText("   ")).toEqual([]);
  });
});
