"use client";
import { useState } from "react";

type AgentPermission = {
  name: string;
  emoji: string;
  color: string;
  scope: string;
  scopeDetail: string;
  lastUsed: string | null;
  seesRawToken: boolean;
};

const AGENT_PERMISSIONS: AgentPermission[] = [
  {
    name: "Scout",
    emoji: "🔭",
    color: "violet",
    scope: "GitHub: read profile only",
    scopeDetail: "Reads public repos, events, PR count. Cannot write or access private repos.",
    lastUsed: null,
    seesRawToken: false,
  },
  {
    name: "Oracle",
    emoji: "🔮",
    color: "blue",
    scope: "GitHub: public search only",
    scopeDetail: "Searches public GitHub issues via /search/issues. No write access.",
    lastUsed: null,
    seesRawToken: false,
  },
  {
    name: "Forge",
    emoji: "⚒️",
    color: "amber",
    scope: "GitHub: file read only",
    scopeDetail: "Reads repo file trees and file contents via /repos/:owner/:repo/git/trees. Read-only.",
    lastUsed: null,
    seesRawToken: false,
  },
  {
    name: "Sage",
    emoji: "🌿",
    color: "emerald",
    scope: "No credentials",
    scopeDetail:
      "Sage calls Perplexity Sonar. It never receives your GitHub token — only structured text context (file name, error message). The LLM is credential-isolated by design.",
    lastUsed: null,
    seesRawToken: false,
  },
  {
    name: "Solution (beta)",
    emoji: "⚡",
    color: "orange",
    scope: "Perplexity · proposed patches (explicit opt-in)",
    scopeDetail:
      "Separate system prompt from Sage: may output concrete code and diffs after you acknowledge elevated workflow. Same structured context as Sage — no raw token in the prompt. You review before git push or PR; OpenStep does not silently commit.",
    lastUsed: null,
    seesRawToken: false,
  },
  {
    name: "Guardian",
    emoji: "🛡️",
    color: "rose",
    scope: "GitHub: webhook events only",
    scopeDetail: "Listens for PR open/merge events via HMAC-verified webhooks. Cannot initiate any GitHub API calls.",
    lastUsed: null,
    seesRawToken: false,
  },
  {
    name: "Ranker",
    emoji: "🏆",
    color: "pink",
    scope: "Supabase: write XP and badges only",
    scopeDetail:
      "Writes to profiles and badge_awards tables only. Uses the service role key server-side. Cannot read other users' data.",
    lastUsed: null,
    seesRawToken: false,
  },
];

const colorMap: Record<string, string> = {
  violet: "bg-violet-500/10 border-violet-500/20 text-violet-400",
  blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  orange: "bg-orange-500/10 border-orange-500/20 text-orange-400",
  rose: "bg-rose-500/10 border-rose-500/20 text-rose-400",
  pink: "bg-pink-500/10 border-pink-500/20 text-pink-400",
};

const dotMap: Record<string, string> = {
  violet: "bg-violet-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  pink: "bg-pink-500",
};

export default function AgentPermissionsPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Agent Permissions
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h2 className="font-semibold text-white text-sm">Agent Permissions</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Token Vault — each agent holds minimum-scope credentials only
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-600 hover:text-white transition-colors text-lg leading-none"
                type="button"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-3 bg-violet-500/5 border-b border-violet-500/10">
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">🔑</span>
                <p className="text-xs text-violet-300 leading-relaxed">
                  <span className="font-medium text-violet-200">Credential Passport</span> — your GitHub
                  token is stored in Auth0 Token Vault. When an agent needs access, Token Vault issues a
                  scoped, short-lived token for one operation only. The token expires immediately after.
                  The LLM (Sage) never sees any token.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {AGENT_PERMISSIONS.map((agent) => (
                <div key={agent.name} className="rounded-xl border border-zinc-800 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/60 transition-colors"
                    onClick={() => setExpanded(expanded === agent.name ? null : agent.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${dotMap[agent.color]}`}
                        style={{
                          backgroundColor: `color-mix(in srgb, currentColor 15%, transparent)`,
                        }}
                      >
                        {agent.emoji}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-white">{agent.name}</div>
                        <div className={`text-xs ${colorMap[agent.color].split(" ")[2]}`}>{agent.scope}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!agent.seesRawToken && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          No raw token
                        </span>
                      )}
                      <span className="text-zinc-600 text-xs">{expanded === agent.name ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {expanded === agent.name && (
                    <div className="px-4 pb-3 bg-zinc-900/40 border-t border-zinc-800">
                      <p className="text-xs text-zinc-400 leading-relaxed pt-2">{agent.scopeDetail}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-zinc-800">
              <p className="text-[11px] text-zinc-600 text-center">
                Powered by Auth0 Token Vault · Principle of Least Privilege, enforced by design
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
