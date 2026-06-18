"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

function money(n) {
  const abs = Math.abs(n);
  const formatted = abs >= 1000 ? "$" + (abs / 1000).toFixed(1) + "k" : "$" + abs.toFixed(2);
  return (n < 0 ? "-" : "+") + formatted;
}

function initials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.ok) setProfile(json.profile);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <section className="page active">
        <div className="profile-public-skeleton">Loading…</div>
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="page active">
        <div className="profile-public-not-found">
          <strong>User not found.</strong>
          <p>@{username} doesn't exist or hasn't joined yet.</p>
          <Link className="btn btn-primary" href="/leaderboard">Back to leaderboard</Link>
        </div>
      </section>
    );
  }

  const pnlPositive = profile.profit >= 0;

  return (
    <section className="page active">
      <div className="profile-public-root">
        <div className="profile-public-header">
          <div className="profile-public-avatar">
            {initials(profile.name)}
          </div>
          <div className="profile-public-identity">
            <h1 className="profile-public-name">{profile.name}</h1>
            <span className="profile-public-username caption">@{profile.username}</span>
            {profile.joinedAt && (
              <span className="profile-public-joined caption">Joined {profile.joinedAt}</span>
            )}
          </div>
          {profile.rank && (
            <div className="profile-public-rank">
              <span className="profile-public-rank-num">#{profile.rank}</span>
              <span className="caption">Global rank</span>
            </div>
          )}
        </div>

        <div className="profile-public-stats">
          <div className="profile-public-stat">
            <strong className={pnlPositive ? "pnl-positive" : "pnl-negative"}>
              {money(profile.profit)}
            </strong>
            <span className="caption">Total P&amp;L</span>
          </div>
          <div className="profile-public-stat-div" />
          <div className="profile-public-stat">
            <strong>{profile.winRate.toFixed(1)}%</strong>
            <span className="caption">Win rate</span>
          </div>
          <div className="profile-public-stat-div" />
          <div className="profile-public-stat">
            <strong>{profile.totalBets}</strong>
            <span className="caption">Bets settled</span>
          </div>
          <div className="profile-public-stat-div" />
          <div className="profile-public-stat">
            <strong>{profile.wins}</strong>
            <span className="caption">Wins</span>
          </div>
        </div>

        <div className="profile-public-actions">
          <Link className="btn btn-secondary" href="/friends">Add as friend</Link>
          <Link className="btn btn-ghost" href="/leaderboard">← Leaderboard</Link>
        </div>
      </div>
    </section>
  );
}
