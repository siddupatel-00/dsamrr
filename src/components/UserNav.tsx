"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { User as UserIcon, LogOut, ShieldCheck, ChevronDown, Settings } from "lucide-react";

export function UserNav() {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />;
  }

  if (!session || !session.user) {
    return (
      <Link
        href="/auth"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-sans font-bold transition cursor-pointer shadow-sm"
      >
        <UserIcon className="w-3.5 h-3.5" />
        <span>Sign In</span>
      </Link>
    );
  }

  const username = (session.user as any).username || session.user.name || "profile";
  const avatar = session.user.image || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 p-1 pl-2 rounded-lg bg-[#15171c] hover:bg-[#1a1d24] border border-[#262933] text-zinc-200 text-xs font-sans transition cursor-pointer"
      >
        <img
          src={avatar}
          alt={session.user.name || "User"}
          className="w-5 h-5 rounded-full object-cover bg-zinc-800"
        />
        <span className="font-medium max-w-[100px] truncate">{session.user.name || username}</span>
        <ChevronDown className="w-3 h-3 text-zinc-400" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-[#111216] border border-[#262933] p-1.5 shadow-2xl z-50 font-sans text-xs space-y-1 animate-fadeIn">
          <div className="px-2.5 py-1.5 border-b border-[#262933]/70">
            <div className="font-semibold text-zinc-100 truncate">{session.user.name}</div>
            <div className="text-[10px] text-zinc-500 truncate font-mono">@{username}</div>
          </div>

          <Link
            href={`/u/${username}`}
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/70 text-zinc-300 hover:text-white transition"
          >
            <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>My Profile</span>
          </Link>

          <Link
            href={`/settings/verify?username=${username}`}
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/70 text-zinc-300 hover:text-white transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verify Handles</span>
          </Link>

          <Link
            href="/settings/account"
            onClick={() => setDropdownOpen(false)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/70 text-zinc-300 hover:text-white transition"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            <span>Settings</span>
          </Link>

          <div className="border-t border-[#262933]/70 my-1" />

          <button
            onClick={() => {
              setDropdownOpen(false);
              signOut();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-300 transition cursor-pointer text-left"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
