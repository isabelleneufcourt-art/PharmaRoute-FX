import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

// Middleware "Edge-safe" : utilise uniquement authConfig (sans Prisma/bcrypt)
// pour décoder le cookie de session JWT et appliquer les redirections par rôle.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
