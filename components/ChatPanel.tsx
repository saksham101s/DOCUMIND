"use client";

import { useEffect, useRef, useState } from "react";
import CitationTag from "./CitationTag";

export type Citation = {
  chunk_id: string;
  page_number: number | null;
  excerpt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[] | null;
};

type ChatPanelProps = {
  documentId: string;
  documentName: string;
};

const STARTER_PROMPTS = [
  "Summarize the main points of this document.",
  "What are the key takeaways and conclusions?",
  "List the core requirements or facts mentioned.",
  "Explain any key terms defined in the text.",
];

export default function ChatPanel({ documentId, documentName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const tempIdRef = useRef(0);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chat?documentId=${documentId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (cancelled) return;
        setChatId(data.chatId);
        setMessages(
          (data.messages ?? []).map((m: ChatMessage) => ({
            ...m,
            role: m.role as "user" | "assistant",
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setError("Could not load chat history. Refresh the page.");
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || streaming) return;

    setError(null);
    setInput("");
    setStreaming(true);

    tempIdRef.current += 1;
    const userMsg: ChatMessage = {
      id: `temp-user-${tempIdRef.current}`,
      role: "user",
      content: text,
    };
    const assistantId = `temp-assistant-${tempIdRef.current}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", citations: [] },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, message: text, chatId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Request failed.");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream.");

      const decoder = new TextDecoder();
      let buffer = "";
      let citations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event: "));
          const dataLine = lines.find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.replace("event: ", "");
          const payload = JSON.parse(dataLine.replace("data: ", ""));

          if (event === "meta" && payload.chatId) {
            setChatId(payload.chatId);
          } else if (event === "token" && payload.text) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + payload.text }
                  : m,
              ),
            );
          } else if (event === "done") {
            citations = payload.citations ?? [];
          } else if (event === "error") {
            throw new Error(payload.message);
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, citations } : m,
        ),
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      setError(
        err instanceof Error
          ? err.message
          : "Could not get an answer. Try again.",
      );
    } finally {
      setStreaming(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportChat = () => {
    if (messages.length === 0) return;
    const markdown = messages
      .map(
        (m) =>
          `### ${m.role === "user" ? "User Question" : "DocuMind Answer"}\n\n${m.content}\n`,
      )
      .join("\n---\n\n");

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${documentName}-chat-transcript.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingHistory) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-marker border-t-transparent animate-spin"></div>
          <span className="font-mono-label text-xs uppercase">Loading document chat…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ink">
      {/* Sub-header Controls */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-2.5 bg-ink-soft/40">
        <div className="flex items-center gap-2 text-xs font-mono-label uppercase text-muted">
          <span className="h-2 w-2 rounded-full bg-marker"></span>
          <span>Engine: RAG (Voyage-3 + Claude Sonnet)</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={exportChat}
            className="flex items-center gap-1.5 font-mono-label text-[10px] uppercase text-muted hover:text-white transition-colors cursor-pointer"
            title="Export conversation as Markdown"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Chat
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-8 max-w-4xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl text-center py-10">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-marker/10 text-marker border border-marker/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h2 className="font-display text-2xl text-white">
              Ask anything about{" "}
              <span className="highlight-mark">{documentName}</span>
            </h2>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Every answer is generated strictly from this document&apos;s indexed text chunks, complete with verified passage citations.
            </p>

            {/* Starter Prompt Chips */}
            <div className="mt-8">
              <p className="font-mono-label text-[10px] uppercase text-muted tracking-wider mb-3">
                Suggested Questions
              </p>
              <div className="grid gap-2 sm:grid-cols-2 text-left">
                {STARTER_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-xl border border-white/10 bg-ink-soft/60 p-3 text-xs text-paper/90 hover:border-marker/50 hover:bg-ink-soft hover:text-white transition-all text-left group cursor-pointer"
                  >
                    <span className="text-marker font-mono-label text-[10px] mr-1.5 group-hover:underline">→</span>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`group relative max-w-[90%] sm:max-w-[85%] rounded-2xl p-5 shadow-lg ${
                msg.role === "user"
                  ? "rounded-tr-xs bg-rule/20 border border-rule/30 text-white"
                  : "rounded-tl-xs bg-ink-soft/90 border border-white/10 text-white/95"
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-label text-[10px] uppercase font-semibold tracking-wider text-muted">
                  {msg.role === "user" ? "You" : "DocuMind Assistant"}
                </span>

                {msg.role === "assistant" && msg.content && (
                  <button
                    onClick={() => copyToClipboard(msg.id, msg.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity font-mono-label text-[10px] uppercase text-muted hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === msg.id ? (
                      <span className="text-marker font-bold">✓ Copied</span>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Message Content */}
              <div className="text-sm leading-relaxed text-paper/95 space-y-2">
                {msg.role === "assistant" && streaming && msg.content === "" ? (
                  <div className="flex items-center gap-2 text-muted py-1 font-mono-label text-xs">
                    <span className="h-2 w-2 rounded-full bg-marker animate-ping"></span>
                    <span>Retrieving vector chunks &amp; generating grounded answer…</span>
                  </div>
                ) : (
                  <FormattedContent content={msg.content} />
                )}
              </div>

              {/* Citations Row */}
              {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                  <span className="font-mono-label text-[10px] uppercase text-muted mr-1">
                    Citations:
                  </span>
                  {msg.citations.map((c) => (
                    <CitationTag
                      key={c.chunk_id}
                      pageNumber={c.page_number}
                      excerpt={c.excerpt}
                      chunkId={c.chunk_id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="max-w-3xl mx-auto w-full px-6 py-2">
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400" role="alert">
            {error}
          </p>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="border-t border-white/10 p-4 md:p-6 bg-ink-soft/40 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask a question about ${documentName}…`}
            disabled={streaming}
            className="flex-1 rounded-full border border-white/15 bg-ink-soft px-5 py-3 text-sm text-white placeholder:text-muted focus:border-marker/60 focus:outline-none disabled:opacity-50 font-sans shadow-inner"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="rounded-full bg-marker px-6 py-3 font-mono-label text-xs uppercase font-bold text-ink-on-paper transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-40 shadow-md cursor-pointer shrink-0"
          >
            {streaming ? "Thinking…" : "Send Question"}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Simple parser to render paragraphs and bullet lists cleanly */
function FormattedContent({ content }: { content: string }) {
  if (!content) return null;

  const paragraphs = content.split("\n\n");

  return (
    <div className="space-y-3 font-sans">
      {paragraphs.map((p, idx) => {
        const lines = p.split("\n");
        const isList = lines.every((l) => l.trim().startsWith("- ") || l.trim().startsWith("* ") || /^\d+\./.test(l.trim()));

        if (isList) {
          return (
            <ul key={idx} className="list-disc list-inside space-y-1 text-paper/90 pl-1">
              {lines.map((line, lIdx) => (
                <li key={lIdx} className="leading-relaxed">
                  {formatInlineText(line.replace(/^[-*]\s+|\d+\.\s+/, ""))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className="whitespace-pre-wrap leading-relaxed">
            {formatInlineText(p)}
          </p>
        );
      })}
    </div>
  );
}

function formatInlineText(text: string) {
  // Simple inline bold handling
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
