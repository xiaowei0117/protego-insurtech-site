import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import type { Account, Profile, Session, User } from "next-auth";
import prisma from "@/lib/prisma";


export const authOptions = {
  adapter: PrismaAdapter(prisma),
  // Allow Google to link to an existing account with the same verified email
  allowDangerousEmailAccountLinking: true,

  providers: [
    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    // Dev login (email only, no password)
    CredentialsProvider({
      name: "Dev Login",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          return null;
        }

        // Look up user in DB; if not found, reject
        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return null;
        }

        // NextAuth expects an object with at least { id, email }
        return {
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          image: user.image ?? null,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    // Ensure Google sign-in reuses an existing user with the same email
    async signIn({ account, profile }: { account?: Account | null; profile?: Profile | null }) {
      if (account?.provider === "google" && profile?.email) {
        const email = profile.email as string;
        const existing = await prisma.user.findUnique({
          where: { email: profile.email as string },
        });
        // Only allow Google sign-in if the user already exists (created via save quote)
        if (!existing) return false;

        // Manually link Google account to existing user to avoid OAuthAccountNotLinked
        try {
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: "google",
                providerAccountId: account.providerAccountId,
              },
            },
            update: {
              userId: existing.id,
              access_token: account.access_token ?? null,
              refresh_token: account.refresh_token ?? null,
              expires_at: account.expires_at ?? null,
              token_type: account.token_type ?? null,
              scope: account.scope ?? null,
              id_token: account.id_token ?? null,
              session_state: account.session_state ?? null,
            },
            create: {
              userId: existing.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token ?? null,
              refresh_token: account.refresh_token ?? null,
              expires_at: account.expires_at ?? null,
              token_type: account.token_type ?? null,
              scope: account.scope ?? null,
              id_token: account.id_token ?? null,
              session_state: account.session_state ?? null,
            },
          });
        } catch (e) {
          console.warn("link google account failed:", (e as any)?.message);
          return false;
        }

        return true;
      }
      return true;
    },

    // Control what goes into the JWT (runs on login and on every request)
    async jwt({
      token,
      user,
      account,
      profile,
    }: {
      token: JWT;
      user?: User | null;
      account?: Account | null;
      profile?: Profile | null;
    }) {
      //
      // Case 1: first time the user logs in (user is defined only then)
      //
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.role = (user as any).role || "customer";
      }

      //
      // Case 2: Google login / callback: ensure user exists in DB
      //
      if (account?.provider === "google" && profile?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: profile.email as string },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },

    // Control what ends up in `session` (used by your server components)
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
        // @ts-ignore
        session.user.role = token.role as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/dashboard`;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
