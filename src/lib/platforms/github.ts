export interface GitHubStats {
  username: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  stars: number;
  topLanguages: { language: string; count: number }[];
  syncedAt: string;
}

export async function fetchGitHubStats(username: string): Promise<GitHubStats | null> {
  try {
    const cleanUsername = username.trim().replace(/^@/, "");
    if (!cleanUsername) return null;

    const headers: Record<string, string> = {
      "User-Agent": "DSAMRR-App",
      Accept: "application/vnd.github.v3+json",
    };

    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const userRes = await fetch(`https://api.github.com/users/${cleanUsername}`, {
      headers,
    });

    if (!userRes.ok) {
      return null;
    }

    const userData = await userRes.json();

    let stars = 0;
    const langMap: Record<string, number> = {};

    try {
      const reposRes = await fetch(
        `https://api.github.com/users/${cleanUsername}/repos?per_page=100&sort=updated`,
        { headers }
      );
      if (reposRes.ok) {
        const repos = await reposRes.json();
        if (Array.isArray(repos)) {
          for (const r of repos) {
            stars += r.stargazers_count || 0;
            if (r.language) {
              langMap[r.language] = (langMap[r.language] || 0) + 1;
            }
          }
        }
      }
    } catch (e) {}

    const topLanguages = Object.entries(langMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([language, count]) => ({ language, count }));

    return {
      username: userData.login,
      name: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
      bio: userData.bio || null,
      publicRepos: userData.public_repos || 0,
      followers: userData.followers || 0,
      following: userData.following || 0,
      stars,
      topLanguages,
      syncedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("fetchGitHubStats error:", err);
    return null;
  }
}
