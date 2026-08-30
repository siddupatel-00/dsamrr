import { PlatformStats, calculateScore } from "./leetcode";

/**
 * Fetch stats for a Codeforces handle via public API.
 * Maps Codeforces problem ratings to:
 * - Easy: rating < 1200 or unrated
 * - Medium: 1200 <= rating < 1900
 * - Hard: rating >= 1900
 */
export async function fetchCodeforcesStats(username: string): Promise<PlatformStats> {
  // 1. Fetch user info for bio/details
  const userRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(username)}`);
  if (!userRes.ok) {
    throw new Error(`Codeforces user info API failed with status ${userRes.status}`);
  }
  const userData = await userRes.json();
  if (userData.status !== "OK" || !userData.result?.[0]) {
    throw new Error(`Codeforces user '${username}' not found`);
  }

  const userInfo = userData.result[0];
  // In Codeforces, users can place tokens in their firstName, lastName, organization, or city
  const bioString = [
    userInfo.firstName || "",
    userInfo.lastName || "",
    userInfo.organization || "",
    userInfo.city || "",
  ].join(" ");

  // 2. Fetch solved submissions to count problem tiers
  const statusRes = await fetch(
    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(username)}&from=1&count=2000`
  );

  let easy = 0;
  let medium = 0;
  let hard = 0;
  const solvedProblems = new Set<string>();

  if (statusRes.ok) {
    const statusData = await statusRes.json();
    if (statusData.status === "OK" && Array.isArray(statusData.result)) {
      for (const sub of statusData.result) {
        if (sub.verdict === "OK" && sub.problem) {
          const probId = `${sub.problem.contestId}-${sub.problem.index}`;
          if (!solvedProblems.has(probId)) {
            solvedProblems.add(probId);
            const r = sub.problem.rating;
            if (!r || r < 1200) {
              easy++;
            } else if (r < 1900) {
              medium++;
            } else {
              hard++;
            }
          }
        }
      }
    }
  }

  const total = solvedProblems.size || easy + medium + hard;

  return {
    username: userInfo.handle,
    platform: "codeforces",
    easy,
    medium,
    hard,
    total,
    score: calculateScore(easy, medium, hard),
    bio: bioString,
    avatarUrl: userInfo.titlePhoto || userInfo.avatar,
    rating: userInfo.rating,
    rank: userInfo.rank,
  };
}
