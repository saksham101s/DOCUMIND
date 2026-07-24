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
  // pdf-parse is CJS; dynamic import keeps it out of the client bundle.
  const pdfParseModule = (await import("pdf-parse")) as any;
  const pdfParse = pdfParseModule.default || pdfParseModule;
  const data = await pdfParse(buffer);
  const fullText = (data.text as string).trim();

  // pdf-parse exposes per-page text in some builds via numpages only;
  // split heuristically on form-feed if present, else treat as single doc.
  const pageParts = fullText.includes("\f")
    ? fullText.split("\f").map((p) => p.trim()).filter(Boolean)
    : null;

  return {
    text: fullText,
    pages: pageParts,
    pageCount: data.numpages ?? pageParts?.length ?? null,
  };
}
