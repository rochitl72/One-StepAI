import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { runOracle } from "../../../../lib/agents/oracle";
import { supabase } from "../../../../lib/supabase";

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { githubToken } = await req.json();

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("skill_fingerprint")
      .eq("user_id", session.user.sub)
      .single();

    if (!profile?.skill_fingerprint) {
      return NextResponse.json({ error: "Run Scout first" }, { status: 400 });
    }

    const issues = await runOracle(
      profile.skill_fingerprint,
      githubToken || process.env.GITHUB_TOKEN || ""
    );

    return NextResponse.json({ issues });
  } catch (err) {
    console.error("Oracle error:", err);
    return NextResponse.json({ error: "Oracle failed" }, { status: 500 });
  }
}
