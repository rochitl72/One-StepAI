# How Token Vault Solved the LLM Credentials Problem in OpenStep AI

*Building a multi-agent open source mentorship platform for the Authorized to Act Hackathon*

---

## The Problem: LLMs + User Credentials = Security Nightmare

When I started building OpenStep AI — a platform where AI agents read your GitHub profile, find matching open source issues, and mentor you Socratically — I ran into a fundamental security problem immediately.

The application needs your GitHub token. Agents need to read your repos, search for issues, load file trees. But the system also runs a large language model (Sage, powered by Perplexity Sonar) that mentors students. If I naively passed the GitHub token into the LLM context, I'd be feeding raw credentials into a third-party AI model. That's not acceptable.

**Auth0 Token Vault solved this at the architectural level.**

---

## The Credential Passport Pattern

Instead of storing tokens myself, Token Vault acts as a Credential Passport. Here's how it works in OpenStep:

1. Student signs in with GitHub via Auth0 OAuth
2. Auth0 stores the GitHub token in Token Vault — I never see it
3. When an agent needs GitHub access, it requests a scoped token for one specific operation
4. The agent performs the operation, the token expires
5. The LLM (Sage) only ever sees structured output — filenames, error messages, issue text — never the token

```typescript
// Sage never receives credentials — only structured context
const reply = await querySage(messages, {
  fileName: selectedFile,      // "auth.py"
  errorMessage: terminalError, // "TypeError: NoneType..."
  issueTitle: issue.title,     // "Fix null username validation"
  // No token. No credentials. Zero raw secret exposure.
});
```

---

## Fine-Grained Authorization: Two Users, One Codebase

OpenStep has two types of users: students and maintainers. Maintainers can see all student contributions and rate PRs (which feeds the XP system). Students cannot access the maintainer view at all.

Auth0 FGA enforces this at the server layer:

```typescript
const result = await fga.check({
  user: session.user.sub,
  relation: "maintainer",
  object: "dashboard:maintainer"
});

if (!result.allowed) redirect("/dashboard");
```

The maintainer page never renders for a student — not just hidden, but server-rejected before any JSX executes.

---

## What I Learned

Token Vault changes how you think about multi-agent architectures. Instead of asking "how do I secure this token?", you ask "which agent actually needs this capability, and for how long?" The Principle of Least Privilege stops being a best practice you bolt on — it becomes the design.

The result: 6 agents, 0 raw token exposures, and a Socratic mentor that genuinely cannot write code for students even if it wanted to.

---

*Built for the Authorized to Act: Auth0 for AI Agents Hackathon · OpenStep.ai*
