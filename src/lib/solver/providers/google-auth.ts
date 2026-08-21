/**
 * Authentification OAuth2 "JWT Bearer" (RFC 7523) pour un compte de service
 * Google Cloud, sans dépendance externe (uniquement `node:crypto`). C'est le
 * flux utilisé par les bibliothèques officielles `google-auth-library` en
 * interne ; on l'implémente ici directement pour éviter d'ajouter une
 * dépendance lourde pour ce seul usage.
 */

import crypto from "node:crypto";

export interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function parseServiceAccount(raw: string): GoogleServiceAccount {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON n'est pas un JSON valide");
  }
  const account = json as Partial<GoogleServiceAccount>;
  if (!account.client_email || !account.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON doit contenir au minimum client_email et private_key");
  }
  return account as GoogleServiceAccount;
}

/** Mint un jeton d'accès OAuth2 pour l'API Google Route Optimization (scope cloud-platform). */
export async function getGoogleAccessToken(serviceAccount: GoogleServiceAccount): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: nowSec,
    exp: nowSec + 3600,
  };

  const signingInput = `${base64url(Buffer.from(JSON.stringify(header)))}.${base64url(
    Buffer.from(JSON.stringify(claims))
  )}`;
  const signature = crypto.createSign("RSA-SHA256").update(signingInput).sign(serviceAccount.private_key);
  const jwt = `${signingInput}.${base64url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Échec de l'authentification Google (${response.status}) : ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  if (!json.access_token) {
    throw new Error("Réponse OAuth2 Google invalide (access_token manquant)");
  }
  return json.access_token as string;
}
