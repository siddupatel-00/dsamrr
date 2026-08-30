"use client";

import React, { useState } from "react";
import { X, Check, Sparkles, Plus } from "lucide-react";

export function SubmitApiModal({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    platform: "LeetCode",
    endpoint: "",
    docsUrl: "",
    maintainer: "",
    type: "REST",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs text-zinc-200">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100 font-sans">Submit a Free DSA / CP API</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-2 font-mono">
            <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-zinc-100 font-sans">API Submitted Successfully!</div>
            <p className="text-xs text-zinc-400">
              Our automated benchmark bots will check uptime, rate limits, and latency before indexing.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 text-xs font-mono">
            <div className="space-y-1">
              <label className="text-zinc-400">API / Project Name</label>
              <input
                type="text"
                placeholder="e.g. Codeforces Standings Streamer"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-zinc-400">Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-zinc-700"
                >
                  <option value="LeetCode">LeetCode</option>
                  <option value="Codeforces">Codeforces</option>
                  <option value="CodeChef">CodeChef</option>
                  <option value="GeeksforGeeks">GeeksforGeeks</option>
                  <option value="AtCoder">AtCoder</option>
                  <option value="HackerRank">HackerRank</option>
                  <option value="Aggregators">Aggregators</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-zinc-700"
                >
                  <option value="REST">REST</option>
                  <option value="GraphQL">GraphQL</option>
                  <option value="JSON API">JSON API</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400">Public Base Endpoint</label>
              <input
                type="url"
                placeholder="https://api.example.com/v1"
                required
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-400">Documentation / GitHub Repo URL</label>
              <input
                type="url"
                placeholder="https://github.com/username/repo"
                required
                value={formData.docsUrl}
                onChange={(e) => setFormData({ ...formData, docsUrl: e.target.value })}
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-zinc-700"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition font-mono"
              >
                Submit for Verification
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
