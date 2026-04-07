import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";
import { runIssueSearch } from "../../../../lib/agents/issueSearch";
import type { SkillFingerprint } from "../../../../lib/supabase";
import { mergeProfileGithubIntoFingerprint } from "../../../../lib/fingerprintForUser";

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, language, topic, githubToken } = await req.json() as {
    query?: string;
    language?: string;
    topic?: string;
    githubToken?: string;
  };

  if (!query || typeof query !== "string" || !query.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("skill_fingerprint, github_username")
    .eq("user_id", session.user.sub)
    .single();

  const fp =
    mergeProfileGithubIntoFingerprint(
      profile?.skill_fingerprint as SkillFingerprint | undefined,
      profile?.github_username
    ) || null;

  try {
    const issues = await runIssueSearch(
      {
        query: query.trim(),
        language: language?.trim() || undefined,
        topic: topic?.trim() || undefined,
        githubToken: githubToken || process.env.GITHUB_TOKEN || "",
      },
      fp
    );
    return NextResponse.json({ issues });
  } catch (err) {
    console.error("Issue search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
