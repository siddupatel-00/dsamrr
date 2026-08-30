import { db } from "@/db";
import { platformAccounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchLeetCodeStats } from "./leetcode";
import { fetchCodeforcesStats } from "./codeforces";
import {
  fetchGeeksForGeeksStats,
  fetchHackerRankStats,
  fetchCodeChefStats,
  fetchAtCoderStats,
} from "./multiPlatforms";
import crypto from "crypto";

export function generateVerificationToken(): string {
  const rand = crypto.randomBytes(6).toString("hex");
  return `dsamrr_${rand}`;
}

export async function verifyPlatformAccount(
  platformAccountId: string,
  mockBio?: string
): Promise<{
  success: boolean;
  message: string;
  verifiedAt?: string;
}> {
  const [account] = await db
    .select()
    .from(platformAccounts)
    .where(eq(platformAccounts.id, platformAccountId));

  if (!account) {
    return { success: false, message: "Platform account not found" };
  }

  if (account.verifiedStatus === "verified") {
    return {
      success: true,
      message: "Account is already verified",
      verifiedAt: account.verifiedAt || undefined,
    };
  }

  const token = account.verificationToken;
  if (!token) {
    return { success: false, message: "No verification token generated for this account" };
  }

  let bioContent = mockBio || "";

  if (!mockBio) {
    try {
      if (account.platform === "leetcode") {
        const stats = await fetchLeetCodeStats(account.username);
        bioContent = stats.bio || "";
      } else if (account.platform === "codeforces") {
        const stats = await fetchCodeforcesStats(account.username);
        bioContent = stats.bio || "";
      } else if (account.platform === "geeksforgeeks") {
        const stats = await fetchGeeksForGeeksStats(account.username);
        bioContent = stats.bio || "";
      } else if (account.platform === "hackerrank") {
        const stats = await fetchHackerRankStats(account.username);
        bioContent = stats.bio || "";
      } else if (account.platform === "codechef") {
        const stats = await fetchCodeChefStats(account.username);
        bioContent = stats.bio || "";
      } else if (account.platform === "atcoder") {
        const stats = await fetchAtCoderStats(account.username);
        bioContent = stats.bio || "";
      }
    } catch (err: any) {
      console.error(`Verification fetch failed for ${account.platform}:`, err);
    }
  }

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const isMatch = normalize(bioContent).includes(normalize(token));

  if (isMatch) {
    const verifiedAt = new Date().toISOString();
    await db
      .update(platformAccounts)
      .set({
        verifiedStatus: "verified",
        verifiedAt,
        updatedAt: verifiedAt,
      })
      .where(eq(platformAccounts.id, account.id));

    return {
      success: true,
      message: "Verification successful! Handle linked and active.",
      verifiedAt,
    };
  }

  return {
    success: false,
    message: `Token "${token}" not found in your ${account.platform} public profile. Please paste and save it in your bio.`,
  };
}
