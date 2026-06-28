import type { NextAuthConfig } from "next-auth";

// Config compartida (Edge-safe): SOLO gatea rutas. Los providers van en auth.ts (usan Node).
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      // El panel /admin (gestión de la tienda) requiere sesión de admin.
      if (isOnAdmin) {
        if (isLoggedIn && auth.user.role === "admin") return true;
        return false; // → redirige a /login
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
  providers: [], // Configurado en auth.ts (no romper en Edge).
} satisfies NextAuthConfig;
