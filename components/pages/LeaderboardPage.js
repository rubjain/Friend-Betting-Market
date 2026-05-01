"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useFriendMarket } from "../../context/FriendMarketContext";
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
            {row.name}
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
  const { state } = useFriendMarket();
  const currentUserId = state.currentUser?.id;

  const [period, setPeriod] = useState("alltime");
  const [scope, setScope] = useState("global");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?period=${period}&scope=${scope}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to load leaderboard.");
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period, scope]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const rows = data?.rows ?? [];
  const currentUserRow = data?.currentUserRow ?? null;
  const currentUserRank = data?.currentUserRank ?? null;
  const friendCount = data?.friendCount ?? 0;

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
                        · · · Rank #{currentUserRank} · · ·
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
        </div>
      )}
    </section>
  );
}
