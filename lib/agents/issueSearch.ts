import type { SkillFingerprint } from "../supabase";
import type { GitHubIssue } from "./oracle";
import { computeIssueDifficulty } from "./oracle";

export type IssueSearchParams = {
  /** Free text — searched in issue title & body */
  query: string;
  language?: string;
  /** GitHub repo topic (e.g. react, machine-learning) */
  topic?: string;
  githubToken: string;
};

/**
 * Custom GitHub issue search (open issues). Uses the same issue shape as Oracle.
 */
export async function runIssueSearch(
  params: IssueSearchParams,
  fingerprint: SkillFingerprint | null
): Promise<GitHubIssue[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (params.githubToken) headers["Authorization"] = `Bearer ${params.githubToken}`;

  const raw = params.query.trim().slice(0, 240).replace(/["'<>]/g, " ");
  if (!raw) return [];

  const parts: string[] = [];
  // Quote multi-word phrases loosely as OR of terms for broader match
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    parts.push(`${tokens[0]} in:title,body`);
  } else {
    parts.push(`(${tokens.join(" ")}) in:title,body`);
  }
  parts.push("is:issue", "is:open", "type:issue");
  if (params.language?.trim()) {
    parts.push(`language:${params.language.trim()}`);
  }
  if (params.topic?.trim()) {
    parts.push(`topic:${params.topic.trim().toLowerCase().replace(/\s+/g, "-")}`);
  }

  const q = parts.join(" ");
  const fp =
    fingerprint ||
    ({
      languages: {},
      commit_count: 0,
      pr_count: 0,
      repo_complexity: 0,
      primary_language: "Unknown",
      experience_level: "intermediate",
    } satisfies SkillFingerprint);

  const res = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=updated&per_page=15`,
    { headers }
  );
  if (!res.ok) return [];

  const data = await res.json();
  const searchSummary = [raw, params.language && `lang:${params.language}`, params.topic && `topic:${params.topic}`]
    .filter(Boolean)
    .join(" · ");

  const who = fp.github_username ? `Your linked GitHub is @${fp.github_username}. ` : "";

  const items: GitHubIssue[] = (data.items || []).map((item: GitHubIssue) => {
    const repoFullName = item.repository_url?.replace("https://api.github.com/repos/", "") || "";
    return {
      ...item,
      repo_full_name: repoFullName,
      difficulty: computeIssueDifficulty(item, fp),
      matched_via_language: params.language || item.language,
      match_reason: `${who}Custom search: “${searchSummary}”. Results come from GitHub’s public issue search (title/body). Difficulty uses your Scout fingerprint when available.`,
      match_source: "search" as const,
    };
  });

  return items;
}
