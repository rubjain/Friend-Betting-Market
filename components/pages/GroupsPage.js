"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAgora } from "../../context/AgoraContext";
import { SectionHead } from "../ui";

// Sport → emoji + gradient
const SPORT_THEMES = {
  nba: { emoji: "🏀", grad: "linear-gradient(135deg,#e85d04 0%,#f48c06 100%)", label: "NBA" },
  nfl: { emoji: "🏈", grad: "linear-gradient(135deg,#003f88 0%,#1565c0 100%)", label: "NFL" },
  mlb: { emoji: "⚾", grad: "linear-gradient(135deg,#1b4332 0%,#2d6a4f 100%)", label: "MLB" },
  nhl: { emoji: "🏒", grad: "linear-gradient(135deg,#0d1b2a 0%,#1b4f72 100%)", label: "NHL" },
  soccer: { emoji: "⚽", grad: "linear-gradient(135deg,#2d6a4f 0%,#40916c 100%)", label: "Soccer" },
  tennis: { emoji: "🎾", grad: "linear-gradient(135deg,#7b2d8b 0%,#a64ac9 100%)", label: "Tennis" },
  golf: { emoji: "⛳", grad: "linear-gradient(135deg,#386641 0%,#6a994e 100%)", label: "Golf" },
  ufc: { emoji: "🥊", grad: "linear-gradient(135deg,#c1121f 0%,#e63946 100%)", label: "Combat" },
  default: { emoji: "📊", grad: "linear-gradient(135deg,#4361ee 0%,#7209b7 100%)", label: "General" },
};

function getTheme(name = "") {
  const l = name.toLowerCase();
  for (const [key, theme] of Object.entries(SPORT_THEMES)) {
    if (key !== "default" && l.includes(key)) return theme;
  }
  if (l.includes("football") || l.includes("nfl")) return SPORT_THEMES.nfl;
  if (l.includes("basketball") || l.includes("court")) return SPORT_THEMES.nba;
  if (l.includes("baseball")) return SPORT_THEMES.mlb;
  if (l.includes("hockey") || l.includes("puck")) return SPORT_THEMES.nhl;
  if (l.includes("soccer") || l.includes("football") || l.includes("premier") || l.includes("mls")) return SPORT_THEMES.soccer;
  if (l.includes("tennis") || l.includes("wimbledon")) return SPORT_THEMES.tennis;
  return SPORT_THEMES.default;
}

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function Avatar({ name, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--accent)", color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size <= 26 ? "0.6rem" : "0.72rem", fontWeight: 700, flexShrink: 0,
    }}>{getInitials(name)}</div>
  );
}

