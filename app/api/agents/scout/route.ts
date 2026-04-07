import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { runScout } from "../../../../lib/agents/scout";
import { supabase } from "../../../../lib/supabase";
import { isValidGithubUsername, normalizeGithubUsername } from "../../../../lib/githubUsername";

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { githubUsername, githubToken } = await req.json();

  if (githubUsername === "demo" || githubUsername?.startsWith?.("demo-")) {
    const { DEMO_FINGERPRINT } = await import("../../../../lib/demoFingerprint");
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", session.user.sub)
      .single();

    if (existing) {
      await supabase
        .from("profiles")
        .update({ skill_fingerprint: DEMO_FINGERPRINT })
        .eq("user_id", session.user.sub);
    } else {
      await supabase.from("profiles").insert({
        user_id: session.user.sub,
        skill_fingerprint: DEMO_FINGERPRINT,
        xp: 750,
        rank: "Contributor",
      });
    }
    return NextResponse.json({ fingerprint: DEMO_FINGERPRINT, demo: true });
  }

  const normalized = normalizeGithubUsername(
    typeof githubUsername === "string" ? githubUsername : ""
  );
  if (!isValidGithubUsername(normalized)) {
    return NextResponse.json(
      { error: "Enter a valid GitHub username (not your Google name)." },
      { status: 400 }
    );
  }

  try {
    const fingerprint = await runScout(
      normalized,
      githubToken || process.env.GITHUB_TOKEN || ""
    );

    const enrichedFingerprint = {
      ...fingerprint,
      github_username: normalized,
      github_avatar: session.user.picture,
    };

    const { data: existing } = await supabase
      .from("profiles")
      .select("id, xp, rank")
      .eq("user_id", session.user.sub)
      .single();

    if (existing) {
      await supabase
        .from("profiles")
        .update({
          skill_fingerprint: enrichedFingerprint,
          github_username: normalized,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.user.sub);
    } else {
      await supabase.from("profiles").insert({
        user_id: session.user.sub,
        github_username: normalized,
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
