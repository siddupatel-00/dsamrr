import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; email?: string } | undefined;
  if (!sessionUser) return null;

  if (sessionUser.id) {
    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id));
    if (user) return user;
  }
  if (sessionUser.email) {
    const [user] = await db.select().from(users).where(eq(users.email, sessionUser.email));
    return user ?? null;
  }
  return null;
}
