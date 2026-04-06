"use client";
import Link from "next/link";

const AGENTS = [
  { letter: "S", name: "Scout", desc: "Reads your GitHub profile & builds a skill fingerprint", color: "bg-violet-500" },
  { letter: "O", name: "Oracle", desc: "Finds the perfect open source issue for your skill level", color: "bg-blue-500" },
  { letter: "S", name: "Sage", desc: "Socratic AI mentor — guides with questions, never answers", color: "bg-emerald-500" },
  { letter: "F", name: "Forge", desc: "Monaco editor + E2B sandbox — code & run right in browser", color: "bg-amber-500" },
  { letter: "G", name: "Guardian", desc: "Watches GitHub webhooks for PRs and merge events", color: "bg-rose-500" },
  { letter: "R", name: "Ranker", desc: "Awards XP, unlocks badges, updates your contribution profile", color: "bg-pink-500" },
];

const STACK = [
  { name: "Auth0", desc: "Identity, FGA, M2M tokens", badge: "FREE" },
  { name: "Token Vault", desc: "Credential passport — scoped per agent", badge: "FREE" },
  { name: "Perplexity Sonar", desc: "Powers Sage's Socratic mentorship", badge: "HAVE KEY" },
  { name: "E2B.dev", desc: "Cloud sandbox — 300ms boot", badge: "FREE" },
  { name: "Supabase", desc: "PostgreSQL + Realtime", badge: "FREE" },
  { name: "GitHub API", desc: "Issues, file trees, PRs, webhooks", badge: "FREE" },
];

