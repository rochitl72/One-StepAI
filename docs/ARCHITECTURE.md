# Architecture & security (accurate)

This document matches **what the code does today**, not marketing copy.

## Identity

- **Auth0** handles login. The app uses **`openid profile email`** (e.g. **Google** as a social connection). Users do **not** automatically get a GitHub OAuth token from that login.
- Each row in **`profiles`** is keyed by Auth0 **`sub`**.

## GitHub data

- **Scout** loads **public** repos and public events for a **GitHub username** the user enters on the dashboard (validated handle). It is **not** inferred from the Google display name.
- **`GITHUB_TOKEN`** in server env is an optional **shared** Personal Access Token: it **increases API rate limits** for all server-side GitHub calls. It does **not** decide which GitHub account is analyzed; the **username** field does.
- **Oracle** and **issue search** use the **skill fingerprint** stored for that logged-in user (from Scout). Match reasons can reference that user’s repos/languages/topics.

## Database

- **Supabase** stores profiles, contributions, badges, etc. Server routes use the **service role** client so RLS policies (written for Supabase JWT claims) are **not** how the Next.js API authorizes users — **Auth0 session** gates routes instead.

## Agents & LLM

- **Sage** (Perplexity) and **Solution** (beta) receive **structured context** (file name, errors, issue text). They do **not** receive raw Auth0 or GitHub OAuth tokens in prompts.
- Optional header **`x-agent-token`**: verified as either an **Auth0 M2M JWT** (`AUTH0_DOMAIN` + `AUTH0_AUDIENCE`) or a **legacy HMAC** token (`AUTH0_M2M_SECRET`). The browser flow often omits this header; it matters for server-to-server calls.

## Maintainer dashboard

- Access is gated by a **custom claim** on the ID token: `https://openstep.ai/roles` must include **`maintainer`**. Configure that via an **Auth0 Action** or rules for chosen users — not via a separate FGA API call in this repo.

## Further reading

- Root **`README.md`** — setup, env vars, Vercel.
- **`env.local.example`** — all variables explained.
