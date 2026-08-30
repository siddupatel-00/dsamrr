"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Copy,
  Check,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Share2,
  Eye,
  EyeOff,
} from "lucide-react";

type PlatformType = "leetcode" | "codeforces" | "geeksforgeeks" | "hackerrank" | "codechef" | "atcoder";

const PLATFORMS: { id: PlatformType; label: string; short: string; url: string; bioField: string }[] = [
  { id: "leetcode", label: "LeetCode", short: "LC", url: "https://leetcode.com/profile/", bioField: "About Me / Summary" },
  { id: "codeforces", label: "Codeforces", short: "CF", url: "https://codeforces.com/settings/social", bioField: "First Name or Organization" },
  { id: "geeksforgeeks", label: "GeeksforGeeks", short: "GFG", url: "https://www.geeksforgeeks.org/profile/edit", bioField: "Institute / Bio" },
  { id: "hackerrank", label: "HackerRank", short: "HR", url: "https://www.hackerrank.com/settings/profile", bioField: "About / Bio" },
  { id: "codechef", label: "CodeChef", short: "CC", url: "https://www.codechef.com/settings", bioField: "About Me / Name" },
  { id: "atcoder", label: "AtCoder", short: "AC", url: "https://atcoder.jp/settings", bioField: "Affiliation / Bio" },
];

