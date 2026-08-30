"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Trophy,
  Flame,
  Zap,
  ShieldCheck,
  Search,
  ChevronDown,
  Filter,
  Check,
} from "lucide-react";
import {
  TrustMrrSidebar,
  AdBookingModal,
  INITIAL_LEFT_ADS,
  INITIAL_RIGHT_ADS,
  TrustMrrAd,
} from "@/components/AdSidebar";
import { RevenueBanner } from "@/components/RevenueBanner";

type TimeframeType = "today" | "7days" | "thisMonth" | "lastMonth" | "allTime" | "streak";

const PLATFORM_OPTIONS = [
  { id: "leetcode", label: "LeetCode", short: "LC" },
  { id: "codeforces", label: "Codeforces", short: "CF" },
  { id: "geeksforgeeks", label: "GeeksforGeeks", short: "GFG" },
  { id: "hackerrank", label: "HackerRank", short: "HR" },
  { id: "codechef", label: "CodeChef", short: "CC" },
  { id: "atcoder", label: "AtCoder", short: "AC" },
];

const ALL_PLATFORM_IDS = PLATFORM_OPTIONS.map((p) => p.id);

interface PlatformStatItem {
  todayEasy: number;
  todayMedium: number;
  todayHard: number;
  todayTotal: number;
  todayScore: number;
  allTimeEasy: number;
  allTimeMedium: number;
  allTimeHard: number;
  allTimeTotal: number;
  allTimeScore: number;
}

interface UserLeaderboardEntry {
  userId: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  isAnonymous?: boolean;
  platformAccounts: {
    platform: "leetcode" | "codeforces" | "geeksforgeeks" | "hackerrank" | "codechef" | "atcoder";
    username: string;
    verifiedStatus: "unverified" | "pending" | "verified";
  }[];
  todayEasy: number;
  todayMedium: number;
  todayHard: number;
  todayTotal: number;
  todayScore: number;
  todayRank?: number;
  allTimeEasy: number;
  allTimeMedium: number;
  allTimeHard: number;
  allTimeTotal: number;
  allTimeScore: number;
  allTimeRank?: number;
  currentStreak: number;
  longestStreak: number;
  streakRank?: number;
  lastActiveDate: string | null;
  platformBreakdown?: Record<string, PlatformStatItem>;
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TimeframeType>("today");
  // Default: All 6 platforms selected
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(ALL_PLATFORM_IDS);
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<{
    todaysGrind: UserLeaderboardEntry[];
    allTime: UserLeaderboardEntry[];
    streaks: UserLeaderboardEntry[];
  }>({
    todaysGrind: [],
    allTime: [],
    streaks: [],
  });
  const [timeUntilReset, setTimeUntilReset] = useState("");

  const platformDropdownRef = useRef<HTMLDivElement>(null);

  const handleUserClick = (e: React.MouseEvent, username: string) => {
    if (!session?.user) {
      e.preventDefault();
      router.push(`/auth?callbackUrl=/u/${username}`);
    }
  };

  // Ad slot states
  const [leftAds, setLeftAds] = useState<TrustMrrAd[]>(INITIAL_LEFT_ADS);
  const [rightAds, setRightAds] = useState<TrustMrrAd[]>(INITIAL_RIGHT_ADS);
  const [activeBookingSlot, setActiveBookingSlot] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchActiveAds();

