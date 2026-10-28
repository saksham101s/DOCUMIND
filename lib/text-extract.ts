import mammoth from "mammoth";

export type ExtractedDocument = {
  text: string;
  pages: string[] | null;
  pageCount: number | null;
};

const ALLOWED_TYPES = {
  pdf: ["application/pdf"],
  txt: ["text/plain"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
} as const;

export function getExtension(filename: string): "pdf" | "txt" | "docx" | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || ext === "txt" || ext === "docx") return ext;
  return null;
}

export function isAllowedFile(filename: string, mimeType: string): boolean {
  const ext = getExtension(filename);
  if (!ext) return false;
  const allowed = ALLOWED_TYPES[ext] as readonly string[];
  return allowed.includes(mimeType) || mimeType === "application/octet-stream";
}

/** Extract plain text (and page splits when available) from uploaded bytes. */
export async function extractText(
  buffer: Buffer,
  filename: string,
): Promise<ExtractedDocument> {
  const ext = getExtension(filename);
  if (!ext) {
    throw new Error("Unsupported file type. Upload a PDF, TXT, or DOCX file.");
  }

  switch (ext) {
    case "txt":
      return extractTxt(buffer);
    case "docx":
      return extractDocx(buffer);
    case "pdf":
      return extractPdf(buffer);
  }
}

async function extractTxt(buffer: Buffer): Promise<ExtractedDocument> {
  const text = buffer.toString("utf-8");
  return { text, pages: null, pageCount: null };
}

async function extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  return { text, pages: null, pageCount: null };
}

async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  // Dynamically import pdf-parse (supports both v2 class API and v1 legacy function API)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf-parse v1/v2 export shapes differ
  const pdfModule = (await import("pdf-parse")) as any;
  const PDFParseClass =
    pdfModule.PDFParse ||
    pdfModule.default?.PDFParse ||
    pdfModule.default ||
    pdfModule;

  // v2.x Class-based API (new PDFParse({ data }))
  if (
    typeof PDFParseClass === "function" &&
    PDFParseClass.prototype?.getText
  ) {
    const uint8Array = new Uint8Array(buffer);
    const parser = new PDFParseClass({ data: uint8Array });
    try {
      const textResult = await parser.getText();
      const fullText = (textResult.text || "").trim();
      // Keep blank pages as "" so array index + 1 stays the real page number
      // (chunkByPages skips empty pages itself).
      const pageParts =
        textResult.pages?.map((p: { text?: string }) => (p.text || "").trim()) ||
        null;

      return {
        text: fullText,
        pages: pageParts,
        pageCount: textResult.total || pageParts?.length || null,
      };
    } finally {
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
    }
  }

  // v1.x Legacy Function API (pdfParse(buffer))
  if (typeof PDFParseClass === "function") {
    const data = await PDFParseClass(buffer);
    const fullText = (data.text as string || "").trim();
    const pageParts = fullText.includes("\f")
      ? fullText.split("\f").map((p) => p.trim())
      : null;

    return {
      text: fullText,
      pages: pageParts,
      pageCount: data.numpages ?? pageParts?.length ?? null,
    };
  }

  throw new Error(
    "PDF text extraction failed: Invalid pdf-parse library export.",
  );
}
