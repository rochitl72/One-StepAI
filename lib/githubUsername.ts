/** GitHub login rules (public profile name): alphanumeric + hyphens, 1–39 chars, no leading/trailing/double hyphen. */
export function isValidGithubUsername(raw: string): boolean {
  const u = raw.trim();
  if (u.length < 1 || u.length > 39) return false;
  if (/--/.test(u) || u.startsWith("-") || u.endsWith("-")) return false;
  return /^[a-zA-Z0-9-]+$/.test(u);
}

export function normalizeGithubUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}
