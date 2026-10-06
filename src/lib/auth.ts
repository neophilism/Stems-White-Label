import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import GithubProvider from "next-auth/providers/github";

import { db } from "@/lib/db";
import { getCurrentTenant } from "@/lib/tenant";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER ?? "",
      from: process.env.EMAIL_FROM ?? "",
      maxAge: 20 * 60,
    }),
  ],
  callbacks: {
    async signIn({ user, account, email }) {
      if (email || account?.provider === "email") {
        if (!user.email) return false;
        const tenant = await getCurrentTenant();
        if (!tenant) return false;

        const normalizedEmail = user.email.trim().toLowerCase();
        const customer = await db.customer.findUnique({
          where: {
            tenantId_normalizedEmail: {
              tenantId: tenant.id,
              normalizedEmail,
            },
          },
          select: { id: true },
        });

        return Boolean(customer);
      }

      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/sign-in",
    verifyRequest: "/auth/verify-request",
  },
};
