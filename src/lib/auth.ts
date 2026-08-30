import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db";
import { initDb } from "@/db/init";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "./crypto";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter your email and password");
        }

        const email = credentials.email.trim().toLowerCase();
        await initDb();

        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email));

        if (!existingUser) {
          throw new Error("No account found with this email. Please sign up.");
        }

        if (!existingUser.passwordHash || !verifyPassword(credentials.password, existingUser.passwordHash)) {
          throw new Error("Incorrect email or password.");
        }

        return {
          id: existingUser.id,
          name: existingUser.name || existingUser.username,
          email: existingUser.email,
          image: existingUser.avatarUrl,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      const lookupId = (token.id as string) || (token.sub as string);
      if (lookupId || session?.user?.email) {
        await initDb();
        let dbUser = null;
        if (lookupId) {
          [dbUser] = await db.select().from(users).where(eq(users.id, lookupId));
        }
        if (!dbUser && session?.user?.email) {
          [dbUser] = await db.select().from(users).where(eq(users.email, session.user.email));
        }

        if (dbUser && session.user) {
          (session.user as any).id = dbUser.id;
          (session.user as any).username = dbUser.username;
          session.user.name = dbUser.name || dbUser.username;
          session.user.email = dbUser.email;
          session.user.image = dbUser.avatarUrl;
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth",
  },
};
