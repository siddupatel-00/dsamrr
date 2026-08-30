import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ShieldCheck,
  ShieldAlert,
  Flame,
  ExternalLink,
  ArrowLeft,
  Lock,
  Plus,
  RotateCw,
} from "lucide-react";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { users, platformAccounts, dailySnapshots, streaks } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ProfileSocialsCard } from "@/components/ProfileSocialsCard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    username: string;
  };
}

const SUPPORTED_PLATFORMS = [
  { id: "leetcode", name: "LeetCode", short: "LC", urlPrefix: "https://leetcode.com/" },
  { id: "codeforces", name: "Codeforces", short: "CF", urlPrefix: "https://codeforces.com/profile/" },
  { id: "geeksforgeeks", name: "GeeksforGeeks", short: "GFG", urlPrefix: "https://auth.geeksforgeeks.org/user/" },
  { id: "hackerrank", name: "HackerRank", short: "HR", urlPrefix: "https://hackerrank.com/" },
  { id: "codechef", name: "CodeChef", short: "CC", urlPrefix: "https://www.codechef.com/users/" },
  { id: "atcoder", name: "AtCoder", short: "AC", urlPrefix: "https://atcoder.jp/users/" },
];

export default async function UserProfilePage({ params }: PageProps) {
  await initDb();
  const { username } = params;

  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;

  if (!sessionUser) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0c0d11] border border-[#1f2128] rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center mx-auto text-emerald-400">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white font-sans">
              Sign Up to View Profiles
            </h1>
            <p className="text-xs text-zinc-400 font-sans leading-relaxed">
              Create a free DSAMRR account to explore verified proof-of-work, competitive programming stats, and daily solve streaks of other developers.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <Link
              href={`/auth?callbackUrl=/u/${username}`}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition font-sans flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
            >
              <span>Sign Up with Email (Free)</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </Link>
            <Link
              href="/"
              className="inline-block text-xs text-zinc-500 hover:text-zinc-300 font-mono"
            >
              &larr; Back to Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let [user] = await db.select().from(users).where(eq(users.username, username));
  if (!user) {
    const newUserId = `user_${username.toLowerCase()}`;
    try {
      await db.insert(users).values({
        id: newUserId,
        username,
        name: username,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      });
      [user] = await db.select().from(users).where(eq(users.username, username));
    } catch (e) {
      [user] = await db.select().from(users).where(eq(users.username, username));
    }
  }

  if (!user) {
    user = {
      id: `user_${username}`,
      username,
      name: username,
      email: null,
      passwordHash: null,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      isAnonymous: 0,
      twitterHandle: null,
      instagramHandle: null,
      linkedinHandle: null,
      githubHandle: null,
      showTwitter: 1,
      showInstagram: 1,
      showLinkedin: 1,
      showGithub: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // STRICT PRIVACY CHECK: Only the verified owner of this profile can see editing/linking controls
  const isOwner = Boolean(
    sessionUser &&
    (sessionUser.username === user.username ||
      sessionUser.email === user.email ||
      sessionUser.id === user.id)
  );

  const [accounts, snapshots, [streak]] = await Promise.all([
    db.select().from(platformAccounts).where(eq(platformAccounts.userId, user.id)),
    db.select().from(dailySnapshots).where(eq(dailySnapshots.userId, user.id)).orderBy(desc(dailySnapshots.date)),
    db.select().from(streaks).where(eq(streaks.userId, user.id)),
  ]);

  // Compute total score and total solved across all linked platforms
  let totalScore = 0;
  let totalSolved = 0;

  SUPPORTED_PLATFORMS.forEach((p) => {
    const snap = snapshots.find((s) => s.platform === p.id);
    if (snap) {
      totalScore += snap.score;
      totalSolved += snap.totalSolved;
    }
  });

  const isVerified = accounts.some((a) => a.verifiedStatus === "verified");

  // Format Founded / Joined Date
  const createdDate = user.createdAt ? new Date(user.createdAt) : new Date();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const joinedMonthYear = `${monthNames[createdDate.getUTCMonth()]} ${createdDate.getUTCFullYear()}`;

  // Monthly stats from snapshots
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const thisMonthSnapshots = snapshots.filter((s) => s.date.startsWith(currentMonthPrefix));
  const thisMonthSolved = thisMonthSnapshots.reduce((acc, curr) => acc + (curr.totalSolved || 0), 0);

  // Helper for 14-day lockout
  const getLockoutInfo = (acc?: typeof platformAccounts.$inferSelect) => {
    if (!acc || acc.verifiedStatus !== "verified" || !acc.verifiedAt) {
      return { isLocked: false, daysRemaining: 0 };
    }
    const verifiedTime = new Date(acc.verifiedAt).getTime();
    const nowTime = Date.now();
    const diffDays = (nowTime - verifiedTime) / (1000 * 60 * 60 * 24);
    if (diffDays < 14) {
      return {
        isLocked: true,
        daysRemaining: Math.ceil(14 - diffDays),
      };
    }
    return { isLocked: false, daysRemaining: 0 };
  };

  // 30-Day Grid
  const days30: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const daySnaps = snapshots.filter((s) => s.date === dateStr);
    const daySolved = daySnaps.reduce((acc, curr) => acc + curr.totalSolved, 0);
    days30.push({ date: dateStr, count: daySolved });
  }

  const isAnonymousMode = user.isAnonymous === 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-2 pb-12 font-sans px-2 sm:px-4">
      {/* Breadcrumb Bar */}
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
        <Link href="/" className="hover:text-zinc-300 transition flex items-center gap-1">
          <span className="text-emerald-400">★</span>
          <span>DSAMRR</span>
        </Link>
        <span>›</span>
        <span>Programmer</span>
        <span>›</span>
        <span className={`text-zinc-200 font-medium ${isAnonymousMode && !isOwner ? "filter blur-[3.5px] select-none" : ""}`}>
          {isAnonymousMode && !isOwner ? "anonymous" : user.username}
        </span>
      </div>

      {/* Anonymous Mode Owner Banner */}
      {isAnonymousMode && isOwner && (
        <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-zinc-300 text-xs flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <span>👻</span>
            <span>
              <strong className="text-zinc-100 font-sans">Anonymous Mode is Active:</strong> Your name is blurred on the leaderboard, and external coding profile links are disabled for public viewers.
            </span>
          </div>
          <Link
            href="/settings/account"
            className="text-emerald-400 hover:underline shrink-0 text-[11px]"
          >
            Change Settings
          </Link>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-4">
          <img
            src={
              isAnonymousMode && !isOwner
                ? "https://api.dicebear.com/7.x/bottts/svg?seed=anonymous"
                : (user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`)
            }
            alt={isAnonymousMode && !isOwner ? "Anonymous Coder" : user.username}
            className={`w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700/80 object-cover shrink-0 shadow-lg ${
              isAnonymousMode && !isOwner ? "filter blur-[1.5px]" : ""
            }`}
          />
          <div>
            <div className="flex items-center gap-2.5">
              <h1
                className={`text-2xl font-bold text-white font-sans tracking-tight ${
                  isAnonymousMode && !isOwner ? "filter blur-[4px] select-none text-zinc-400" : ""
                }`}
              >
                {isAnonymousMode && !isOwner ? "Anonymous Coder" : (user.name || user.username)}
              </h1>
              {isAnonymousMode && (
                <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                  👻 Anon
                </span>
              )}
              {isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {isAnonymousMode && !isOwner
                ? "Verified competitive programmer proof-of-work (Identity masked in Anonymous Mode)."
                : "Competitive programmer on DSAMRR. Tracking daily algorithm grind & proof of work."}
            </p>
          </div>
        </div>

        {/* Action button - ONLY visible if owner */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isOwner ? (
            <Link
              href={`/settings/verify?username=${user.username}`}
              className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Handles</span>
            </Link>
          ) : (
            <span className="text-xs text-zinc-500 font-mono">Public Profile</span>
          )}
        </div>
      </div>

      {/* 4 TrustMRR Highlight Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: All-Time Solved */}
        <div className="p-5 rounded-2xl bg-[#0e0f14] border border-[#1f2128] space-y-3 shadow-xl flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400">All-time Problems</div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
              {totalSolved.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono mt-1 font-medium">
              verified solved
            </div>
          </div>
        </div>

        {/* Card 2: This Month */}
        <div className="p-5 rounded-2xl bg-[#0e0f14] border border-[#1f2128] space-y-3 shadow-xl flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400 flex items-center gap-1">
            <span>This Month</span>
            <span className="text-[10px] text-zinc-500 font-mono">ⓘ</span>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
              {thisMonthSolved > 0 ? `+${thisMonthSolved}` : "0"}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono mt-1">
              problems this month
            </div>
          </div>
        </div>

        {/* Card 3: Programmer & Socials (with Edit Socials modal for owner) */}
        <ProfileSocialsCard
          username={isAnonymousMode && !isOwner ? "anonymous" : user.username}
          name={isAnonymousMode && !isOwner ? "Anonymous" : (user.name || user.username)}
          avatarUrl={isAnonymousMode && !isOwner ? "https://api.dicebear.com/7.x/bottts/svg?seed=anonymous" : user.avatarUrl}
          twitterHandle={isAnonymousMode && !isOwner ? null : user.twitterHandle}
          instagramHandle={isAnonymousMode && !isOwner ? null : user.instagramHandle}
          linkedinHandle={isAnonymousMode && !isOwner ? null : user.linkedinHandle}
          githubHandle={isAnonymousMode && !isOwner ? null : user.githubHandle}
          showTwitter={isAnonymousMode && !isOwner ? 0 : user.showTwitter}
          showInstagram={isAnonymousMode && !isOwner ? 0 : user.showInstagram}
          showLinkedin={isAnonymousMode && !isOwner ? 0 : user.showLinkedin}
          showGithub={isAnonymousMode && !isOwner ? 0 : user.showGithub}
          isOwner={isOwner}
        />

        {/* Card 4: Started / Joined */}
        <div className="p-5 rounded-2xl bg-[#0e0f14] border border-[#1f2128] space-y-3 shadow-xl flex flex-col justify-between">
          <div className="text-xs font-medium text-zinc-400">Started</div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
              {joinedMonthYear}
            </div>
            <div className="text-[11px] text-zinc-400 font-sans mt-1 flex items-center gap-1.5">
              <span>🇮🇳</span>
              <span>Competitive Coder</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified DSA Platforms Grid */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-zinc-200 font-sans">
          Verified Coding Platforms
        </h2>

        {(() => {
          const activePlatforms = SUPPORTED_PLATFORMS.filter((platform) => {
            const acc = accounts.find((a) => a.platform === platform.id);
            return acc && acc.verifiedStatus === "verified" && acc.isVisible !== 0;
          });

          if (activePlatforms.length === 0) {
            return (
              <div className="p-8 rounded-2xl bg-[#0e0f14] border border-[#1f2128] text-center text-zinc-500 font-mono text-xs space-y-2">
                <div>No verified platforms attached to this profile yet.</div>
                {isOwner && (
                  <Link
                    href={`/settings/verify?username=${user.username}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition font-sans"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Verify First Platform</span>
                  </Link>
                )}
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 font-mono">
              {activePlatforms.map((platform) => {
                const acc = accounts.find((a) => a.platform === platform.id);
                const snap = snapshots.find((s) => s.platform === platform.id);
                const lockout = getLockoutInfo(acc);

                return (
                  <div
                    key={platform.id}
                    className="p-4 rounded-2xl bg-[#0e0f14] border border-[#1f2128] space-y-3 shadow-lg flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                          {platform.short}
                        </span>
                        <span className="text-xs font-bold text-zinc-200">{platform.name}</span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    </div>

                    {acc && (
                      isAnonymousMode && !isOwner ? (
                        <div className="text-xs text-zinc-400 inline-flex items-center gap-1 select-none cursor-default font-mono">
                          <span>@••••••••</span>
                          <span className="text-[10px] text-zinc-600">(hidden)</span>
                        </div>
                      ) : (
                        <a
                          href={`${platform.urlPrefix}${acc.username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-zinc-300 hover:text-white inline-flex items-center gap-1"
                        >
                          @{acc.username} <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                        </a>
                      )
                    )}

                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                      <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                        <div className="text-[9px] text-zinc-400">Easy</div>
                        <div className="font-bold text-emerald-400 mt-0.5 text-xs">
                          {snap?.problemsSolvedEasy || 0}
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                        <div className="text-[9px] text-zinc-400">Med</div>
                        <div className="font-bold text-amber-400 mt-0.5 text-xs">
                          {snap?.problemsSolvedMedium || 0}
                        </div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                        <div className="text-[9px] text-zinc-400">Hard</div>
                        <div className="font-bold text-rose-400 mt-0.5 text-xs">
                          {snap?.problemsSolvedHard || 0}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-300 pt-1 border-t border-zinc-800/60 font-semibold">
                      <span>Total Solved</span>
                      <span className="font-bold text-emerald-400">{snap?.totalSolved || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* 30-Day Activity Grid */}
      <div className="p-4 rounded-2xl bg-[#0e0f14] border border-[#1f2128] space-y-3 font-mono shadow-lg">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-zinc-200 font-sans">
            30-Day Activity Grind
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <span>0</span>
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-950 border border-zinc-800" />
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-950 border border-emerald-900" />
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-800" />
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            <span>5+</span>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1.5">
          {days30.map((d) => {
            const count = d.count;
            let bg = "bg-zinc-950 border border-zinc-800 text-zinc-600";
            if (count >= 5) {
              bg = "bg-emerald-500 border border-emerald-400 text-zinc-950 font-bold";
            } else if (count >= 3) {
              bg = "bg-emerald-700 border border-emerald-600 text-emerald-100";
            } else if (count >= 2) {
              bg = "bg-emerald-800/80 border border-emerald-700/80 text-emerald-200";
            } else if (count >= 1) {
              bg = "bg-emerald-950 border border-emerald-900 text-emerald-300";
            }

            return (
              <div
                key={d.date}
                title={`${d.date}: ${d.count} problems`}
                className={`p-1.5 rounded-sm text-center text-[10px] ${bg}`}
              >
                <div className="opacity-60 text-[9px]">{d.date.slice(5)}</div>
                <div className="mt-0.5">{count > 0 ? `+${count}` : "·"}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
