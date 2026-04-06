"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type ContributionRow = {
  id: string;
  pr_url: string;
  xp_awarded: number;
  pr_merged: boolean;
  maintainer_rating: number | null;
  maintainer_comment: string | null;
  created_at: string;
  profiles: {
    github_username: string;
    github_avatar: string;
    rank: string;
    xp: number;
  };
};

export default function MaintainerClient({ user }: { user: { name?: string; picture?: string } }) {
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<Record<string, number>>({});
  const [comment, setComment] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/maintainer/contributions")
      .then((r) => r.json())
      .then((data) => setContributions(data.contributions || []))
      .finally(() => setLoading(false));
  }, []);

  async function submitRating(contributionId: string) {
    const r = rating[contributionId];
    if (!r) return;
    await fetch("/api/maintainer/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contributionId,
        rating: r,
        comment: comment[contributionId] || "",
      }),
    });
    setSubmitted((prev) => new Set([...prev, contributionId]));
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
              OS
            </div>
            <span className="font-semibold text-white">OpenStep AI</span>
          </Link>
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
            Maintainer Dashboard
          </span>
          <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">
            Auth0 FGA Gated
          </span>
        </div>
        <div className="flex items-center gap-3">
          {user.picture && (
            <Image src={user.picture} alt="avatar" width={28} height={28} className="rounded-full" />
          )}
          <span className="text-sm text-zinc-400">{user.name}</span>
          <a href="/auth/logout" className="text-sm text-zinc-600 hover:text-white transition-colors">
            Sign out
          </a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Maintainer Dashboard</h1>
          <p className="text-zinc-400 text-sm">
            Rate student contributions to award XP and unlock the{" "}
            <span className="text-amber-400">🤝 Team Player</span> badge.
            Only visible to users with the <code className="bg-zinc-800 px-1 rounded text-xs">maintainer</code> role in Auth0 FGA.
          </p>
        </div>

        {/* FGA explanation box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-8 flex gap-4">
          <div className="text-2xl">🔐</div>
          <div>
            <h3 className="font-medium text-white mb-1 text-sm">Access Control via Auth0 FGA</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This page is completely invisible to students. The maintainer role is granted via Auth0
              Fine-Grained Authorization when a user connects a GitHub organisation token via Token
              Vault. Different token, different scope, different UI — enforced by Auth0 at the server
              layer before this page renders.
            </p>
            <pre className="mt-3 bg-zinc-800 rounded-lg p-3 text-xs text-zinc-300 font-mono overflow-x-auto">
{`fga.check({
  user: auth0.userId,
  relation: "maintainer",
  object: "dashboard:maintainer"
})`}
            </pre>
          </div>
        </div>

        {loading ? (
          <div className="text-zinc-500 text-center py-10">Loading contributions...</div>
        ) : contributions.length === 0 ? (
          <div className="text-center py-20 text-zinc-600">
            <div className="text-4xl mb-3">📭</div>
            <p>No contributions awaiting review yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contributions.map((c) => (
              <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    {c.profiles?.github_avatar && (
                      <Image
                        src={c.profiles.github_avatar}
                        alt="avatar"
                        width={36}
                        height={36}
                        className="rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-medium text-white text-sm">
                        @{c.profiles?.github_username}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {c.profiles?.rank} · {c.profiles?.xp} XP
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.pr_merged ? (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                        Merged
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                        In Review
                      </span>
                    )}
                    <a
                      href={c.pr_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      View PR →
                    </a>
                  </div>
                </div>

                {submitted.has(c.id) || c.maintainer_rating ? (
                  <div className="bg-zinc-800 rounded-lg p-3 text-sm">
                    <span className="text-zinc-400">Rating: </span>
                    <span className="text-amber-400">{"★".repeat(c.maintainer_rating || rating[c.id])}</span>
                    {c.maintainer_comment && (
                      <p className="text-zinc-400 text-xs mt-1">{c.maintainer_comment}</p>
                    )}
                    {submitted.has(c.id) && (
                      <p className="text-emerald-400 text-xs mt-1">✓ Rating submitted — Ranker will award XP</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-zinc-500 mb-2">Rate this contribution (1–5 stars)</div>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating((r) => ({ ...r, [c.id]: star }))}
                            className={`text-xl transition-colors ${
                              (rating[c.id] || 0) >= star ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"
                            }`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      className="w-full bg-zinc-800 text-xs text-zinc-300 placeholder-zinc-600 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-violet-500"
                      placeholder="Optional feedback comment..."
                      value={comment[c.id] || ""}
                      onChange={(e) => setComment((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => submitRating(c.id)}
                      disabled={!rating[c.id]}
                      className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs px-4 py-2 rounded-lg transition-colors"
                    >
                      Submit Rating
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
