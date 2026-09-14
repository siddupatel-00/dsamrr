"use client";

import React, { useState } from "react";
import { Zap, GitBranch, Star, Users, FolderGit2, RefreshCw, Lock } from "lucide-react";
import { ProUpgradeModal } from "./ProUpgradeModal";

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
  isPro: boolean;
  proExpiresAt?: string | null;
  githubHandle?: string | null;
  githubStats?: string | null;
  isOwner: boolean;
  profileUsername: string;
}

export function GitHubProCard({
  isPro,
  proExpiresAt,
  githubHandle,
  githubStats,
  isOwner,
  profileUsername,
}: GitHubProCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
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

  // If user is NOT PRO
  if (!isPro) {
    return (
      <>
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0e0f14] via-[#14121a] to-[#0e0f14] border border-amber-900/40 space-y-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                  <span>GitHub Developer Showcase</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800 text-amber-400 font-bold">
                    PRO
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400 font-sans">
                  Showcase GitHub commit streak, stars, top repositories & languages.
                </p>
              </div>
            </div>

            {isOwner && (
              <button
                onClick={() => setModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-sans transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
              >
                <Zap className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Unlock for ₹1</span>
              </button>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#090a0d]/70 border border-dashed border-zinc-800/80 text-center space-y-2 py-6">
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
              <Lock className="w-4 h-4" />
            </div>
            <p className="text-xs text-zinc-400 font-sans max-w-sm mx-auto">
              {isOwner
                ? "Upgrade to DSAMRR Pro (₹1 for 15 days or ₹2 for 30 days) to display your verified GitHub stats and unlock a gold PRO badge on the leaderboard."
                : `This developer has not enabled GitHub Pro Showcase yet.`}
            </p>
            {isOwner && (
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold font-mono underline cursor-pointer"
              >
                Upgrade to Pro &rarr;
              </button>
            )}
          </div>
        </div>

        <ProUpgradeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          defaultGithubHandle={githubHandle || ""}
        />
      </>
    );
  }

  // If user IS PRO
  return (
    <>
      <div className="p-5 rounded-2xl bg-[#0e0f14] border border-amber-900/50 space-y-4 shadow-xl font-sans relative">
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
                  className="text-sm font-bold text-white hover:text-amber-400 transition"
                >
                  @{githubHandle || stats?.username || "github"}
                </a>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800 text-amber-400 font-bold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 fill-amber-400" />
                  <span>PRO</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                {stats?.bio || "Verified GitHub Open-Source Contributor"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={syncing}
                  className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 font-mono transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Refresh stats from GitHub"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin text-amber-400" : ""}`} />
                  <span>{syncing ? "Syncing..." : "Sync"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 text-[11px] text-amber-300 font-mono transition cursor-pointer"
                >
                  Extend Plan
                </button>
              </>
            )}
          </div>
        </div>

        {syncMsg && (
          <div className="text-[11px] text-amber-400 font-mono text-center">
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

      <ProUpgradeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultGithubHandle={githubHandle || ""}
      />
    </>
  );
}
