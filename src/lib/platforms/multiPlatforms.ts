export interface MultiPlatformStats {
  username: string;
  platform: "geeksforgeeks" | "hackerrank" | "codechef" | "atcoder";
  problemsSolvedEasy: number;
  problemsSolvedMedium: number;
  problemsSolvedHard: number;
  totalSolved: number;
  score: number;
  bio?: string;
  rating?: number;
  rawData?: any;
}

// 1. GeeksforGeeks Fetcher (Direct GFG Public Profile Fetcher)
export async function fetchGeeksForGeeksStats(username: string): Promise<MultiPlatformStats> {
  try {
    const res = await fetch(`https://www.geeksforgeeks.org/user/${encodeURIComponent(username)}/`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const html = await res.text();

      // Extract bio from escaped or unescaped SSR JSON
      let bio = "";
      const bioMatch = html.match(/\\?"bio\\?"\s*:\s*\\?"([^"\\]+)\\?"/i);
      if (bioMatch) {
        bio = bioMatch[1];
      }

      // Extract total solved problems
      let totalSolved = 0;
      const totalSolvedMatch = html.match(/\\?"total_problems_solved\\?"\s*:\s*(\d+)/i);
      if (totalSolvedMatch) {
        totalSolved = parseInt(totalSolvedMatch[1], 10);
      }

      // Extract score
      let score = 0;
      const scoreMatch = html.match(/\\?"score\\?"\s*:\s*(\d+)/i);
      if (scoreMatch) {
        score = parseInt(scoreMatch[1], 10);
      }

      // Estimate difficulty distribution from GFG score & total solved
      const easy = Math.max(0, Math.round(totalSolved * 0.5));
      const medium = Math.max(0, Math.round(totalSolved * 0.35));
      const hard = Math.max(0, totalSolved - easy - medium);

      return {
        username,
        platform: "geeksforgeeks",
        problemsSolvedEasy: easy,
        problemsSolvedMedium: medium,
        problemsSolvedHard: hard,
        totalSolved,
        score: score || easy * 1 + medium * 3 + hard * 5,
        bio: bio.trim(),
      };
    }
  } catch (e) {
    console.error("GFG fetch error:", e);
  }

  // Fallback defaults
  return {
    username,
    platform: "geeksforgeeks",
    problemsSolvedEasy: 0,
    problemsSolvedMedium: 0,
    problemsSolvedHard: 0,
    totalSolved: 0,
    score: 0,
    bio: "",
  };
}

// 2. HackerRank Fetcher (Public Profile API)
export async function fetchHackerRankStats(username: string): Promise<MultiPlatformStats> {
  try {
    const res = await fetch(`https://www.hackerrank.com/rest/hackers/${encodeURIComponent(username)}/profile`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const model = data.model || {};
      const bio = `${model.short_bio || ""} ${model.about || ""}`;
      const solved = model.solved_challenges_count || 0;
      const easy = Math.round(solved * 0.5);
      const medium = Math.round(solved * 0.35);
      const hard = Math.max(0, solved - easy - medium);
      const score = easy * 1 + medium * 3 + hard * 5;

      return {
        username,
        platform: "hackerrank",
        problemsSolvedEasy: easy,
        problemsSolvedMedium: medium,
        problemsSolvedHard: hard,
        totalSolved: solved,
        score,
        bio: bio.trim(),
        rawData: model,
      };
    }
  } catch (e) {}

  return {
    username,
    platform: "hackerrank",
    problemsSolvedEasy: 0,
    problemsSolvedMedium: 0,
    problemsSolvedHard: 0,
    totalSolved: 0,
    score: 0,
    bio: "",
  };
}

// 3. CodeChef Fetcher (Public API / Profile)
export async function fetchCodeChefStats(username: string): Promise<MultiPlatformStats> {
  try {
    const res = await fetch(`https://codechef-api.vercel.app/handle/${encodeURIComponent(username)}`, {
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const rating = data.currentRating || 0;
      const total = data.totalSolved || 0;
      const easy = Math.round(total * 0.6);
      const medium = Math.round(total * 0.3);
      const hard = Math.max(0, total - easy - medium);
      const score = easy * 1 + medium * 3 + hard * 5;

      return {
        username,
        platform: "codechef",
        problemsSolvedEasy: easy,
        problemsSolvedMedium: medium,
        problemsSolvedHard: hard,
        totalSolved: total,
        score,
        rating,
        bio: data.name || "",
        rawData: data,
      };
    }
  } catch (e) {}

  return {
    username,
    platform: "codechef",
    problemsSolvedEasy: 0,
    problemsSolvedMedium: 0,
    problemsSolvedHard: 0,
    totalSolved: 0,
    score: 0,
    bio: "",
  };
}

// 4. AtCoder Fetcher (Public API / Scraping)
export async function fetchAtCoderStats(username: string): Promise<MultiPlatformStats> {
  try {
    const res = await fetch(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=${encodeURIComponent(username)}`, {
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      const count = data.count || 0;
      const easy = Math.round(count * 0.6);
      const medium = Math.round(count * 0.3);
      const hard = Math.max(0, count - easy - medium);
      const score = easy * 1 + medium * 3 + hard * 5;

      return {
        username,
        platform: "atcoder",
        problemsSolvedEasy: easy,
        problemsSolvedMedium: medium,
        problemsSolvedHard: hard,
        totalSolved: count,
        score,
        bio: "",
        rawData: data,
      };
    }
  } catch (e) {}

  return {
    username,
    platform: "atcoder",
    problemsSolvedEasy: 0,
    problemsSolvedMedium: 0,
    problemsSolvedHard: 0,
    totalSolved: 0,
    score: 0,
    bio: "",
  };
}
