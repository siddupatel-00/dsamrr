"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GitBranch, Star, Users, FolderGit2, RefreshCw, ArrowRight } from "lucide-react";

interface GitHubStatsData {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  stars: number;
  topLanguages: { language: string; count: number }[];
  syncedAt: string;
}

interface GitHubProCardProps {
  isPro?: boolean;
  proExpiresAt?: string | null;
  githubHandle?: string | null;
  githubStats?: string | null;
  isOwner: boolean;
  profileUsername?: string;
}

export function GitHubProCard({
  githubHandle,
  githubStats,
  isOwner,
}: GitHubProCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  let stats: GitHubStatsData | null = null;
  if (githubStats) {
    try {
      stats = JSON.parse(githubStats);
    } catch (e) {}
  }

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/pro/sync-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubHandle }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMsg("GitHub stats synced!");
        window.location.reload();
      } else {
        setSyncMsg(data.error || "Sync failed");
      }
    } catch (e: any) {
      setSyncMsg(e.message || "Failed to sync");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 3000);
    }
  };

  // If user hasn't linked GitHub yet
  if (!githubHandle && !stats) {
    if (!isOwner) return null;

    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0f14] border border-[#262933] shadow-xl font-sans flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-sans">
              GitHub Developer Integration
            </h3>
            <p className="text-xs text-zinc-400 font-sans">
              Showcase your public repositories, total stars, and top languages for free.
            </p>
          </div>
        </div>

        <Link
          href="/settings/verify?platform=github"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-sans transition shadow-md shrink-0"
        >
          <span>Link GitHub</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  // Active GitHub Showcase Card
  return (
    <div className="p-5 rounded-2xl bg-[#0e0f14] border border-zinc-800/80 space-y-4 shadow-xl font-sans relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white font-bold shrink-0">
            {stats?.avatarUrl ? (
              <img
                src={stats.avatarUrl}
                alt={stats.username}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              <span className="font-mono text-sm">GH</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <a
                href={`https://github.com/${githubHandle || stats?.username}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-bold text-white hover:text-emerald-400 transition"
              >
                @{githubHandle || stats?.username || "github"}
              </a>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800/80 border border-zinc-700 text-zinc-300 font-semibold">
                GitHub Verified
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
              {stats?.bio || "Open-Source Developer"}
            </p>
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 font-mono transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh stats from GitHub"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin text-emerald-400" : ""}`} />
              <span>{syncing ? "Syncing..." : "Sync"}</span>
            </button>
          </div>
        )}
      </div>

      {syncMsg && (
        <div className="text-[11px] text-emerald-400 font-mono text-center">
          {syncMsg}
        </div>
      )}

      {/* GitHub Highlight Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="p-3 rounded-xl bg-[#15171c] border border-[#262933]">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1">
            <FolderGit2 className="w-3 h-3 text-sky-400" />
            <span>Public Repos</span>
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {stats?.publicRepos ?? 0}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#15171c] border border-[#262933]">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400" />
            <span>Total Stars</span>
          </div>
          <div className="text-lg font-bold text-amber-400 mt-1">
            {stats?.stars ?? 0}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#15171c] border border-[#262933]">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1">
            <Users className="w-3 h-3 text-emerald-400" />
            <span>Followers</span>
          </div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {stats?.followers ?? 0}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#15171c] border border-[#262933]">
          <div className="text-[11px] text-zinc-400 flex items-center gap-1">
            <GitBranch className="w-3 h-3 text-purple-400" />
            <span>Following</span>
          </div>
          <div className="text-lg font-bold text-purple-400 mt-1">
            {stats?.following ?? 0}
          </div>
        </div>
      </div>

      {/* Top Languages */}
      {stats?.topLanguages && stats.topLanguages.length > 0 && (
        <div className="pt-2 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-zinc-500 font-mono">Top Languages:</span>
          {stats.topLanguages.map((l) => (
            <span
              key={l.language}
              className="text-[11px] px-2 py-0.5 rounded-md bg-[#15171c] border border-[#262933] text-zinc-300 font-mono"
            >
              {l.language} ({l.count})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
