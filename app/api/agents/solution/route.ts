import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { querySolution } from "../../../../lib/agents/solution";
import type { SageMessage } from "../../../../lib/agents/sage";
import { verifyM2MToken } from "../../../../lib/m2m";

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const m2mToken = req.headers.get("x-agent-token");
  if (m2mToken && !verifyM2MToken(m2mToken, "solution")) {
    return NextResponse.json({ error: "Invalid agent token" }, { status: 403 });
  }

  const body = await req.json() as {
    messages: SageMessage[];
    context: {
      fileName?: string;
      fileContent?: string;
      errorMessage?: string;
      issueTitle?: string;
      issueBody?: string;
    };
    patchOnly?: boolean;
    acknowledgedElevated?: boolean;
  };

  if (!body.acknowledgedElevated) {
    return NextResponse.json(
      { error: "Solution agent requires explicit user acknowledgment (elevated workflow)." },
      { status: 400 }
    );
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  try {
    const reply = await querySolution(body.messages, body.context || {}, {
      patchOnly: Boolean(body.patchOnly),
    });
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Solution agent error:", err);
    return NextResponse.json({ error: "Solution agent failed" }, { status: 500 });
  }
}
