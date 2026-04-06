"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { GitHubIssue } from "../../lib/agents/oracle";
import { RANK_THRESHOLDS, BADGES, getRank } from "../../lib/gamedata";

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

  async function runScout() {
    setScanning(true);
    setError(null);
    try {
      const githubUsername = user.nickname || user.name || "";
      const res = await fetch("/api/agents/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUsername }),
      });
      if (!res.ok) throw new Error("Scout failed");
      await fetchProfile();
    } catch {
      setError("Scout failed to analyze your GitHub profile. Try again.");
    } finally {
      setScanning(false);
    }
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
    } catch {
      setError("Oracle failed to find issues. Try again.");
    } finally {
      setFinding(false);
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

              {/* XP bar */}
              {nextRank && (
                <div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-1">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-zinc-500">
                    {xpToNext} XP to {nextRank.name}
                  </div>
                </div>
              )}
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
                      title={badge.desc}
                      className={`aspect-square rounded-lg flex items-center justify-center text-xl ${
                        earned ? "bg-zinc-800" : "bg-zinc-800/40 opacity-30"
                      }`}
                    >
                      {badge.emoji}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                {issues.length > 0 ? "Matched Issues" : "Find Your Issues"}
              </h2>
              <button
                onClick={runOracle}
                disabled={finding || !profile?.skill_fingerprint}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
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
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {issues.length === 0 && !finding && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-10 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="text-white font-medium mb-2">No issues loaded yet</h3>
                <p className="text-sm text-zinc-400">
                  {profile?.skill_fingerprint
                    ? "Run Oracle to find issues matched to your skill level."
                    : "Run Scout first to build your skill fingerprint, then Oracle will find matching issues."}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white text-sm leading-snug mb-1 line-clamp-2">
                        {issue.title}
                      </h3>
                      <div className="text-xs text-zinc-500">{issue.repo_full_name}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <DifficultyBadge difficulty={issue.difficulty || 5} />
                    </div>
                  </div>

                  {issue.body && (
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{issue.body}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                      {issue.labels.slice(0, 3).map((label) => (
                        <span
                          key={label.name}
                          className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded"
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
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
              ))}
            </div>
          </div>
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
