// Demo fingerprint for judges — bypasses Scout entirely
export const DEMO_FINGERPRINT = {
  languages: { TypeScript: 12, Python: 8, JavaScript: 6, Go: 3, Rust: 1 },
  commit_count: 87,
  pr_count: 14,
  repo_complexity: 6,
  primary_language: "TypeScript",
  experience_level: "intermediate" as const,
  github_username: "demo-judge",
  github_avatar: "https://avatars.githubusercontent.com/u/583231?v=4",
  public_repo_count: 24,
  top_repo_signals: [
    { full_name: "demo-judge/web-app", language: "TypeScript", topics: ["react", "nextjs"], stargazers_count: 42 },
    { full_name: "demo-judge/ml-utils", language: "Python", topics: ["machine-learning"], stargazers_count: 18 },
    { full_name: "demo-judge/cli-tool", language: "Go", topics: ["cli"], stargazers_count: 7 },
  ],
};
