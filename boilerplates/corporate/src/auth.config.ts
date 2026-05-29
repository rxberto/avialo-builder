import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      if (isOnAdmin) {
        if (isLoggedIn && auth.user.role === "admin") return true;
        return false; // Redirigir a login
      }

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirigir a login
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "client";
      }
      return session;
    },
  },
  providers: [], // Configurado en auth.ts para no romper en Edge
} satisfies NextAuthConfig;
