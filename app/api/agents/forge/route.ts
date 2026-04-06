import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "../../../../lib/auth0";

export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repoFullName, path, githubToken } = await req.json();

  const token = githubToken || process.env.GITHUB_TOKEN || "";

  try {
    if (path) {
      // Fetch file content
      const res = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/${path}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            Accept: "application/vnd.github+json",
          },
        }
      );
      if (!res.ok) return NextResponse.json({ error: "File not found" }, { status: 404 });
      const data = await res.json();
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return NextResponse.json({ content, sha: data.sha, name: data.name });
    } else {
      // Fetch repo tree
      const repoRes = await fetch(
        `https://api.github.com/repos/${repoFullName}/git/trees/HEAD?recursive=1`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            Accept: "application/vnd.github+json",
          },
        }
      );
      if (!repoRes.ok) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
      const treeData = await repoRes.json();
      const files = (treeData.tree || [])
        .filter((f: { type: string; path: string }) => f.type === "blob" && !f.path.includes("node_modules"))
        .map((f: { path: string; sha: string }) => ({ path: f.path, sha: f.sha }))
        .slice(0, 300);
      return NextResponse.json({ files });
    }
  } catch (err) {
    console.error("Forge error:", err);
    return NextResponse.json({ error: "Forge failed" }, { status: 500 });
  }
}
