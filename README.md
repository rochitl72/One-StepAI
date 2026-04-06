# OpenStep AI

> **The LeetCode of Open Source** — an intelligent multi-agent platform that matches students to real GitHub issues, mentors them Socratically, and lets them code, run, and ship inside one unified workspace.

Built for the **Auth0 × Token Vault Hackathon**.

---

## 🏆 Judge Quick Start

**Live demo:** https://your-vercel-url.vercel.app

**Demo credentials:** Sign in with GitHub, then click "Try demo mode" — no real GitHub history required.

**To run locally:**

1. `git clone ... && cd openstep && npm install`
2. `cp env.local.example .env.local` — fill in Auth0, Supabase, and Perplexity keys (see README below)
3. Run `supabase-schema.sql` in your Supabase SQL editor
4. `npm run dev` → http://localhost:3000

---

## What is OpenStep AI?

Every CS student wants to contribute to open source. Almost none know where to start.

OpenStep AI bridges that gap with **6 specialized AI agents**, a **Socratic mentor** powered by Perplexity Sonar, a **Monaco code editor** with a live E2B cloud terminal, and a **LeetCode-style XP system** — all secured by Auth0 and Token Vault so that no agent ever sees your raw credentials.

**One-sentence pitch:** *"OpenStep AI reads your GitHub like a résumé, finds the right open source issue for your exact skill level, loads the code in your browser, and coaches you through it — never handing you the answer."*

---

## Live Demo

```
npm run dev → http://localhost:3000
```

---

## The Six Agents

| Agent | Role | Token Scope |
|-------|------|-------------|
| **Scout** | Reads GitHub profile → builds skill fingerprint (languages, commits, PRs) | Read-only profile |
| **Oracle** | Searches GitHub for issues matched to your exact skill delta | Public search |
| **Sage** | Socratic AI mentor via Perplexity Sonar — forbidden by system prompt from writing code | No credentials |
| **Forge** | Loads repo file tree into Monaco editor + spins up E2B cloud sandbox | File-read only |
| **Guardian** | Listens to GitHub webhooks for PR events, triggers Ranker on merge | Webhook-read only |
| **Ranker** | Computes XP, updates rank, awards smart badges, writes to Supabase | DB write only |

**Solution agent (beta)** — Separate from Sage: optional workspace mode with explicit opt-in. Uses its own API route (`/api/agents/solution`) and system prompt so it may propose concrete code and diffs (Perplexity Sonar). Same structured context as Sage (no raw OAuth token in the LLM prompt). **Generate patch** opens a review modal; **Open PR on GitHub** links to the repo compare page — the app does not silently commit or push.

---

## Auth0 + Token Vault Architecture

Token Vault acts as a **Credential Passport** — each agent receives only the minimum permission it needs, only when it needs it. The LLM (Sage) never sees your raw GitHub token.

```
1. Student logs in via GitHub OAuth → Auth0
2. Auth0 stores GitHub token in Token Vault
3. Agent requests a scoped token for one operation
4. Agent performs the operation, token expires
5. LLM only sees structured result data ✓
```

**Auth0 features used:**
- GitHub Social Login
- Auth0 Actions (fires Scout automatically on login)
- Fine-Grained Authorization (FGA) — gates the Maintainer Dashboard
- M2M Tokens — agents authenticate to each other

---

## Tech Stack

| Layer | Tool | Tier |
|-------|------|------|
| Auth & Security | Auth0 + Token Vault | Free |
| AI Mentor | Perplexity Sonar | API key |
| Code Sandbox | E2B.dev | Free |
| Database | Supabase (PostgreSQL) | Free |
| Source Data | GitHub API | Free |
| Editor | Monaco Editor (VS Code engine) | Free (CDN) |
| Framework | Next.js 16 + Vercel | Free |

---

## Project Structure

```
openstep/
├── app/
│   ├── page.tsx                    # Root — redirects logged-in users to /dashboard
│   ├── LandingPage.tsx             # Public landing page
│   ├── components/                 # AgentPermissionsPanel, MentorMessageContent (markdown chat)
│   ├── dashboard/
│   │   ├── page.tsx                # Auth-guarded server component
│   │   └── DashboardClient.tsx     # XP bar, badges, issue list, Scout/Oracle UI
│   ├── workspace/[issueId]/
│   │   ├── page.tsx                # Auth-guarded server component
│   │   └── WorkspaceClient.tsx     # Monaco + file tree + Sage / Solution tabs + terminal
│   ├── maintainer/
│   │   ├── page.tsx                # Auth0 FGA-gated (maintainer role only)
│   │   └── MaintainerClient.tsx    # Rate contributions, award XP
│   └── api/
│       ├── agents/
│       │   ├── scout/route.ts      # POST — analyze GitHub profile
│       │   ├── oracle/route.ts     # POST — find matched issues
│       │   ├── sage/route.ts       # POST — Socratic chat via Perplexity
│       │   ├── solution/route.ts   # POST — Solution agent (beta); concrete fixes, opt-in
│       │   ├── forge/route.ts      # POST — load repo file tree / file content
│       │   └── ranker/route.ts     # POST — award XP and badges
│       ├── profile/route.ts        # GET — fetch user profile + badges
│       ├── maintainer/
│       │   ├── contributions/route.ts  # GET — list contributions (maintainer only)
│       │   └── rate/route.ts           # POST — submit rating (maintainer only)
│       └── webhook/github/route.ts     # POST — Guardian: GitHub webhook handler
├── lib/
│   ├── auth0.ts                    # Auth0Client instance
│   ├── supabase.ts                 # Supabase server client + types
│   ├── gamedata.ts                 # XP ranks, badges (client-safe, no env vars)
│   ├── m2m.ts                      # Optional M2M token check for agent routes
│   └── agents/
│       ├── scout.ts                # GitHub profile analysis logic
│       ├── oracle.ts               # GitHub issue search + difficulty scoring
│       ├── sage.ts                 # Perplexity Sonar system prompt + API call
│       └── ranker.ts               # XP formula + badge unlock conditions
├── proxy.ts                        # Auth0 request boundary (Next.js 16 convention; replaces middleware.ts)
├── supabase-schema.sql             # Run this in Supabase SQL editor
└── env.local.example               # All required environment variables (copy to .env.local)
```

