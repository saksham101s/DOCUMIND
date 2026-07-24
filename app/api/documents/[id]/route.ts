import { NextResponse } from "next/server";
import { AuthError, requireDbUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { deleteDocumentFiles } from "@/lib/storage";
import type { DocumentRow } from "../route";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireDbUser();
    const { id } = await context.params;

    const document = await queryOne<DocumentRow>(
      `SELECT id, filename, file_url, status, page_count, error_message, created_at
       FROM documents
       WHERE id = $1 AND user_id = $2`,
      [id, user.id],
    );

    if (!document) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ document });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireDbUser();
    const { id } = await context.params;

    const document = await queryOne<{ id: string }>(
      `SELECT id FROM documents WHERE id = $1 AND user_id = $2`,
      [id, user.id],
    );

    if (!document) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 },
      );
    }

    await deleteDocumentFiles(user.id, id);
    await query(`DELETE FROM documents WHERE id = $1`, [id]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  console.error(err);
  return NextResponse.json(
    { error: "Could not complete that action. Try again." },
    { status: 500 },
  );
}
