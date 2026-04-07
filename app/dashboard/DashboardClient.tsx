"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { GitHubIssue } from "../../lib/agents/oracle";
import { RANK_THRESHOLDS, BADGES, getRank } from "../../lib/gamedata";
import AgentPermissionsPanel from "../components/AgentPermissionsPanel";

type ProfileData = {
  github_username: string;
  github_avatar: string;
  xp: number;
  rank: string;
  badges: string[];
  skill_fingerprint: {
    primary_language: string;
    experience_level: string;
    commit_count: number;
    pr_count: number;
    languages: Record<string, number>;
    github_username?: string;
    public_repo_count?: number;
    top_repo_signals?: { full_name: string; language: string | null; topics: string[] }[];
  } | null;
  contributions: {
    id: string;
    pr_url?: string;
    merged_at?: string;
    status: string;
    repo?: string;
    created_at: string;
  }[];
};

type DashboardClientProps = {
  user: {
    sub: string;
    name?: string;
    nickname?: string;
    picture?: string;
    email?: string;
  };
};

export default function DashboardClient({ user }: DashboardClientProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [issuesPanelTab, setIssuesPanelTab] = useState<"matched" | "search">("matched");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLanguage, setSearchLanguage] = useState("");
  const [searchTopic, setSearchTopic] = useState("");
  const [searchResults, setSearchResults] = useState<GitHubIssue[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  /** Public GitHub login — Oracle/Scout use this account’s repos, not Google’s display name. */
  const [githubHandle, setGithubHandle] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!profile) return;
    const handle =
      profile.github_username?.trim() ||
      profile.skill_fingerprint?.github_username?.trim() ||
      "";
    if (handle) setGithubHandle(handle);
  }, [profile?.github_username, profile?.skill_fingerprint?.github_username]);

  async function runScoutWithUsername(overrideUsername?: string) {
    const isDemo =
      overrideUsername === "demo" || (overrideUsername?.startsWith?.("demo-") ?? false);
    const githubUsername = isDemo
      ? overrideUsername!
      : (
          overrideUsername?.trim() ||
          githubHandle.trim() ||
          profile?.github_username?.trim() ||
          ""
        ).replace(/^@+/, "");

    if (!isDemo && !githubUsername) {
      setError("Enter your GitHub username (handle), then run Scout.");
      return;
    }

    setScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUsername }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Scout failed");
      }
      await fetchProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scout failed to analyze your GitHub profile. Try again.");
    } finally {
      setScanning(false);
    }
  }

  async function runScout() {
    await runScoutWithUsername();
  }

  async function runOracle() {
    setFinding(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Oracle failed");
      const data = await res.json();
      setIssues(data.issues || []);
      setIssuesPanelTab("matched");
    } catch {
      setError("Oracle failed to find issues. Try again.");
    } finally {
      setFinding(false);
    }
  }

  async function runIssueSearch() {
    if (!searchQuery.trim()) {
      setError("Enter a topic or keywords to search.");
      return;
    }
    setSearchLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery.trim(),
          language: searchLanguage.trim() || undefined,
          topic: searchTopic.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.issues || []);
    } catch {
      setError("Issue search failed. Try again.");
    } finally {
      setSearchLoading(false);
    }
  }

  const rank = getRank(profile?.xp || 0);
  const nextRank = RANK_THRESHOLDS.find((r) => r.min > (profile?.xp || 0));
  const xpToNext = nextRank ? nextRank.min - (profile?.xp || 0) : 0;
  const xpProgress = nextRank
    ? (((profile?.xp || 0) - rank.min) / (nextRank.min - rank.min)) * 100
    : 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
            OS
          </div>
          <span className="font-semibold text-white">OpenStep AI</span>
        </Link>
        <div className="flex items-center gap-4">
          <AgentPermissionsPanel />
          <span className="text-sm text-zinc-400">{user.name || user.nickname}</span>
          {user.picture && (
            <Image src={user.picture} alt="avatar" width={32} height={32} className="rounded-full" />
          )}
          <a
            href="/auth/logout"
            className="text-sm text-zinc-500 hover:text-white transition-colors"
          >
            Sign out
          </a>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="lg:col-span-1 space-y-4">
            {/* Rank card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                {user.picture && (
                  <Image src={user.picture} alt="avatar" width={48} height={48} className="rounded-full" />
                )}
                <div>
                  <div className="font-semibold text-white">{user.name || user.nickname}</div>
                  <div className="text-sm text-zinc-400">@{profile?.github_username || user.nickname}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{rank.emoji}</span>
                <div>
                  <div className="font-semibold text-white">{rank.name}</div>
                  <div className="text-sm text-zinc-400">{profile?.xp || 0} XP</div>
                </div>
              </div>

              {/* XP Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-500">
                    {rank.emoji} {rank.name}
                  </span>
                  {nextRank && (
                    <span className="text-xs text-zinc-500">
                      {nextRank.emoji} {nextRank.name}
                    </span>
                  )}
                </div>
                <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.max(4, xpProgress)}%`,
                      background: "linear-gradient(90deg, #7c3aed, #3b82f6)",
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs font-mono text-violet-400">{profile?.xp || 0} XP</span>
                  {nextRank && (
                    <span className="text-xs text-zinc-600">{xpToNext} XP to next rank</span>
                  )}
                </div>
              </div>
            </div>

            {/* GitHub handle — matching uses this account, not the Google sign-in name */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-zinc-400 mb-1">GitHub username</h3>
              <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                You sign in with Google. Scout reads <span className="text-zinc-400">public</span> repos and
                events for this GitHub login; Oracle ranks issues from that fingerprint. The token in{" "}
                <code className="text-zinc-600">.env</code> only raises API rate limits—it does not choose whose
                profile is scanned.
              </p>
              <input
                type="text"
                autoComplete="username"
                spellCheck={false}
                placeholder="e.g. octocat"
                value={githubHandle}
                onChange={(e) => setGithubHandle(e.target.value.replace(/^@+/, ""))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500 font-mono"
              />
            </div>

            {/* Skill fingerprint */}
            {profile?.skill_fingerprint ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Skill Fingerprint</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Level</span>
                    <span className="text-white capitalize">{profile.skill_fingerprint.experience_level}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Primary</span>
                    <span className="text-white">{profile.skill_fingerprint.primary_language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Commits</span>
                    <span className="text-white">{profile.skill_fingerprint.commit_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">PRs</span>
                    <span className="text-white">{profile.skill_fingerprint.pr_count}</span>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-1">
                    {Object.entries(profile.skill_fingerprint.languages)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([lang]) => (
                        <span key={lang} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
                          {lang}
                        </span>
                      ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed border-t border-zinc-800 pt-2">
                    <span className="text-emerald-500/90">● Live GitHub data</span> — Scout calls{" "}
                    <code className="text-zinc-400">/users/…/repos</code> and{" "}
                    <code className="text-zinc-400">/users/…/events</code> (public only). Oracle then searches open
                    issues by those languages.
                    {profile.skill_fingerprint.github_username && (
                      <>
                        {" "}
                        Last scan target:{" "}
                        <strong className="text-zinc-300">@{profile.skill_fingerprint.github_username}</strong>
                        {typeof profile.skill_fingerprint.public_repo_count === "number" && (
                          <> · {profile.skill_fingerprint.public_repo_count} public repos read</>
                        )}
                        .
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={runScout}
                  disabled={scanning}
                  className="mt-4 w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {scanning ? "Rescanning..." : "Rescan profile →"}
                </button>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-center">
                <div className="text-zinc-400 text-sm mb-3">
                  Scout hasn&apos;t analyzed your GitHub yet.
                </div>
                <button
                  onClick={runScout}
                  disabled={scanning}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors w-full"
                >
                  {scanning ? "Scanning GitHub..." : "Run Scout Agent"}
                </button>
                <button
                  type="button"
                  onClick={() => runScoutWithUsername("demo")}
                  className="text-xs text-zinc-500 hover:text-violet-400 transition-colors mt-2 underline underline-offset-2"
                >
                  Try demo mode (no GitHub needed)
                </button>
              </div>
            )}

            {/* Badges */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Badges</h3>
              <div className="grid grid-cols-4 gap-2">
                {BADGES.map((badge) => {
                  const earned = profile?.badges?.includes(badge.id);
                  return (
                    <div
                      key={badge.id}
                      title={earned ? `${badge.name}: ${badge.desc}` : `Locked: ${badge.desc}`}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-lg cursor-help transition-all ${
                        earned
                          ? "bg-zinc-800 border border-zinc-700 shadow-lg"
                          : "bg-zinc-800/30 opacity-25 grayscale"
                      }`}
                    >
                      <span>{badge.emoji}</span>
                      {earned && (
                        <span className="text-[8px] text-zinc-500 mt-0.5 text-center px-0.5 leading-tight truncate w-full text-center">
                          {badge.name.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent contributions */}
            {profile?.contributions && profile.contributions.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Recent Contributions</h3>
                <div className="space-y-2">
                  {profile.contributions.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      {c.pr_url ? (
                        <a
                          href={c.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 hover:text-violet-300 truncate max-w-[140px] text-xs"
                        >
                          {c.repo || "View PR"} →
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-500 truncate max-w-[140px]">{c.repo || "Working..."}</span>
                      )}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${c.merged_at ? "bg-emerald-500/20 text-emerald-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                        {c.merged_at ? "Merged" : c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Issues panel */}
          <div className="lg:col-span-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex rounded-lg border border-zinc-800 p-0.5 bg-zinc-900/50 w-fit">
                <button
                  type="button"
                  onClick={() => setIssuesPanelTab("matched")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    issuesPanelTab === "matched"
                      ? "bg-violet-600 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Matched (Oracle)
                </button>
                <button
                  type="button"
                  onClick={() => setIssuesPanelTab("search")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    issuesPanelTab === "search"
                      ? "bg-violet-600 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Search issues
                </button>
              </div>
              {issuesPanelTab === "matched" ? (
                <button
                  onClick={runOracle}
                  disabled={finding || !profile?.skill_fingerprint}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shrink-0"
                >
                  {finding ? (
                    <>
                      <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                      Finding Issues...
                    </>
                  ) : (
                    "Run Oracle Agent"
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => runIssueSearch()}
                  disabled={searchLoading || !searchQuery.trim()}
                  className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shrink-0"
                >
                  {searchLoading ? (
                    <>
                      <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                      Searching...
                    </>
                  ) : (
                    "Search GitHub"
                  )}
                </button>
              )}
            </div>

            {issuesPanelTab === "search" && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4 space-y-3">
                <p className="text-xs text-zinc-500">
                  Search live open issues (title & body). Optional filters: repo language and GitHub topic.
                </p>
                <input
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="e.g. machine learning, accessibility, graphql"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runIssueSearch()}
                />
                <div className="flex flex-wrap gap-2">
                  <input
                    className="flex-1 min-w-[120px] bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600"
                    placeholder="Language (e.g. Python)"
                    value={searchLanguage}
                    onChange={(e) => setSearchLanguage(e.target.value)}
                  />
                  <input
                    className="flex-1 min-w-[120px] bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600"
                    placeholder="Topic (e.g. react)"
                    value={searchTopic}
                    onChange={(e) => setSearchTopic(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.03] flex flex-col overflow-hidden min-h-[min(380px,calc(100vh-16rem))] max-h-[calc(100vh-14rem)]">
              <div className="shrink-0 px-5 pt-4 pb-3 border-b border-zinc-800/90">
                <h2 className="text-lg font-semibold text-white">
                  {issuesPanelTab === "matched"
                    ? issues.length > 0
                      ? "Matched issues"
                      : "Find your issues"
                    : searchResults.length > 0
                      ? "Search results"
                      : "Explore open source"}
                </h2>
                {error && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
              </div>

              <div
                className={[
                  "min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-4",
                  "[scrollbar-gutter:stable]",
                  "[scrollbar-width:thin]",
                  "[scrollbar-color:rgb(63_63_70)_rgb(9_9_11)]",
                  "[&::-webkit-scrollbar]:w-2",
                  "[&::-webkit-scrollbar-track]:bg-zinc-950/80",
                  "[&::-webkit-scrollbar-track]:rounded-full",
                  "[&::-webkit-scrollbar-thumb]:rounded-full",
                  "[&::-webkit-scrollbar-thumb]:bg-zinc-600",
                  "[&::-webkit-scrollbar-thumb]:hover:bg-zinc-500",
                ].join(" ")}
              >
                {finding && issuesPanelTab === "matched" && issues.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="w-8 h-8 border-2 border-zinc-600 border-t-violet-400 rounded-full animate-spin mb-4" />
                    <p className="text-sm text-zinc-400">Finding issues with Oracle…</p>
                  </div>
                )}

                {searchLoading && issuesPanelTab === "search" && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="w-8 h-8 border-2 border-zinc-600 border-t-violet-400 rounded-full animate-spin mb-4" />
                    <p className="text-sm text-zinc-400">Searching GitHub…</p>
                  </div>
                )}

                {issuesPanelTab === "matched" && issues.length === 0 && !finding && (
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-10 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <h3 className="text-white font-medium mb-2">No issues loaded yet</h3>
                    <p className="text-sm text-zinc-400 max-w-md mx-auto">
                      {profile?.skill_fingerprint
                        ? "Run Oracle to query GitHub with your fingerprint languages + experience level."
                        : "Run Scout first to build your skill fingerprint from your public GitHub repos."}
                    </p>
                  </div>
                )}

                {issuesPanelTab === "search" && searchResults.length === 0 && !searchLoading && (
                  <div className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-8 text-center">
                    <p className="text-sm text-zinc-500 max-w-md mx-auto">
                      Enter keywords and click Search GitHub. Results update from GitHub&apos;s issue search API.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {(issuesPanelTab === "matched" ? issues : searchResults).map((issue) => (
                    <IssueResultCard key={`${issuesPanelTab}-${issue.id}`} issue={issue} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IssueResultCard({ issue }: { issue: GitHubIssue }) {
  const labels = issue.labels || [];
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white text-sm leading-snug mb-1 line-clamp-2">{issue.title}</h3>
          <div className="text-xs text-zinc-500">{issue.repo_full_name}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <DifficultyBadge difficulty={issue.difficulty || 5} />
          {issue.matched_via_language && (
            <span className="text-[10px] text-violet-400/90 bg-violet-500/10 px-1.5 py-0.5 rounded">
              via {issue.matched_via_language}
            </span>
          )}
        </div>
      </div>

      {issue.body && <p className="text-xs text-zinc-500 line-clamp-2 mb-3 break-words">{issue.body}</p>}

      {issue.match_reason && (
        <details className="mb-3 group">
          <summary className="text-[11px] text-zinc-400 cursor-pointer hover:text-violet-300 list-none flex items-center gap-1.5">
            <span className="text-violet-500 group-open:rotate-90 transition-transform inline-block">▸</span>
            Why this issue
          </summary>
          <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed pl-4 border-l border-violet-500/30 break-words">
            {issue.match_reason}
          </p>
        </details>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap items-center">
          {issue.language && (
            <span className="text-xs bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded">
              {issue.language}
            </span>
          )}
          {labels.slice(0, 2).map((label) => (
            <span key={label.name} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">
              {label.name}
            </span>
          ))}
          <span className="text-xs text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded">
            {issue.match_source === "search" ? "✦ search" : "✦ matched to your level"}
          </span>
        </div>
        <div className="flex gap-2 shrink-0">
          <a
            href={issue.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            GitHub →
          </a>
          <Link
            href={`/workspace/${issue.repo_full_name?.replace("/", "__")}__${issue.number}`}
            className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1 rounded-lg transition-colors"
          >
            Open in Forge
          </Link>
        </div>
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const colors =
    difficulty <= 3
      ? "bg-emerald-500/20 text-emerald-400"
      : difficulty <= 6
      ? "bg-amber-500/20 text-amber-400"
      : "bg-red-500/20 text-red-400";
  const label = difficulty <= 3 ? "Easy" : difficulty <= 6 ? "Medium" : "Hard";
  return <span className={`text-xs px-2 py-0.5 rounded ${colors}`}>{label} {difficulty}/10</span>;
}
