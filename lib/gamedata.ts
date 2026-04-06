// Pure constants — safe to import in client components (no supabase dependency)

export const RANK_THRESHOLDS = [
  { name: "Newbie", emoji: "🌱", min: 0, max: 499 },
  { name: "Contributor", emoji: "🔧", min: 500, max: 1999 },
  { name: "Collaborator", emoji: "⚡", min: 2000, max: 7999 },
  { name: "Maintainer", emoji: "🛠️", min: 8000, max: 24999 },
  { name: "Legend", emoji: "👑", min: 25000, max: Infinity },
];

export function getRank(xp: number) {
  return RANK_THRESHOLDS.find((r) => xp >= r.min && xp <= r.max) ?? RANK_THRESHOLDS[0];
}

export const BADGES = [
  { id: "first_bug", emoji: "🐛", name: "First Bug Fix", desc: "First bug-type issue resolved" },
  { id: "doc_writer", emoji: "📚", name: "Doc Writer", desc: "First documentation PR merged" },
  { id: "java_hunter", emoji: "☕", name: "Java Hunter", desc: "3 Java repos contributed to" },
  { id: "pythonista", emoji: "🐍", name: "Pythonista", desc: "5 Python PRs merged" },
  { id: "week_streak", emoji: "🔥", name: "Week Streak", desc: "7 consecutive days active" },
  { id: "star_repo", emoji: "⭐", name: "Star Repo", desc: "Contributed to 1k+ star repo" },
  { id: "test_author", emoji: "🧪", name: "Test Author", desc: "PR includes new test coverage" },
  { id: "team_player", emoji: "🤝", name: "Team Player", desc: "Got 5-star maintainer rating" },
];
