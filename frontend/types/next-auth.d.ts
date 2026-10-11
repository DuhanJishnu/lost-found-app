import "next-auth";
import "next-auth/jwt";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      googleId?: string;
      userId?: string;
    };
  }

  interface User {
    googleId?: string;
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    googleId?: string;
    userId?: string;
    rememberMe?: boolean;
  }
}