---

## Gamification

### Rank Ladder

| Rank | XP Required |
|------|------------|
| 🌱 Newbie | 0 XP |
| 🔧 Contributor | 500 XP |
| ⚡ Collaborator | 2,000 XP |
| 🛠️ Maintainer | 8,000 XP |
| 👑 Legend | 25,000 XP |

### XP Formula

```
XP = base(100) × difficulty_multiplier × rating_bonus
```

- `difficulty_multiplier` = 1.0 – 2.8 based on issue difficulty (1–10)
- `rating_bonus` = adjusted by maintainer star rating (1–5)

### Smart Badges

Auto-awarded by the Ranker agent on specific conditions — not generic trophy counts.

| Badge | Condition |
|-------|-----------|
| 🐛 First Bug Fix | First bug-label issue resolved |
| 📚 Doc Writer | First docs PR merged |
| 🧪 Test Author | PR includes new test coverage |
| 🤝 Team Player | Received a 5-star maintainer rating |
| ☕ Java Hunter | 3 Java repos contributed to |
| 🐍 Pythonista | 5 Python PRs merged |
| 🔥 Week Streak | 7 consecutive days active |
| ⭐ Star Repo | Contributed to a 1k+ star repo |

---

## Maintainer Dashboard

Completely invisible to students. Access is gated by **Auth0 Fine-Grained Authorization**:

```typescript
fga.check({
  user: auth0.userId,
  relation: "maintainer",
  object: "dashboard:maintainer"
})
```

Maintainers can:
- See all students actively working their issues
- Rate PRs (1–5 stars) — rating feeds directly into the student's XP calculation
- Track which issues attract contributors

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/openstep-ai.git
cd openstep-ai
npm install
```

### 2. Set up environment variables

```bash
cp env.local.example .env.local
```

Fill in `.env.local`:

```env
# Auth0 — get from manage.auth0.com → Applications → your app
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=                        # openssl rand -hex 32

# Supabase — get from supabase.com → your project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Perplexity — get from perplexity.ai/settings/api
PERPLEXITY_API_KEY=pplx-your-key

# E2B — get from e2b.dev/dashboard
E2B_API_KEY=your-e2b-key

# GitHub — optional, increases API rate limits
GITHUB_TOKEN=ghp_your-pat

# GitHub Webhooks — generate with: openssl rand -hex 32
GITHUB_WEBHOOK_SECRET=your-webhook-secret
```

### 3. Set up Auth0

In your Auth0 Dashboard → Applications → your app → Settings:

- **Allowed Callback URLs:** `http://localhost:3000/auth/callback`
- **Allowed Logout URLs:** `http://localhost:3000`
- **Allowed Web Origins:** `http://localhost:3000`

Enable **GitHub** as a Social Connection under Authentication → Social.

### 4. Set up Supabase

Run `supabase-schema.sql` in your Supabase project's SQL editor (Dashboard → SQL Editor).

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## User Flow

```
1. Student signs in with GitHub via Auth0
      ↓
2. Auth0 Actions hook fires → Scout agent analyzes GitHub profile
      ↓
3. Oracle finds matching good-first-issues ranked by skill delta
      ↓
4. Student picks an issue → Forge loads the repo in Monaco editor
      ↓
5. Student codes + runs tests in E2B sandbox
   Sage monitors terminal output → annotates errors Socratically
      ↓
6. Student pushes branch + opens PR
   Guardian webhook fires → dashboard updates to "PR In Review"
      ↓
7. Maintainer rates PR (1–5 stars) on Maintainer Dashboard
      ↓
8. Ranker awards XP + badges → public contribution profile updates
```

---

## Sage — The Socratic System Prompt

Sage is explicitly forbidden from writing code:

```
You MUST NEVER write code for the student. Not even a single line.
You MUST NEVER give direct answers. Only ask guiding questions.
Keep responses short — 2-4 sentences, then one guiding question.
```

This is enforced by prompt engineering. Students think, students code, students learn.

---

## Deployment

```bash
# Deploy to Vercel
vercel deploy

# Add environment variables in Vercel dashboard
# Update Auth0 Allowed Callback URLs to include your Vercel URL
```

---

## Hackathon Highlights

**Why Auth0 and Token Vault are architectural, not cosmetic:**

- Every agent interaction is gated by M2M tokens
- The LLM (Sage) never touches credentials — it only sees structured data Forge fetched
- The Maintainer Dashboard is rendered server-side and FGA-checked before any JSX loads
- Students can't escalate to maintainer scope — different token, different UI, enforced by Auth0

**Key phrases for judges:**
- *"Credential Passport"* — Token Vault releases per-agent, per-operation, minimum-scope tokens
- *"Principle of Least Privilege, enforced by design"*
- *"Socratic System Prompt"* — AI is forbidden from writing code by its own instructions
- *"Two-Sided Marketplace"* — students and maintainers both have strong reasons to use the platform

---

## License

MIT

---

*Built for the Auth0 × Token Vault Hackathon · OpenStep.ai*
