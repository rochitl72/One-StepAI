import { SkillFingerprint } from "../supabase";

type GitHubRepo = {
  full_name: string;
  language: string | null;
  stargazers_count: number;
  topics?: string[];
};

export async function runScout(githubUsername: string, githubToken: string): Promise<SkillFingerprint> {
  const trimmed = githubUsername?.trim();
  if (!trimmed) {
    throw new Error("GitHub username is required for Scout");
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;

  const reposRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(trimmed)}/repos?per_page=100&sort=updated`,
    { headers }
  );
  const rawRepos = (await reposRes.json()) as unknown;
  const repoList: GitHubRepo[] = Array.isArray(rawRepos) ? (rawRepos as GitHubRepo[]) : [];

  // Aggregate languages (primary language per repo, same as GitHub UI)
  const languages: Record<string, number> = {};
  let totalStars = 0;
  for (const repo of repoList) {
    if (repo.language) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }
    totalStars += repo.stargazers_count || 0;
  }

  const top_repo_signals = [...repoList]
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 12)
    .map((r) => ({
      full_name: r.full_name,
      language: r.language,
      topics: Array.isArray(r.topics) ? r.topics : [],
      stargazers_count: r.stargazers_count || 0,
    }));

  // Fetch events for commit count estimate
  const eventsRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(trimmed)}/events?per_page=100`,
    { headers }
  );
  const events = await eventsRes.json();
  const pushEvents = Array.isArray(events)
    ? events.filter((e: { type: string }) => e.type === "PushEvent")
    : [];
  const commitCount = pushEvents.reduce((sum: number, e: { payload?: { commits?: unknown[] } }) => {
    return sum + (e.payload?.commits?.length || 0);
  }, 0);

  // PR count from events
  const prEvents = Array.isArray(events)
    ? events.filter((e: { type: string }) => e.type === "PullRequestEvent")
    : [];
  const prCount = prEvents.length;

  const primaryLanguage = Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";
  const repoCount = repoList.length;
  const repoComplexity = Math.min(10, Math.floor((totalStars + repoCount * 2) / 10));

  let experienceLevel: "beginner" | "intermediate" | "advanced" = "beginner";
  if (commitCount > 200 || prCount > 20 || repoCount > 15) {
    experienceLevel = "advanced";
  } else if (commitCount > 50 || prCount > 5 || repoCount > 5) {
    experienceLevel = "intermediate";
  }

  return {
    languages,
    commit_count: commitCount,
    pr_count: prCount,
    repo_complexity: repoComplexity,
    primary_language: primaryLanguage,
    experience_level: experienceLevel,
    github_username: trimmed,
    top_repo_signals,
    public_repo_count: repoCount,
  };
}
