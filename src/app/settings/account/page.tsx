"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Mail,
  Trash2,
  Check,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

function AccountSettingsContent() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    const fetchLatestSettings = async () => {
      try {
        const res = await fetch("/api/users/settings");
        const data = await res.json();
        if (data.success && data.user) {
          setUsername(data.user.username || "");
          setEmail(data.user.email || "");
          setName(data.user.name || data.user.username || "");
          setIsAnonymous(Boolean(data.user.isAnonymous));
        } else if (session?.user) {
          const u = (session.user as any).username || session.user.name || "";
          setUsername(u);
          setEmail(session.user.email || "");
          setName(session.user.name || u);
        }
      } catch (e) {
        if (session?.user) {
          const u = (session.user as any).username || session.user.name || "";
          setUsername(u);
          setEmail(session.user.email || "");
          setName(session.user.name || u);
        }
      }
    };

    fetchLatestSettings();
  }, [session]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSavedMsg("");

    try {
      const res = await fetch("/api/users/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          name: name.trim(),
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSavedMsg("Settings updated successfully!");
        if (update) {
          await update();
        }
        router.refresh();
        setTimeout(() => setSavedMsg(""), 3000);
      } else {
        setErrorMsg(data.error || "Failed to update settings.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== "delete my account") return;
    setDeleting(true);

    try {
      const res = await fetch("/api/users/settings", {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        signOut({ callbackUrl: "/" });
      } else {
        setErrorMsg(data.error || "Failed to delete account.");
        setDeleting(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete account.");
      setDeleting(false);
    }
  };

  if (status === "loading") {
    return <div className="py-20 text-center text-zinc-500 font-mono">Loading settings...</div>;
  }

  if (!session || !session.user) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 font-mono">
        <p className="text-zinc-400">Please sign in to manage account settings.</p>
        <Link
          href="/auth"
          className="inline-flex px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const handleBack = () => {
    if (username) {
      router.push(`/u/${username}`);
    } else {
      router.back();
    }
  };

  return (
    <div
      onClick={handleBack}
      className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-start pt-4 pb-16 font-sans cursor-pointer px-4"
    >
      <div className="w-full max-w-2xl space-y-4 cursor-default" onClick={(e) => e.stopPropagation()}>
        {/* Back button */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition font-mono cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>back to profile</span>
        </button>

        <div className="p-6 sm:p-8 rounded-2xl bg-[#0e0f12] border border-[#1f2128] space-y-6 shadow-2xl">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Account Settings
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage your DSAMRR account details, username, email, and preferences.
            </p>
          </div>

          {/* Update Form */}
          <form onSubmit={handleUpdate} className="space-y-4 text-xs font-mono">
          <div className="space-y-1.5">
            <label className="text-zinc-300 font-medium flex items-center gap-1.5 font-sans">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              <span>Username</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-emerald-500/80 transition"
              />
            </div>
            <p className="text-[11px] text-zinc-500 font-sans">
              Your profile will be available at /u/{username || "..."}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-zinc-300 font-medium flex items-center gap-1.5 font-sans">
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-emerald-500/80 transition"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-zinc-300 font-medium flex items-center gap-1.5 font-sans">
                <span>Display Name</span>
              </label>
              <label className="flex items-center gap-1.5 text-[11px] font-sans text-zinc-400 hover:text-zinc-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={name === username}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setName(username);
                    }
                  }}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span>Same as username</span>
              </label>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-emerald-500/80 transition"
            />
          </div>

          {/* Anonymous / Ghost Mode Toggle */}
          <div className="p-4 rounded-xl bg-[#15171c] border border-[#262933] flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-zinc-200 font-sans flex items-center gap-1.5">
                <span>👻 Anonymous / Ghost Mode</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                Stay on the leaderboard with your username blurred and external coding profile links disabled/unclickable.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer flex items-center shrink-0 ${
                isAnonymous ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
            </button>
          </div>

          {savedMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-sans">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{savedMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-sans">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition font-mono flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Save Account Changes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Danger Zone: Delete Account */}
        <div className="pt-6 border-t border-rose-950/50 space-y-3">
          <div>
            <h2 className="text-sm font-bold text-rose-400 font-sans flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 font-sans">
              Permanently delete your account, linked coding platform verifications, snapshots, and streaks.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 font-bold text-xs font-mono transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono animate-fadeIn">
          <div className="bg-[#0c0d11] border border-rose-900/70 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold font-sans text-white">
                Permanently Delete Account?
              </h3>
            </div>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              This action cannot be undone. All your verified handles, leaderboard standings, snapshots, and records will be deleted forever.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="text-zinc-400">
                Type <span className="text-rose-400 font-bold">delete my account</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="delete my account"
                className="w-full px-3 py-2 rounded-lg bg-[#15171c] border border-rose-900/60 text-zinc-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setConfirmText("");
                }}
                className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmText !== "delete my account" || deleting}
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              >
                {deleting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Delete Forever</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function AccountSettingsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-zinc-500">Loading settings...</div>}>
      <AccountSettingsContent />
    </Suspense>
  );
}
