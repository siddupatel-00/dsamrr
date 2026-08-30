"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Share2, ArrowRight } from "lucide-react";

export function EditSocialsModal({
  initialSocials,
  onClose,
}: {
  initialSocials: {
    twitterHandle?: string | null;
    instagramHandle?: string | null;
    linkedinHandle?: string | null;
    githubHandle?: string | null;
    showTwitter?: boolean | number;
    showInstagram?: boolean | number;
    showLinkedin?: boolean | number;
    showGithub?: boolean | number;
  };
  onClose: () => void;
}) {
  const router = useRouter();
  const [twitter, setTwitter] = useState(initialSocials.twitterHandle || "");
  const [instagram, setInstagram] = useState(initialSocials.instagramHandle || "");
  const [linkedin, setLinkedin] = useState(initialSocials.linkedinHandle || "");
  const [github, setGithub] = useState(initialSocials.githubHandle || "");

  const [showTwitter, setShowTwitter] = useState(initialSocials.showTwitter !== 0 && initialSocials.showTwitter !== false);
  const [showInstagram, setShowInstagram] = useState(initialSocials.showInstagram !== 0 && initialSocials.showInstagram !== false);
  const [showLinkedin, setShowLinkedin] = useState(initialSocials.showLinkedin !== 0 && initialSocials.showLinkedin !== false);
  const [showGithub, setShowGithub] = useState(initialSocials.showGithub !== 0 && initialSocials.showGithub !== false);

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/users/socials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twitterHandle: twitter.replace(/^@/, "").trim(),
          instagramHandle: instagram.replace(/^@/, "").trim(),
          linkedinHandle: linkedin.replace(/^@/, "").trim(),
          githubHandle: github.replace(/^@/, "").trim(),
          showTwitter,
          showInstagram,
          showLinkedin,
          showGithub,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaved(true);
        router.refresh();
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setErrorMsg(data.error || "Failed to update socials");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update socials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono">
      <div className="bg-[#0c0d11] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <Share2 className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-zinc-100 font-sans">
              Edit Social Accounts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {saved ? (
          <div className="py-8 text-center space-y-2 font-sans">
            <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <div className="font-bold text-white text-sm">Socials Updated!</div>
            <p className="text-xs text-zinc-400">
              Your profile social links have been updated successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs font-mono">
            {/* X / Twitter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-zinc-400 flex items-center gap-1.5 font-sans">
                  <span className="font-bold text-zinc-300">𝕏</span>
                  <span>X / Twitter</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowTwitter(!showTwitter)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer flex items-center ${
                    showTwitter ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-emerald-500/80"
                />
              </div>
            </div>

            {/* Instagram */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-zinc-400 flex items-center gap-1.5 font-sans">
                  <span className="font-bold text-pink-400">IG</span>
                  <span>Instagram</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowInstagram(!showInstagram)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer flex items-center ${
                    showInstagram ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-emerald-500/80"
                />
              </div>
            </div>

            {/* LinkedIn */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-zinc-400 flex items-center gap-1.5 font-sans">
                  <span className="font-bold text-sky-400">in</span>
                  <span>LinkedIn</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowLinkedin(!showLinkedin)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer flex items-center ${
                    showLinkedin ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">in/</span>
                <input
                  type="text"
                  placeholder="username"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-emerald-500/80"
                />
              </div>
            </div>

            {/* GitHub */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-zinc-400 flex items-center gap-1.5 font-sans">
                  <span className="font-bold text-zinc-300">gh</span>
                  <span>GitHub</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowGithub(!showGithub)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer flex items-center ${
                    showGithub ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-emerald-500/80"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition font-mono flex items-center justify-center gap-1.5 shadow-md cursor-pointer mt-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Save Social Accounts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
