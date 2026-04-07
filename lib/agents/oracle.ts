import type { SkillFingerprint, RepoSignal } from "../supabase";

export type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  body: string;
  html_url: string;
  labels?: { name: string }[];
  repository_url: string;
  repo_full_name?: string;
  language?: string;
  /** 1–10 from computeIssueDifficulty */
  difficulty?: number;
  comments?: number;
  /** Language filter used in the GitHub search query that returned this issue */
  matched_via_language?: string;
  /** Human-readable: why this issue was suggested for you */
  match_reason?: string;
  match_source?: "oracle" | "search";
};

export function computeIssueDifficulty(issue: GitHubIssue, fp: SkillFingerprint): number {
  return computeDifficulty(issue, fp);
}

function buildMatchReason(lang: string, fp: SkillFingerprint, labelFilter: string): string {
  const repoCount = fp.public_repo_count ?? 0;
  const langRepoCount = fp.languages[lang] ?? 0;
  const examples =
    fp.top_repo_signals?.filter((r) => r.language === lang).slice(0, 3) ?? ([] as RepoSignal[]);
  const topicHint =
    fp.top_repo_signals
      ?.flatMap((r) => r.topics || [])
      .filter((t, i, a) => a.indexOf(t) === i)
      .slice(0, 4)
      .join(", ") || "";

  const parts: string[] = [];
  parts.push(
    `Oracle ran a live GitHub search: open issues with ${labelFilter} and repository language “${lang}”.`
  );
  if (fp.github_username) {
    parts.push(`Your public GitHub profile @${fp.github_username} was scanned by Scout to pick these languages.`);
  }
  if (langRepoCount > 0) {
    parts.push(`You have ${langRepoCount} public repo(s) whose primary language on GitHub is ${lang}.`);
  } else if (repoCount > 0) {
    parts.push(`Language stats come from your ${repoCount} public repos (aggregated in your skill fingerprint).`);
  }
  if (examples.length > 0) {
    parts.push(`Repos on your account that use ${lang} include: ${examples.map((e) => e.full_name).join(", ")}.`);
  }
  if (topicHint) {
    parts.push(`Topics you work with include: ${topicHint}.`);
  }
  return parts.join(" ");
}

export async function runOracle(
  fingerprint: SkillFingerprint,
  githubToken: string
): Promise<GitHubIssue[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;

  let topLanguages = Object.entries(fingerprint.languages || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);

  if (topLanguages.length === 0 && fingerprint.primary_language && fingerprint.primary_language !== "Unknown") {
    topLanguages = [fingerprint.primary_language];
  }
  if (topLanguages.length === 0) {
    topLanguages = ["JavaScript", "TypeScript", "Python"];
  }

  const allIssues: GitHubIssue[] = [];

  for (const lang of topLanguages) {
    const labelFilter =
      fingerprint.experience_level === "beginner"
        ? 'label:"good first issue"'
        : fingerprint.experience_level === "intermediate"
          ? 'label:"help wanted"'
          : 'label:"help wanted" stars:>1000';
    const q = `${labelFilter} language:${lang} state:open`;

    const res = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=created&per_page=10`,
      { headers }
    );
    if (!res.ok) continue;
    const data = await res.json();
    const reason = buildMatchReason(lang, fingerprint, labelFilter);

    const items: GitHubIssue[] = (data.items || []).map((item: GitHubIssue) => {
      const repoFullName = item.repository_url?.replace("https://api.github.com/repos/", "") || "";
      return {
        ...item,
        repo_full_name: repoFullName,
        difficulty: computeDifficulty(item, fingerprint),
        matched_via_language: lang,
        match_reason: reason,
        match_source: "oracle" as const,
      };
    });
    allIssues.push(...items);
  }

  const seen = new Set<number>();
  const unique = allIssues.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  return unique.sort((a, b) => (a.difficulty || 5) - (b.difficulty || 5)).slice(0, 12);
}

/**
 * Difficulty 1=easy … 10=hard.
 */
function computeDifficulty(issue: GitHubIssue, fp: SkillFingerprint): number {
  const labelNames = (issue.labels || []).map((l) => l.name.toLowerCase());
  const has = (s: string) => labelNames.some((l) => l === s || l.includes(s));

  let score = 5;
  if (has("good first issue")) {
    score = 2;
  } else {
    if (has("bug")) score -= 1;
    if (has("documentation") || has("docs")) score -= 1;
    if (has("enhancement")) score += 1;
    if (labelNames.some((l) => l.includes("feature"))) score += 2;
    if (has("help wanted")) score += 0;
    if (has("question")) score -= 1;
    if (has("security")) score += 2;
    if (has("performance")) score += 1;
  }

  const bodyLen = (issue.body || "").length;
  if (bodyLen > 4500) score += 2;
  else if (bodyLen > 2500) score += 1;
  else if (bodyLen > 1200) score += 0;
  else if (bodyLen < 80 && bodyLen > 0) score -= 1;

  const title = (issue.title || "").trim();
  if (title.length > 90) score += 1;
  if (title.split(/\s+/).length > 18) score += 1;

  const c = typeof issue.comments === "number" ? issue.comments : 0;
  if (c > 50) score += 2;
  else if (c > 20) score += 1;
  else if (c > 8) score += 0;

  if ((issue.labels || []).length >= 6) score += 1;

  if (fp.experience_level === "beginner") {
    score = Math.min(score, 6);
    score = Math.max(1, score - 1);
  } else if (fp.experience_level === "intermediate") {
    score = Math.min(Math.max(score, 2), 8);
  } else {
    score = Math.min(10, Math.max(3, score));
  }

  return Math.min(10, Math.max(1, Math.round(score)));
}
