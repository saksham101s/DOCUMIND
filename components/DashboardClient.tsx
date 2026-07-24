"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import DocumentCard, { type DocumentSummary } from "./DocumentCard";
import UploadDropzone from "./UploadDropzone";

export default function DashboardClient() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "processing">("all");

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load documents.");
      setDocuments(data.documents ?? []);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load documents.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll while any document is still indexing.
  useEffect(() => {
    const hasPending = documents.some(
      (d) => d.status === "queued" || d.status === "processing",
    );
    if (!hasPending) return;

    const interval = setInterval(fetchDocuments, 3000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.filename
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      if (statusFilter === "ready") {
        return matchesSearch && doc.status === "ready";
      }
      if (statusFilter === "processing") {
        return (
          matchesSearch &&
          (doc.status === "processing" || doc.status === "queued")
        );
      }
      return matchesSearch;
    });
  }, [documents, searchQuery, statusFilter]);

  // Stats summary
  const totalDocs = documents.length;
  const readyDocs = documents.filter((d) => d.status === "ready").length;
  const totalPages = documents.reduce(
    (acc, d) => acc + (d.page_count || 0),
    0,
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Top Bar / Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-white/10 pb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-marker"></span>
            <p className="font-mono-label text-xs uppercase text-marker tracking-wider">
              Document Workspace
            </p>
          </div>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl text-white">Your Documents</h1>
          <p className="mt-2 text-sm text-muted max-w-md">
            Upload PDFs, text files, or Word documents. Ask questions and receive precise, cited answers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-ink-soft px-3 py-1.5 font-mono-label text-xs uppercase text-muted">
            <span className="text-marker font-bold">{readyDocs}</span> / {totalDocs} Ready
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-4 py-2 font-mono-label text-xs uppercase text-muted transition-colors hover:border-white/30 hover:text-white"
          >
            ← Home
          </Link>
        </div>
      </div>

      {/* Library Analytics Pill Row */}
      {totalDocs > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-ink-soft/40 p-4">
            <p className="font-mono-label text-[10px] uppercase text-muted">Total Documents</p>
            <p className="mt-1 font-display text-2xl text-white">{totalDocs}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-ink-soft/40 p-4">
            <p className="font-mono-label text-[10px] uppercase text-muted">Indexed Pages</p>
            <p className="mt-1 font-display text-2xl text-marker">{totalPages}</p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/10 bg-ink-soft/40 p-4">
            <p className="font-mono-label text-[10px] uppercase text-muted">Vector Engine</p>
            <p className="mt-1 font-mono-label text-xs text-rule">Voyage-3 + pgvector</p>
          </div>
        </div>
      )}

      {/* Dropzone Section */}
      <div className="mt-8">
        <UploadDropzone onUploaded={fetchDocuments} />
      </div>

      {error && (
        <p className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Library Filter & Search */}
      <div className="mt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-soft/60 p-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg px-3 py-1.5 font-mono-label text-xs uppercase transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white/10 text-white font-semibold shadow-sm"
                  : "text-muted hover:text-white"
              }`}
            >
              All ({totalDocs})
            </button>
            <button
              onClick={() => setStatusFilter("ready")}
              className={`rounded-lg px-3 py-1.5 font-mono-label text-xs uppercase transition-all cursor-pointer ${
                statusFilter === "ready"
                  ? "bg-marker/20 text-marker font-semibold shadow-sm"
                  : "text-muted hover:text-white"
              }`}
            >
              Ready ({readyDocs})
            </button>
            <button
              onClick={() => setStatusFilter("processing")}
              className={`rounded-lg px-3 py-1.5 font-mono-label text-xs uppercase transition-all cursor-pointer ${
                statusFilter === "processing"
                  ? "bg-rule/20 text-rule font-semibold shadow-sm"
                  : "text-muted hover:text-white"
              }`}
            >
              Indexing ({totalDocs - readyDocs})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by name..."
              className="w-full rounded-xl border border-white/10 bg-ink-soft/60 px-4 py-2 pl-10 font-sans text-sm text-white placeholder:text-muted focus:border-marker/50 focus:outline-none"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-muted hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Document Grid / States */}
        <div className="mt-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-2xl border border-white/5 bg-ink-soft/40 p-6 animate-pulse"
                >
                  <div className="h-4 w-2/3 rounded bg-white/10"></div>
                  <div className="mt-4 h-3 w-1/3 rounded bg-white/5"></div>
                  <div className="mt-12 h-4 w-1/2 rounded bg-white/10"></div>
                </div>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-ink-soft/30 p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-muted">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-display text-xl text-white">
                {searchQuery ? "No matching documents found" : "No documents in library"}
              </p>
              <p className="mt-2 text-sm text-muted max-w-sm mx-auto">
                {searchQuery
                  ? `No file matching "${searchQuery}". Try clearing your search query.`
                  : "Upload your first PDF, TXT, or DOCX document above to start asking questions."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={fetchDocuments}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