export default function LandingPage() {
  return (
    <>
      <div className="bg-violet-600/90 text-white px-4 py-2 text-center text-xs">
        <span className="font-medium">👋 Hackathon Judge?</span> Log in with GitHub then click &quot;Try
        demo mode&quot; on the dashboard — no real GitHub history needed.{" "}
        <a
          href="/auth/login?returnTo=/dashboard"
          className="underline font-medium hover:text-violet-200"
        >
          Sign in →
        </a>
      </div>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
            OS
          </div>
          <span className="font-semibold text-white">OpenStep AI</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
            Auth0 × Token Vault Hackathon
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Dashboard
          </Link>
          <a
            href="/auth/login?returnTo=/dashboard"
            className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Sign in with GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          6 AI Agents · Auth0 FGA · Token Vault · Zero Raw Token Exposure
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-white mb-6 leading-tight">
          The LeetCode of{" "}
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Open Source
          </span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          OpenStep AI reads your GitHub, finds the right issue for your skill level, loads the code
          in a browser editor, and coaches you Socratically — never writing code for you.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href="/auth/login?returnTo=/dashboard"
            className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base"
          >
            Start Contributing
          </a>
          <Link
            href="#how-it-works"
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white px-8 py-3.5 rounded-xl transition-colors text-base"
          >
            See How It Works
          </Link>
        </div>
        <div className="flex items-center justify-center gap-12 mt-16 text-center">
          {[["6","AI Agents"],["2","User Personas"],["100%","Free Tier"],["0","Raw Tokens Exposed"]].map(([val,label]) => (
            <div key={label}>
              <div className="text-3xl font-bold text-white">{val}</div>
              <div className="text-sm text-zinc-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-20 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">How It Works</h2>
          <p className="text-zinc-400 text-center mb-14">From signup to merged PR — seven steps, six agents, zero raw token exposure.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { n: "01", title: "Sign in via Auth0", desc: "GitHub OAuth — Auth0 handles everything. Zero credential management." },
              { n: "02", title: "Token Vault stores credentials", desc: "Your GitHub token goes into Token Vault. Agents only get scoped, short-lived access." },
              { n: "03", title: "Scout + Oracle discover issues", desc: "Scout profiles your GitHub. Oracle finds issues within your exact skill delta." },
              { n: "04", title: "Forge loads the workspace", desc: "Monaco editor + file tree + E2B sandbox in under 5 seconds." },
              { n: "05", title: "Sage mentors Socratically", desc: "Ask questions, get questions back. Sage is forbidden from writing code for you." },
              { n: "06", title: "Submit your PR", desc: "Guardian watches your PR. Maintainers rate it. Ranker awards XP and badges." },
            ].map((step) => (
              <div key={step.n} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex gap-4">
                <span className="text-2xl font-bold text-violet-500/60 font-mono">{step.n}</span>
                <div>
                  <h3 className="font-semibold text-white mb-1">{step.title}</h3>
                  <p className="text-sm text-zinc-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="px-6 py-20 border-t border-zinc-800 bg-zinc-900/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">The Six Agents</h2>
          <p className="text-zinc-400 text-center mb-14">Each agent has exactly one job and gets only minimum scope from Token Vault.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AGENTS.map((agent) => (
              <div key={agent.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors">
                <div className={`w-9 h-9 rounded-lg ${agent.color} flex items-center justify-center text-white font-bold text-sm mb-3`}>
                  {agent.letter}
                </div>
                <h3 className="font-semibold text-white mb-1">{agent.name}</h3>
                <p className="text-sm text-zinc-400">{agent.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Auth0 + Token Vault */}
      <section className="px-6 py-20 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">Auth0 + Token Vault</h2>
          <p className="text-zinc-400 text-center mb-14">
            <span className="text-white font-medium">Credential Passport</span> — each agent gets only the minimum permission it needs. The LLM never sees your raw token.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">🔑 Auth0</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>▸ GitHub Social Login — one-click sign in</li>
                <li>▸ Auth0 Actions — fires Scout on login automatically</li>
                <li>▸ Fine-Grained Authorization — Student / Maintainer roles</li>
                <li>▸ M2M Tokens — agents authenticate to each other</li>
              </ul>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">🛡️ Token Vault</h3>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li>▸ Stores GitHub, GitLab, npm credentials</li>
                <li>▸ Scout gets read-only profile access only</li>
                <li>▸ Forge gets file-read scope only</li>
                <li>▸ LLM (Sage) never receives raw credentials</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h4 className="text-sm font-medium text-zinc-400 mb-4">Token Vault Flow</h4>
            <div className="flex items-center gap-2 flex-wrap text-sm">
              {["1. GitHub OAuth → Auth0","2. Auth0 → Token Vault","3. Agent requests scoped token","4. Agent runs one operation","5. Token expires ✓"].map((step,i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-zinc-300 bg-zinc-800 px-3 py-1.5 rounded-lg">{step}</span>
                  {i < 4 && <span className="text-zinc-600">→</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 bg-zinc-900 border border-emerald-500/20 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wide">
                Security guarantee
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-white font-medium">🔒 Zero raw token exposure</span>
                <span className="text-zinc-500 text-xs">
                  Sage (the LLM) only receives structured text — file names, error messages. Never your
                  GitHub token.
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-white font-medium">⏱ Tokens expire per-operation</span>
                <span className="text-zinc-500 text-xs">
                  Token Vault issues a scoped credential for one operation, then it expires. No long-lived
                  secrets in agent memory.
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-white font-medium">🎭 Two-role system, one codebase</span>
                <span className="text-zinc-500 text-xs">
                  Students and Maintainers see entirely different UIs, enforced by Auth0 FGA at the server
                  layer before any JSX loads.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gamification */}
      <section className="px-6 py-20 border-t border-zinc-800 bg-zinc-900/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">The LeetCode Layer</h2>
          <p className="text-zinc-400 text-center mb-14">Rank up by shipping real contributions to real projects.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap mb-10">
            {[
              { emoji: "🌱", rank: "Newbie", xp: "0 XP" },
              { emoji: "🔧", rank: "Contributor", xp: "500 XP" },
              { emoji: "⚡", rank: "Collaborator", xp: "2,000 XP" },
              { emoji: "🛠️", rank: "Maintainer", xp: "8,000 XP" },
              { emoji: "👑", rank: "Legend", xp: "25,000 XP" },
            ].map((r) => (
              <div key={r.rank} className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-center min-w-[100px]">
                <div className="text-2xl mb-1">{r.emoji}</div>
                <div className="text-sm font-medium text-white">{r.rank}</div>
                <div className="text-xs text-zinc-500">{r.xp}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { emoji: "🐛", name: "First Bug Fix" }, { emoji: "📚", name: "Doc Writer" },
              { emoji: "🔥", name: "Week Streak" },  { emoji: "🧪", name: "Test Author" },
              { emoji: "☕", name: "Java Hunter" },   { emoji: "🐍", name: "Pythonista" },
              { emoji: "⭐", name: "Star Repo" },     { emoji: "🤝", name: "Team Player" },
            ].map((b) => (
              <div key={b.name} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 flex items-center gap-2">
                <span className="text-lg">{b.emoji}</span>
                <span className="text-xs text-zinc-300">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stack */}
      <section className="px-6 py-20 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">Zero-Cost Stack</h2>
          <p className="text-zinc-400 text-center mb-14">Every tool has a free tier. No credit card required.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STACK.map((s) => (
              <div key={s.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white text-sm">{s.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${s.badge === "HAVE KEY" ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700 text-zinc-400"}`}>
                    {s.badge}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 border-t border-zinc-800 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to ship your first contribution?</h2>
        <p className="text-zinc-400 mb-8">Sign in with GitHub. Scout reads your profile. Oracle finds your issue. Let&apos;s go.</p>
        <a
          href="/auth/login?returnTo=/dashboard"
          className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-10 py-4 rounded-xl transition-colors text-base inline-block"
        >
          Sign in with GitHub →
        </a>
      </section>

      <footer className="border-t border-zinc-800 px-6 py-8 text-center text-sm text-zinc-600">
        OpenStep.ai · Auth0 × Token Vault Hackathon · Next.js · Auth0 · Perplexity · E2B · Supabase
      </footer>
      </div>
    </>
  );
}
