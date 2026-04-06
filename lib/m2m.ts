import { timingSafeEqual } from "crypto";

export function getM2MSecret(): string {
  return process.env.AUTH0_M2M_SECRET || process.env.AUTH0_CLIENT_SECRET || "";
}

export function generateM2MToken(agentName: string): string {
  const secret = getM2MSecret();
  const timestamp = Math.floor(Date.now() / 60000);
  const payload = `${agentName}:${timestamp}`;
  const tokenSecret = secret.slice(0, 8);
  return Buffer.from(`${payload}:${tokenSecret}`).toString("base64url");
}

export function verifyM2MToken(token: string, agentName: string): boolean {
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
