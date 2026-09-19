"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Lock, Unlock, Key, Eye, EyeOff, CheckCircle2, ArrowRight, Globe, AlertCircle } from "lucide-react";
import { useAnalyticsAuth } from "@/hooks/useAnalyticsAuth";

export default function PrivacyPage() {
  const { isUnlocked, loading, unlock, lock } = useAnalyticsAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter your access key.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await unlock(password);
    setSubmitting(false);

    if (res.success) {
      setPassword("");
      router.push("/analytics");
    } else {
      setError(res.error || "Incorrect access key. Please check your Vercel environment variable.");
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#141517] border border-[#242528] rounded-[24px] p-6 sm:p-8 shadow-2xl space-y-6 font-sans">
        {/* Header with Icon */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-emerald-400 shadow-inner">
            {isUnlocked ? <Unlock className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6 text-zinc-300" />}
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Privacy & Access Control
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
            Detailed telemetry, visitor acquisition, and device breakdown analytics are restricted to authorized administrators.
          </p>
        </div>

        {/* State 1: Already Unlocked */}
        {isUnlocked ? (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-semibold text-emerald-200">
                  Analytics Dashboard Unlocked
                </div>
                <div className="text-[11px] text-emerald-400/80 leading-relaxed">
                  Your access key is verified. The Analytics tab and navigation links are now visible to you across the site.
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/analytics"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Go to Analytics Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={lock}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Lock Access & Hide Analytics</span>
              </button>
            </div>
          </div>
        ) : (
          /* State 2: Locked - Enter Access Key */
          <form onSubmit={handleUnlock} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                Access Key / Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter access key..."
                  disabled={submitting}
                  autoFocus
                  className="w-full bg-[#0d0e10] border border-[#2d2e33] rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !password.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Analytics</span>
                </>
              )}
            </button>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed font-mono">
              <span className="text-zinc-300 font-bold block mb-0.5">Vercel Configuration:</span>
              Set <code className="text-emerald-400 font-bold">ANALYTICS_PASSWORD</code> in your Vercel Project Settings → Environment Variables.
            </div>
          </form>
        )}

        {/* Public Map Notice */}
        <div className="pt-4 border-t border-[#222327] flex items-center justify-between text-xs text-zinc-400">
          <span className="text-[11px]">Looking for the live visitor map?</span>
          <Link
            href="/map"
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition font-medium text-[11px] hover:underline"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>3D Map (Public)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
