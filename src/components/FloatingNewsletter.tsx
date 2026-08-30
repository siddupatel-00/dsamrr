"use client";

import React, { useState } from "react";
import { X, Bell, Sparkles, Check, ArrowRight } from "lucide-react";

export function FloatingNewsletter() {
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  if (dismissed) return null;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-xs sm:max-w-sm w-full animate-fadeIn font-mono">
      <div className="p-4 rounded-2xl bg-[#0c0c0e]/95 border border-zinc-800 shadow-2xl backdrop-blur-md relative space-y-3">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-100 font-sans">
              Daily POTD & Contest Webhook API
            </div>
            <div className="text-[10px] text-zinc-400">
              Free automated alerts for LC, CF & GFG
            </div>
          </div>
        </div>

        {subscribed ? (
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium py-1">
            <Check className="w-3.5 h-3.5" />
            <span>Webhook key sent to your inbox!</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="flex items-center gap-1.5 pt-1">
            <input
              type="email"
              placeholder="developer@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-zinc-700"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition flex items-center gap-1 shrink-0"
            >
              <span>Get Key</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