export default function GroupsPage() {
  const { state } = useAgora();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openGroupId, setOpenGroupId] = useState(null);
  const [groupDetails, setGroupDetails] = useState({}); // id → { leaderboard, markets }
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "" });
  const [joinCode, setJoinCode] = useState("");
  const [flash, setFlash] = useState("");
  const [busy, setBusy] = useState(false);
  const [spaceTab, setSpaceTab] = useState("markets"); // "markets" | "leaderboard" | "members"

  const clearFlash = useCallback(() => setFlash(""), []);
  useEffect(() => { if (flash) { const t = setTimeout(clearFlash, 4000); return () => clearTimeout(t); } }, [flash, clearFlash]);

  useEffect(() => {
    if (state.auth.authenticated) fetchGroups();
    else setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.auth.authenticated]);

  async function fetchGroups() {
    setLoading(true);
    try {
      const r = await fetch("/api/groups");
      const d = await r.json();
      if (d.ok) setGroups(d.groups);
    } finally { setLoading(false); }
  }

  async function openGroup(id) {
    if (openGroupId === id) { setOpenGroupId(null); return; }
    setOpenGroupId(id);
    if (groupDetails[id]) return; // already cached
    const [detR, mktR] = await Promise.all([
      fetch(`/api/groups/${id}`),
      fetch(`/api/groups/${id}/markets`),
    ]);
    const det = await detR.json();
    const mkt = await mktR.json();
    setGroupDetails((p) => ({
      ...p,
      [id]: {
        leaderboard: det.ok ? det.group.leaderboard : [],
        markets: mkt.ok ? mkt.markets : [],
      },
    }));
  }

  async function createGroup(e) {
    e.preventDefault();
    if (!draft.name.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const d = await r.json();
      if (d.ok) { setFlash(`"${d.group.name}" created!`); setDraft({ name: "", description: "" }); setShowCreate(false); await fetchGroups(); }
      else setFlash(d.message || "Failed.");
    } finally { setBusy(false); }
  }

  async function joinGroup(e) {
    e.preventDefault();
    if (!joinCode.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/groups/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteCode: joinCode.trim() }) });
      const d = await r.json();
      if (d.ok) { setFlash(d.message || "Joined!"); setJoinCode(""); await fetchGroups(); }
      else setFlash(d.message || "Failed.");
    } finally { setBusy(false); }
  }

  async function leaveOrDelete(groupId, isOwner) {
    if (!confirm(isOwner ? "Delete this group?" : "Leave this group?")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      const d = await r.json();
      if (d.ok) { setFlash(d.message || "Done."); if (openGroupId === groupId) setOpenGroupId(null); await fetchGroups(); }
      else setFlash(d.message || "Failed.");
    } finally { setBusy(false); }
  }

  if (!state.auth.authenticated) {
    return (
      <section className="page active">
        <SectionHead title="Groups" body="Create private bet leagues with your friends." />
        <div className="auth-nudge"><a href="/login">Sign in</a> to manage your groups.</div>
      </section>
    );
  }

  return (
    <section className="page active gp-root">
      <SectionHead title="Groups" body="Create a space for your crew — share predictions and bet together." />
      <p className="page-inline-links">
        <Link href="/friends">Friends</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/feed">Activity feed</Link>
      </p>

      {flash && <div className="gp-flash" onClick={clearFlash}>{flash} ×</div>}

      {/* ── Top actions ───────────────────────────────────────────────────── */}
      <div className="gp-actions">
        <button className="btn btn-primary btn-sm" type="button" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "+ New group"}
        </button>
        <form className="gp-join-form" onSubmit={joinGroup}>
          <input className="gp-join-input" type="text" placeholder="Enter invite code…" value={joinCode} onChange={(e) => setJoinCode(e.currentTarget.value)} />
          <button className="btn btn-secondary btn-sm" type="submit" disabled={!joinCode.trim() || busy}>Join</button>
        </form>
      </div>

      {/* ── Create form ───────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="gp-create-card list-card">
          <div className="gp-create-title">Create a group space</div>
          <p className="caption" style={{ margin: "0 0 12px" }}>Your group becomes a shared hub where you can see what everyone's betting on and compare results.</p>
          <form onSubmit={createGroup} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className="caption" htmlFor="gp-name">Group name *</label>
              <input id="gp-name" type="text" className="gp-input" placeholder="e.g. NBA Crew, Champions League Fans…" maxLength={80} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} required />
            </div>
            <div>
              <label className="caption" htmlFor="gp-desc">Description (optional)</label>
              <input id="gp-desc" type="text" className="gp-input" placeholder="What's this group about?" maxLength={200} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary btn-sm" type="submit" disabled={!draft.name.trim() || busy}>{busy ? "Creating…" : "Create"}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Groups ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="gp-skeletons">{[1,2].map((i) => <div key={i} className="gp-skeleton" />)}</div>
      ) : groups.length === 0 ? (
        <div className="gp-zero">
          <div style={{ fontSize: "2.5rem" }}>🏟️</div>
          <strong>No groups yet</strong>
          <p>Create one or join with an invite code.</p>
        </div>
      ) : (
        <div className="gp-list">
          {groups.map((group) => {
            const theme = getTheme(group.name + " " + (group.description || ""));
            const isOpen = openGroupId === group.id;
            const details = groupDetails[group.id];

            return (
              <div key={group.id} className={`gp-card${isOpen ? " gp-card--open" : ""}`}>
                {/* Card header with gradient banner */}
                <div className="gp-card-banner" style={{ background: theme.grad }} onClick={() => openGroup(group.id)}>
                  <div className="gp-banner-emoji">{theme.emoji}</div>
                  <div className="gp-banner-info">
                    <div className="gp-banner-name">{group.name}</div>
                    {group.description && <div className="gp-banner-desc">{group.description}</div>}
                    <div className="gp-banner-meta">
                      <span>{group.memberCount} member{group.memberCount !== 1 ? "s" : ""}</span>
                      {group.isOwner && <span className="gp-owner-badge">Owner</span>}
                    </div>
                  </div>
                  <div className="gp-banner-chevron">{isOpen ? "▲" : "▼"}</div>
                </div>

                {/* Invite code strip */}
                {group.inviteCode && (
                  <div className="gp-invite-strip">
                    <span className="caption">Invite code:</span>
                    <code className="gp-invite-code">{group.inviteCode}</code>
                    <button className="btn btn-ghost btn-sm" type="button"
                      onClick={async () => { await navigator.clipboard.writeText(group.inviteCode); setFlash("Copied!"); }}>
                      Copy
                    </button>
                    <span className="caption gp-invite-hint">Share this with friends to join</span>
                  </div>
                )}

                {/* Space content */}
                {isOpen && (
                  <div className="gp-space">
                    {/* Space tab bar */}
                    <div className="gp-space-tabs">
                      {[
                        { key: "markets", label: `📊 Markets${details?.markets?.length ? ` (${details.markets.length})` : ""}` },
                        { key: "leaderboard", label: "🏆 Leaderboard" },
                        { key: "members", label: `👥 Members` },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          className={`gp-space-tab${spaceTab === key ? " gp-space-tab--active" : ""}`}
                          type="button"
                          onClick={() => setSpaceTab(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Markets board */}
                    {spaceTab === "markets" && (
                      <div className="gp-board">
                        {!details ? (
                          <div className="gp-board-loading">Loading…</div>
                        ) : details.markets.length === 0 ? (
                          <div className="gp-board-empty">
                            <div style={{ fontSize: "1.8rem" }}>📭</div>
                            <strong>No active bets in this group yet.</strong>
                            <p className="caption">When members bet on markets, they'll show up here.</p>
                            <Link href="/markets" className="btn btn-secondary btn-sm">Browse markets →</Link>
                          </div>
                        ) : (
                          <div className="gp-market-list">
                            {details.markets.map((m) => (
                              <GroupMarketCard key={m.id} market={m} currentUserId={state.currentUser.id} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Leaderboard */}
                    {spaceTab === "leaderboard" && (
                      <div className="gp-board">
                        {!details || details.leaderboard.length === 0 ? (
                          <div className="gp-board-empty">
                            <div style={{ fontSize: "1.8rem" }}>📊</div>
                            <strong>No settled bets yet.</strong>
                            <p className="caption">Place bets to start climbing the leaderboard.</p>
                          </div>
                        ) : (
                          <div className="gp-lb-list">
                            {details.leaderboard.map((entry) => (
                              <div
                                key={entry.userId}
                                className={`gp-lb-row${entry.userId === state.currentUser.id ? " gp-lb-row--me" : ""}`}
                              >
                                <span className={`gp-lb-rank${entry.rank <= 3 ? " gp-lb-rank--top" : ""}`}>
                                  {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`}
                                </span>
                                <Avatar name={entry.name} size={32} />
                                <div className="gp-lb-info">
                                  <div className="fp-name">{entry.name}{entry.userId === state.currentUser.id ? " (you)" : ""}</div>
                                  <div className="caption">{entry.totalBets} bet{entry.totalBets !== 1 ? "s" : ""}
                                    {entry.winRate !== null ? ` · ${entry.winRate}% win rate` : ""}
                                  </div>
                                </div>
                                <div className={`gp-lb-pnl${entry.estimatedPnl >= 0 ? " gp-lb-pnl--up" : " gp-lb-pnl--down"}`}>
                                  {entry.estimatedPnl >= 0 ? "+" : ""}${Math.abs(entry.estimatedPnl).toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Members */}
                    {spaceTab === "members" && (
                      <div className="gp-board">
                        {!details || details.leaderboard.length === 0 ? (
                          <div className="gp-board-loading">Loading…</div>
                        ) : (
                          <div className="gp-member-grid">
                            {details.leaderboard.map((entry) => (
                              <div
                                key={entry.userId}
                                className={`gp-member-chip${entry.userId === state.currentUser.id ? " gp-member-chip--me" : ""}`}
                              >
                                <Avatar name={entry.name} size={36} />
                                <div>
                                  <div className="fp-name" style={{ fontSize: "0.82rem" }}>
                                    {entry.name.split(" ")[0]}
                                    {entry.isOwner && <span className="gp-star">★</span>}
                                  </div>
                                  <div className="caption">{entry.totalBets} bet{entry.totalBets !== 1 ? "s" : ""}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="gp-card-footer">
                  <button className="btn btn-ghost btn-sm gp-leave-btn" type="button" disabled={busy}
                    onClick={() => leaveOrDelete(group.id, group.isOwner)}>
                    {group.isOwner ? "Delete group" : "Leave group"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function GroupMarketCard({ market, currentUserId }) {
  const yesPct = Math.round((market.yesPrice ?? 0.5) * 100);
  const noPct = 100 - yesPct;
  const myEntry = market.members?.find((m) => m.id === currentUserId);
  const others = market.members?.filter((m) => m.id !== currentUserId) ?? [];

  return (
    <div className="gp-market-card">
      <div className="gp-market-card-top">
        <div>
          <span className="caption gp-market-cat">{market.category}</span>
          <Link href={`/markets/${market.id}`} className="gp-market-title">{market.title}</Link>
        </div>
        {!myEntry && (
          <Link href={`/markets/${market.id}`} className="btn btn-primary btn-sm gp-bet-btn">Bet →</Link>
        )}
      </div>

      {/* Odds bar */}
      <div className="gp-odds-bar">
        <div className="gp-odds-yes" style={{ width: `${yesPct}%` }}>YES {yesPct}¢</div>
        <div className="gp-odds-no" style={{ width: `${noPct}%` }}>NO {noPct}¢</div>
      </div>

      {/* Who's betting */}
      <div className="gp-market-bettors">
        {myEntry && (
          <span className={`gp-bettor-badge gp-bettor-badge--me gp-bettor-badge--${myEntry.side.toLowerCase()}`}>
            You: {myEntry.side}
          </span>
        )}
        {others.map((m) => (
          <span key={m.id} className={`gp-bettor-badge gp-bettor-badge--${m.side.toLowerCase()}`}
            title={`${m.name} bet ${m.side}`}>
            {getInitials(m.name)}: {m.side}
          </span>
        ))}
      </div>
    </div>
  );
}
