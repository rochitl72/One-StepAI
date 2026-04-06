import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabase } from "../../../../lib/supabase";

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get("x-hub-signature-256") || "";
  const secret = process.env.GITHUB_WEBHOOK_SECRET || "";

  if (secret) {
    const expected = "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const event = req.headers.get("x-github-event");
  const body = JSON.parse(payload);

  if (event === "pull_request") {
    const pr = body.pull_request;
    const action = body.action;

    if (action === "opened" || action === "reopened") {
      // Update matching contribution to pr_submitted
      await supabase
        .from("contributions")
        .update({ pr_url: pr.html_url, status: "pr_submitted" })
        .eq("user_id", body.sender?.login)
        .eq("status", "working");
    }

    if (action === "closed" && pr.merged) {
      await supabase
        .from("contributions")
        .update({ status: "merged", merged_at: new Date().toISOString() })
        .eq("pr_url", pr.html_url);
    }
  }

  return NextResponse.json({ ok: true });
}
