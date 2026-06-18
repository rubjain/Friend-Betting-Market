"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAgora } from "../../context/AgoraContext";
import { SectionHead } from "../ui";

const PERIODS = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "This Week" },
  { key: "alltime", label: "All Time" },
];

const SCOPES = [
  { key: "global", label: "Global" },
  { key: "friends", label: "Friends" },
];

const MODES = [
  { key: "real", label: "Real" },
  { key: "paper", label: "Paper" },
];

function money(n) {
  const abs = Math.abs(n);
  const formatted =
    abs >= 1000
      ? "$" + (abs / 1000).toFixed(1) + "k"
      : "$" + abs.toFixed(2);
  return n < 0 ? "-" + formatted : "+" + formatted;
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function RankBadge({ rank }) {
  const cls =
    rank === 1
      ? "rank-badge rank-badge--gold"
      : rank === 2
      ? "rank-badge rank-badge--silver"
      : rank === 3
      ? "rank-badge rank-badge--bronze"
      : "rank-badge";
  return <span className={cls}>{rank}</span>;
}

function LeaderboardRow({ row, isCurrentUser, isSelf }) {
  return (
    <tr className={`leaderboard-row${isSelf ? " leaderboard-row--self" : ""}`}>
      <td className="leaderboard-cell leaderboard-cell--rank">
        <RankBadge rank={row.rank} />
      </td>
      <td className="leaderboard-cell leaderboard-cell--user">
        <div className="leaderboard-avatar" aria-hidden="true">
          {getInitials(row.name)}
        </div>
        <div className="leaderboard-user-info">
          <span className="leaderboard-name">
            <Link href={`/profile/${row.username}`} className="leaderboard-name-link">
              {row.name}
            </Link>
            {isSelf && <span className="leaderboard-you-badge">You</span>}
          </span>
          <span className="leaderboard-username caption">{row.username}</span>
        </div>
      </td>
      <td className={`leaderboard-cell leaderboard-cell--profit ${row.profit >= 0 ? "profit-positive" : "profit-negative"}`}>
        {money(row.profit)}
      </td>
      <td className="leaderboard-cell leaderboard-cell--winrate">
        {row.winRate.toFixed(1)}%
      </td>
      <td className="leaderboard-cell leaderboard-cell--bets">
        {row.totalBets}
      </td>
    </tr>
  );
}

export default function LeaderboardPage() {
  const { state } = useAgora();
  const currentUserId = state.currentUser?.id;

  const [period, setPeriod] = useState("alltime");
  const [scope, setScope] = useState("global");
  const [mode, setMode] = useState("real");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?period=${period}&scope=${scope}&mode=${mode}&page=${page}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to load leaderboard.");
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period, scope, mode, page]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [period, scope, mode]);

  const rows = data?.rows ?? [];
  const currentUserRow = data?.currentUserRow ?? null;
  const currentUserRank = data?.currentUserRank ?? null;
  const friendCount = data?.friendCount ?? 0;
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  const PAGE_SIZE = 25;

  const isCurrentUserInTop = rows.some((r) => r.userId === currentUserId);
  const showPinnedSelf = currentUserRow && !isCurrentUserInTop;

  const noFriends = scope === "friends" && !loading && rows.length === 0;

  return (
    <section className="page active">
      <SectionHead
        title="Leaderboard"
        body="See how you stack up against other traders."
      />

      <div className="leaderboard-controls">
        <div className="tab-group" role="tablist" aria-label="Time period">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={period === p.key}
              className={`tab-btn${period === p.key ? " tab-btn--active" : ""}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="scope-toggle" role="tablist" aria-label="Mode">
            {MODES.map((m) => (
              <button
                key={m.key}
                role="tab"
                aria-selected={mode === m.key}
                className={`scope-btn${mode === m.key ? " scope-btn--active" : ""}${m.key === "paper" && mode === "paper" ? " scope-btn--paper" : ""}`}
                onClick={() => setMode(m.key)}
              >
                {m.key === "paper" && <span className="paper-dot" aria-hidden="true" />}
                {m.label}
              </button>
            ))}
          </div>
          <div className="scope-toggle" role="tablist" aria-label="Scope">
            {SCOPES.map((s) => (
              <button
                key={s.key}
                role="tab"
                aria-selected={scope === s.key}
                className={`scope-btn${scope === s.key ? " scope-btn--active" : ""}`}
                onClick={() => setScope(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="note-banner" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {noFriends ? (
        <div className="leaderboard-empty">
          <strong>No friends yet.</strong>
          <p>Add friends to see how you rank against them.</p>
          <Link className="btn btn-primary" href="/friends">
            Invite Friends
          </Link>
        </div>
      ) : (
        <div className="leaderboard-card">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th className="leaderboard-th leaderboard-th--rank">#</th>
                <th className="leaderboard-th leaderboard-th--user">Trader</th>
                <th className="leaderboard-th leaderboard-th--profit">Profit / Loss</th>
                <th className="leaderboard-th leaderboard-th--winrate">Win Rate</th>
                <th className="leaderboard-th leaderboard-th--bets">Bets</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="leaderboard-row leaderboard-row--skeleton">
                      <td className="leaderboard-cell" colSpan={5}>
                        <div className="skeleton-line" />
                      </td>
                    </tr>
                  ))
                : rows.map((row) => (
                    <LeaderboardRow
                      key={row.userId}
                      row={row}
                      isSelf={row.userId === currentUserId}
                    />
                  ))}

              {!loading && rows.length === 0 && !noFriends && (
                <tr>
                  <td className="leaderboard-cell leaderboard-empty-cell" colSpan={5}>
                    No bets settled in this period yet.
                  </td>
                </tr>
              )}

              {showPinnedSelf && (
                <>
                  <tr className="leaderboard-divider-row">
                    <td colSpan={5}>
                      <div className="leaderboard-rank-gap">
                        ... Rank #{currentUserRank} ...
                      </div>
                    </td>
                  </tr>
                  <LeaderboardRow
                    key="self-pinned"
                    row={currentUserRow}
                    isSelf
                  />
                </>
              )}
            </tbody>
          </table>

          {scope === "friends" && !loading && friendCount > 0 && (
            <div className="leaderboard-footer caption">
              Ranked among {friendCount} friend{friendCount !== 1 ? "s" : ""}
            </div>
          )}

          {!loading && total > PAGE_SIZE && (
            <div className="leaderboard-pagination">
              <button
                className="btn btn-ghost btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <span className="caption leaderboard-pagination-info">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                disabled={!hasMore}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
