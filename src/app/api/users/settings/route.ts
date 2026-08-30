import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, client } from "@/db";
import { initDb } from "@/db/init";
import { users, platformAccounts } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET: Fetch current user's latest settings directly from DB
export async function GET(req: NextRequest) {
  try {
    await initDb();
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;

    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const currentEmail = sessionUser.email;
    const currentId = sessionUser.id;

    let [currentUser] = currentEmail
      ? await db.select().from(users).where(eq(users.email, currentEmail))
      : currentId
      ? await db.select().from(users).where(eq(users.id, currentId))
      : [];

    if (!currentUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const userPlatforms = await db
      .select()
      .from(platformAccounts)
      .where(eq(platformAccounts.userId, currentUser.id));

    return NextResponse.json({
      success: true,
      user: {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        name: currentUser.name || currentUser.username,
        avatarUrl: currentUser.avatarUrl,
        isAnonymous: currentUser.isAnonymous === 1,
        platforms: userPlatforms,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH: Update username, email, name, anonymous mode
export async function PATCH(req: NextRequest) {
  try {
    await initDb();
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;

    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { username, email, name, isAnonymous } = body;

    const currentEmail = sessionUser.email;
    const currentId = sessionUser.id;

    // Find current user in DB
    let [currentUser] = currentEmail
      ? await db.select().from(users).where(eq(users.email, currentEmail))
      : currentId
      ? await db.select().from(users).where(eq(users.id, currentId))
      : [];

    if (!currentUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const cleanUsername = username !== undefined ? username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") : currentUser.username;
    const cleanEmail = email !== undefined ? email.trim().toLowerCase() : currentUser.email;
    const cleanName = name !== undefined ? name.trim() : (currentUser.name || currentUser.username);
    const cleanAnonymous = isAnonymous !== undefined ? (isAnonymous ? 1 : 0) : currentUser.isAnonymous;

    if (!cleanUsername || !cleanEmail) {
      return NextResponse.json(
        { success: false, error: "Username and Email cannot be empty." },
        { status: 400 }
      );
    }

    // Check if new username is already taken by someone else
    if (cleanUsername !== currentUser.username) {
      const [takenUsername] = await db
        .select()
        .from(users)
        .where(and(eq(users.username, cleanUsername), ne(users.id, currentUser.id)));

      if (takenUsername) {
        return NextResponse.json(
          { success: false, error: "Username is already taken by another user." },
          { status: 400 }
        );
      }
    }

    // Check if new email is already taken by someone else
    if (cleanEmail !== currentUser.email) {
      const [takenEmail] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, cleanEmail), ne(users.id, currentUser.id)));

      if (takenEmail) {
        return NextResponse.json(
          { success: false, error: "Email is already in use by another account." },
          { status: 400 }
        );
      }
    }

    await db
      .update(users)
      .set({
        username: cleanUsername,
        email: cleanEmail,
        name: cleanName || cleanUsername,
        isAnonymous: cleanAnonymous,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, currentUser.id));

    return NextResponse.json({
      success: true,
      message: "Account settings updated successfully.",
      user: {
        id: currentUser.id,
        username: cleanUsername,
        email: cleanEmail,
        name: cleanName || cleanUsername,
        isAnonymous: cleanAnonymous === 1,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE: Delete account
export async function DELETE(req: NextRequest) {
  try {
    await initDb();
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as any;

    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const currentEmail = sessionUser.email;
    const currentId = sessionUser.id;

    let [currentUser] = currentEmail
      ? await db.select().from(users).where(eq(users.email, currentEmail))
      : currentId
      ? await db.select().from(users).where(eq(users.id, currentId))
      : [];

    if (!currentUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    // Foreign keys are enabled by initDb; deleting the parent cascades atomically.
    await client.execute({
      sql: `DELETE FROM users WHERE id = ?`,
      args: [currentUser.id],
    });

    return NextResponse.json({
      success: true,
      message: "Account deleted permanently.",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