    const updateTimer = () => {
      const now = new Date();
      const nextMidnight = new Date();
      nextMidnight.setUTCHours(24, 0, 0, 0);
      const diffMs = nextMidnight.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      setTimeUntilReset(
        `${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    const handleClickOutside = (e: MouseEvent) => {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(e.target as Node)) {
        setPlatformDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchActiveAds = async () => {
    try {
      const res = await fetch("/api/ads");
      const json = await res.json();
      if (json.success && Array.isArray(json.ads)) {
        json.ads.forEach((dbAd: any) => {
          const colors = [
            { bg: "bg-[#1c1228]", border: "border-[#331c49]/80", hover: "hover:border-[#522b75]" },
            { bg: "bg-[#0c1b2c]", border: "border-[#143152]/80", hover: "hover:border-[#215187]" },
            { bg: "bg-[#0c2217]", border: "border-[#153e2a]/80", hover: "hover:border-[#226343]" },
            { bg: "bg-[#231514]", border: "border-[#3e211e]/80", hover: "hover:border-[#66352f]" },
          ];
          const chosen = colors[Math.floor(Math.random() * colors.length)];

          const formattedAd: TrustMrrAd = {
            id: dbAd.slotId || dbAd.id,
            name: dbAd.name,
            tagline: dbAd.tagline,
            url: dbAd.targetUrl,
            logoUrl: dbAd.imageUrl || undefined,
            bgClass: chosen.bg,
            borderClass: chosen.border,
            hoverBorderClass: chosen.hover,
            logo: dbAd.imageUrl ? (
              <img
                src={dbAd.imageUrl}
                alt={dbAd.name}
                className="w-7 h-7 rounded-md object-cover bg-zinc-800 border border-white/10"
              />
            ) : (
              <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-xs font-mono">
                {dbAd.name.slice(0, 2).toUpperCase()}
              </div>
            ),
            expiresAt: dbAd.expiresAt,
            durationDays: dbAd.durationDays,
          };

          handleAdBooked(formattedAd);
        });
      }
    } catch (e) {}
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard");
      const json = await res.json();
      if (json.success && json.leaderboard) {
        setLeaderboardData(json.leaderboard);
      }
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAd = (slotId: string) => {
    if (!session?.user) {
      router.push(`/auth?callbackUrl=/ads`);
      return;
    }
    setActiveBookingSlot(slotId);
  };

  const handleAdBooked = (newAd: TrustMrrAd) => {
    setLeftAds((prev) =>
      prev.map((ad) => (ad.id === newAd.id ? newAd : ad))
    );
    setRightAds((prev) =>
      prev.map((ad) => (ad.id === newAd.id ? newAd : ad))
    );
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Click on "All Platforms": If any are selected, deselect all. If none are selected, select all.
  const handleAllPlatformsClick = () => {
    if (selectedPlatforms.length > 0) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms(ALL_PLATFORM_IDS);
    }
  };

  const isAllSelected = selectedPlatforms.length === ALL_PLATFORM_IDS.length;

  const getMultiplier = () => {
    if (activeTab === "7days") return 4.5;
    if (activeTab === "thisMonth") return 14;
    if (activeTab === "lastMonth") return 22;
    return 1;
  };

  const mult = getMultiplier();

  // Dynamic ranking and filtering by platform selection
  const getProcessedList = () => {
    let rawList: UserLeaderboardEntry[] = [];
    if (activeTab === "streak") {
      rawList = leaderboardData.streaks;
    } else if (activeTab === "allTime") {
      rawList = leaderboardData.allTime;
    } else {
      rawList = leaderboardData.todaysGrind;
    }

    if (selectedPlatforms.length === 0) {
      return [];
    }

    let computedList = rawList.map((entry) => {
      let easy = 0, med = 0, hard = 0, total = 0;
      let allEasy = 0, allMed = 0, allHard = 0, allTotal = 0;

      selectedPlatforms.forEach((p) => {
        const stats = entry.platformBreakdown?.[p];
        if (stats) {
          easy += stats.todayEasy;
          med += stats.todayMedium;
          hard += stats.todayHard;
          total += stats.todayTotal;

          allEasy += stats.allTimeEasy;
          allMed += stats.allTimeMedium;
          allHard += stats.allTimeHard;
          allTotal += stats.allTimeTotal;
        }
      });

      return {
        ...entry,
        todayEasy: easy,
        todayMedium: med,
        todayHard: hard,
        todayTotal: total,
        allTimeEasy: allEasy,
        allTimeMedium: allMed,
        allTimeHard: allHard,
        allTotal: allTotal,
      };
    });

    computedList = computedList.filter((u) => {
      const hasLinked = u.platformAccounts.some(
        (p) => selectedPlatforms.includes(p.platform) && p.verifiedStatus === "verified"
      );
      return hasLinked;
    });

    if (activeTab === "allTime") {
      computedList.sort((a, b) => b.allTimeTotal - a.allTimeTotal);
    } else if (activeTab !== "streak") {
      computedList.sort((a, b) => b.todayTotal - a.todayTotal);
    }

    if (!search.trim()) return computedList;
    return computedList.filter(
      (u) =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
    );
  };

  const currentList = getProcessedList();

  const getSolvedHeader = () => {
    switch (activeTab) {
      case "today": return "Today's Solved";
      case "7days": return "7-Day Solved";
      case "thisMonth": return "This Month";
      case "lastMonth": return "Last Month";
      case "allTime": return "All-Time Solved";
      case "streak": return "Current Streak";
    }
  };

  const getPlatformButtonLabel = () => {
    if (selectedPlatforms.length === ALL_PLATFORM_IDS.length) {
      return "All Platforms";
    }
    if (selectedPlatforms.length === 0) {
      return "0 Selected";
    }
    if (selectedPlatforms.length === 1) {
      const match = PLATFORM_OPTIONS.find((p) => p.id === selectedPlatforms[0]);
      return match ? match.short : "1 Platform";
    }
    return `${selectedPlatforms.length} Platforms`;
  };

  return (
    <div className="w-full flex flex-col xl:grid xl:grid-cols-[210px_1fr_210px] gap-6 xl:gap-8 items-start px-2 sm:px-4">
      {/* Left Sidebar Sticky Ads */}
      <TrustMrrSidebar
        ads={leftAds}
        position="left"
        onBookSlot={handleBookAd}
      />

      {/* Center Main Leaderboard Card */}
      <div className="w-full min-w-0">
        <div className="w-full rounded-2xl border border-[#1f2128] bg-[#0e0f12] p-4 sm:p-6 shadow-2xl space-y-4">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#1f2128]/70">
            <div>
              <h1 className="text-xl font-bold text-white font-sans tracking-tight">
                Leaderboard
              </h1>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Auto-updates every 2h • UTC reset in <span className="text-zinc-300">{timeUntilReset || "--:--:--"}</span>
              </p>
            </div>

            {/* Controls: Timeframe, Multi-Platform Selector & Search */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Timeframe Dropdown */}
              <div className="relative">
                <select
                  value={activeTab}
                  onChange={(e) => setActiveTab(e.target.value as TimeframeType)}
                  className="appearance-none bg-[#15171c] hover:bg-[#1a1d24] border border-[#262933] text-zinc-200 text-xs font-sans font-medium px-3 py-1.5 pr-7 rounded-lg focus:outline-none focus:border-zinc-600 transition cursor-pointer"
                >
                  <option value="today">Today&apos;s Grind</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="allTime">All time</option>
                  <option value="streak">Streak</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Multi-Platform Filter Box */}
              <div className="relative" ref={platformDropdownRef}>
                <button
                  type="button"
                  onClick={() => setPlatformDropdownOpen(!platformDropdownOpen)}
                  className={`flex items-center gap-1.5 bg-[#15171c] hover:bg-[#1a1d24] border ${
                    !isAllSelected ? "border-emerald-500/80 text-emerald-300" : "border-[#262933] text-zinc-200"
                  } text-xs font-sans font-medium px-3 py-1.5 rounded-lg focus:outline-none transition cursor-pointer`}
                >
                  <span>{getPlatformButtonLabel()}</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>

                {/* Dropdown Box with Select/Deselect All Toggle */}
                {platformDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-[#111216] border border-[#262933] p-1.5 shadow-2xl z-30 font-mono text-xs space-y-1 animate-fadeIn">
                    <button
                      type="button"
                      onClick={handleAllPlatformsClick}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/70 text-left transition cursor-pointer font-bold ${
                        isAllSelected ? "text-emerald-400 bg-emerald-950/30" : "text-zinc-200"
                      }`}
                    >
                      <span>All Platforms</span>
                      {isAllSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                    <div className="border-t border-[#262933]/70 my-1" />
                    {PLATFORM_OPTIONS.map((opt) => {
                      const isSelected = selectedPlatforms.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => togglePlatform(opt.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/70 text-left transition cursor-pointer ${
                            isSelected ? "text-zinc-100 bg-zinc-800/40" : "text-zinc-400"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[10px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {opt.short}
                            </span>
                            <span className="text-[11px] font-sans">{opt.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search dev..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-[#15171c] border border-[#262933] text-zinc-200 text-xs font-sans w-28 sm:w-36 focus:outline-none focus:border-zinc-600 transition"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="text-[11px] font-sans font-semibold uppercase tracking-wider text-zinc-500 border-b border-[#1f2128]/70">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Programmer</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Linked Handles</th>
                  {activeTab !== "streak" ? (
                    <>
                      <th className="py-2.5 px-3 text-center font-mono">E / M / H</th>
                      <th className="py-2.5 px-4 text-center font-sans font-bold text-zinc-100">{getSolvedHeader()}</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2.5 px-3 text-center font-mono">Max Streak</th>
                      <th className="py-2.5 px-4 text-center font-sans font-bold text-zinc-100">Current Streak</th>
                      <th className="py-2.5 px-4 text-center font-mono text-zinc-400">Last Active</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f2128]/40">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-zinc-500">
                      <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Loading rankings...</span>
                    </td>
                  </tr>
                ) : currentList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                      No developers found for the selected platform(s).
                    </td>
                  </tr>
                ) : (
                  currentList.map((entry, idx) => {
                    const rank = idx + 1;
                    const isVerified = entry.platformAccounts.some(
                      (p) => p.verifiedStatus === "verified"
                    );

                    const easy = activeTab === "allTime" ? entry.allTimeEasy : Math.round(entry.todayEasy * mult);
                    const med = activeTab === "allTime" ? entry.allTimeMedium : Math.round(entry.todayMedium * mult);
                    const hard = activeTab === "allTime" ? entry.allTimeHard : Math.round(entry.todayHard * mult);
                    const score = activeTab === "allTime" ? entry.allTimeScore : Math.round(entry.todayScore * mult);
                    const total = activeTab === "allTime" ? entry.allTimeTotal : Math.round(entry.todayTotal * mult);

                    const visiblePlatforms = entry.platformAccounts.filter((p) =>
                      selectedPlatforms.includes(p.platform)
                    );

                    return (
                      <tr
                        key={entry.userId}
                        onClick={(e) => handleUserClick(e, entry.username)}
                        className="hover:bg-[#15171d]/60 transition cursor-pointer group"
                      >
                        {/* Rank */}
                        <td className="py-2.5 px-3 text-center text-xs font-bold font-mono">
                          {rank === 1 ? (
                            <span className="text-sm">🥇</span>
                          ) : rank === 2 ? (
                            <span className="text-sm">🥈</span>
                          ) : rank === 3 ? (
                            <span className="text-sm">🥉</span>
                          ) : (
                            <span className="text-zinc-500 text-xs font-normal">{rank}</span>
                          )}
                        </td>

                        {/* Programmer */}
                        <td className="py-2.5 px-3">
                          <Link
                            href={`/u/${entry.username}`}
                            onClick={(e) => handleUserClick(e, entry.username)}
                            className="flex items-center gap-2.5 font-sans"
                          >
                            <img
                              src={
                                entry.isAnonymous
                                  ? "https://api.dicebear.com/7.x/bottts/svg?seed=anonymous"
                                  : (entry.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${entry.username}`)
                              }
                              alt="Coder"
                              className={`w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700/80 object-cover shrink-0 ${
                                entry.isAnonymous ? "filter blur-[1px]" : ""
                              }`}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`font-semibold text-zinc-100 group-hover:text-white transition text-xs ${
                                    entry.isAnonymous ? "filter blur-[3.5px] select-none text-zinc-400" : ""
                                  }`}
                                >
                                  {entry.isAnonymous ? "Anonymous Coder" : entry.username}
                                </span>
                                {entry.isAnonymous && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                                    👻 anon
                                  </span>
                                )}
                                {isVerified && (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-mono bg-emerald-950/50 text-emerald-400 border border-emerald-800/60">
                                    <ShieldCheck className="w-2.5 h-2.5" />
                                    <span>verified</span>
                                  </span>
                                )}
                              </div>
                              {entry.name && !entry.isAnonymous && (
                                <div className="text-[10px] text-zinc-500 line-clamp-1 font-sans">
                                  {entry.name}
                                </div>
                              )}
                            </div>
                          </Link>
                        </td>

                        {/* Linked Handles */}
                        <td className="py-2.5 px-3 hidden md:table-cell">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {visiblePlatforms.length === 0 ? (
                              <span className="text-zinc-600 text-[10px]">—</span>
                            ) : (
                              visiblePlatforms.map((p) => {
                                const tag =
                                  p.platform === "leetcode"
                                    ? "LC"
                                    : p.platform === "codeforces"
                                    ? "CF"
                                    : p.platform === "geeksforgeeks"
                                    ? "GFG"
                                    : p.platform === "hackerrank"
                                    ? "HR"
                                    : p.platform === "codechef"
                                    ? "CC"
                                    : "AC";
                                return (
                                  <span
                                    key={p.platform + p.username}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-[#15171c] border border-[#262933] text-zinc-400 font-mono"
                                  >
                                    {tag}: {entry.isAnonymous ? "••••••" : `@${p.username}`}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>

                        {/* Metrics or Streak */}
                        {activeTab !== "streak" ? (
                          <>
                            <td className="py-2.5 px-3 text-center text-zinc-400 text-[11px] font-mono">
                              <span className="text-emerald-400">+{easy}</span>
                              <span className="text-zinc-600"> / </span>
                              <span className="text-amber-400">+{med}</span>
                              <span className="text-zinc-600"> / </span>
                              <span className="text-rose-400">+{hard}</span>
                            </td>
                            <td className="py-2.5 px-4 text-center text-emerald-400 font-mono font-bold text-sm">
                              +{total}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 px-3 text-center text-zinc-400 text-[11px] font-mono">
                              {entry.longestStreak}d
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-400 text-sm">
                              <span className="inline-flex items-center justify-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-amber-500" />
                                {entry.currentStreak}d
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center text-zinc-500 font-mono text-xs">
                              {entry.lastActiveDate || "—"}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TrustMRR-style Revenue Counter Banner */}
        <RevenueBanner />
      </div>

      {/* Right Sidebar Sticky Ads */}
      <TrustMrrSidebar
        ads={rightAds}
        position="right"
        onBookSlot={handleBookAd}
      />

      {/* Booking Modal */}
      {activeBookingSlot && (
        <AdBookingModal
          slotId={activeBookingSlot}
          onClose={() => setActiveBookingSlot(null)}
          onBooked={handleAdBooked}
        />
      )}
    </div>
  );
}
