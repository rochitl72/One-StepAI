import type { SkillFingerprint } from "./supabase";

/** Prefer `profiles.github_username` so Oracle matches the account the user chose, not stale JSON. */
export function mergeProfileGithubIntoFingerprint(
  fp: SkillFingerprint | null | undefined,
  profileGithubUsername: string | null | undefined
): SkillFingerprint | null {
  if (!fp) return null;
  const fromProfile = profileGithubUsername?.trim();
  return {
    ...fp,
    github_username: fromProfile || fp.github_username,
  };
}
