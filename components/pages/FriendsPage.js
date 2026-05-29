"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAgora } from "../../context/AgoraContext";
import { SectionHead } from "../ui";

const FEED_POLL_MS = 30_000;

function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function initials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function Avatar({ name, size = "md", side }) {
  const sz = size === "lg" ? 44 : size === "sm" ? 26 : 34;
  const fs = size === "lg" ? "1rem" : size === "sm" ? "0.6rem" : "0.75rem";
  const sideColor = side === "YES" ? "#38a169" : side === "NO" ? "#e53e3e" : "var(--accent)";
  return (
    <div style={{
      width: sz, height: sz, borderRadius: "50%",
      background: side ? sideColor : "var(--accent)",
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: fs, fontWeight: 700, flexShrink: 0, userSelect: "none",
    }}>
      {initials(name)}
    </div>
  );
}

export default function FriendsPage() {
  const { state, actions } = useAgora();
  const [tab, setTab] = useState("friends");

  // friend management
  const [pendingAction, setPendingAction] = useState("");
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [discoveryResults, setDiscoveryResults] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // activity feed
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const feedRef = useRef(null);

  // bet together / invite
  const [inviteMarket, setInviteMarket] = useState(null);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteSelectedFriends, setInviteSelectedFriends] = useState([]);
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteSide, setInviteSide] = useState("YES");
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);
  const [receivedInvites, setReceivedInvites] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);
  const [invitesLoaded, setInvitesLoaded] = useState(false);
  const [marketSearch, setMarketSearch] = useState("");

  const hasFriends = state.friends.list.length > 0;
  const pendingCount = state.friends.pending.length;
  const incomingCount = state.friends.pending.filter((r) => r.direction === "incoming").length;

  // ── Feed ──────────────────────────────────────────────────────────────────
  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/feed/friends");
      const json = await res.json();
      if (json.ok) setFeedItems(json.items ?? []);
    } catch { /**/ }
    finally { setFeedLoading(false); }
  }, []);

  useEffect(() => {
    fetchFeed();
    feedRef.current = setInterval(fetchFeed, FEED_POLL_MS);
    return () => clearInterval(feedRef.current);
  }, [fetchFeed]);

  // ── Discovery search ──────────────────────────────────────────────────────
  useEffect(() => {
    const q = discoveryQuery.trim();
    if (q.length < 2) { setDiscoveryResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setDiscoveryLoading(true);
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setDiscoveryResults(data.results ?? []);
      } catch { if (!ctrl.signal.aborted) setDiscoveryResults([]); }
      finally { if (!ctrl.signal.aborted) setDiscoveryLoading(false); }
    }, 250);
    return () => { ctrl.abort(); clearTimeout(t); };
  }, [discoveryQuery]);

  // ── Invites ───────────────────────────────────────────────────────────────
  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch("/api/friends/bet-invite");
      const json = await res.json();
      if (json.ok) { setReceivedInvites(json.received ?? []); setSentInvites(json.sent ?? []); }
    } catch { /**/ }
    finally { setInvitesLoaded(true); }
  }, []);

  useEffect(() => {
    if (tab === "together") fetchInvites();
  }, [tab, fetchInvites]);

  async function run(key, fn) {
    if (pendingAction) return;
    setPendingAction(key);
    try { await fn(); } finally { setPendingAction(""); }
  }

  async function sendInvites() {
    if (!inviteMarket || !inviteSelectedFriends.length || inviteSending) return;
    setInviteSending(true);
    try {
      const res = await fetch("/api/friends/bet-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: inviteMarket.id,
          marketTitle: inviteMarket.title,
          friendIds: inviteSelectedFriends.map((f) => f.id),
          message: inviteMessage || undefined,
          side: inviteSide,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setInviteSent(true);
        fetchInvites();
      }
    } finally {
      setInviteSending(false);
    }
  }

  async function respondToInvite(inviteId, status, marketId) {
    await fetch("/api/friends/bet-invite", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId, status }),
    });
    fetchInvites();
    if (status === "accepted") {
      window.location.href = `/markets/${marketId}`;
    }
  }

  function resetInviteFlow() {
    setInviteMarket(null);
    setInviteSelectedFriends([]);
    setInviteMessage("");
    setInviteSide("YES");
    setInviteSent(false);
    setMarketSearch("");
  }

  const filteredMarkets = state.markets
    .filter((m) => m.status === "active")
    .filter((m) => !marketSearch || m.title.toLowerCase().includes(marketSearch.toLowerCase()) || m.category?.toLowerCase().includes(marketSearch.toLowerCase()));

  const pendingReceived = receivedInvites.filter((i) => i.status === "pending");

  return (
    <section className="page active fp-root">
      <SectionHead title="Friends" body="Invite friends, challenge each other, and bet together." />
      <p className="page-inline-links">
        <Link href="/groups">Groups</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/feed">Activity feed</Link>
      </p>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="fp-tabs">
        {[
          { key: "friends", label: "Friends", badge: state.friends.list.length || null },
          { key: "together", label: "Bet Together", badge: pendingReceived.length || null, accent: true },
          { key: "pending", label: "Pending", badge: pendingCount || null, alert: true },
        ].map(({ key, label, badge, accent, alert }) => (
          <button
            key={key}
            className={`fp-tab${tab === key ? " fp-tab--active" : ""}`}
            type="button"
            onClick={() => setTab(key)}
          >
            {label}
            {badge > 0 && (
              <span className={`fp-tab-pill${alert ? " fp-tab-pill--alert" : accent ? " fp-tab-pill--accent" : ""}`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="fp-layout">
        <div className="fp-main">

          {/* ════════════════ FRIENDS TAB ════════════════ */}
          {tab === "friends" && (
            <div className="fp-stack">
              {/* Stats */}
              <div className="fp-stats">
                <div className="fp-stat"><strong>{state.friends.list.length}</strong><span>Friends</span></div>
                <div className="fp-stat-div" />
                <div className="fp-stat"><strong>{pendingCount}</strong><span>Pending</span></div>
                <div className="fp-stat-div" />
                <div className="fp-stat fp-stat--accent">
                  <strong>{state.friends.list.reduce((s, f) => s + (f.boostCount || 0), 0)}</strong>
                  <span>Boosts given</span>
                </div>
              </div>

              {/* Add friend */}
              <div className="fp-add-card">
                <div className="fp-add-card-title">Add a friend</div>
                <div className="fp-add-row">
                  <input
                    type="text"
                    className="fp-input"
                    placeholder="@username"
                    value={state.friendInviteDraft}
                    onChange={(e) => actions.updateFriendInviteDraft(e.currentTarget.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") run("invite", actions.sendFriendInvite); }}
                  />
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={!state.friendInviteDraft.trim() || !!pendingAction}
                    onClick={() => run("invite", actions.sendFriendInvite)}
                  >
                    {pendingAction === "invite" ? "Sending…" : "Invite"}
                  </button>
                </div>

                <input
                  type="search"
                  className="fp-input fp-discovery-input"
                  placeholder="Or search by name…"
                  value={discoveryQuery}
                  onChange={(e) => setDiscoveryQuery(e.currentTarget.value)}
                />

                {discoveryQuery.trim().length >= 2 && (
                  <div className="fp-discovery-results">
                    {discoveryLoading ? (
                      <p className="caption" style={{ padding: "8px 0" }}>Searching…</p>
                    ) : discoveryResults.length ? (
                      discoveryResults.map((p) => (
                        <div key={p.id} className="fp-discovery-row">
                          <Avatar name={p.name} size="sm" />
                          <div style={{ flex: 1 }}>
                            <div className="fp-name">{p.name}</div>
                            <div className="caption">{p.username}</div>
                          </div>
                          <button
                            className={`btn btn-sm ${p.status === "not_connected" ? "btn-secondary" : "btn-ghost"}`}
                            type="button"
                            disabled={p.status !== "not_connected" || pendingAction === `invite-${p.username}`}
                            onClick={() => run(`invite-${p.username}`, () => actions.sendFriendInvite(p.username))}
                          >
                            {p.status === "friends" ? "Friends" : p.status === "pending_outgoing" ? "Sent" : pendingAction === `invite-${p.username}` ? "…" : "Invite"}
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="caption" style={{ padding: "8px 0" }}>No accounts found.</p>
                    )}
                  </div>
                )}

                <p className="caption fp-demo-note">Demo: test@example.com / taylor@example.com · password123</p>
              </div>

              {/* Friends list */}
              {hasFriends ? (
                <div className="fp-friend-list">
                  {state.friends.list.map((f) => (
                    <FriendRow
                      key={f.username}
                      friend={f}
                      onInvite={() => { setTab("together"); setInviteSelectedFriends([f]); }}
                    />
                  ))}
                </div>
              ) : (
                <div className="fp-empty">
                  <div className="fp-empty-icon">👥</div>
                  <strong>No friends yet</strong>
                  <p>Invite someone above to get started.</p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ BET TOGETHER TAB ════════════════ */}
          {tab === "together" && (
            <div className="fp-stack">
              {/* Received invites */}
              {pendingReceived.length > 0 && (
                <div className="fp-invites-section">
                  <div className="fp-section-label">
                    <span className="fp-pulse" />
                    {pendingReceived.length} invite{pendingReceived.length !== 1 ? "s" : ""} waiting for you
                  </div>
                  {pendingReceived.map((inv) => (
                    <ReceivedInviteCard key={inv.id} invite={inv} onRespond={respondToInvite} />
                  ))}
                </div>
              )}

              {/* Invite composer */}
              {inviteSent ? (
                <div className="fp-invite-success">
                  <div className="fp-success-icon">🎉</div>
                  <strong>Invites sent!</strong>
                  <p className="caption">
                    {inviteSelectedFriends.map((f) => f.name.split(" ")[0]).join(", ")} will see your invite next time they check their Bet Together tab.
                  </p>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={resetInviteFlow}>
                    Send another invite
                  </button>
                </div>
              ) : (
                <div className="fp-composer">
                  <div className="fp-composer-title">
                    Send a bet invite
                    <span className="fp-composer-subtitle caption">Pick a market, choose friends, send it</span>
                  </div>

                  {/* Step 1: Market */}
                  <div className={`fp-step${inviteMarket ? " fp-step--done" : ""}`}>
                    <div className="fp-step-num">1</div>
                    <div className="fp-step-body">
                      <div className="fp-step-label">Choose a market</div>
                      {inviteMarket ? (
                        <div className="fp-selected-market">
                          <div className="fp-selected-market-inner">
                            <span className="caption fp-market-cat">{inviteMarket.category}</span>
                            <strong className="fp-market-name">{inviteMarket.title}</strong>
                          </div>
                          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setInviteMarket(null)}>Change</button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="search"
                            className="fp-input"
                            placeholder="Search markets…"
                            value={marketSearch}
                            onChange={(e) => setMarketSearch(e.currentTarget.value)}
                          />
                          <div className="fp-market-picker">
                            {filteredMarkets.slice(0, 15).map((m) => (
                              <button
                                key={m.id}
                                className="fp-market-option"
                                type="button"
                                onClick={() => setInviteMarket(m)}
                              >
                                <span className="fp-market-option-cat caption">{m.category}</span>
                                <span className="fp-market-option-title">{m.title}</span>
                                <span className="fp-market-option-odds caption">YES {Math.round(m.yesPrice * 100)}¢</span>
                              </button>
                            ))}
                            {filteredMarkets.length === 0 && (
                              <p className="caption" style={{ padding: "8px" }}>No markets match.</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Side */}
                  {inviteMarket && (
                    <div className="fp-step fp-step--done">
                      <div className="fp-step-num">2</div>
                      <div className="fp-step-body">
                        <div className="fp-step-label">Your side (optional signal)</div>
                        <div className="fp-side-toggle">
                          <button
                            className={`fp-side-btn${inviteSide === "YES" ? " fp-side-btn--yes" : ""}`}
                            type="button"
                            onClick={() => setInviteSide("YES")}
                          >
                            YES {Math.round((inviteMarket.yesPrice ?? 0.5) * 100)}¢
                          </button>
                          <button
                            className={`fp-side-btn${inviteSide === "NO" ? " fp-side-btn--no" : ""}`}
                            type="button"
                            onClick={() => setInviteSide("NO")}
                          >
                            NO {Math.round((inviteMarket.noPrice ?? 0.5) * 100)}¢
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Friends */}
                  {inviteMarket && (
                    <div className="fp-step">
                      <div className="fp-step-num">3</div>
                      <div className="fp-step-body">
                        <div className="fp-step-label">Who to invite</div>
                        {!hasFriends ? (
                          <p className="caption">Add friends first.</p>
                        ) : (
                          <div className="fp-friend-checkboxes">
                            {state.friends.list.map((f) => {
                              const checked = inviteSelectedFriends.some((x) => x.id === f.id);
                              return (
                                <button
                                  key={f.id || f.username}
                                  className={`fp-friend-check${checked ? " fp-friend-check--on" : ""}`}
                                  type="button"
                                  onClick={() => setInviteSelectedFriends((prev) =>
                                    checked ? prev.filter((x) => x.id !== f.id) : [...prev, f]
                                  )}
                                >
                                  <Avatar name={f.name} size="sm" />
                                  <span>{f.name.split(" ")[0]}</span>
                                  {checked && <span className="fp-check-tick">✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Message + send */}
                  {inviteMarket && inviteSelectedFriends.length > 0 && (
                    <div className="fp-step">
                      <div className="fp-step-num">4</div>
                      <div className="fp-step-body">
                        <div className="fp-step-label">Add a message (optional)</div>
                        <input
                          type="text"
                          className="fp-input"
                          placeholder="e.g. This one's a lock 🔥"
                          maxLength={120}
                          value={inviteMessage}
                          onChange={(e) => setInviteMessage(e.currentTarget.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Preview card */}
                  {inviteMarket && inviteSelectedFriends.length > 0 && (
                    <div className="fp-invite-preview">
                      <div className="fp-preview-label caption">Preview</div>
                      <InvitePreviewCard
                        market={inviteMarket}
                        side={inviteSide}
                        from={state.currentUser}
                        message={inviteMessage}
                      />
                      <button
                        className="btn btn-primary fp-send-btn"
                        type="button"
                        disabled={inviteSending}
                        onClick={sendInvites}
                      >
                        {inviteSending
                          ? "Sending…"
                          : `Send to ${inviteSelectedFriends.length} friend${inviteSelectedFriends.length !== 1 ? "s" : ""}`}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sent invites */}
              {sentInvites.length > 0 && (
                <div className="fp-sent-invites">
                  <div className="fp-section-label">Sent</div>
                  {sentInvites.map((inv) => (
                    <div key={inv.id} className="fp-sent-row">
                      <div className={`fp-sent-dot fp-sent-dot--${inv.status}`} />
                      <div style={{ flex: 1 }}>
                        <div className="fp-name" style={{ fontSize: "0.85rem" }}>{inv.marketTitle}</div>
                        <div className="caption">{timeAgo(inv.createdAt)} · {inv.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════ PENDING TAB ════════════════ */}
          {tab === "pending" && (
            <div className="fp-stack">
              {pendingCount === 0 ? (
                <div className="fp-empty">
                  <div className="fp-empty-icon">✓</div>
                  <strong>All caught up</strong>
                  <p>No pending requests.</p>
                </div>
              ) : (
                <>
                  {incomingCount > 0 && (
                    <div className="fp-pending-section">
                      <div className="fp-section-label">Incoming</div>
                      {state.friends.pending.filter((r) => r.direction === "incoming").map((req) => (
                        <PendingRow key={req.username} req={req} pendingAction={pendingAction}
                          onAccept={() => run(`accept-${req.username}`, () => actions.handleFriendRequest(req.username, "accept"))}
                          onDecline={() => run(`decline-${req.username}`, () => actions.handleFriendRequest(req.username, "decline"))}
                        />
                      ))}
                    </div>
                  )}
                  {state.friends.pending.filter((r) => r.direction === "outgoing").length > 0 && (
                    <div className="fp-pending-section">
                      <div className="fp-section-label">Sent</div>
                      {state.friends.pending.filter((r) => r.direction === "outgoing").map((req) => (
                        <PendingRow key={req.username} req={req} pendingAction={pendingAction}
                          onCancel={() => run(`cancel-${req.username}`, () => actions.handleFriendRequest(req.username, "cancel"))}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Feed sidebar ──────────────────────────────────────────────────── */}
        <aside className="fp-feed-aside">
          <div className="fp-feed-card">
            <div className="fp-feed-hd">
              <span className="fp-feed-title">Friend Activity</span>
              <span className="caption">Last 24h</span>
            </div>
            {feedLoading ? (
              [1,2,3].map((i) => <div key={i} className="fp-feed-skeleton" />)
            ) : feedItems.length === 0 ? (
              <div className="fp-feed-empty">
                {hasFriends ? "No bets in the last 24 hours." : "Add friends to see their activity."}
              </div>
            ) : feedItems.map((item) => (
              <Link key={item.id} href={`/markets/${item.marketId}`} className="fp-feed-row">
                <Avatar name={item.friendName} size="sm" side={item.side} />
                <div>
                  <div className="fp-name" style={{ fontSize: "0.83rem" }}>
                    <strong>{item.friendName.split(" ")[0]}</strong> bet{" "}
                    <span className={`fp-side fp-side--${item.side.toLowerCase()}`}>{item.side}</span>
                  </div>
                  <div className="caption fp-feed-mkt">{item.marketTitle}</div>
                  <div className="caption" style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{timeAgo(item.placedAt)}</div>
                </div>
              </Link>
            ))}
            <div className="fp-feed-footer caption">Refreshes every 30s</div>
          </div>
        </aside>
      </div>
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FriendRow({ friend, onInvite }) {
  return (
    <div className="fp-friend-row">
      <Avatar name={friend.name} />
      <div className="fp-friend-info">
        <div className="fp-name">{friend.name}</div>
        <div className="caption">{friend.username}{friend.boostCount > 0 ? ` · ${friend.boostCount} boosts` : ""}</div>
      </div>
      <button className="btn btn-secondary btn-sm fp-invite-btn" type="button" onClick={onInvite}>
        Invite to bet
      </button>
    </div>
  );
}

function PendingRow({ req, pendingAction, onAccept, onDecline, onCancel }) {
  return (
    <div className="fp-pending-row">
      <Avatar name={req.name} size="sm" />
      <div className="fp-friend-info">
        <div className="fp-name">{req.name}</div>
        <div className="caption">{req.username}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {req.direction === "incoming" ? (
          <>
            <button className="btn btn-secondary btn-sm" type="button" disabled={!!pendingAction} onClick={onAccept}>
              {pendingAction === `accept-${req.username}` ? "…" : "Accept"}
            </button>
            <button className="btn btn-ghost btn-sm" type="button" disabled={!!pendingAction} onClick={onDecline}>
              Decline
            </button>
          </>
        ) : (
          <button className="btn btn-ghost btn-sm" type="button" disabled={!!pendingAction} onClick={onCancel}>
            {pendingAction === `cancel-${req.username}` ? "…" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}

function InvitePreviewCard({ market, side, from, message }) {
  const sideColor = side === "YES" ? "#38a169" : "#e53e3e";
  return (
    <div className="fp-preview-card">
      <div className="fp-preview-card-header">
        <Avatar name={from.name} size="sm" side={side} />
        <div>
          <span className="fp-name" style={{ fontSize: "0.85rem" }}>{from.name}</span>
          <span className="caption"> is betting </span>
          <span style={{ fontWeight: 700, color: sideColor }}>{side}</span>
        </div>
      </div>
      <div className="fp-preview-market">
        <div className="caption" style={{ color: "var(--text-muted)" }}>{market.category}</div>
        <div className="fp-name" style={{ fontSize: "0.9rem" }}>{market.title}</div>
        <div className="fp-preview-odds">
          <span style={{ color: "#38a169", fontWeight: 600 }}>YES {Math.round((market.yesPrice ?? 0.5) * 100)}¢</span>
          <span style={{ color: "var(--text-muted)" }}> · </span>
          <span style={{ color: "#e53e3e", fontWeight: 600 }}>NO {Math.round((market.noPrice ?? 0.5) * 100)}¢</span>
        </div>
      </div>
      {message && <div className="fp-preview-msg">"{message}"</div>}
      <div className="fp-preview-cta">Bet on this market →</div>
    </div>
  );
}

function ReceivedInviteCard({ invite, onRespond }) {
  const sideColor = invite.side === "YES" ? "#38a169" : "#e53e3e";
  return (
    <div className="fp-received-card">
      <div className="fp-received-header">
        <Avatar name={invite.fromName} size="sm" side={invite.side} />
        <div style={{ flex: 1 }}>
          <span className="fp-name" style={{ fontSize: "0.85rem" }}>{invite.fromName}</span>
          <span className="caption"> invited you to bet on</span>
        </div>
        <span className="caption" style={{ flexShrink: 0 }}>{timeAgo(invite.createdAt)}</span>
      </div>
      <div className="fp-received-market">
        <strong style={{ fontSize: "0.875rem" }}>{invite.marketTitle}</strong>
        {invite.side && (
          <span className="fp-received-side" style={{ color: sideColor }}>They bet {invite.side}</span>
        )}
      </div>
      {invite.message && <div className="fp-received-msg">"{invite.message}"</div>}
      <div className="fp-received-actions">
        <Link href={`/markets/${invite.marketId}`} className="btn btn-primary btn-sm"
          onClick={() => onRespond(invite.id, "accepted", invite.marketId)}>
          View &amp; Bet →
        </Link>
        <button className="btn btn-ghost btn-sm" type="button"
          onClick={() => onRespond(invite.id, "declined", invite.marketId)}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
