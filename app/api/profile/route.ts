import { NextResponse } from "next/server";
import { auth0 } from "../../../lib/auth0";
import { supabase } from "../../../lib/supabase";

export async function GET() {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", session.user.sub)
    .single();

  // Fetch badges from badge_awards table
  const { data: badgeRows } = await supabase
    .from("badge_awards")
    .select("badge_slug")
    .eq("user_id", session.user.sub);

  const badges = (badgeRows || []).map((b: { badge_slug: string }) => b.badge_slug);

  if (!profile) {
    return NextResponse.json({
      user_id: session.user.sub,
      github_username: session.user.nickname || session.user.name,
      github_avatar: session.user.picture,
      xp: 0,
      rank: "Newbie",
      badges,
      skill_fingerprint: null,
      contributions: [],
    });
  }

  const { data: contributions } = await supabase
    .from("contributions")
    .select("*")
    .eq("user_id", session.user.sub)
    .order("created_at", { ascending: false })
    .limit(10);

  // Merge github_username/avatar from fingerprint or session
  const fp = profile.skill_fingerprint as { github_username?: string; github_avatar?: string } | null;

  return NextResponse.json({
    ...profile,
    github_username: fp?.github_username || session.user.nickname || session.user.name,
    github_avatar: fp?.github_avatar || session.user.picture,
    badges,
    contributions: contributions || [],
  });
}
