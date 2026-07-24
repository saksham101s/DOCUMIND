"use client";

import Link from "next/link";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <LogoMark />
          <span className="font-display text-lg tracking-tight text-white group-hover:text-marker transition-colors">
            DocuMind
          </span>
        </Link>

        <div className="hidden items-center gap-8 font-mono-label text-xs uppercase text-muted md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-white">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="font-mono-label text-xs uppercase text-muted transition-colors hover:text-white px-3 py-2 cursor-pointer">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
              <button className="rounded-full bg-marker px-4 py-2 font-mono-label text-xs font-bold uppercase text-ink-on-paper transition-transform hover:scale-[1.03] active:scale-95 cursor-pointer shadow-sm">
                Get started
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-full bg-marker/15 border border-marker/30 px-4 py-2 font-mono-label text-xs font-bold uppercase text-marker transition-all hover:bg-marker/25 hover:scale-[1.03]"
            >
              Go to Dashboard →
            </Link>
            <UserButton />
          </Show>
        </div>
      </nav>
    </header>
  );
}

function LogoMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 3h13l3 3v15H4V3z"
        stroke="#EAE7DE"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M17 3v3h3" stroke="#D7F26D" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
