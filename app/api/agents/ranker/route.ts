import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { runRanker } from "../../../../lib/agents/ranker";

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  try {
    const result = await runRanker({
      userId: session.user.sub,
      issueUrl: body.issueUrl,
      repo: body.repo || "",
      difficulty: body.difficulty || 5,
      maintainerRating: body.maintainerRating || null,
      prUrl: body.prUrl,
      labels: body.labels || [],
      language: body.language || "Unknown",
      hasTests: body.hasTests || false,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Ranker error:", err);
    return NextResponse.json({ error: "Ranker failed" }, { status: 500 });
  }
}
