"use client";

import { useState, useRef, useEffect } from "react";

type CitationTagProps = {
  pageNumber: number | null;
  excerpt?: string;
  chunkId?: string;
};

/** Interactive citation tag pill with source excerpt popover modal. */
export default function CitationTag({
  pageNumber,
  excerpt,
  chunkId,
}: CitationTagProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const label =
    pageNumber != null ? `cited · page ${pageNumber}` : "cited · source";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-full bg-marker/15 px-2.5 py-1 font-mono-label text-[10px] uppercase font-medium text-marker transition-all hover:bg-marker/25 hover:scale-105 active:scale-95 border border-marker/20 focus:outline-none cursor-pointer"
        aria-label={`View citation source${pageNumber != null ? ` for page ${pageNumber}` : ""}`}
      >
        <svg
          className="w-3 h-3 text-marker shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span>{label}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-72 sm:w-80 rounded-xl border border-white/15 bg-ink-soft/95 p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-marker"></span>
              <span className="font-mono-label text-[11px] uppercase font-bold text-white tracking-wider">
                Source Citation
              </span>
            </div>
            {pageNumber != null && (
              <span className="rounded-full bg-marker/20 px-2 py-0.5 font-mono-label text-[10px] uppercase text-marker">
                Page {pageNumber}
              </span>
            )}
          </div>

          <div className="text-xs text-paper/90 leading-relaxed font-sans max-h-48 overflow-y-auto pr-1 bg-ink/40 p-2.5 rounded-lg border border-white/5 italic">
            &ldquo;{excerpt || "Source excerpt available in document vector index."}&rdquo;
          </div>

          {chunkId && (
            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-muted font-mono-label">
              <span>Vector Chunk</span>
              <span className="truncate max-w-[140px] opacity-70">{chunkId}</span>
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] uppercase font-mono-label text-muted hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
