"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, Globe } from "lucide-react";

export function HeaderNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 sm:gap-2 text-xs font-medium">
      {/* Leaderboard Tab */}
      <Link
        href="/"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
          pathname === "/"
            ? "bg-zinc-800/80 text-white font-semibold shadow-sm"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
        }`}
      >
        <Trophy className="w-3.5 h-3.5 text-amber-400/90" />
        <span className="hidden sm:inline">Leaderboard</span>
      </Link>

      {/* 3D Map Tab (Visible for All) */}
      <Link
        href="/map"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
          pathname === "/map"
            ? "bg-zinc-800/80 text-white font-semibold shadow-sm"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
        }`}
        title="Live 3D Visitor Globe"
      >
        <Globe className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline">Map</span>
      </Link>
    </nav>
  );
}
