import type { SageMessage } from "./sage";

export type { SageMessage as SolutionMessage };

const SOLUTION_SYSTEM_PROMPT = `You are the Solution agent (beta) — a separate mode from Sage the Socratic mentor.

ROLE:
- You MAY propose concrete code fixes: full snippets, patches, or step-by-step edits.
- Always pair code with a short explanation: what changed, why, and risks (breaking changes, tests to run).
- Use markdown: ### Explanation, then ### Proposed code (with fenced code blocks and language tags).
- If suggesting multiple files, label each block with the file path in a comment at the top or a small heading.
- Prefer unified diff format (---/+++ lines) when the change is localized; otherwise show full file content for small files.
- Never claim you already pushed to GitHub or merged a PR — the user must run git and open PRs explicitly.

SECURITY NOTE FOR USER:
- Remind briefly that this mode reasons over the same structured context as the app provides (issue text, open file excerpt) — not raw OAuth tokens in the prompt — but proposing write operations is a higher-impact workflow than Socratic mode.

TONE: Professional, concise, actionable.`;

const PATCH_ONLY_PROMPT = `You are the Solution agent (beta), patch-only request.

Output ONLY a valid unified diff (git diff style) that implements the fix discussed. No prose before or after the diff unless inside diff comments.
If you cannot produce a diff, output a single code block with the full replacement file content and the path in the first line as a comment.

Context: same issue and file as the main conversation.`;

export async function querySolution(
  messages: SageMessage[],
  context: {
    fileName?: string;
    fileContent?: string;
    errorMessage?: string;
    issueTitle?: string;
    issueBody?: string;
  },
  options?: { patchOnly?: boolean }
): Promise<string> {
  const contextBlock = buildSolutionContext(context);
  const system = (options?.patchOnly ? PATCH_ONLY_PROMPT : SOLUTION_SYSTEM_PROMPT) + contextBlock;

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [{ role: "system", content: system }, ...messages],
      max_tokens: options?.patchOnly ? 2048 : 3072,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Could not generate a solution.";
}

function buildSolutionContext(ctx: {
  fileName?: string;
  fileContent?: string;
  errorMessage?: string;
  issueTitle?: string;
  issueBody?: string;
}): string {
  const parts: string[] = ["\n\n--- CONTEXT (structured; no raw GitHub OAuth token) ---"];
  if (ctx.issueTitle) parts.push(`Issue title: ${ctx.issueTitle}`);
  if (ctx.issueBody) parts.push(`Issue body (excerpt):\n${ctx.issueBody.slice(0, 4000)}`);
  if (ctx.fileName) parts.push(`Current file: ${ctx.fileName}`);
  if (ctx.fileContent) {
    const truncated = ctx.fileContent.slice(0, 8000);
    parts.push(`File content (excerpt):\n\`\`\`\n${truncated}\n\`\`\``);
  }
  if (ctx.errorMessage) {
    parts.push(`Terminal / error output:\n\`\`\`\n${ctx.errorMessage.slice(0, 2000)}\n\`\`\``);
  }
  return parts.join("\n");
}
