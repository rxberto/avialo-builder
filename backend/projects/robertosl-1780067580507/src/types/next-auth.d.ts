import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "admin" | "client";
  }

  interface Session {
    user: {
      id: string;
      role: "admin" | "client";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "admin" | "client";
  }
}
