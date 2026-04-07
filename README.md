# One-Step AI (OpenStep)

**Match contributors to real open-source issues, mentor in-app, and gamify progress** — built with **Next.js**, **Auth0**, **Supabase**, **GitHub**, **Perplexity**, and **E2B**.

Public repo: [github.com/rochitl72/One-StepAI](https://github.com/rochitl72/One-StepAI)

---

## Judge / demo quick start

**Live demo:** https://one-step-ai.vercel.app

**Demo video:** https://youtu.be/bdcfjKUloF0?si=L8jRUAp-C9X5P3p-

1. Open the deployed site (after [Vercel](#deploy-to-vercel-free)) or run locally below.
2. **Sign in** (Auth0 — e.g. Google).
3. On the dashboard, enter your **GitHub username**, run **Scout**, then **Oracle** (or use **Search issues**).
4. Optional: **Try demo mode** (Scout with demo fingerprint — no GitHub needed).

---

## Features

| Area | What it does |
|------|----------------|
| **Scout** | Reads **public** GitHub repos + events for the handle you enter → **skill fingerprint** saved to Supabase. |
| **Oracle** | Live GitHub issue search by your top languages + experience tier; **“Why matched”** explains the link to your repos. |
| **Search** | Keyword / language / **topic** search against open issues. |
| **Sage** | Socratic mentor via **Perplexity Sonar** (structured context only — no raw tokens in prompts). |
| **Solution β** | Opt-in agent for concrete suggestions / patch flow (explicit acknowledgment required). |
| **Forge** | Monaco + repo tree + **E2B** terminal (keys from env). |
| **Ranker / badges / XP** | Maintainer ratings and contribution flow update profile XP and `badge_awards`. |
| **Auth0 M2M** | Optional **`x-agent-token`**: Auth0 **JWT** (client credentials) or legacy HMAC — see `lib/m2m.ts`. |

For an honest security and data-flow summary, see **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Tech stack

- **Next.js 16** (App Router), **React 19**, **Tailwind 4**
- **Auth0** (`@auth0/nextjs-auth0`) — `proxy.ts` for auth boundary
- **Supabase** (Postgres + service role from API routes)
- **GitHub REST API** (public repos, search, file/tree)
- **Perplexity API** (Sage / Solution)
- **E2B** (sandbox)

---

## Repository layout

```
├── app/                    # Next.js App Router (pages, API routes, components)
│   ├── api/agents/         # scout, oracle, search, sage, solution, forge, ranker
│   ├── dashboard/
│   ├── workspace/
│   ├── maintainer/
│   └── components/
├── lib/                    # auth0, supabase, m2m, agents/*, gamedata, helpers
├── supabase/
│   └── schema.sql          # Run once in Supabase SQL Editor
├── scripts/
│   └── verify-env.mjs      # npm run check-env — validates keys (no secrets printed)
├── docs/
│   └── ARCHITECTURE.md
├── env.local.example       # Copy to .env.local
├── proxy.ts
└── package.json
```

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/rochitl72/One-StepAI.git
cd One-StepAI
npm install
```

### 2. Environment variables

```bash
cp env.local.example .env.local
```

Fill **`.env.local`** (never commit it). Minimum:

| Variable | Purpose |
|----------|---------|
| `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` | Web login |
| `APP_BASE_URL` | e.g. `http://localhost:3000` — use production URL on Vercel |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Database |
| `PERPLEXITY_API_KEY` | Sage / Solution |
| `E2B_API_KEY` | Forge terminal |

**Recommended:**

| Variable | Purpose |
|----------|---------|
| `GITHUB_TOKEN` | Classic PAT with `public_repo` (or similar) — **rate limits** for GitHub API |
| `AUTH0_AUDIENCE`, `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET` | M2M JWT for `x-agent-token` |
| `GITHUB_WEBHOOK_SECRET` | If you configure GitHub webhooks for Guardian |
| `AUTH0_M2M_SECRET` | Optional legacy HMAC for `x-agent-token` |

See **`env.local.example`** for comments.

### 3. Supabase

In the Supabase dashboard → **SQL Editor**, run:

**`supabase/schema.sql`**

### 4. Auth0 application URLs (local)

**Applications → your app → Settings:**

- **Allowed Callback URLs:** `http://localhost:3000/auth/callback`
- **Allowed Logout URLs:** `http://localhost:3000`
- **Allowed Web Origins:** `http://localhost:3000`

Enable your **social connection** (e.g. Google) and attach it to this application.

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Verify credentials (optional)

```bash
npm run check-env
```

---

## Deploy to Vercel (free tier)

1. Push this repo to GitHub (**One-StepAI**).
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. **Environment variables:** copy every key from `.env.local` into Vercel **Production** (and Preview if you want).
4. Set **`APP_BASE_URL`** to your production URL, e.g. `https://your-project.vercel.app`.
5. In **Auth0**, add the same three URL fields for the **production** origin (callback `/auth/callback`, logout, web origins).
6. Redeploy after changing env or Auth0.

---

## Maintainer role

`/maintainer` expects the ID token to include:

`https://openstep.ai/roles` → array containing **`maintainer`**.

Add an **Auth0 Action** (login flow) to set this claim for designated users.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run check-env` | Test Auth0 / Supabase / GitHub / M2M / APIs (safe output) |

---

## Contributors

- [rochitl72](https://github.com/rochitl72) — maintainer
- [Adith-Sree-Jey](https://github.com/Adith-Sree-Jey)

To get **write access** to the repo, the maintainer must invite you: GitHub → **One-StepAI** → **Settings** → **Collaborators** → **Add people**.

---

## License

MIT

---

*Hackathon / learning project — One-Step AI.*
