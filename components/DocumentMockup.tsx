export default function DocumentMockup() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-paper-line bg-paper p-6 shadow-2xl shadow-black/40">
        <div className="mb-4 flex items-center justify-between font-mono-label text-[10px] uppercase text-ink-on-paper/50">
          <span>chapter-7-thermodynamics.pdf</span>
          <span>page 14 of 212</span>
        </div>
        <p className="font-serif text-sm leading-relaxed text-ink-on-paper/80">
          In an isolated system, entropy never decreases over time.{" "}
          <span className="highlight-mark font-medium text-ink-on-paper">
            This is the second law of thermodynamics
          </span>
          , and it explains why heat flows from hot to cold and not the
          reverse.
        </p>
      </div>

      <div className="my-3 ml-10 h-8 dash-connector" />

      <div className="ml-10 max-w-xs rounded-2xl rounded-tl-sm bg-ink-soft p-4 shadow-xl">
        <p className="text-sm leading-relaxed text-white/90">
          Heat moves from hot to cold because entropy in an isolated system
          only increases — never reverses.
        </p>
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-marker/15 px-2 py-1 font-mono-label text-[10px] uppercase text-marker">
          cited · page 14
        </div>
      </div>
    </div>
  );
}
