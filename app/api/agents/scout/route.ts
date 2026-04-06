import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { runScout } from "../../../../lib/agents/scout";
import { supabase } from "../../../../lib/supabase";

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { githubUsername, githubToken } = await req.json();

  try {
    const fingerprint = await runScout(
      githubUsername,
      githubToken || process.env.GITHUB_TOKEN || ""
    );

    // Store github_username/avatar inside the fingerprint jsonb (no separate columns in schema)
    const enrichedFingerprint = {
      ...fingerprint,
      github_username: githubUsername,
      github_avatar: session.user.picture,
    };

    // Check if profile exists, update or insert
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, xp, rank")
      .eq("user_id", session.user.sub)
      .single();

    if (existing) {
      await supabase
        .from("profiles")
        .update({ skill_fingerprint: enrichedFingerprint })
        .eq("user_id", session.user.sub);
    } else {
      await supabase.from("profiles").insert({
        user_id: session.user.sub,
        skill_fingerprint: enrichedFingerprint,
        xp: 0,
        rank: "Newbie",
      });
    }

    return NextResponse.json({ fingerprint: enrichedFingerprint });
  } catch (err) {
    console.error("Scout error:", err);
    return NextResponse.json({ error: "Scout failed" }, { status: 500 });
  }
}
