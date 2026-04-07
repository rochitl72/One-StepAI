/**
 * Loads .env then .env.local (local overrides) and checks credentials without printing secrets.
 * Run: node scripts/verify-env.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvFile(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (k && !(k in out)) out[k] = v;
  }
  return out;
}

/** .env.local overrides .env (same as Next.js for duplicate keys — here we merge local second). */
function loadMergedEnv() {
  const base = loadEnvFile(".env");
  const local = loadEnvFile(".env.local");
  return { ...base, ...local };
}

function ok(name, detail = "") {
  console.log(`  OK  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

const env = loadMergedEnv();

async function main() {
  console.log("OpenStep env checks (no secrets printed)\n");

  // --- Auth0 domain (OIDC metadata) ---
  const domain = env.AUTH0_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!domain) {
    fail("AUTH0_DOMAIN", "missing");
  } else {
    try {
      const r = await fetch(`https://${domain}/.well-known/openid-configuration`);
      if (r.ok) ok("AUTH0_DOMAIN", "OIDC metadata reachable");
      else fail("AUTH0_DOMAIN", `HTTP ${r.status}`);
    } catch (e) {
      fail("AUTH0_DOMAIN", e.message);
    }
  }

  // --- Supabase ---
  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const sbAnon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const sbService = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!sbUrl) fail("NEXT_PUBLIC_SUPABASE_URL", "missing");
  else {
    if (sbAnon) {
      try {
        const r = await fetch(`${sbUrl}/rest/v1/profiles?select=id&limit=1`, {
          headers: {
            apikey: sbAnon,
            Authorization: `Bearer ${sbAnon}`,
          },
        });
        if (r.ok || r.status === 206) ok("Supabase anon", "REST reachable");
        else fail("Supabase anon", `HTTP ${r.status}`);
      } catch (e) {
        fail("Supabase anon", e.message);
      }
    } else fail("NEXT_PUBLIC_SUPABASE_ANON_KEY", "missing");

    if (sbService) {
      try {
        const r = await fetch(`${sbUrl}/rest/v1/profiles?select=id&limit=1`, {
          headers: {
            apikey: sbService,
            Authorization: `Bearer ${sbService}`,
          },
        });
        if (r.ok || r.status === 206) ok("Supabase service_role", "REST reachable");
        else fail("Supabase service_role", `HTTP ${r.status}`);
      } catch (e) {
        fail("Supabase service_role", e.message);
      }
    } else fail("SUPABASE_SERVICE_ROLE_KEY", "missing");
  }

  // --- GitHub PAT (optional) ---
  const gh = env.GITHUB_TOKEN?.trim();
  if (gh) {
    try {
      const r = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${gh}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (r.ok) {
        const j = await r.json();
        ok("GITHUB_TOKEN", `valid (user: ${j.login || "?"})`);
      } else fail("GITHUB_TOKEN", `HTTP ${r.status}`);
    } catch (e) {
      fail("GITHUB_TOKEN", e.message);
    }
  } else {
    ok("GITHUB_TOKEN", "not set (anonymous GitHub API limits)");
  }

  // --- Auth0 M2M client credentials ---
  const aud = env.AUTH0_AUDIENCE?.trim();
  const m2mId = env.AUTH0_M2M_CLIENT_ID?.trim();
  const m2mSec = env.AUTH0_M2M_CLIENT_SECRET?.trim();
  if (aud && m2mId && m2mSec && domain) {
    try {
      const r = await fetch(`https://${domain}/oauth/token`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          grant_type: "client_credentials",
          client_id: m2mId,
          client_secret: m2mSec,
          audience: aud,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.access_token) ok("Auth0 M2M", "client_credentials token issued");
      else fail("Auth0 M2M", `HTTP ${r.status} ${j.error || j.error_description || ""}`.trim());
    } catch (e) {
      fail("Auth0 M2M", e.message);
    }
  } else {
    ok(
      "Auth0 M2M",
      "skipped (set AUTH0_DOMAIN + AUTH0_AUDIENCE + AUTH0_M2M_CLIENT_ID + AUTH0_M2M_CLIENT_SECRET)"
    );
  }

  // --- Perplexity (optional) ---
  const pplx = env.PERPLEXITY_API_KEY?.trim();
  if (pplx) {
    try {
      const r = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pplx}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
      });
      if (r.ok) ok("PERPLEXITY_API_KEY", "API accepted request");
      else fail("PERPLEXITY_API_KEY", `HTTP ${r.status}`);
    } catch (e) {
      fail("PERPLEXITY_API_KEY", e.message);
    }
  } else ok("PERPLEXITY_API_KEY", "not set (Sage will fail until set)");

  // --- E2B (optional) ---
  const e2b = env.E2B_API_KEY?.trim();
  if (e2b) {
    try {
      const r = await fetch("https://api.e2b.dev/templates", {
        headers: { "X-API-Key": e2b },
      });
      if (r.ok || r.status === 404) ok("E2B_API_KEY", "API reachable");
      else fail("E2B_API_KEY", `HTTP ${r.status}`);
    } catch (e) {
      fail("E2B_API_KEY", e.message);
    }
  } else ok("E2B_API_KEY", "not set (Forge sandbox may fail until set)");

  // --- App URL sanity ---
  if (env.APP_BASE_URL?.trim()) ok("APP_BASE_URL", "set");
  else ok("APP_BASE_URL", "not set (SDK may infer from request in dev)");

  console.log("\nDone. Fix any FAIL lines above.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
