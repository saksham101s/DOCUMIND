import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import DashboardClient from "@/components/DashboardClient";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-ink text-white">
      <header className="border-b border-white/10 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-lg tracking-tight">
            DocuMind
          </Link>
          <UserButton />
        </div>
      </header>
      <DashboardClient />
    </main>
  );
}
