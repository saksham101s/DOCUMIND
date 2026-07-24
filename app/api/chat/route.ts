import { NextResponse } from "next/server";
import { AuthError, requireDbUser } from "@/lib/auth";
import { streamGroundedAnswer, type CitationRef } from "@/lib/anthropic";
import { query, queryOne } from "@/lib/db";
import { retrieveChunks } from "@/lib/retrieval";

export const maxDuration = 60;

type ChatRequestBody = {
  documentId: string;
  message: string;
  chatId?: string;
};

type MessageRow = {
  id: string;
  role: string;
  content: string;
  citations: CitationRef[] | null;
  created_at: string;
};

export async function GET(request: Request) {
  try {
    const user = await requireDbUser();
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");
    const chatId = searchParams.get("chatId");

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required." },
        { status: 400 },
      );
    }

    const owned = await queryOne(
      `SELECT id FROM documents WHERE id = $1 AND user_id = $2 AND status = 'ready'`,
      [documentId, user.id],
    );
    if (!owned) {
      return NextResponse.json(
        { error: "Document not found or not ready." },
        { status: 404 },
      );
    }

    let activeChatId: string | null = chatId;
    if (!activeChatId) {
      const chat = await queryOne<{ id: string }>(
        `SELECT id FROM chats
         WHERE document_id = $1 AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [documentId, user.id],
      );
      activeChatId = chat?.id ?? null;
    }

    if (!activeChatId) {
      return NextResponse.json({ chatId: null, messages: [] });
    }

    const messages = await query<MessageRow>(
      `SELECT id, role, content, citations, created_at
       FROM messages
       WHERE chat_id = $1
       ORDER BY created_at ASC`,
      [activeChatId],
    );

    return NextResponse.json({ chatId: activeChatId, messages });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireDbUser();
    const body = (await request.json()) as ChatRequestBody;
    const { documentId, message, chatId } = body;

    if (!documentId?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Enter a question before sending." },
        { status: 400 },
      );
    }

    const document = await queryOne<{ id: string; filename: string }>(
      `SELECT id, filename FROM documents
       WHERE id = $1 AND user_id = $2 AND status = 'ready'`,
      [documentId, user.id],
    );

    if (!document) {
      return NextResponse.json(
        { error: "This document is not ready for questions yet." },
        { status: 404 },
      );
    }

    let activeChatId: string = chatId ?? "";
    if (!activeChatId) {
      const title =
        message.length > 80 ? `${message.slice(0, 77)}…` : message;
      const chat = await queryOne<{ id: string }>(
        `INSERT INTO chats (user_id, document_id, title)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [user.id, documentId, title],
      );
      if (!chat) {
        return NextResponse.json(
          { error: "Could not start a chat session." },
          { status: 500 },
        );
      }
      activeChatId = chat.id;
    }

    await query(
      `INSERT INTO messages (chat_id, role, content) VALUES ($1, 'user', $2)`,
      [activeChatId, message.trim()],
    );

    const chunks = await retrieveChunks(documentId, message.trim(), 5);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "No indexed content found for this document." },
        { status: 422 },
      );
    }

    const encoder = new TextEncoder();
    let citations: CitationRef[] = [];
    let assistantContent = "";

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        };

        try {
          send("meta", { chatId: activeChatId });

          const result = await streamGroundedAnswer({
            question: message.trim(),
            chunks,
            onToken: (token) => {
              assistantContent += token;
              send("token", { text: token });
            },
          });

          citations = result.citations;

          await query(
            `INSERT INTO messages (chat_id, role, content, citations)
             VALUES ($1, 'assistant', $2, $3::jsonb)`,
            [activeChatId, result.content, JSON.stringify(citations)],
          );

          send("done", { citations });
          controller.close();
        } catch (err) {
          console.error(err);
          send("error", {
            message:
              err instanceof Error
                ? err.message
                : "Answer generation failed. Try again.",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
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
    { error: "Something went wrong. Try again." },
    { status: 500 },
  );
}
