import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { runOracle } from "../../../../lib/agents/oracle";
import { supabase } from "../../../../lib/supabase";
import type { SkillFingerprint } from "../../../../lib/supabase";
import { mergeProfileGithubIntoFingerprint } from "../../../../lib/fingerprintForUser";

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { githubToken } = await req.json();

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("skill_fingerprint, github_username")
      .eq("user_id", session.user.sub)
      .single();

    if (!profile?.skill_fingerprint) {
      return NextResponse.json({ error: "Run Scout first" }, { status: 400 });
    }

    const fp = mergeProfileGithubIntoFingerprint(
      profile.skill_fingerprint as SkillFingerprint,
      profile.github_username
    );
    if (!fp) {
      return NextResponse.json({ error: "Run Scout first" }, { status: 400 });
    }

    const issues = await runOracle(
      fp,
      githubToken || process.env.GITHUB_TOKEN || ""
    );

    return NextResponse.json({ issues });
  } catch (err) {
    console.error("Oracle error:", err);
    return NextResponse.json({ error: "Oracle failed" }, { status: 500 });
  }
}
