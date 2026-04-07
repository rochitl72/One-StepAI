// SERVER-ONLY — do not import this file in client components ("use client")
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Re-export constants so server files can still import from one place
export { RANK_THRESHOLDS, getRank, BADGES } from "./gamedata";

// Types
export type UserProfile = {
  id: string;
  user_id: string;
  github_username?: string;
  github_avatar?: string;
  xp: number;
  rank: string;
  skill_fingerprint: SkillFingerprint | null;
  created_at: string;
};

export type RepoSignal = {
  full_name: string;
  language: string | null;
  topics: string[];
  stargazers_count: number;
};

export type SkillFingerprint = {
  languages: Record<string, number>;
  commit_count: number;
  pr_count: number;
  repo_complexity: number;
  primary_language: string;
  experience_level: "beginner" | "intermediate" | "advanced";
  github_username?: string;
  github_avatar?: string;
  /** Top public repos (for Oracle “why matched” copy) */
  top_repo_signals?: RepoSignal[];
  public_repo_count?: number;
};

export type Contribution = {
  id: string;
  user_id: string;
  issue_url: string;
  repo: string;
  branch?: string;
  pr_url?: string;
  status: string;
  maintainer_rating?: number;
  maintainer_comment?: string;
  xp_awarded?: number;
  language?: string;
  merged_at?: string;
  created_at: string;
};

export type BadgeAward = {
  id: string;
  user_id: string;
  badge_slug: string;
  awarded_at: string;
};
