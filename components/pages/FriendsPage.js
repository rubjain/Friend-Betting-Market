"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useAgora } from "../../context/AgoraContext";
import { getMultiplier } from "../../lib/marketMath";
import { SectionHead } from "../ui";

const FEED_POLL_MS = 30_000;

function money(n) {
  const abs = Math.abs(n);
  const s = abs >= 1000 ? "$" + (abs / 1000).toFixed(1) + "k" : "$" + abs.toFixed(2);
  return n < 0 ? "-" + s : s;
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Tab definitions ────────────────────────────────────────────────────────

const TABS = ["friends", "together", "pending"];

// ─── Main page ──────────────────────────────────────────────────────────────

export default function FriendsPage() {
  const { state, actions, selectors } = useAgora();

  const [tab, setTab] = useState("friends");
  const [pendingAction, setPendingAction] = useState("");
  const [boostPanelFriend, setBoostPanelFriend] = useState(null);
  const [h2hPanelFriend, setH2hPanelFriend] = useState(null);
  const [invitePanelFriend, setInvitePanelFriend] = useState(null);

  // Discovery / search
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [discoveryResults, setDiscoveryResults] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // Activity feed
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const feedIntervalRef = useRef(null);

  // Bet Together
  const [sharedMarkets, setSharedMarkets] = useState([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedFetched, setSharedFetched] = useState(false);

  const selectedMarket = selectors.getSelectedMarket();
  const boostSlotsRemaining = Math.max(
    0,
    state.adminConfig.maxGroupSize - selectedMarket.friendGroup.length,
  );
  const pendingCount = state.friends.pending.length;
  const incomingCount = state.friends.pending.filter((r) => r.direction === "incoming").length;
  const totalBoosts = state.friends.list.reduce((sum, f) => sum + (f.boostCount || 0), 0);
  const bestMultiplier = state.markets.length
    ? Math.max(...state.markets.map((m) => getMultiplier(m, state.adminConfig)))
    : 1;
  const hasFriends = state.friends.list.length > 0;

  // ── Feed polling ──────────────────────────────────────────────────────────
  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/feed/friends");
      const json = await res.json();
      if (json.ok) setFeedItems(json.items);
    } catch { /* non-critical */ }
    finally { setFeedLoading(false); }
  }, []);

  useEffect(() => {
    fetchFeed();
    feedIntervalRef.current = setInterval(fetchFeed, FEED_POLL_MS);
    return () => clearInterval(feedIntervalRef.current);
  }, [fetchFeed]);

  // ── Discovery search ─────────────────────────────────────────────────────
  useEffect(() => {
    const query = discoveryQuery.trim();
    if (query.length < 2) { setDiscoveryResults([]); setDiscoveryLoading(false); return; }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDiscoveryLoading(true);
      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await res.json();
        setDiscoveryResults(Array.isArray(data.results) ? data.results : []);
      } catch { if (!controller.signal.aborted) setDiscoveryResults([]); }
      finally { if (!controller.signal.aborted) setDiscoveryLoading(false); }
    }, 250);

    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [discoveryQuery]);

  // ── Shared markets (Bet Together) ─────────────────────────────────────────
  const fetchSharedMarkets = useCallback(async () => {
    setSharedLoading(true);
    try {
      const res = await fetch("/api/friends/shared-markets");
      const json = await res.json();
      if (json.ok) setSharedMarkets(json.markets);
    } catch { /* silently fail */ }
    finally { setSharedLoading(false); setSharedFetched(true); }
  }, []);

  useEffect(() => {
    if (tab === "together" && !sharedFetched) fetchSharedMarkets();
  }, [tab, sharedFetched, fetchSharedMarkets]);

  // ── Action helpers ────────────────────────────────────────────────────────
  async function runFriendAction(actionKey, callback) {
    if (pendingAction) return;
    setPendingAction(actionKey);
    try { await callback(); }
    finally { setPendingAction(""); }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <section className="page active friends-page-root">
      <SectionHead
        title="Friends"
        body="Invite friends, track your records, and bet together on the same markets."
      />
      <p className="page-inline-links">
        <Link href="/groups">Groups</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/feed">Full activity feed</Link>
      </p>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="friends-tabs" role="tablist">
        <button
          className={`friends-tab${tab === "friends" ? " active" : ""}`}
          role="tab"
          aria-selected={tab === "friends"}
          type="button"
          onClick={() => setTab("friends")}
        >
          Friends
          {hasFriends && <span className="friends-tab-badge">{state.friends.list.length}</span>}
        </button>
        <button
          className={`friends-tab${tab === "together" ? " active" : ""}`}
          role="tab"
          aria-selected={tab === "together"}
          type="button"
          onClick={() => setTab("together")}
        >
          Bet Together
          {sharedMarkets.length > 0 && (
            <span className="friends-tab-badge friends-tab-badge--accent">{sharedMarkets.length}</span>
          )}
        </button>
        <button
          className={`friends-tab${tab === "pending" ? " active" : ""}`}
          role="tab"
          aria-selected={tab === "pending"}
          type="button"
          onClick={() => setTab("pending")}
        >
          Pending
          {pendingCount > 0 && (
            <span className="friends-tab-badge friends-tab-badge--alert">{pendingCount}</span>
          )}
        </button>
      </div>

      <div className="friends-layout">
        <div className="friends-main">

          {/* ── FRIENDS TAB ─────────────────────────────────────────────── */}
          {tab === "friends" && (
            <div className="friends-page-stack">
              {/* Stats bar */}
              <div className="friends-stat-bar">
                <div className="friends-stat-chip">
                  <strong>{state.friends.list.length}</strong>
                  <span>Friends</span>
                </div>
                <div className="friends-stat-divider" aria-hidden="true" />
                <div className="friends-stat-chip">
                  <strong>{totalBoosts}</strong>
                  <span>Active boosts</span>
                </div>
                <div className="friends-stat-divider" aria-hidden="true" />
                <div className="friends-stat-chip friends-stat-chip--accent">
                  <strong>{bestMultiplier.toFixed(2)}x</strong>
                  <span>Best multiplier</span>
                </div>
              </div>

              {/* Add friend — invite by username */}
              <div className="friends-add-card">
                <h4 className="friends-add-card-title">Add a friend</h4>
                <div className="friends-search-row">
                  <label className="visually-hidden" htmlFor="friend-invite-input">Friend username</label>
                  <input
                    id="friend-invite-input"
                    type="text"
                    placeholder="@username"
                    value={state.friendInviteDraft}
                    onChange={(e) => actions.updateFriendInviteDraft(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !pendingAction) runFriendAction("invite", actions.sendFriendInvite);
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={!state.friendInviteDraft.trim() || !!pendingAction}
                    onClick={() => runFriendAction("invite", actions.sendFriendInvite)}
                  >
                    {pendingAction === "invite" ? "Sending…" : "Send invite"}
                  </button>
                </div>

                {/* Discovery search */}
                <div className="friends-discovery-inset">
                  <label className="visually-hidden" htmlFor="friend-discovery-input">Search people</label>
                  <input
                    id="friend-discovery-input"
                    type="search"
                    placeholder="Or search by name / @username…"
                    value={discoveryQuery}
                    onChange={(e) => setDiscoveryQuery(e.currentTarget.value)}
                  />
                  <div className="friends-discovery-results" aria-live="polite">
                    {discoveryLoading ? (
                      <div className="empty-note empty-note--sm">Searching…</div>
                    ) : discoveryQuery.trim().length >= 2 ? (
                      discoveryResults.length ? (
                        discoveryResults.map((person) => (
                          <FriendDiscoveryRow
                            key={person.id}
                            person={person}
                            pendingAction={pendingAction}
                            onInvite={() =>
                              runFriendAction(`invite-${person.username}`, () =>
                                actions.sendFriendInvite(person.username),
                              )
                            }
                          />
                        ))
                      ) : (
                        <div className="empty-note empty-note--sm">No accounts found.</div>
                      )
                    ) : null}
                  </div>
                </div>

                <div className="friends-demo-note">
                  Demo accounts: test@example.com / password123 and taylor@example.com / password123
                </div>
              </div>

              {/* Friends list */}
              <div className="friends-hero-list">
                {hasFriends ? (
                  state.friends.list.map((friend) => {
                    const boostName = selectors.getFriendBoostName(friend);
                    const isBoosting = selectedMarket.friendGroup.includes(boostName);
                    const boostDisabled = !isBoosting && boostSlotsRemaining <= 0;
                    return (
                      <FriendCard
                        key={friend.username}
                        friend={friend}
                        isBoosting={isBoosting}
                        boostDisabled={boostDisabled}
                        pendingAction={pendingAction}
                        onBoost={() => setBoostPanelFriend(friend)}
                        onH2H={() => setH2hPanelFriend(friend)}
                        onInvite={() => setInvitePanelFriend(friend)}
                      />
                    );
                  })
                ) : (
                  <div className="friends-empty">
                    <strong>No friends yet.</strong>
                    <p>Send an invite above to get started.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── BET TOGETHER TAB ────────────────────────────────────────── */}
          {tab === "together" && (
            <div className="friends-page-stack">
              <div className="together-header">
                <p className="caption">
                  Markets where your friends have open bets — jump in on the same action.
                </p>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={fetchSharedMarkets}
                  disabled={sharedLoading}
                >
                  {sharedLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>

              {sharedLoading && !sharedFetched ? (
                <div className="together-skeleton-list">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="together-skeleton-card">
                      <div className="skeleton-line skeleton-line--long" />
                      <div className="skeleton-line skeleton-line--short" />
                    </div>
                  ))}
                </div>
              ) : !hasFriends ? (
                <div className="friends-empty">
                  <strong>Add friends first.</strong>
                  <p>Switch to the Friends tab to invite people, then come back here.</p>
                </div>
              ) : sharedMarkets.length === 0 ? (
                <div className="friends-empty">
                  <strong>Nothing to bet on together yet.</strong>
                  <p>Your friends haven&apos;t placed any bets on active markets yet.</p>
                </div>
              ) : (
                <div className="together-market-list">
                  {sharedMarkets.map((m) => (
                    <TogetherMarketCard key={m.id} item={m} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PENDING TAB ─────────────────────────────────────────────── */}
          {tab === "pending" && (
            <div className="friends-page-stack">
              {pendingCount === 0 ? (
                <div className="friends-empty">
                  <strong>No pending requests.</strong>
                  <p>All caught up — no incoming or outgoing requests right now.</p>
                </div>
              ) : (
                <>
                  {incomingCount > 0 && (
                    <div className="pending-section">
                      <div className="pending-section-label caption">Incoming requests</div>
                      {state.friends.pending
                        .filter((r) => r.direction === "incoming")
                        .map((req) => (
                          <PendingRequestRow
                            key={req.username}
                            request={req}
                            pendingAction={pendingAction}
                            onAccept={() => runFriendAction(`accept-${req.username}`, () => actions.handleFriendRequest(req.username, "accept"))}
                            onDecline={() => runFriendAction(`decline-${req.username}`, () => actions.handleFriendRequest(req.username, "decline"))}
                          />
                        ))}
                    </div>
                  )}
                  {state.friends.pending.filter((r) => r.direction === "outgoing").length > 0 && (
                    <div className="pending-section">
                      <div className="pending-section-label caption">Sent requests</div>
                      {state.friends.pending
                        .filter((r) => r.direction === "outgoing")
                        .map((req) => (
                          <PendingRequestRow
                            key={req.username}
                            request={req}
                            pendingAction={pendingAction}
                            onCancel={() => runFriendAction(`cancel-${req.username}`, () => actions.handleFriendRequest(req.username, "cancel"))}
                          />
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Activity feed (always visible) ─────────────────────────────── */}
        <aside className="friends-feed-aside">
          <FriendFeed
            items={feedItems}
            loading={feedLoading}
            hasFriends={hasFriends}
          />
        </aside>
      </div>

      {/* ── Panels ─────────────────────────────────────────────────────────── */}
      {h2hPanelFriend && (
        <H2HPanel friend={h2hPanelFriend} onClose={() => setH2hPanelFriend(null)} />
      )}

      {boostPanelFriend && (
        <BoostPanel
          friend={boostPanelFriend}
          selectedMarket={selectedMarket}
          boostSlotsRemaining={boostSlotsRemaining}
          state={state}
          actions={actions}
          selectors={selectors}
          pendingAction={pendingAction}
          runFriendAction={runFriendAction}
          onClose={() => setBoostPanelFriend(null)}
        />
      )}

      {invitePanelFriend && (
        <InviteToMarketPanel
          friend={invitePanelFriend}
          markets={state.markets}
          pendingAction={pendingAction}
          runFriendAction={runFriendAction}
          actions={actions}
          selectors={selectors}
          adminConfig={state.adminConfig}
          onClose={() => setInvitePanelFriend(null)}
        />
      )}
    </section>
  );
}

// ─── FriendCard ──────────────────────────────────────────────────────────────

function FriendCard({ friend, isBoosting, boostDisabled, pendingAction, onBoost, onH2H, onInvite }) {
  const initials = getInitials(friend.name);
  return (
    <div className={`friend-card${isBoosting ? " friend-card--boosting" : ""}`}>
      <div className="friend-avatar" aria-hidden="true">{initials}</div>
      <div className="friend-card-body">
        <strong className="friend-card-name">{friend.name}</strong>
        <div className="friend-card-username caption">{friend.username}</div>
        {friend.boostCount > 0 && (
          <div className="friend-card-boosts caption">
            {friend.boostCount} market{friend.boostCount !== 1 ? "s" : ""} together
          </div>
        )}
      </div>
      <div className="friend-card-actions">
        <button className="btn btn-ghost btn-sm friend-h2h-btn" type="button" onClick={onH2H}>
          Record
        </button>
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={onInvite}
        >
          Invite to bet
        </button>
        <button
          className={`btn btn-sm friend-boost-btn${isBoosting ? " btn-secondary" : " btn-ghost"}`}
          type="button"
          disabled={boostDisabled || !!pendingAction}
          onClick={onBoost}
          title={isBoosting ? "Remove from current market boost" : "Add to current market boost"}
        >
          {isBoosting ? "★ Boosting" : "Boost"}
        </button>
      </div>
    </div>
  );
}

// ─── FriendDiscoveryRow ───────────────────────────────────────────────────────

function labelForStatus(status) {
  if (status === "friends") return "Friend";
  if (status === "pending_outgoing") return "Invite sent";
  if (status === "pending_incoming") return "Respond in Pending";
  return "Invite";
}

function FriendDiscoveryRow({ person, pendingAction, onInvite }) {
  const inviteKey = `invite-${person.username}`;
  const canInvite = person.status === "not_connected";
  return (
    <div className="friend-discovery-row">
      <div className="friend-avatar" aria-hidden="true">{getInitials(person.name)}</div>
      <div className="friend-card-body">
        <strong className="friend-card-name">{person.name}</strong>
        <div className="friend-card-username caption">{person.username}</div>
      </div>
      <button
        className={canInvite ? "btn btn-secondary btn-sm" : "btn btn-ghost btn-sm"}
        type="button"
        disabled={!canInvite || pendingAction === inviteKey}
        onClick={onInvite}
      >
        {pendingAction === inviteKey ? "Sending…" : labelForStatus(person.status)}
      </button>
    </div>
  );
}

// ─── PendingRequestRow ────────────────────────────────────────────────────────

function PendingRequestRow({ request, pendingAction, onAccept, onDecline, onCancel }) {
  return (
    <div className="pending-request-row">
      <div className="friend-avatar" aria-hidden="true">{getInitials(request.name)}</div>
      <div className="friend-card-body">
        <strong className="friend-card-name">{request.name}</strong>
        <div className="friend-card-username caption">{request.username}</div>
      </div>
      <div className="inline-actions">
        {request.direction === "incoming" ? (
          <>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              disabled={!!pendingAction}
              onClick={onAccept}
            >
              {pendingAction === `accept-${request.username}` ? "…" : "Accept"}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={!!pendingAction}
              onClick={onDecline}
            >
              {pendingAction === `decline-${request.username}` ? "…" : "Decline"}
            </button>
          </>
        ) : (
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            disabled={!!pendingAction}
            onClick={onCancel}
          >
            {pendingAction === `cancel-${request.username}` ? "Canceling…" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── TogetherMarketCard ───────────────────────────────────────────────────────

function TogetherMarketCard({ item }) {
  const yesPct = Math.round(item.yesPrice * 100);
  const noPct = 100 - yesPct;

  return (
    <div className="together-card">
      <div className="together-card-top">
        <div className="together-card-meta">
          <span className="together-card-category caption">{item.category}</span>
          {item.myBet && (
            <span className={`together-card-mybadge together-card-mybadge--${item.myBet.toLowerCase()}`}>
              You bet {item.myBet}
            </span>
          )}
        </div>
        <Link href={`/markets/${item.id}`} className="together-card-title">
          {item.title}
        </Link>
      </div>

      {/* Odds bar */}
      <div className="together-odds-bar">
        <div className="together-odds-yes" style={{ width: `${yesPct}%` }}>
          <span>YES {yesPct}¢</span>
        </div>
        <div className="together-odds-no" style={{ width: `${noPct}%` }}>
          <span>NO {noPct}¢</span>
        </div>
      </div>

      {/* Friends on this market */}
      <div className="together-friends-row">
        <div className="together-avatars">
          {item.friends.slice(0, 5).map((f) => (
            <div
              key={f.id}
              className={`together-avatar together-avatar--${f.side.toLowerCase()}`}
              title={`${f.name} bet ${f.side}`}
            >
              {getInitials(f.name)}
            </div>
          ))}
          {item.friends.length > 5 && (
            <div className="together-avatar together-avatar--more">+{item.friends.length - 5}</div>
          )}
        </div>
        <div className="together-friend-names caption">
          {item.friends.slice(0, 2).map((f) => f.name.split(" ")[0]).join(", ")}
          {item.friends.length > 2 && ` +${item.friends.length - 2} more`}
          {" "}
          {item.friends.length === 1 ? "is" : "are"} betting
        </div>
      </div>

      <Link href={`/markets/${item.id}`} className="btn btn-primary btn-sm together-join-btn">
        {item.myBet ? "View market →" : "Join them →"}
      </Link>
    </div>
  );
}

// ─── FriendFeed ───────────────────────────────────────────────────────────────

function FriendFeed({ items, loading, hasFriends }) {
  return (
    <div className="friends-feed-card">
      <div className="friends-feed-header">
        <h4 className="friends-feed-title">Friend Activity</h4>
        <span className="friends-feed-subtitle caption">Last 24 hours</span>
      </div>

      {loading ? (
        <div className="friends-feed-body">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="friends-feed-skeleton">
              <div className="friends-feed-skeleton-avatar" />
              <div className="friends-feed-skeleton-lines">
                <div className="skeleton-line skeleton-line--long" />
                <div className="skeleton-line skeleton-line--short" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="friends-feed-empty">
          {hasFriends ? (
            <>
              <span className="friends-feed-empty-icon" aria-hidden="true">!</span>
              <p>No bets in the last 24 hours.</p>
            </>
          ) : (
            <>
              <span className="friends-feed-empty-icon" aria-hidden="true">+</span>
              <p>Add friends to see their activity here.</p>
            </>
          )}
        </div>
      ) : (
        <div className="friends-feed-body">
          {items.map((item) => (
            <Link key={item.id} className="friends-feed-item" href={`/markets/${item.marketId}`}>
              <div className="friends-feed-avatar" aria-hidden="true">
                {getInitials(item.friendName)}
              </div>
              <div className="friends-feed-item-body">
                <p className="friends-feed-item-text">
                  <strong>{item.friendName}</strong>
                  {" bet "}
                  <span className={`friends-feed-side friends-feed-side--${item.side.toLowerCase()}`}>
                    {item.side}
                  </span>
                </p>
                <p className="friends-feed-item-market caption">{item.marketTitle}</p>
                <span className="friends-feed-time caption">{timeAgo(item.placedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="friends-feed-footer caption">Refreshes every 30s</div>
    </div>
  );
}

// ─── InviteToMarketPanel ──────────────────────────────────────────────────────
// Pick any active market and boost the friend on it.

function InviteToMarketPanel({ friend, markets, pendingAction, runFriendAction, actions, selectors, adminConfig, onClose }) {
  const [search, setSearch] = useState("");
  const [selectedMarketId, setSelectedMarketId] = useState(null);
  const [success, setSuccess] = useState(null);

  const activeMarkets = useMemo(
    () => markets.filter((m) => m.status === "active"),
    [markets],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? activeMarkets.filter((m) =>
      m.title.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q),
    ) : activeMarkets;
  }, [activeMarkets, search]);

  const selectedMarket = activeMarkets.find((m) => m.id === selectedMarketId);
  const boostName = selectedMarket ? selectors.getFriendBoostName(friend) : null;
  const isBoosting = selectedMarket?.friendGroup?.includes(boostName);
  const slotsLeft = selectedMarket
    ? Math.max(0, adminConfig.maxGroupSize - selectedMarket.friendGroup.length)
    : 0;

  async function handleSend() {
    if (!selectedMarketId || pendingAction) return;
    await runFriendAction(`invite-market-${friend.username}`, async () => {
      // Temporarily set the selected market context and boost
      actions.setSelectedMarket(selectedMarketId);
      await actions.toggleFriendBoost(friend.username);
      setSuccess(selectedMarket?.title ?? "market");
    });
  }

  const initials = getInitials(friend.name);

  return (
    <>
      <div className="boost-panel-overlay" onClick={onClose} aria-hidden="true" />
      <div className="boost-panel invite-panel" role="dialog" aria-label={`Invite ${friend.name} to a market`}>
        <div className="boost-panel-header">
          <div className="boost-panel-friend">
            <div className="friend-avatar friend-avatar--lg" aria-hidden="true">{initials}</div>
            <div>
              <strong>{friend.name}</strong>
              <div className="caption">{friend.username}</div>
            </div>
          </div>
          <button className="btn btn-ghost boost-panel-close" type="button" onClick={onClose}>Close</button>
        </div>

        {success ? (
          <div className="invite-panel-success">
            <div className="invite-panel-success-icon" aria-hidden="true">✓</div>
            <strong>{friend.name.split(" ")[0]} added to the boost group on</strong>
            <p className="caption">&ldquo;{success}&rdquo;</p>
            <p className="caption">They&apos;ll see the boost multiplier update on their next visit.</p>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setSuccess(null); setSelectedMarketId(null); }}>
              Invite to another market
            </button>
          </div>
        ) : (
          <>
            <p className="invite-panel-label caption">Pick a market to invite {friend.name.split(" ")[0]} to:</p>

            <input
              className="invite-panel-search"
              type="search"
              placeholder="Search markets…"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />

            <div className="invite-panel-market-list" role="listbox">
              {filtered.length === 0 ? (
                <div className="empty-note empty-note--sm">No markets match.</div>
              ) : (
                filtered.slice(0, 20).map((m) => {
                  const bname = selectors.getFriendBoostName(friend);
                  const alreadyBoosting = m.friendGroup?.includes(bname);
                  return (
                    <button
                      key={m.id}
                      className={`invite-market-row${selectedMarketId === m.id ? " invite-market-row--selected" : ""}${alreadyBoosting ? " invite-market-row--boosting" : ""}`}
                      type="button"
                      role="option"
                      aria-selected={selectedMarketId === m.id}
                      onClick={() => setSelectedMarketId(m.id)}
                    >
                      <div className="invite-market-row-inner">
                        <span className="invite-market-title">{m.title}</span>
                        <span className="invite-market-meta caption">{m.category}</span>
                      </div>
                      {alreadyBoosting && <span className="invite-market-boosting-badge">Boosting</span>}
                    </button>
                  );
                })
              )}
            </div>

            {selectedMarket && (
              <div className="invite-panel-preview">
                <div className="invite-panel-preview-label caption">Selected</div>
                <strong className="invite-panel-preview-title">{selectedMarket.title}</strong>
                <div className="caption">
                  {isBoosting
                    ? `${friend.name.split(" ")[0]} is already boosting this market.`
                    : slotsLeft === 0
                      ? "Boost group is full for this market."
                      : `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} available · adds them to the boost group`}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary invite-panel-cta"
              type="button"
              disabled={!selectedMarketId || isBoosting || slotsLeft === 0 || !!pendingAction}
              onClick={handleSend}
            >
              {pendingAction === `invite-market-${friend.username}`
                ? "Adding…"
                : isBoosting
                  ? "Already on this market"
                  : "Add to boost group"}
            </button>
          </>
        )}
      </div>
    </>
  );
}

// ─── H2HPanel ─────────────────────────────────────────────────────────────────

function H2HPanel({ friend, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const initials = getInitials(friend.name);

  const fetchH2H = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/friends/h2h?friendId=${encodeURIComponent(friend.id)}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Failed to load record.");
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [friend.id]);

  useEffect(() => { fetchH2H(); }, [fetchH2H]);

  const record = data?.record ?? { wins: 0, losses: 0, pushes: 0, open: 0 };
  const summary = data?.summary ?? { total: 0, settled: 0, winRate: 0, open: 0, stakeAtRisk: 0 };
  const netAmount = data?.netAmount ?? 0;
  const recentMatchups = data?.recentMatchups ?? [];
  const hasMatchups = summary.total > 0;

  return (
    <>
      <div className="boost-panel-overlay" onClick={onClose} aria-hidden="true" />
      <div className="boost-panel h2h-panel" role="dialog" aria-label={`Head-to-head with ${friend.name}`}>
        <div className="boost-panel-header">
          <div className="boost-panel-friend">
            <div className="friend-avatar friend-avatar--lg" aria-hidden="true">{initials}</div>
            <div>
              <strong>{friend.name}</strong>
              <div className="caption">{friend.username}</div>
            </div>
          </div>
          <button className="btn btn-ghost boost-panel-close" type="button" onClick={onClose}>Close</button>
        </div>

        {loading ? (
          <div className="h2h-loading caption">Loading record…</div>
        ) : error ? (
          <div className="h2h-error caption">{error}</div>
        ) : !hasMatchups ? (
          <div className="h2h-empty">
            <strong>No matchups yet.</strong>
            <p className="caption">
              A matchup happens when you and {friend.name.split(" ")[0]} bet on opposite sides of the same market.
            </p>
          </div>
        ) : (
          <>
            <div className="h2h-record-row">
              <div className="h2h-stat h2h-stat--win"><strong>{record.wins}</strong><span className="caption">Wins</span></div>
              <div className="h2h-stat-divider" aria-hidden="true">/</div>
              <div className="h2h-stat h2h-stat--loss"><strong>{record.losses}</strong><span className="caption">Losses</span></div>
              {record.pushes > 0 && (<><div className="h2h-stat-divider" aria-hidden="true">/</div><div className="h2h-stat"><strong>{record.pushes}</strong><span className="caption">Push</span></div></>)}
              {record.open > 0 && (<><div className="h2h-stat-divider" aria-hidden="true">/</div><div className="h2h-stat"><strong>{record.open}</strong><span className="caption">Open</span></div></>)}
            </div>
            <div className={`h2h-net ${netAmount >= 0 ? "h2h-net--up" : "h2h-net--down"}`}>
              {netAmount >= 0 ? `You're up ${money(netAmount)} lifetime` : `You're down ${money(netAmount)} lifetime`}
            </div>
            <div className="h2h-summary-grid">
              <div><strong>{summary.settled ? `${summary.winRate}%` : "–"}</strong><span className="caption">Settled win rate</span></div>
              <div><strong>{summary.open}</strong><span className="caption">Open overlaps</span></div>
              <div><strong>{money(summary.stakeAtRisk)}</strong><span className="caption">Stake at risk</span></div>
            </div>
            {recentMatchups.length > 0 && (
              <div className="h2h-recent">
                <div className="h2h-recent-label caption">Last {recentMatchups.length} matchup{recentMatchups.length !== 1 ? "s" : ""}</div>
                {recentMatchups.map((m, i) => (
                  <div key={i} className="h2h-matchup-row">
                    <span className={`h2h-matchup-result h2h-matchup-result--${(m.myStatus || "open").toLowerCase()}`}>{m.myBadge || "O"}</span>
                    <span className="h2h-matchup-title caption">{m.title}</span>
                    <span className="h2h-matchup-sides caption">{m.mySide} vs {m.friendSide}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── BoostPanel ───────────────────────────────────────────────────────────────

function BoostPanel({ friend, selectedMarket, boostSlotsRemaining, state, actions, selectors, pendingAction, runFriendAction, onClose }) {
  const boostName = selectors.getFriendBoostName(friend);
  const isBoosting = selectedMarket.friendGroup.includes(boostName);
  const disabled = !isBoosting && boostSlotsRemaining <= 0;
  const multiplierNow = getMultiplier(selectedMarket, state.adminConfig);
  const friendsAfter = isBoosting
    ? Math.max(0, selectedMarket.friendsBoosting - 1)
    : selectedMarket.friendsBoosting + 1;
  const multiplierAfter = getMultiplier({ ...selectedMarket, friendsBoosting: friendsAfter }, state.adminConfig);
  const initials = getInitials(friend.name);

  return (
    <>
      <div className="boost-panel-overlay" onClick={onClose} aria-hidden="true" />
      <div className="boost-panel" role="dialog" aria-label={`Boost with ${friend.name}`}>
        <div className="boost-panel-header">
          <div className="boost-panel-friend">
            <div className="friend-avatar friend-avatar--lg" aria-hidden="true">{initials}</div>
            <div>
              <strong>{friend.name}</strong>
              <div className="caption">{friend.username}</div>
            </div>
          </div>
          <button className="btn btn-ghost boost-panel-close" type="button" onClick={onClose}>Close</button>
        </div>

        <div className="boost-panel-market">
          <div className="boost-panel-market-label caption">Boosting on</div>
          <strong>{selectedMarket.title}</strong>
          <div className="boost-panel-market-meta caption">
            {selectedMarket.friendGroup.length} / {state.adminConfig.maxGroupSize} boosters
            {boostSlotsRemaining > 0 && !isBoosting && <> · {boostSlotsRemaining} slot{boostSlotsRemaining !== 1 ? "s" : ""} left</>}
          </div>
        </div>

        <div className="boost-panel-multiplier">
          <div className="boost-panel-multiplier-row">
            <span className="caption">Current multiplier</span>
            <strong>{multiplierNow.toFixed(2)}x</strong>
          </div>
          {multiplierAfter !== multiplierNow && (
            <div className="boost-panel-multiplier-row boost-panel-multiplier-after">
              <span className="caption">After this boost</span>
              <strong className="accent">{multiplierAfter.toFixed(2)}x</strong>
            </div>
          )}
        </div>

        {disabled ? (
          <div className="boost-panel-full-note caption">
            This market&apos;s boost group is full ({state.adminConfig.maxGroupSize} / {state.adminConfig.maxGroupSize}).
          </div>
        ) : (
          <button
            className={`btn boost-panel-cta ${isBoosting ? "btn-ghost" : "btn-primary"}`}
            type="button"
            disabled={!!pendingAction}
            onClick={() => runFriendAction(`boost-${friend.username}`, () => actions.toggleFriendBoost(friend.username))}
          >
            {pendingAction === `boost-${friend.username}`
              ? "Updating…"
              : isBoosting
                ? `Remove ${friend.name.split(" ")[0]} from boost`
                : `Add ${friend.name.split(" ")[0]} to boost`}
          </button>
        )}
      </div>
    </>
  );
}
