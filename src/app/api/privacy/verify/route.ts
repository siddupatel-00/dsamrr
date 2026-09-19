import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const expectedSecret =
      process.env.ANALYTICS_PASSWORD ||
      process.env.PRIVACY_KEY ||
      process.env.ANALYTICS_SECRET ||
      "admin123"; // default fallback for local dev if not set

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password / access key is required." },
        { status: 400 }
      );
    }

    if (password.trim() !== expectedSecret.trim()) {
      return NextResponse.json(
        { success: false, error: "Invalid access key. Please check the value set in Vercel." },
        { status: 401 }
      );
    }

    // Set secure HTTP-only cookie valid for 30 days
    const cookieStore = cookies();
    cookieStore.set("analytics_unlocked", "true", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({
      success: true,
      authenticated: true,
      message: "Analytics dashboard unlocked successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Internal server error verifying access key." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = cookies();
    const isUnlocked = cookieStore.get("analytics_unlocked")?.value === "true";

    return NextResponse.json({
      success: true,
      authenticated: Boolean(isUnlocked),
    });
  } catch {
    return NextResponse.json({ success: true, authenticated: false });
  }
}

export async function DELETE() {
  try {
    const cookieStore = cookies();
    cookieStore.delete("analytics_unlocked");

    return NextResponse.json({
      success: true,
      authenticated: false,
      message: "Analytics dashboard locked.",
    });
  } catch {
    return NextResponse.json({ success: true, authenticated: false });
  }
}
