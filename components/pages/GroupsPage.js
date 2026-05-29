"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAgora } from "../../context/AgoraContext";
import { SectionHead } from "../ui";

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function GroupsPage() {
  const { state } = useAgora();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState({ name: "", description: "" });
  const [joinCode, setJoinCode] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMarkets, setGroupMarkets] = useState({}); // groupId → markets[]
  const [flash, setFlash] = useState("");
  const [pending, setPending] = useState(false);

  const clearFlash = useCallback(() => setFlash(""), []);

  useEffect(() => {
    if (flash) {
      const t = window.setTimeout(clearFlash, 4000);
      return () => window.clearTimeout(t);
    }
  }, [flash, clearFlash]);

  useEffect(() => {
    if (state.auth.authenticated) {
      fetchGroups();
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.auth.authenticated]);

  async function fetchGroups() {
    setLoading(true);
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      if (data.ok) setGroups(data.groups);
    } finally {
      setLoading(false);
    }
  }

  async function selectGroup(id) {
    if (selectedGroup && selectedGroup.id === id) {
      setSelectedGroup(null);
      return;
    }
    // Load group details + markets in parallel
    const [detailRes, marketsRes] = await Promise.all([
      fetch(`/api/groups/${id}`),
      fetch(`/api/groups/${id}/markets`),
    ]);
    const detail = await detailRes.json();
    const marketsData = await marketsRes.json();
    if (detail.ok) setSelectedGroup(detail.group);
    if (marketsData.ok) {
      setGroupMarkets((prev) => ({ ...prev, [id]: marketsData.markets }));
    }
  }

  async function createGroup(e) {
    e.preventDefault();
    if (!createDraft.name.trim() || pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createDraft.name, description: createDraft.description }),
      });
      const data = await res.json();
      if (data.ok) {
        setFlash(`Group "${data.group.name}" created!`);
        setCreateDraft({ name: "", description: "" });
        setShowCreate(false);
        await fetchGroups();
      } else {
        setFlash(data.message || "Failed to create group.");
      }
    } finally {
      setPending(false);
    }
  }

  async function joinGroup(e) {
    e.preventDefault();
    if (!joinCode.trim() || pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setFlash(data.message || "Joined group!");
        setJoinCode("");
        await fetchGroups();
      } else {
        setFlash(data.message || "Failed to join group.");
      }
    } finally {
      setPending(false);
    }
  }

  async function leaveOrDelete(groupId, isOwner) {
    if (pending) return;
    const confirmed = window.confirm(
      isOwner
        ? "Delete this group? This cannot be undone."
        : "Leave this group?",
    );
    if (!confirmed) return;
    setPending(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setFlash(data.message || (isOwner ? "Group deleted." : "Left group."));
        if (selectedGroup && selectedGroup.id === groupId) setSelectedGroup(null);
        await fetchGroups();
      } else {
        setFlash(data.message || "Action failed.");
      }
    } finally {
      setPending(false);
    }
  }

  async function copyInvite(code) {
    try {
      await navigator.clipboard.writeText(code);
      setFlash("Invite code copied!");
    } catch {
      setFlash("Could not copy — check clipboard permissions.");
    }
  }

  if (!state.auth.authenticated) {
    return (
      <section className="page active">
        <SectionHead title="Groups" body="Create private leagues with your friends." />
        <div className="auth-nudge">
          <a href="/login">Sign in</a> to view and manage your groups.
        </div>
      </section>
    );
  }

  return (
    <section className="page active groups-page-root">
      <SectionHead
        title="Groups"
        body="Create private leagues, share an invite code, and see how your crew stacks up."
      />
      <p className="page-inline-links">
        <Link href="/friends">Friends</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/feed">Activity feed</Link>
      </p>

      {flash && (
        <div className="groups-flash" role="status" onClick={clearFlash}>
          {flash} &times;
        </div>
      )}

      {/* ── Actions row ───────────────────────────────────────────────────── */}
      <div className="groups-actions">
        <button
          className="btn btn-primary btn-sm"
          type="button"
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? "Cancel" : "+ Create group"}
        </button>
        <form className="groups-join-form" onSubmit={joinGroup}>
          <input
            className="groups-join-input"
            type="text"
            placeholder="Enter invite code to join…"
            value={joinCode}
            onChange={(e) => setJoinCode(e.currentTarget.value)}
          />
          <button className="btn btn-secondary btn-sm" type="submit" disabled={!joinCode.trim() || pending}>
            Join
          </button>
        </form>
      </div>

      {/* ── Create form ───────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="list-card groups-create-card">
          <form onSubmit={createGroup}>
            <div className="info-list info-list--tight">
              <div>
                <label htmlFor="group-name-input" className="caption">Group name *</label>
                <input
                  id="group-name-input"
                  type="text"
                  placeholder="My Crew"
                  maxLength={80}
                  value={createDraft.name}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, name: e.currentTarget.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="group-desc-input" className="caption">Description (optional)</label>
                <input
                  id="group-desc-input"
                  type="text"
                  placeholder="What's this group about?"
                  maxLength={200}
                  value={createDraft.description}
                  onChange={(e) => setCreateDraft((d) => ({ ...d, description: e.currentTarget.value }))}
                />
              </div>
            </div>
            <div className="groups-create-footer">
              <button
                className="btn btn-primary btn-sm"
                type="submit"
                disabled={!createDraft.name.trim() || pending}
              >
                {pending ? "Creating…" : "Create group"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Groups list ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="groups-loading">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="groups-skeleton-card">
              <div className="skeleton-line skeleton-line--long" />
              <div className="skeleton-line skeleton-line--short" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="groups-empty">
          <strong>No groups yet.</strong>
          <p>Create one above or join with an invite code from a friend.</p>
        </div>
      ) : (
        <div className="groups-list">
          {groups.map((group) => {
            const isExpanded = selectedGroup && selectedGroup.id === group.id;
            const markets = groupMarkets[group.id] ?? [];

            return (
              <div className="list-card groups-card" key={group.id}>
                {/* Header */}
                <div className="groups-card-header" onClick={() => selectGroup(group.id)}>
                  <div className="groups-card-info">
                    <div className="groups-card-name-row">
                      <strong className="groups-card-name">{group.name}</strong>
                      {group.isOwner && <span className="groups-owner-badge">Owner</span>}
                    </div>
                    {group.description && (
                      <span className="groups-card-desc">{group.description}</span>
                    )}
                    <span className="caption">
                      {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
                      {!group.isOwner && ` · owned by ${group.ownerName}`}
                    </span>
                  </div>
                  <div className="groups-card-meta">
                    <span className="groups-expand-icon caption" aria-hidden="true">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Invite code row */}
                {group.inviteCode && (
                  <div className="groups-invite-row">
                    <span className="groups-invite-label">Invite code:</span>
                    <span className="groups-invite-code">{group.inviteCode}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      onClick={() => copyInvite(group.inviteCode)}
                    >
                      Copy
                    </button>
                    <span className="caption" style={{ marginLeft: "auto" }}>
                      Share this code with friends to add them
                    </span>
                  </div>
                )}

                {/* Expanded: Leaderboard + Group Markets */}
                {isExpanded && selectedGroup && (
                  <div className="groups-expanded">
                    {/* Leaderboard */}
                    <div className="groups-section">
                      <div className="groups-section-title caption">Leaderboard</div>
                      {selectedGroup.leaderboard.length === 0 ? (
                        <div className="empty-note empty-note--sm">No bets yet — place some!</div>
                      ) : (
                        <div className="groups-leaderboard">
                          {selectedGroup.leaderboard.map((entry) => (
                            <div
                              className={`leaderboard-row${entry.userId === state.currentUser.id ? " leaderboard-row--self" : ""}`}
                              key={entry.userId}
                            >
                              <span className="leaderboard-rank">#{entry.rank}</span>
                              <div className="leaderboard-identity">
                                <div className="friend-avatar leaderboard-avatar" aria-hidden="true">
                                  {getInitials(entry.name)}
                                </div>
                                <div>
                                  <strong>{entry.name}</strong>
                                  <div className="caption">
                                    {entry.username}{entry.isOwner ? " · owner" : ""}
                                  </div>
                                </div>
                              </div>
                              <div className="leaderboard-stats">
                                <span className={entry.estimatedPnl >= 0 ? "pnl-positive" : "pnl-negative"}>
                                  {entry.estimatedPnl >= 0 ? "+" : ""}${Math.abs(entry.estimatedPnl).toFixed(2)}
                                </span>
                                <span className="caption">
                                  {entry.winRate !== null ? `${entry.winRate}% win rate` : "No settled bets"}
                                  {" · "}{entry.totalBets} bet{entry.totalBets !== 1 ? "s" : ""}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Group Markets — what members are currently betting on */}
                    <div className="groups-section">
                      <div className="groups-section-header">
                        <div className="groups-section-title caption">Active Markets in This Group</div>
                      </div>

                      {markets.length === 0 ? (
                        <div className="groups-markets-empty">
                          <p>No active bets in this group yet.</p>
                          <Link className="btn btn-secondary btn-sm" href="/markets">
                            Browse markets →
                          </Link>
                        </div>
                      ) : (
                        <div className="groups-market-list">
                          {markets.map((m) => (
                            <GroupMarketRow
                              key={m.id}
                              market={m}
                              currentUserId={state.currentUser.id}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Member chips */}
                    <div className="groups-section">
                      <div className="groups-section-title caption">Members</div>
                      <div className="groups-member-chips">
                        {selectedGroup.leaderboard.map((entry) => (
                          <div
                            key={entry.userId}
                            className={`groups-member-chip${entry.userId === state.currentUser.id ? " groups-member-chip--self" : ""}`}
                            title={entry.username}
                          >
                            <div className="friend-avatar groups-member-avatar" aria-hidden="true">
                              {getInitials(entry.name)}
                            </div>
                            <span>{entry.name.split(" ")[0]}</span>
                            {entry.isOwner && <span className="groups-owner-dot" aria-label="owner" title="Group owner">★</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="groups-card-footer">
                  <button
                    className="btn btn-ghost btn-sm groups-leave-btn"
                    type="button"
                    disabled={pending}
                    onClick={() => leaveOrDelete(group.id, group.isOwner)}
                  >
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

// ─── GroupMarketRow ───────────────────────────────────────────────────────────

function GroupMarketRow({ market, currentUserId }) {
  const yesPct = Math.round(market.yesPrice * 100);
  const noPct = 100 - yesPct;
  const myEntry = market.members.find((m) => m.id === currentUserId);
  const others = market.members.filter((m) => m.id !== currentUserId);

  return (
    <div className="groups-market-row">
      <div className="groups-market-row-info">
        <Link href={`/markets/${market.id}`} className="groups-market-title">
          {market.title}
        </Link>
        <div className="groups-market-meta caption">
          <span>{market.category}</span>
          <span className="groups-market-odds">YES {yesPct}¢ · NO {noPct}¢</span>
        </div>
      </div>

      <div className="groups-market-members">
        {myEntry && (
          <span className={`groups-market-badge groups-market-badge--${myEntry.side.toLowerCase()} groups-market-badge--me`}>
            You: {myEntry.side}
          </span>
        )}
        {others.map((m) => (
          <span
            key={m.id}
            className={`groups-market-badge groups-market-badge--${m.side.toLowerCase()}`}
            title={`${m.name} bet ${m.side}`}
          >
            {getInitials(m.name)}: {m.side}
          </span>
        ))}
        {!myEntry && (
          <Link href={`/markets/${market.id}`} className="btn btn-primary btn-sm groups-market-join-btn">
            Bet →
          </Link>
        )}
      </div>
    </div>
  );
}
