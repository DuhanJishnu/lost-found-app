import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile?.sub) {
        token.googleId = profile.sub ?? undefined;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.googleId = token.googleId as string;

      return session;
    },
  },
});