"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type DocumentSummary = {
  id: string;
  filename: string;
  status: string;
  page_count: number | null;
  error_message: string | null;
  created_at: string;
};

type DocumentCardProps = {
  document: DocumentSummary;
  onDelete?: () => void;
};

const STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  processing: "Indexing",
  ready: "Ready",
  error: "Failed",
};

export default function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isReady = document.status === "ready";
  const isPending =
    document.status === "queued" || document.status === "processing";

  const ext = document.filename.split(".").pop()?.toUpperCase() || "DOC";

  const confirmDelete = async () => {
    setShowConfirmDelete(false);
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed.");
      }
      onDelete?.();
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete document.");
    } finally {
      setDeleting(false);
    }
  };

  const cardContent = (
    <article
      className={`group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-ink-soft/70 p-6 transition-all duration-200 hover:border-marker/40 hover:bg-ink-soft hover:shadow-xl ${
        deleting ? "opacity-40 pointer-events-none" : ""
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink/60 font-mono-label text-[10px] font-bold uppercase text-marker">
              {ext}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg tracking-tight text-white group-hover:text-marker transition-colors truncate max-w-[180px] sm:max-w-[200px]">
                {document.filename.replace(/\.[^.]+$/, "")}
              </h3>
              <p className="truncate font-mono-label text-[10px] uppercase text-muted">
                {document.filename}
              </p>
            </div>
          </div>
          <StatusBadge status={document.status} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 font-mono-label text-[11px] text-muted">
          {document.page_count != null && (
            <span className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1">
              <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {document.page_count} {document.page_count === 1 ? "page" : "pages"}
            </span>
          )}
          <span className="flex items-center gap-1">
            {formatRelativeTime(document.created_at)}
          </span>
        </div>

        {document.status === "error" && document.error_message && (
          <p className="mt-3 rounded-lg bg-red-500/10 p-2.5 text-xs text-red-400 border border-red-500/20">
            {document.error_message}
          </p>
        )}

        {isPending && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-rule/10 p-2.5 text-xs text-rule border border-rule/20">
            <span className="h-2 w-2 rounded-full bg-rule animate-ping"></span>
            <span>Indexing document vectors…</span>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
        {isReady ? (
          <span className="inline-flex items-center gap-1 font-mono-label text-[11px] font-semibold uppercase text-marker group-hover:translate-x-1 transition-transform">
            Start Q&amp;A Chat →
          </span>
        ) : (
          <span className="font-mono-label text-[11px] uppercase text-muted">
            Processing
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowConfirmDelete(true);
          }}
          disabled={deleting}
          className="p-1.5 rounded-lg font-mono-label text-[10px] uppercase text-muted transition-colors hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
          title="Delete document"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </article>
  );

  return (
    <>
      {isReady ? (
        <Link href={`/documents/${document.id}`} className="block">
          {cardContent}
        </Link>
      ) : (
        cardContent
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-ink-soft p-6 shadow-2xl">
            <h4 className="font-display text-xl text-white">Delete document?</h4>
            <p className="mt-2 text-sm text-muted">
              Are you sure you want to delete <span className="text-white font-medium">&ldquo;{document.filename}&rdquo;</span>? This will permanently remove all indexed chunks and chat history.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                className="rounded-full px-4 py-2 font-mono-label text-xs uppercase text-muted hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-full bg-red-500/90 px-4 py-2 font-mono-label text-xs uppercase font-semibold text-white hover:bg-red-600 transition-colors cursor-pointer"
              >
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-marker/15 px-2.5 py-1 font-mono-label text-[10px] font-semibold uppercase text-marker border border-marker/20">
        <span className="h-1.5 w-1.5 rounded-full bg-marker"></span>
        Ready
      </span>
    );
  }

  if (status === "processing" || status === "queued") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rule/15 px-2.5 py-1 font-mono-label text-[10px] font-semibold uppercase text-rule border border-rule/20">
        <span className="h-1.5 w-1.5 rounded-full bg-rule animate-pulse"></span>
        {STATUS_LABEL[status] ?? status}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-1 font-mono-label text-[10px] font-semibold uppercase text-red-400 border border-red-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
      Failed
    </span>
  );
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
