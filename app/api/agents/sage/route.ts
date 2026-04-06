import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { querySage, SageMessage } from "../../../../lib/agents/sage";

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, context } = await req.json() as {
    messages: SageMessage[];
    context: {
      fileName?: string;
      fileContent?: string;
      errorMessage?: string;
      issueTitle?: string;
      issueBody?: string;
    };
  };

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
  }

  try {
    const reply = await querySage(messages, context || {});
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Sage error:", err);
    return NextResponse.json({ error: "Sage failed" }, { status: 500 });
  }
}
