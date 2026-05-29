import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;


export const config = {
  // Coincide con todas las rutas excepto static assets y api internas de Next.js
  matcher: ["/((?!api|_next/static|_next/image|assets|favicon.ico).*)"],
};
