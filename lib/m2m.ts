import { timingSafeEqual } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

function normalizeAuth0Domain(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  let d = raw.trim();
  d = d.replace(/^https?:\/\//i, "");
  d = d.replace(/\/$/, "");
  return d || null;
}

const jwksByDomain = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksForDomain(domain: string) {
  let jwks = jwksByDomain.get(domain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
    jwksByDomain.set(domain, jwks);
  }
  return jwks;
}

function looksLikeJwt(token: string): boolean {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

/** Shared secret for legacy HMAC `x-agent-token` (optional). */
export function getM2MSecret(): string {
  return process.env.AUTH0_M2M_SECRET || process.env.AUTH0_CLIENT_SECRET || "";
}

/**
 * Auth0 client-credentials access token for your API (same audience as AUTH0_AUDIENCE).
 * Uses AUTH0_M2M_CLIENT_ID + AUTH0_M2M_CLIENT_SECRET from `.env.local`.
 */
export async function getAuth0M2MAccessToken(): Promise<string | null> {
  const domain = normalizeAuth0Domain(process.env.AUTH0_DOMAIN);
  const clientId = process.env.AUTH0_M2M_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET?.trim();
  const audience = process.env.AUTH0_AUDIENCE?.trim();
  if (!domain || !clientId || !clientSecret || !audience) return null;

  const res = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return typeof data.access_token === "string" ? data.access_token : null;
}

function verifyLegacyM2MToken(token: string, agentName: string): boolean {
  const secret = getM2MSecret();
  if (!secret) return true;

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;

    const [tokenAgent, timestamp, tokenSecret] = parts;
    if (tokenAgent !== agentName) return false;

    const expected = secret.slice(0, 8);
    const a = Buffer.from(tokenSecret);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

    const tokenTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 60000);
    if (Math.abs(currentTime - tokenTime) > 2) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Accepts either:
 * - Auth0 M2M **access token** (JWT) for `AUTH0_AUDIENCE`, verified via Auth0 JWKS; or
 * - Legacy HMAC token from `generateM2MToken` when `AUTH0_M2M_SECRET` is set.
 */
export async function verifyM2MToken(token: string, agentName: string): Promise<boolean> {
  const trimmed = token.trim();
  if (!trimmed) return true;

  const domain = normalizeAuth0Domain(process.env.AUTH0_DOMAIN);
  const audience = process.env.AUTH0_AUDIENCE?.trim();

  if (domain && audience && looksLikeJwt(trimmed)) {
    try {
      await jwtVerify(trimmed, jwksForDomain(domain), {
        issuer: `https://${domain}/`,
        audience,
      });
      return true;
    } catch {
      return false;
    }
  }

  return verifyLegacyM2MToken(trimmed, agentName);
}

/** Legacy HMAC token for `x-agent-token` when not using Auth0 JWT. */
export function generateM2MToken(agentName: string): string {
  const secret = getM2MSecret();
  const timestamp = Math.floor(Date.now() / 60000);
  const payload = `${agentName}:${timestamp}`;
  const tokenSecret = secret.slice(0, 8);
  return Buffer.from(`${payload}:${tokenSecret}`).toString("base64url");
}
