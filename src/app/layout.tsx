import type { Metadata } from "next";
import Link from "next/link";
import { Terminal, Trophy, Megaphone } from "lucide-react";
import { AuthProvider } from "@/components/AuthProvider";
import { UserNav } from "@/components/UserNav";
import { VisitorCounter } from "@/components/VisitorCounter";
import "./globals.css";

export const metadata: Metadata = {
  title: "DSAMRR — Verified Competitive Programming Leaderboard",
  description: "Verified developer rankings and daily grind proof-of-work for LeetCode, Codeforces, GFG, HackerRank, CodeChef, and AtCoder.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-zinc-800 selection:text-white">
        <AuthProvider>
          {/* Clean Full-width Top Navbar */}
          <header className="sticky top-0 z-50 w-full bg-[#09090b]/95 border-b border-zinc-800/80 backdrop-blur px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-zinc-100 hover:text-white transition">
                <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="font-bold text-sm tracking-tight font-mono">DSAMRR</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  PRO
                </span>
              </Link>

              <Link
                href="/"
                className="text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1.5 text-xs font-medium ml-2"
              >
                <Trophy className="w-3.5 h-3.5 text-zinc-500" />
                <span>Leaderboard</span>
              </Link>
            </div>

            {/* Center Total Visitors Badge */}
            <div className="flex items-center justify-center">
              <VisitorCounter />
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/ads"
                className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-100 transition px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 cursor-pointer shadow-sm"
              >
                <Megaphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">Advertise</span>
              </Link>

              {/* User Authentication & Profile Menu */}
              <UserNav />
            </div>
          </header>

          {/* 100% full-width main container */}
          <main className="flex-1 w-full px-3 py-2">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