function VerifySettingsContent() {
  const searchParams = useSearchParams();
  const paramUsername = searchParams ? searchParams.get("username") || "siddu" : "siddu";
  const paramPlatform = searchParams ? (searchParams.get("platform") as PlatformType) || "leetcode" : "leetcode";

  const [activeTab, setActiveTab] = useState<"platforms" | "socials" | "visibility">("platforms");

  // Platform verification states
  const [username, setUsername] = useState(paramUsername);
  const [platform, setPlatform] = useState<PlatformType>(paramPlatform);
  const [handle, setHandle] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [generatedToken, setGeneratedToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Socials states
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [savingSocials, setSavingSocials] = useState(false);
  const [socialsSaved, setSocialsSaved] = useState(false);
  const [socialsError, setSocialsError] = useState("");

  // Linked platforms & visibility
  const [userPlatforms, setUserPlatforms] = useState<any[]>([]);

  const fetchUserSettings = async () => {
    try {
      const res = await fetch("/api/users/settings");
      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.platforms) {
          setUserPlatforms(data.user.platforms);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchUserSettings();
  }, []);

  useEffect(() => {
    if (searchParams?.get("username")) {
      setUsername(searchParams.get("username")!);
    }
    if (searchParams?.get("platform")) {
      const p = searchParams.get("platform") as PlatformType;
      if (PLATFORMS.some((item) => item.id === p)) {
        setPlatform(p);
      }
    }
    if (searchParams?.get("tab") === "socials") {
      setActiveTab("socials");
    } else if (searchParams?.get("tab") === "visibility") {
      setActiveTab("visibility");
    }
  }, [searchParams]);

  const activePlatformConfig = PLATFORMS.find((p) => p.id === platform) || PLATFORMS[0];

  const handleTogglePlatformVisibility = async (platId: string, currentVisible: boolean) => {
    try {
      const nextVisible = !currentVisible;
      setUserPlatforms((prev) =>
        prev.map((p) => (p.platform === platId ? { ...p, isVisible: nextVisible ? 1 : 0 } : p))
      );

      await fetch("/api/accounts/visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: platId, isVisible: nextVisible }),
      });
    } catch (err) {
      fetchUserSettings();
    }
  };

  const handleGenerateToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!handle.trim()) return;

    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch("/api/accounts/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          platform,
          handle: handle.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.token && data.account) {
        setGeneratedToken(data.token);
        setAccountId(data.account.id);
        if (data.account.verifiedStatus === "verified") {
          setIsVerified(true);
        } else {
          setIsVerified(false);
        }
        setVerifyResult(null);
        setStep(2);
      } else {
        setVerifyResult({
          success: false,
          message: data.error || "Failed to generate token. Please check inputs.",
        });
      }
    } catch (err: any) {
      setVerifyResult({ success: false, message: err.message || "Network request failed" });
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(generatedToken);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (!accountId) return;
    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch("/api/accounts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsVerified(true);
        fetchUserSettings();
        setVerifyResult({
          success: true,
          message: `Verification complete! Linked @${handle} (${activePlatformConfig.label}) to ${username}.`,
        });
      } else {
        setVerifyResult({
          success: false,
          message: data.error || "Verification token not detected. Please verify token placement and retry.",
        });
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        message: err.message || "Verification request failed.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSocials(true);
    setSocialsError("");

    try {
      const res = await fetch("/api/users/socials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          twitterHandle: twitter.replace(/^@/, "").trim(),
          instagramHandle: instagram.replace(/^@/, "").trim(),
          linkedinHandle: linkedin.replace(/^@/, "").trim(),
          githubHandle: github.replace(/^@/, "").trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSocialsSaved(true);
        setTimeout(() => setSocialsSaved(false), 3000);
      } else {
        setSocialsError(data.error || "Failed to update socials");
      }
    } catch (err: any) {
      setSocialsError(err.message || "Failed to save social handles");
    } finally {
      setSavingSocials(false);
    }
  };

  const handleBack = () => {
    if (username) {
      window.location.href = `/u/${username}`;
    } else {
      window.history.back();
    }
  };

  return (
    <div
      onClick={handleBack}
      className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-start pt-4 pb-12 cursor-pointer px-4 font-sans"
    >
      <div className="w-full max-w-2xl space-y-6 cursor-default" onClick={(e) => e.stopPropagation()}>
        {/* Back button */}
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition font-mono cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>back to profile</span>
        </button>

        {/* Tabs Header */}
        <div className="flex items-center gap-2 border-b border-[#1f2128] pb-2 font-mono text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab("platforms")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold shrink-0 ${
              activeTab === "platforms"
                ? "bg-zinc-800 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            1. Verify Platforms
          </button>
          <button
            onClick={() => setActiveTab("visibility")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold shrink-0 ${
              activeTab === "visibility"
                ? "bg-zinc-800 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            2. Platform Visibility (Show / Hide)
          </button>
          <button
            onClick={() => setActiveTab("socials")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer font-bold shrink-0 ${
              activeTab === "socials"
                ? "bg-zinc-800 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            3. Social Accounts
          </button>
        </div>

        {activeTab === "visibility" ? (
          /* Platform Visibility Toggle Section */
          <div className="p-6 rounded-2xl bg-[#0e0f12] border border-[#1f2128] space-y-5 shadow-2xl font-mono">
            <div>
              <h1 className="text-lg font-bold text-zinc-100 font-sans">
                Platform Profile Visibility
              </h1>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Toggle platforms ON or OFF to control which verified accounts appear on your public profile.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {userPlatforms.filter((p) => p.verifiedStatus === "verified").length === 0 ? (
                <div className="p-6 rounded-xl bg-[#15171c] border border-[#262933] text-center text-zinc-500 text-xs">
                  You haven't verified any platforms yet. Verify a platform in tab 1 to manage its visibility.
                </div>
              ) : (
                userPlatforms
                  .filter((p) => p.verifiedStatus === "verified")
                  .map((p) => {
                    const isVis = p.isVisible !== 0;
                    const platConfig = PLATFORMS.find((item) => item.id === p.platform);

                    return (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl bg-[#15171c] border border-[#262933] flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-200 font-mono">
                            {platConfig?.short || p.platform.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-zinc-200 font-sans flex items-center gap-2">
                              <span>{platConfig?.label || p.platform}</span>
                              <span className="text-[10px] text-emerald-400 font-mono">@{p.username}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 font-sans mt-0.5">
                              {isVis ? "Visible on your public profile" : "Hidden from your public profile"}
                            </div>
                          </div>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleTogglePlatformVisibility(p.platform, isVis)}
                          className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer flex items-center shrink-0 ${
                            isVis ? "bg-emerald-500 justify-end" : "bg-zinc-700 justify-start"
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-md transition-transform" />
                        </button>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="pt-2">
              <Link
                href={`/u/${username}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono transition"
              >
                <span>View Updated Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : activeTab === "socials" ? (
          /* Social Accounts Configuration */
          <div className="p-6 rounded-2xl bg-[#0e0f12] border border-[#1f2128] space-y-5 shadow-2xl font-mono">
            <div>
              <h1 className="text-lg font-bold text-zinc-100 font-sans">
                Social Accounts
              </h1>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Add your official handles to display on your DSAMRR profile card.
              </p>
            </div>

            <form onSubmit={handleSaveSocials} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-zinc-300 font-medium flex items-center gap-1.5 font-sans">
                  <span className="font-bold text-zinc-300">𝕏</span>
                  <span>X / Twitter Handle</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                  <input
                    type="text"
                    placeholder="username"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-emerald-500/80"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium flex items-center gap-1.5 font-sans">
                  <span className="font-bold text-pink-400">IG</span>
                  <span>Instagram Handle</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                  <input
                    type="text"
                    placeholder="username"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-emerald-500/80"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium flex items-center gap-1.5 font-sans">
                  <span className="font-bold text-sky-400">in</span>
                  <span>LinkedIn Username</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">in/</span>
                  <input
                    type="text"
                    placeholder="username"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-emerald-500/80"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-medium flex items-center gap-1.5 font-sans">
                  <span className="font-bold text-zinc-300">gh</span>
                  <span>GitHub Username</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">@</span>
                  <input
                    type="text"
                    placeholder="username"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 focus:outline-none focus:border-emerald-500/80"
                  />
                </div>
              </div>

              {socialsSaved && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Social handles saved successfully!</span>
                </div>
              )}

              {socialsError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
                  {socialsError}
                </div>
              )}

              <button
                type="submit"
                disabled={savingSocials}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition font-mono flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                {savingSocials ? (
                  <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Save Social Accounts</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Platform Verification Section */
          <div className="p-6 rounded-2xl bg-[#0e0f12] border border-[#1f2128] space-y-6 shadow-2xl font-mono">
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-zinc-100 font-sans">
                Verify Competitive Programming Handles
              </h1>
              <p className="text-xs text-zinc-400 font-sans">
                Authenticate your ownership of LeetCode, Codeforces, GeeksforGeeks, HackerRank, CodeChef, and AtCoder accounts.
              </p>
            </div>

            {/* Platform Selector Grid */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-300 font-semibold uppercase tracking-wider block">
                1. Select Platform
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PLATFORMS.map((p) => {
                  const active = platform === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPlatform(p.id);
                        setStep(1);
                        setVerifyResult(null);
                      }}
                      className={`py-2 px-2 rounded-xl border text-xs font-mono transition flex flex-col items-center gap-1 cursor-pointer ${
                        active
                          ? "bg-zinc-800 border-zinc-600 text-white font-bold shadow-sm"
                          : "bg-[#15171c] border-[#262933] text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                        {p.short}
                      </span>
                      <span className="text-[11px] truncate w-full text-center">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 1: Input Handle */}
            {step === 1 && (
              <form onSubmit={handleGenerateToken} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-300 font-semibold uppercase tracking-wider block">
                    2. Enter your {activePlatformConfig.label} Handle
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder={`e.g. ${activePlatformConfig.id === "leetcode" ? "tourist" : "coder123"}`}
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#15171c] border border-[#262933] text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-600"
                    />
                    <button
                      type="submit"
                      disabled={verifying || !handle.trim()}
                      className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {verifying ? "Generating..." : "Generate Code"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Step 2: Verification Instructions */}
            {step === 2 && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 rounded-xl bg-[#15171c] border border-[#262933] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200">
                      Verification Code for @{handle} ({activePlatformConfig.label})
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[10px] text-zinc-400 hover:underline cursor-pointer"
                    >
                      Change Handle
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-emerald-400 font-mono text-sm tracking-wider select-all font-bold">
                      {generatedToken}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="px-3 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  <div className="text-xs text-zinc-400 space-y-1 pt-1 font-sans">
                    <div>
                      1. Open your{" "}
                      <a
                        href={activePlatformConfig.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>{activePlatformConfig.label} Profile Settings</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div>
                      2. Paste the code above into your{" "}
                      <span className="text-zinc-200 font-bold">{activePlatformConfig.bioField}</span> and click Save.
                    </div>
                    <div>3. Click the Verify button below to complete verification.</div>
                  </div>
                </div>

                {isVerified ? (
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Account is verified & active on leaderboard!</span>
                    </div>
                    <Link
                      href={`/u/${username}`}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition"
                    >
                      Done • View Profile
                    </Link>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={verifying}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {verifying ? (
                      <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify {activePlatformConfig.label} Account</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Feedback messages */}
            {verifyResult && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  verifyResult.success
                    ? "bg-emerald-950/40 border border-emerald-800 text-emerald-300"
                    : "bg-rose-950/40 border border-rose-800 text-rose-300"
                }`}
              >
                {verifyResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="font-sans leading-relaxed">{verifyResult.message}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifySettingsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-zinc-500">Loading settings...</div>}>
      <VerifySettingsContent />
    </Suspense>
  );
}
