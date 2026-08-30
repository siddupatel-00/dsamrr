export interface PlatformStats {
  username: string;
  platform: "leetcode" | "codeforces";
  easy: number;
  medium: number;
  hard: number;
  total: number;
  score: number;
  bio?: string;
  avatarUrl?: string;
  rating?: number;
  rank?: string;
  submissionCalendarRaw?: string;
  activityByDate?: Record<string, number>; // Format: { "YYYY-MM-DD": count }
}

export function calculateScore(easy: number, medium: number, hard: number): number {
  return easy * 1 + medium * 3 + hard * 5;
}

/**
 * Parses LeetCode's submissionCalendar JSON string of { [unixSeconds: string]: count }
 * into a date-keyed map { "YYYY-MM-DD": count }.
 */
export function parseSubmissionCalendar(rawCalendarJson?: string | null): Record<string, number> {
  const result: Record<string, number> = {};
  if (!rawCalendarJson) return result;
  try {
    const parsed: Record<string, number> = JSON.parse(rawCalendarJson);
    for (const [timestampStr, count] of Object.entries(parsed)) {
      const ts = Number(timestampStr);
      if (!isNaN(ts)) {
        const dateStr = new Date(ts * 1000).toISOString().split("T")[0];
        result[dateStr] = (result[dateStr] || 0) + (Number(count) || 0);
      }
    }
  } catch (e) {
    console.error("Failed to parse submissionCalendar:", e);
  }
  return result;
}

/**
 * Fetch stats for a LeetCode username via public GraphQL endpoint.
 */
export async function fetchLeetCodeStats(username: string): Promise<PlatformStats> {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submissionCalendar
        profile {
          aboutMe
          userAvatar
          ranking
        }
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: JSON.stringify({ query, variables: { username } }),
    });

    if (!res.ok) {
      throw new Error(`LeetCode API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.data?.matchedUser) {
      throw new Error(`LeetCode user '${username}' not found`);
    }

    const user = data.data.matchedUser;
    const acCounts = user.submitStatsGlobal?.acSubmissionNum || [];

    let easy = 0;
    let medium = 0;
    let hard = 0;
    let total = 0;

    for (const item of acCounts) {
      const diff = item.difficulty.toLowerCase();
      const count = Number(item.count) || 0;
      if (diff === "easy") easy = count;
      else if (diff === "medium") medium = count;
      else if (diff === "hard") hard = count;
      else if (diff === "all") total = count;
    }

    if (total === 0) {
      total = easy + medium + hard;
    }

    const rawCalendar = user.submissionCalendar || "{}";
    const activityByDate = parseSubmissionCalendar(rawCalendar);

    return {
      username: user.username,
      platform: "leetcode",
      easy,
      medium,
      hard,
      total,
      score: calculateScore(easy, medium, hard),
      bio: user.profile?.aboutMe || "",
      avatarUrl: user.profile?.userAvatar,
      rank: user.profile?.ranking ? `#${user.profile.ranking}` : undefined,
      submissionCalendarRaw: rawCalendar,
      activityByDate,
    };
  } catch (error: any) {
    throw error;
  }
}
