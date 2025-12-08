import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
    }),

    CredentialsProvider({
      name: "EmailLogin",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        const email = creds?.email?.toLowerCase().trim();
        if (!email) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Demo: 不校验密码（或你可以在这里加密校验）
        return {
          id: user.id,
          name: user.name || email,
          email: user.email,
          role: "customer",
        };
      },
    }),
  ],

  // ---- 把 role 等自定义信息放进 JWT，再放进 session ----
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return baseUrl + url;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl + "/quotes";
    },
    async jwt({ token, user }) {
      // jwt() 在登录时会拿到 user，在后续请求里只有 token
      if (user) {
        // 把我们的自定义字段塞进 token
        token.role = (user as any).role;
      }
      return token;
    },

    async session({ session, token }) {
      // session 是给前端用的，token 是我们刚刚扩展过的
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};
