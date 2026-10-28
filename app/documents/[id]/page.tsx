import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ChatPanel from "@/components/ChatPanel";
import { AuthError, requireDbUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";

type PageProps = { params: Promise<{ id: string }> };

export default async function DocumentChatPage({ params }: PageProps) {
  let user;
  try {
    user = await requireDbUser();
  } catch (err) {
    // There is no /sign-in route (Clerk uses modals); real DB errors should surface.
    if (err instanceof AuthError) redirect("/");
    throw err;
  }

  const { id } = await params;

  const document = await queryOne<{
    id: string;
    filename: string;
    status: string;
  }>(
    `SELECT id, filename, status FROM documents WHERE id = $1 AND user_id = $2`,
    [id, user.id],
  );

  if (!document) notFound();

  if (document.status !== "ready") {
    return (
      <main className="min-h-screen bg-ink text-white">
        <DocumentHeader filename={document.filename} />
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <p className="font-display text-xl">Document not ready yet</p>
          <p className="mt-3 text-sm text-muted">
            {document.status === "error"
              ? "Processing failed for this file. Delete it from your dashboard and try uploading again."
              : "Still indexing — head back to the dashboard and wait for the status to show Ready."}
          </p>
          <Link
            href="/dashboard"
            className="mt-8 inline-block rounded-full bg-marker px-6 py-3 font-mono-label text-sm uppercase text-ink-on-paper"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const displayName = document.filename.replace(/\.[^.]+$/, "");

  return (
    <main className="flex min-h-screen flex-col bg-ink text-white">
      <DocumentHeader filename={document.filename} />
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatPanel documentId={document.id} documentName={displayName} />
      </div>
    </main>
  );
}

function DocumentHeader({ filename }: { filename: string }) {
  return (
    <header className="shrink-0 border-b border-white/10 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="font-mono-label text-[10px] uppercase text-muted transition-colors hover:text-white"
          >
            ← Dashboard
          </Link>
          <p className="mt-1 truncate font-mono-label text-xs uppercase text-marker">
            {filename}
          </p>
        </div>
        <UserButton />
      </div>
    </header>
  );
}
