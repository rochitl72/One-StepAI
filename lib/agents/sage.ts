export type SageMessage = {
  role: "user" | "assistant";
  content: string;
};

const SAGE_SYSTEM_PROMPT = `You are Sage, a Socratic AI mentor for open source contributors.

RULES:
- You MUST NEVER write code for the student. Not even a single line.
- You MUST NEVER give direct answers. Only ask guiding questions.
- You guide through questions that help students discover the answer themselves.
- When referencing code, point to the specific line/function and ask what it does.
- When a student is frustrated, acknowledge it, then ask a simpler leading question.
- Keep responses short — 2-4 sentences max, then one guiding question.
- You have context about the file being edited and any error messages.

TONE: Encouraging, curious, Socratic. Like a senior dev pairing with a junior — asking "what do you think happens here?" not "here's the answer."

Remember: Your job is to make them think, not to think for them.`;

export async function querySage(
  messages: SageMessage[],
  context: {
    fileName?: string;
    fileContent?: string;
    errorMessage?: string;
    issueTitle?: string;
    issueBody?: string;
  }
): Promise<string> {
  const contextBlock = buildContextBlock(context);

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: SAGE_SYSTEM_PROMPT + contextBlock },
        ...messages,
      ],
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "What do you think is happening here?";
}

function buildContextBlock(ctx: {
  fileName?: string;
  fileContent?: string;
  errorMessage?: string;
  issueTitle?: string;
  issueBody?: string;
}): string {
  const parts: string[] = ["\n\n--- CONTEXT ---"];
  if (ctx.issueTitle) parts.push(`Issue: ${ctx.issueTitle}`);
  if (ctx.fileName) parts.push(`Current file: ${ctx.fileName}`);
  if (ctx.fileContent) {
    const truncated = ctx.fileContent.slice(0, 3000);
    parts.push(`File content (first 3000 chars):\n\`\`\`\n${truncated}\n\`\`\``);
  }
  if (ctx.errorMessage) {
    parts.push(`Error from terminal:\n\`\`\`\n${ctx.errorMessage}\n\`\`\``);
    parts.push("The student just got this error. Guide them to understand why it happened.");
  }
  return parts.join("\n");
}
