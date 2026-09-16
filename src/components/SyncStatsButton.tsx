"use client";

import { useState } from "react";
import { RotateCw, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface SyncStatsButtonProps {
  username: string;
  isOwner?: boolean;
  className?: string;
  compact?: boolean;
}

export function SyncStatsButton({
  username,
  isOwner = false,
  className = "",
  compact = false,
}: SyncStatsButtonProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (syncing) return;

    setSyncing(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/sync`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        // Dispatch global event for listeners (e.g. Leaderboard)
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dsamrr:synced", { detail: { username } }));
        }
        setTimeout(() => {
          router.refresh();
        }, 300);
        setTimeout(() => setStatus("idle"), 2500);
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to sync");
        setTimeout(() => setStatus("idle"), 4000);
      }
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Network error");
      setTimeout(() => setStatus("idle"), 4000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        title={`Sync verified platform stats for @${username}`}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono font-medium transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          status === "success"
            ? "bg-emerald-950/60 border-emerald-600 text-emerald-300"
            : status === "error"
            ? "bg-red-950/60 border-red-800 text-red-300"
            : "bg-[#15171c] hover:bg-[#1f222a] border-[#2a2e39] hover:border-zinc-500 text-zinc-200"
        } ${className}`}
      >
        {status === "success" ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <RotateCw
            className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-emerald-400" : "text-zinc-400"}`}
          />
        )}
        <span>
          {syncing
            ? "Syncing..."
            : status === "success"
            ? "Synced!"
            : compact
            ? "Sync"
            : isOwner
            ? "Sync Stats"
            : "Refresh"}
        </span>
      </button>
      {status === "error" && errorMessage && (
        <span className="absolute top-full mt-1.5 left-0 text-[10px] text-red-400 whitespace-nowrap bg-zinc-950/95 px-2 py-1 rounded-md border border-red-900/80 z-30 shadow-lg font-sans">
          {errorMessage}
        </span>
      )}
    </div>
  );
}
