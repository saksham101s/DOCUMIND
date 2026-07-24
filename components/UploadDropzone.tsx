"use client";

import { useCallback, useRef, useState } from "react";

type UploadDropzoneProps = {
  onUploaded: () => void;
};

export default function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressStage, setProgressStage] = useState<string>("Uploading file...");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setSelectedFile(file);
      setUploading(true);
      setProgressStage("Uploading to storage...");

      try {
        const formData = new FormData();
        formData.append("file", file);

        // Stage feedback simulation
        const timer1 = setTimeout(() => {
          setProgressStage("Extracting document text & pages...");
        }, 1200);

        const timer2 = setTimeout(() => {
          setProgressStage("Generating Voyage 1024-dim embeddings & indexing...");
        }, 2800);

        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        clearTimeout(timer1);
        clearTimeout(timer2);

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Upload failed.");
        }

        setSelectedFile(null);
        onUploaded();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Upload failed. Check the file format and try again.",
        );
      } finally {
        setUploading(false);
      }
    },
    [onUploaded],
  );

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) uploadFile(file);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!uploading) handleFiles(e.dataTransfer.files);
        }}
        className={`group relative overflow-hidden cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-10 text-center transition-all duration-200 ${
          dragging
            ? "border-marker bg-marker/10 shadow-[0_0_30px_rgba(215,242,109,0.15)] scale-[1.01]"
            : "border-white/15 bg-ink-soft/40 hover:border-marker/40 hover:bg-ink-soft/80"
        } ${uploading ? "pointer-events-none opacity-80" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-2 border-marker/20 border-t-marker animate-spin"></div>
              <div className="absolute font-mono-label text-[9px] uppercase text-marker font-bold">
                RAG
              </div>
            </div>
            <div>
              <p className="font-display text-lg text-white">
                {selectedFile ? selectedFile.name : "Processing Document"}
              </p>
              <p className="mt-1 font-mono-label text-xs uppercase text-marker tracking-wide">
                {progressStage}
              </p>
            </div>
            {selectedFile && (
              <div className="flex items-center gap-2 text-xs text-muted font-mono-label">
                <span>{formatFileSize(selectedFile.size)}</span>
                <span>•</span>
                <span className="uppercase">{selectedFile.name.split('.').pop()}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5 border border-white/10 group-hover:scale-110 group-hover:border-marker/40 transition-all">
              <svg
                className="h-7 w-7 text-marker"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="font-display text-xl text-white">
              Drop your document here
            </p>
            <p className="mt-2 text-sm text-muted">
              Supports <span className="text-white font-medium">PDF, TXT, DOCX</span> up to 25MB
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-marker/10 px-3 py-1 font-mono-label text-[10px] uppercase text-marker border border-marker/20">
                Automatic RAG Vector Indexing
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 flex items-center gap-3 text-sm text-red-300">
          <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="font-mono-label text-[10px] uppercase text-red-400 hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
