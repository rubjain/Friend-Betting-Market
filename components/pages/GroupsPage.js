"use client";

import { useState, useEffect } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { SectionHead } from "../ui";

export default function GroupsPage() {
  const { state } = useFriendMarket();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState({ name: "", description: "" });
  const [joinCode, setJoinCode] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [flash, setFlash] = useState("");
  const [pending, setPending] = useState(false);

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
    try {
      const res = await fetch(`/api/groups/${id}`);
      const data = await res.json();
      if (data.ok) setSelectedGroup(data.group);
    } catch {
      // silently fail
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
      setFlash("Copied!");
    } catch {
      setFlash("Could not copy to clipboard.");
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
    <section className="page active">
      <SectionHead title="Groups" body="Create private leagues, share an invite code, and compare performance." />

      {flash && (
        <div className="flash-banner" onClick={() => setFlash("")}>
          {flash} &times;
        </div>
      )}

      <div className="groups-actions">
        <button
          className="btn btn-primary btn-sm"
          type="button"
          onClick={() => setShowCreate(v => !v)}
        >
          {showCreate ? "Cancel" : "Create group"}
        </button>
        <form className="groups-join-form" onSubmit={joinGroup}>
          <input
            className="groups-join-input"
            type="text"
            placeholder="Enter invite code..."
            value={joinCode}
            onChange={e => setJoinCode(e.currentTarget.value)}
          />
          <button className="btn btn-secondary btn-sm" type="submit" disabled={!joinCode.trim() || pending}>
            Join
          </button>
        </form>
      </div>

      {showCreate && (
        <div className="list-card groups-create-card">
          <form onSubmit={createGroup}>
            <div className="info-list info-list--tight">
              <div>
                <label htmlFor="group-name-input" className="caption">Group name</label>
                <input
                  id="group-name-input"
                  type="text"
                  placeholder="My League"
                  maxLength={80}
                  value={createDraft.name}
                  onChange={e => setCreateDraft(d => ({ ...d, name: e.currentTarget.value }))}
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
                  onChange={e => setCreateDraft(d => ({ ...d, description: e.currentTarget.value }))}
                />
              </div>
            </div>
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-primary btn-sm" type="submit" disabled={!createDraft.name.trim() || pending}>
                {pending ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="empty-note">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="empty-note">No groups yet. Create one or join with an invite code.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.map(group => {
            const isExpanded = selectedGroup && selectedGroup.id === group.id;
            return (
              <div className="list-card groups-card" key={group.id}>
                <div className="groups-card-header" onClick={() => selectGroup(group.id)}>
                  <div className="groups-card-info">
                    <strong className="groups-card-name">{group.name}</strong>
                    {group.description && (
                      <span className="groups-card-desc">{group.description}</span>
                    )}
                    <span className="caption">{group.memberCount} member{group.memberCount !== 1 ? "s" : ""} · {group.isOwner ? "You own this" : `Owned by ${group.ownerName}`}</span>
                  </div>
                  <div className="groups-card-meta">
                    <span className="caption">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

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
                  </div>
                )}

                {isExpanded && selectedGroup && (
                  <div className="groups-leaderboard">
                    <p className="groups-leaderboard-title">Leaderboard</p>
                    {selectedGroup.leaderboard.length === 0 ? (
                      <div className="empty-note">No bets yet.</div>
                    ) : (
                      selectedGroup.leaderboard.map(entry => (
                        <div
                          className={`leaderboard-row${entry.userId === state.currentUser.id ? " leaderboard-row--self" : ""}`}
                          key={entry.userId}
                        >
                          <span className="leaderboard-rank">#{entry.rank}</span>
                          <div className="leaderboard-identity">
                            <strong>{entry.name}</strong>
                            <span className="caption">@{entry.username}{entry.isOwner ? " · owner" : ""}</span>
                          </div>
                          <div className="leaderboard-stats">
                            <span className={entry.estimatedPnl >= 0 ? "pnl-positive" : "pnl-negative"}>
                              {entry.estimatedPnl >= 0 ? "+" : ""}${Math.abs(entry.estimatedPnl).toFixed(2)}
                            </span>
                            <span className="caption">
                              {entry.winRate !== null ? `${entry.winRate}% win rate` : "No settled bets"} · {entry.totalBets} bet{entry.totalBets !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                <div className="groups-card-footer">
                  <button
                    className="btn btn-ghost btn-sm"
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
