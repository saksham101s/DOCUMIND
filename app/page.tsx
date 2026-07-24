import Link from "next/link";
import { Show, SignUpButton } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import DocumentMockup from "@/components/DocumentMockup";

const features = [
  {
    tag: "grounded",
    title: "Answers, not guesses",
    body: "Every response is pulled from your own documents and linked back to the exact passage it came from.",
  },
  {
    tag: "any format",
    title: "PDFs, notes, docs",
    body: "Upload PDFs, Word files, or plain text. DocuMind reads and indexes them in seconds.",
  },
  {
    tag: "private",
    title: "Your files, your account",
    body: "Documents are scoped to your account only. Nothing you upload trains a shared model.",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload a document",
    body: "Drop in a PDF, text file, or Word doc. DocuMind splits and indexes it automatically.",
  },
  {
    number: "02",
    title: "Ask a question",
    body: "Type what you want to know, in plain language, about anything inside the document.",
  },
  {
    number: "03",
    title: "Get a cited answer",
    body: "DocuMind answers using only your text, and shows you exactly where the answer came from.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-ink text-white">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-16 px-6 py-20 md:grid-cols-2 md:items-center md:py-28">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-marker"></span>
            <p className="font-mono-label text-xs uppercase text-marker tracking-wider">
              AI Reading Assistant
            </p>
          </div>

          <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
            Ask your documents anything.{" "}
            <span className="highlight-mark">Get real answers.</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
            Upload a PDF, textbook chapter, or set of notes. DocuMind reads
            it, answers your questions in plain language, and always shows
            you the exact source passage.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="rounded-full bg-marker px-7 py-3.5 font-mono-label text-sm uppercase font-bold text-ink-on-paper transition-transform hover:scale-[1.03] active:scale-95 shadow-md"
              >
                Go to Dashboard →
              </Link>
            </Show>
            <Show when="signed-out">
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button className="rounded-full bg-marker px-7 py-3.5 font-mono-label text-sm uppercase font-bold text-ink-on-paper transition-transform hover:scale-[1.03] active:scale-95 shadow-md cursor-pointer">
                  Try it free →
                </button>
              </SignUpButton>
            </Show>

            <a
              href="#how-it-works"
              className="text-sm font-mono-label text-muted transition-colors hover:text-white px-2 py-1"
            >
              See how it works ↓
            </a>
          </div>
        </div>

        <Show when="signed-in">
          <Link href="/dashboard" className="block group cursor-pointer" title="Click to open Dashboard workspace">
            <DocumentMockup />
          </Link>
        </Show>
        <Show when="signed-out">
          <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
            <div className="group cursor-pointer" title="Click to sign up and try DocuMind">
              <DocumentMockup />
            </div>
          </SignUpButton>
        </Show>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/10 py-24 bg-ink-soft/30">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl md:text-3xl">
            Built for real documents, not demos.
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.tag}
                className="rounded-2xl border border-white/10 bg-ink-soft/60 p-6 transition-all hover:border-marker/40 hover:bg-ink-soft"
              >
                <span className="font-mono-label text-[10px] uppercase font-semibold text-marker">
                  {f.tag}
                </span>
                <h3 className="mt-3 font-display text-xl">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-white/10 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="font-display text-2xl md:text-3xl">How it works</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.number} className="rounded-2xl border border-white/10 bg-ink-soft/40 p-6">
                <span className="font-mono-label text-sm font-bold text-rule">
                  {s.number}
                </span>
                <h3 className="mt-3 font-display text-xl">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Footer */}
      <footer
        id="get-started"
        className="border-t border-white/10 py-20 text-center bg-ink-soft/40"
      >
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="font-display text-3xl md:text-4xl">
            Stop searching. Start asking.
          </h2>
          <p className="mt-3 text-base text-muted">
            Upload your first document and get cited answers in seconds.
          </p>

          <div className="mt-8 flex justify-center">
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="rounded-full bg-marker px-8 py-4 font-mono-label text-sm uppercase font-bold text-ink-on-paper transition-transform hover:scale-[1.03] active:scale-95 shadow-lg"
              >
                Open Dashboard Workspace →
              </Link>
            </Show>
            <Show when="signed-out">
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <button className="rounded-full bg-marker px-8 py-4 font-mono-label text-sm uppercase font-bold text-ink-on-paper transition-transform hover:scale-[1.03] active:scale-95 shadow-lg cursor-pointer">
                  Get Started Free →
                </button>
              </SignUpButton>
            </Show>
          </div>

          <div className="mt-12 flex items-center justify-center gap-2 font-mono-label text-[10px] uppercase text-muted border-t border-white/10 pt-8">
            <span>DocuMind</span>
            <span>·</span>
            <span>RAG Architecture: Next.js + Voyage-3 + PgVector + Claude 3.5</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
