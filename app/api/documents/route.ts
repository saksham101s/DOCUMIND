import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { AuthError, requireDbUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { processDocument } from "@/lib/process-document";
import { uploadDocumentFile } from "@/lib/storage";
import { isAllowedFile } from "@/lib/text-extract";

export type DocumentRow = {
  id: string;
  filename: string;
  file_url: string;
  status: string;
  page_count: number | null;
  error_message: string | null;
  created_at: string;
};

export async function GET() {
  try {
    const user = await requireDbUser();
    const documents = await query<DocumentRow>(
      `SELECT id, filename, file_url, status, page_count, error_message, created_at
       FROM documents
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user.id],
    );
    return NextResponse.json({ documents });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireDbUser();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Choose a PDF, TXT, or DOCX file to upload." },
        { status: 400 },
      );
    }

    if (!isAllowedFile(file.name, file.type)) {
      return NextResponse.json(
        { error: "That file type is not supported. Upload a PDF, TXT, or DOCX." },
        { status: 400 },
      );
    }

    const documentId = randomUUID();
    const buffer = Buffer.from(await file.arrayBuffer());

    const fileUrl = await uploadDocumentFile(
      user.id,
      documentId,
      file.name,
      buffer,
      file.type || "application/octet-stream",
    );

    await query(
      `INSERT INTO documents (id, user_id, filename, file_url, status)
       VALUES ($1, $2, $3, $4, 'queued')`,
      [documentId, user.id, file.name, fileUrl],
    );

    // Synchronous processing — fine at portfolio scale.
    await processDocument(documentId, buffer, file.name);

    const document = await queryOne<DocumentRow>(
      `SELECT id, filename, file_url, status, page_count, error_message, created_at
       FROM documents WHERE id = $1`,
      [documentId],
    );

    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  console.error(err);
  const message =
    err instanceof Error ? err.message : "Something went wrong. Try again.";
  return NextResponse.json({ error: message }, { status: 500 });
}
