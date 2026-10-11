import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60; // 30 days
const SESSION_MAX_AGE = 12 * 60 * 60; // 12 hours without "remember"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember this device", type: "text" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!email || !password) {
          return null;
        }

        let response: Response;

        try {
          response = await fetch(`${process.env.BACKEND_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
            cache: "no-store",
          });
        } catch {
          return null;
        }

        if (!response.ok) {
          return null;
        }

        const { user } = await response.json();

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          rememberMe: credentials?.remember !== "false",
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account && profile?.sub) {
        token.googleId = profile.sub ?? undefined;
      }

      if (user && account?.provider === "credentials") {
        token.userId = user.id;
        const remember =
          (user as { rememberMe?: boolean }).rememberMe !== false;
        token.rememberMe = remember;
        // Shorter server-side session when "remember this device" is off.
        token.exp =
          Math.floor(Date.now() / 1000) +
          (remember ? REMEMBER_MAX_AGE : SESSION_MAX_AGE);
      }

      return token;
    },

    async session({ session, token }) {
      session.user.googleId = token.googleId as string | undefined;
      session.user.userId = token.userId as string | undefined;

      return session;
    },
  },
});
