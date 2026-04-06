import { NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

export async function GET() {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = (session.user["https://openstep.ai/roles"] as string[]) || [];
  if (!roles.includes("maintainer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch contributions and join profile data manually (schema uses user_id text)
  const { data: contributions, error } = await supabase
    .from("contributions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with profile data
  const enriched = await Promise.all(
    (contributions || []).map(async (c: { user_id: string }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("skill_fingerprint, rank, xp")
        .eq("user_id", c.user_id)
        .single();

      const fp = profile?.skill_fingerprint as { github_username?: string; github_avatar?: string } | null;

      return {
        ...c,
        profiles: {
          github_username: fp?.github_username || c.user_id,
          github_avatar: fp?.github_avatar || null,
          rank: profile?.rank || "Newbie",
          xp: profile?.xp || 0,
        },
      };
    })
  );

  return NextResponse.json({ contributions: enriched });
}
