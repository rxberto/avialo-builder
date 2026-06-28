import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Gatea /admin con el callback `authorized`. Edge-safe (sin Node/Prisma aquí).
export default NextAuth(authConfig).auth;

export const config = {
  // Todas las rutas excepto estáticos y las API internas de Next.
  matcher: ["/((?!api|_next/static|_next/image|assets|favicon.ico).*)"],
};
