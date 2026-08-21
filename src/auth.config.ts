import type { NextAuthConfig } from "next-auth";

/**
 * Configuration "Edge-safe" utilisée par le middleware (aucune dépendance à
 * Prisma/bcrypt ici : le middleware tourne sur le runtime Edge et ne fait que
 * décoder le cookie de session JWT, sans accès base de données). La
 * configuration complète (fournisseur Credentials, accès Prisma) vit dans
 * `src/auth.ts`, chargée uniquement côté serveur Node (routes API, pages).
 */

const DISPATCHER_ONLY_PREFIXES = ["/optimize", "/results"];
const DISPATCHER_ONLY_API_PREFIXES = [
  "/api/depot",
  "/api/pharmacies",
  "/api/optimize",
  "/api/routes",
];
const DRIVER_HOME = "/my-routes";
const DISPATCHER_HOME = "/";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as "DISPATCHER" | "DRIVER";
        session.user.id = token.id as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;

      const isApiRoute = pathname.startsWith("/api/");
      // Pour une route API, on répond directement par un statut HTTP plutôt que de
      // laisser Auth.js rediriger vers /login : un `fetch()` suivrait silencieusement
      // cette redirection et verrait un succès (200) au lieu du vrai refus d'accès.
      const deny = (status: number, message: string) =>
        isApiRoute
          ? new Response(JSON.stringify({ error: message }), {
              status,
              headers: { "content-type": "application/json" },
            })
          : false;

      // La page de connexion reste toujours accessible.
      if (pathname === "/login") {
        if (auth?.user) {
          const home = auth.user.role === "DRIVER" ? DRIVER_HOME : DISPATCHER_HOME;
          return Response.redirect(new URL(home, request.nextUrl));
        }
        return true;
      }

      if (!auth?.user) return deny(401, "Non authentifié"); // page → redirection vers /login

      const role = auth.user.role;
      const isDispatcherPage =
        pathname === "/" || DISPATCHER_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
      const isDispatcherApi = DISPATCHER_ONLY_API_PREFIXES.some((p) => pathname.startsWith(p));
      const isDriverPage = pathname.startsWith(DRIVER_HOME);

      if ((isDispatcherPage || isDispatcherApi) && role !== "DISPATCHER") {
        if (isDispatcherApi) return deny(403, "Accès réservé au dispatcher");
        return Response.redirect(new URL(DRIVER_HOME, request.nextUrl));
      }

      if (isDriverPage && role !== "DRIVER") {
        return Response.redirect(new URL(DISPATCHER_HOME, request.nextUrl));
      }

      return true;
    },
  },
};
