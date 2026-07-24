import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DocuMind — AI Document Q&A with Source Citations",
  description: "Upload PDFs, Word docs, or text files and ask questions with RAG-backed source citations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${ibmPlexMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-ink text-white font-sans selection:bg-marker selection:text-ink">
        <ClerkProvider>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
