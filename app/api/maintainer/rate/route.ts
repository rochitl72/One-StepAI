import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";
import { supabase } from "../../../../lib/supabase";

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = (session.user["https://openstep.ai/roles"] as string[]) || [];
  if (!roles.includes("maintainer")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { contributionId, rating, comment } = await req.json();
  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  const { error } = await supabase
    .from("contributions")
    .update({ maintainer_rating: rating, maintainer_comment: comment })
    .eq("id", contributionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
