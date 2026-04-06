import { supabase, RANK_THRESHOLDS, BADGES } from "../supabase";

export type RankerInput = {
  userId: string;        // Auth0 sub (user_id in profiles)
  issueUrl: string;
  repo: string;
  difficulty: number;
  maintainerRating: number | null;
  prUrl: string;
  labels: string[];
  language: string;
  hasTests: boolean;
};

export async function runRanker(input: RankerInput) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", input.userId)
    .single();

  if (!profile) throw new Error("Profile not found");

  // XP formula: base × difficulty_multiplier × rating_bonus
  const base = 100;
  const difficultyMultiplier = 1 + (input.difficulty - 1) * 0.2;
  const ratingBonus = input.maintainerRating ? 1 + (input.maintainerRating - 3) * 0.1 : 1.0;
  const xpAwarded = Math.round(base * difficultyMultiplier * ratingBonus);

  const newXp = (profile.xp || 0) + xpAwarded;
  const newRank = RANK_THRESHOLDS.find((r) => newXp >= r.min && newXp <= r.max)?.name || "Newbie";

  // Existing badges
  const { data: existingBadges } = await supabase
    .from("badge_awards")
    .select("badge_slug")
    .eq("user_id", input.userId);

  const currentBadgeSlugs = (existingBadges || []).map((b: { badge_slug: string }) => b.badge_slug);
  const newBadgeSlugs: string[] = [];

  // Fetch contribution count for badge checks
  const { count: totalContributions } = await supabase
    .from("contributions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", input.userId);

  const total = (totalContributions || 0) + 1;

  if (total === 1 && !currentBadgeSlugs.includes("first_bug") && input.labels.includes("bug")) {
    newBadgeSlugs.push("first_bug");
  }
  if (!currentBadgeSlugs.includes("doc_writer") && input.labels.some((l) => l.includes("doc"))) {
    newBadgeSlugs.push("doc_writer");
  }
  if (!currentBadgeSlugs.includes("test_author") && input.hasTests) {
    newBadgeSlugs.push("test_author");
  }
  if (!currentBadgeSlugs.includes("team_player") && input.maintainerRating === 5) {
    newBadgeSlugs.push("team_player");
  }

  // Language-specific badges
  // Language badges: use total contributions as proxy (language column not in schema)
  const { count: langCount } = await supabase
    .from("contributions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", input.userId);

  const langTotal = (langCount || 0) + 1;
  if (!currentBadgeSlugs.includes("java_hunter") && input.language === "Java" && langTotal >= 3) {
    newBadgeSlugs.push("java_hunter");
  }
  if (!currentBadgeSlugs.includes("pythonista") && input.language === "Python" && langTotal >= 5) {
    newBadgeSlugs.push("pythonista");
  }

  // Update profile XP and rank (using user_id text field)
  await supabase
    .from("profiles")
    .update({ xp: newXp, rank: newRank })
    .eq("user_id", input.userId)
    .eq("id", profile.id);

  // Insert new badges
  if (newBadgeSlugs.length > 0) {
    await supabase.from("badge_awards").insert(
      newBadgeSlugs.map((slug) => ({ user_id: input.userId, badge_slug: slug }))
    );
  }

  // Record contribution (only columns that exist in the schema)
  await supabase.from("contributions").insert({
    user_id: input.userId,
    issue_url: input.issueUrl,
    repo: input.repo,
    pr_url: input.prUrl,
    status: "merged",
    maintainer_rating: input.maintainerRating,
    merged_at: new Date().toISOString(),
  });

  return { xpAwarded, newXp, newRank, earnedBadges: newBadgeSlugs };
}

export { BADGES };
