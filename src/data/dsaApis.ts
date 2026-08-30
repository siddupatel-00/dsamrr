export interface DsaApi {
  id: string;
  name: string;
  platform: "LeetCode" | "Codeforces" | "CodeChef" | "GeeksforGeeks" | "AtCoder" | "HackerRank" | "Aggregators";
  type: "REST" | "GraphQL" | "JSON API";
  description: string;
  endpoint: string;
  sampleCurl: string;
  sampleResponse: any;
  docsUrl: string;
  latencyMs: number;
  monthlyRequests: string;
  rateLimit: string;
  uptime: string;
  authType: "No-Auth" | "Free API Key";
  maintainer: string;
  category: "user-stats" | "daily-problem" | "contests" | "problemset" | "submissions";
  isPopular?: boolean;
  isRecent?: boolean;
  tags: string[];
  icon: string;
  color: string;
}

export const DSA_APIS: DsaApi[] = [
  {
    id: "leetcode-alfa",
    name: "LeetCode Alfa Public API",
    platform: "LeetCode",
    type: "REST",
    description: "Fetches user solved problems, contest ranking, badges, and daily POTD without cookies.",
    endpoint: "https://alfa-leetcode-api.onrender.com/userProfile/tourist",
    sampleCurl: "curl -X GET 'https://alfa-leetcode-api.onrender.com/userProfile/tourist'",
    sampleResponse: {
      totalSolved: 1450,
      easySolved: 480,
      mediumSolved: 740,
      hardSolved: 230,
      ranking: 1042,
      contributionPoints: 3200,
      reputation: 890,
      submissionCalendar: { "1709164800": 4, "1709251200": 7 }
    },
    docsUrl: "https://github.com/alfaarghya/alfa-leetcode-api",
    latencyMs: 145,
    monthlyRequests: "1.2M",
    rateLimit: "120 req/min",
    uptime: "99.9%",
    authType: "No-Auth",
    maintainer: "alfaarghya",
    category: "user-stats",
    isPopular: true,
    isRecent: true,
    tags: ["leetcode", "user-stats", "badges", "calendar"],
    icon: "code",
    color: "amber"
  },
  {
    id: "codeforces-official",
    name: "Codeforces Official REST API",
    platform: "Codeforces",
    type: "REST",
    description: "Official public API to inspect user rating history, recent submissions, standings, and problem catalogs.",
    endpoint: "https://codeforces.com/api/user.info?handles=tourist",
    sampleCurl: "curl -X GET 'https://codeforces.com/api/user.info?handles=tourist'",
    sampleResponse: {
      status: "OK",
      result: [{
        handle: "tourist",
        rating: 3528,
        maxRating: 3979,
        rank: "legendary grandmaster",
        maxRank: "tourist",
        contribution: 184,
        friendOfCount: 42391
      }]
    },
    docsUrl: "https://codeforces.com/apiHelp",
    latencyMs: 95,
    monthlyRequests: "4.8M",
    rateLimit: "300 req/min",
    uptime: "99.8%",
    authType: "No-Auth",
    maintainer: "Codeforces (Mike Mirzayanov)",
    category: "user-stats",
    isPopular: true,
    isRecent: false,
    tags: ["codeforces", "ratings", "contests", "official"],
    icon: "zap",
    color: "blue"
  },
  {
    id: "leetcode-daily-potd",
    name: "LeetCode Daily POTD API",
    platform: "LeetCode",
    type: "REST",
    description: "Returns today's LeetCode Problem of the Day, title, difficulty, problem URL, tags, and hints.",
    endpoint: "https://alfa-leetcode-api.onrender.com/daily",
    sampleCurl: "curl -X GET 'https://alfa-leetcode-api.onrender.com/daily'",
    sampleResponse: {
      questionTitle: "Minimum Window Substring",
      questionId: "76",
      difficulty: "Hard",
      questionLink: "https://leetcode.com/problems/minimum-window-substring/",
      date: "2026-08-30",
      topicTags: ["Hash Table", "String", "Sliding Window"]
    },
    docsUrl: "https://github.com/alfaarghya/alfa-leetcode-api",
    latencyMs: 85,
    monthlyRequests: "850k",
    rateLimit: "180 req/min",
    uptime: "99.9%",
    authType: "No-Auth",
    maintainer: "Community Open Source",
    category: "daily-problem",
    isPopular: true,
    isRecent: true,
    tags: ["potd", "daily-challenge", "leetcode"],
    icon: "calendar",
    color: "amber"
  },
  {
    id: "clist-contests",
    name: "Kontests / CLIST Unified Contest API",
    platform: "Aggregators",
    type: "REST",
    description: "All-in-one live and upcoming CP contest timetable spanning LeetCode, Codeforces, AtCoder, CodeChef, and HackerRank.",
    endpoint: "https://kontests.net/api/v1/all",
    sampleCurl: "curl -X GET 'https://kontests.net/api/v1/all'",
    sampleResponse: [
      {
        name: "Codeforces Round 990 (Div. 2)",
        url: "https://codeforces.com/contest/2042",
        start_time: "2026-08-31T14:35:00.000Z",
        end_time: "2026-08-31T16:35:00.000Z",
        duration: "7200",
        site: "CodeForces",
        status: "BEFORE"
      },
      {
        name: "Weekly Contest 438",
        url: "https://leetcode.com/contest/weekly-contest-438",
        start_time: "2026-09-01T02:30:00.000Z",
        end_time: "2026-09-01T04:00:00.000Z",
        duration: "5400",
        site: "LeetCode",
        status: "BEFORE"
      }
    ],
    docsUrl: "https://kontests.net/api",
    latencyMs: 110,
    monthlyRequests: "2.1M",
    rateLimit: "120 req/min",
    uptime: "99.7%",
    authType: "No-Auth",
    maintainer: "Kontests Team",
    category: "contests",
    isPopular: true,
    isRecent: false,
    tags: ["contests", "schedule", "timetable", "multi-platform"],
    icon: "globe",
    color: "emerald"
  },
  {
    id: "gfg-stats-potd",
    name: "GeeksforGeeks POTD & Profile API",
    platform: "GeeksforGeeks",
    type: "REST",
    description: "Extracts GFG user coding scores, streak records, institute ranks, and Problem of the Day.",
    endpoint: "https://gfg-api.vercel.app/api/user/siddu",
    sampleCurl: "curl -X GET 'https://gfg-api.vercel.app/api/user/siddu'",
    sampleResponse: {
      userName: "siddu",
      overallScore: 684,
      totalProblemsSolved: 240,
      currentStreak: 18,
      longestStreak: 45,
      instituteRank: 3,
      solvedBreakdown: { School: 12, Basic: 45, Easy: 98, Medium: 65, Hard: 20 }
    },
    docsUrl: "https://github.com/developer/gfg-api",
    latencyMs: 160,
    monthlyRequests: "420k",
    rateLimit: "90 req/min",
    uptime: "99.4%",
    authType: "No-Auth",
    maintainer: "GFG Community",
    category: "user-stats",
    isPopular: true,
    isRecent: true,
    tags: ["gfg", "potd", "geeksforgeeks", "streak"],
    icon: "terminal",
    color: "emerald"
  },
  {
    id: "atcoder-kenkoooo",
    name: "AtCoder Kenkoooo Problems API",
    platform: "AtCoder",
    type: "JSON API",
    description: "The gold standard AtCoder database API for problem difficulty models, AC history, and contest performance.",
    endpoint: "https://kenkoooo.com/atcoder/resources/problem-models.json",
    sampleCurl: "curl -X GET 'https://kenkoooo.com/atcoder/resources/problem-models.json'",
    sampleResponse: {
      "abc350_a": {
        "slope": -0.0014,
        "intercept": 8.42,
        "variance": 0.42,
        "difficulty": 18,
        "discrimination": 0.0014
      }
    },
    docsUrl: "https://github.com/kenkoooo/AtCoderProblems/blob/master/doc/api.md",
    latencyMs: 70,
    monthlyRequests: "3.5M",
    rateLimit: "600 req/min",
    uptime: "99.9%",
    authType: "No-Auth",
    maintainer: "Kenkoooo",
    category: "problemset",
    isPopular: false,
    isRecent: true,
    tags: ["atcoder", "difficulty", "kenkoooo", "japan"],
    icon: "cpu",
    color: "sky"
  },
  {
    id: "codechef-scraper",
    name: "CodeChef User Profile API",
    platform: "CodeChef",
    type: "REST",
    description: "Retrieves stars rating (1★-7★), global rank, country rank, and contest division standings.",
    endpoint: "https://codechef-api.vercel.app/handle/tourist",
    sampleCurl: "curl -X GET 'https://codechef-api.vercel.app/handle/tourist'",
    sampleResponse: {
      handle: "tourist",
      stars: "7★",
      currentRating: 3120,
      highestRating: 3254,
      globalRank: 1,
      countryRank: 1,
      fullySolvedCount: 812
    },
    docsUrl: "https://github.com/faisal-shohag/codechef-api",
    latencyMs: 195,
    monthlyRequests: "280k",
    rateLimit: "60 req/min",
    uptime: "98.9%",
    authType: "No-Auth",
    maintainer: "Faisal Shohag",
    category: "user-stats",
    isPopular: false,
    isRecent: true,
    tags: ["codechef", "stars", "ratings", "india"],
    icon: "zap",
    color: "rose"
  },
  {
    id: "hackerrank-badges",
    name: "HackerRank Profile & Badges API",
    platform: "HackerRank",
    type: "REST",
    description: "Provides verified badges, star tiers in Problem Solving, Python, C++, and contest medals.",
    endpoint: "https://hackerrank-api.fly.dev/profile/siddu",
    sampleCurl: "curl -X GET 'https://hackerrank-api.fly.dev/profile/siddu'",
    sampleResponse: {
      username: "siddu",
      badges: [
        { badge_name: "Problem Solving", stars: 6, solved: 140 },
        { badge_name: "Python", stars: 5, solved: 75 },
        { badge_name: "C++", stars: 5, solved: 55 }
      ]
    },
    docsUrl: "https://github.com/hackerrank-api/spec",
    latencyMs: 130,
    monthlyRequests: "190k",
    rateLimit: "90 req/min",
    uptime: "99.2%",
    authType: "No-Auth",
    maintainer: "Community HR Wrapper",
    category: "user-stats",
    isPopular: false,
    isRecent: true,
    tags: ["hackerrank", "badges", "stars", "certifications"],
    icon: "shield",
    color: "emerald"
  },
  {
    id: "codeforces-problems",
    name: "Codeforces Problemset Catalog API",
    platform: "Codeforces",
    type: "REST",
    description: "Filter through 10,000+ problems by tag (dp, trees, graphs, greedy) and difficulty rating intervals.",
    endpoint: "https://codeforces.com/api/problemset.problems?tags=dp;graphs",
    sampleCurl: "curl -X GET 'https://codeforces.com/api/problemset.problems?tags=dp;graphs'",
    sampleResponse: {
      status: "OK",
      result: {
        problems: [
          { contestId: 1980, index: "F1", name: "Field Division (easy version)", type: "PROGRAMMING", rating: 1900, tags: ["dp", "geometry", "graphs"] }
        ]
      }
    },
    docsUrl: "https://codeforces.com/apiHelp",
    latencyMs: 105,
    monthlyRequests: "1.9M",
    rateLimit: "300 req/min",
    uptime: "99.8%",
    authType: "No-Auth",
    maintainer: "Codeforces",
    category: "problemset",
    isPopular: true,
    isRecent: false,
    tags: ["codeforces", "problemset", "dp", "graphs"],
    icon: "terminal",
    color: "blue"
  },
  {
    id: "dsamrr-native-rank",
    name: "DSAMRR Verified CP Multi-Rank API",
    platform: "Aggregators",
    type: "GraphQL",
    description: "Calculates unified proof-of-work score across both LeetCode and Codeforces with UTC delta snapshotting.",
    endpoint: "https://dsamrr.dev/api/leaderboard",
    sampleCurl: "curl -X GET 'http://localhost:3000/api/leaderboard'",
    sampleResponse: {
      success: true,
      date: "2026-08-30",
      leaderboard: {
        todaysGrind: [
          { username: "tourist_fan", todayScore: 190, todayTotal: 90, currentStreak: 5 }
        ]
      }
    },
    docsUrl: "http://localhost:3000/docs",
    latencyMs: 45,
    monthlyRequests: "640k",
    rateLimit: "240 req/min",
    uptime: "99.99%",
    authType: "No-Auth",
    maintainer: "DSAMRR Core Team",
    category: "user-stats",
    isPopular: true,
    isRecent: true,
    tags: ["dsamrr", "multi-platform", "unified-rank", "graphql"],
    icon: "sparkles",
    color: "purple"
  }
];

export const FEATURED_SDKS = [
  {
    name: "leetcode-query-py",
    language: "Python",
    install: "pip install leetcode-query",
    url: "https://github.com",
    stars: "1.4k",
  },
  {
    name: "codeforces-api-ts",
    language: "TypeScript / Node",
    install: "npm i @codeforces/api-client",
    url: "https://github.com",
    stars: "890",
  },
  {
    name: "gocp-contest-fetcher",
    language: "Go",
    install: "go get github.com/gocp/contests",
    url: "https://github.com",
    stars: "620",
  },
  {
    name: "dsa-scrapers-rust",
    language: "Rust",
    install: "cargo add dsa-scraper",
    url: "https://github.com",
    stars: "450",
  }
];
