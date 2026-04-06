import { SkillFingerprint } from "../supabase";

export type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  body: string;
  html_url: string;
  labels: { name: string }[];
  repository_url: string;
  repo_full_name?: string;
  language?: string;
  difficulty?: number;
};

export async function runOracle(
  fingerprint: SkillFingerprint,
  githubToken: string
): Promise<GitHubIssue[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;

  const topLanguages = Object.entries(fingerprint.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);

  const queries: string[] = [];

  for (const lang of topLanguages) {
    const labelFilter =
      fingerprint.experience_level === "beginner"
        ? 'label:"good first issue"'
        : fingerprint.experience_level === "intermediate"
        ? 'label:"help wanted"'
        : 'label:"help wanted" stars:>1000';
    queries.push(`${labelFilter} language:${lang} state:open`);
  }

  const allIssues: GitHubIssue[] = [];

  for (const q of queries) {
    const res = await fetch(
      `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=created&per_page=10`,
      { headers }
    );
    if (!res.ok) continue;
    const data = await res.json();
    const items: GitHubIssue[] = (data.items || []).map((item: GitHubIssue) => {
      const repoFullName = item.repository_url?.replace("https://api.github.com/repos/", "") || "";
      return {
        ...item,
        repo_full_name: repoFullName,
        difficulty: computeDifficulty(item, fingerprint),
      };
    });
    allIssues.push(...items);
  }

  // Deduplicate and sort by skill delta (closest to user's level)
  const seen = new Set<number>();
  const unique = allIssues.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });

  return unique.sort((a, b) => (a.difficulty || 5) - (b.difficulty || 5)).slice(0, 12);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function computeDifficulty(issue: GitHubIssue, _fp: SkillFingerprint): number {
  const labelNames = issue.labels.map((l) => l.name.toLowerCase());
  let base = 5;
  if (labelNames.includes("good first issue")) base = 2;
  else if (labelNames.includes("help wanted")) base = 5;
  else if (labelNames.includes("bug")) base = 4;
  else if (labelNames.includes("enhancement")) base = 6;

  const bodyLen = (issue.body || "").length;
  if (bodyLen > 2000) base += 1;

  return Math.min(10, Math.max(1, base));
}
