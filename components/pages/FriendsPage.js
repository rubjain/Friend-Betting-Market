"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useAgora } from "../../context/AgoraContext";
import { getMultiplier } from "../../lib/marketMath";
import { SectionHead } from "../ui";

const FEED_POLL_MS = 30_000;

function formatMoney(n) {
  const abs = Math.abs(n);
  const formatted = abs >= 1000 ? "$" + (abs / 1000).toFixed(1) + "k" : "$" + abs.toFixed(2);
  return n < 0 ? "-" + formatted : "+" + formatted;
}

function formatAbsoluteMoney(n) {
  const abs = Math.abs(n);
  return abs >= 1000 ? "$" + (abs / 1000).toFixed(1) + "k" : "$" + abs.toFixed(2);
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function FriendsPage() {
  const { state, actions, selectors } = useAgora();
  const [pendingAction, setPendingAction] = useState("");
  const [boostPanelFriend, setBoostPanelFriend] = useState(null);
  const [h2hPanelFriend, setH2hPanelFriend] = useState(null);
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [discoveryResults, setDiscoveryResults] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);

  // Feed state
  const [feedItems, setFeedItems] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const feedIntervalRef = useRef(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch("/api/feed/friends");
      const json = await res.json();
      if (json.ok) setFeedItems(json.items);
    } catch {
      // silently fail; feed is non-critical
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    feedIntervalRef.current = setInterval(fetchFeed, FEED_POLL_MS);
    return () => clearInterval(feedIntervalRef.current);
  }, [fetchFeed]);

  useEffect(() => {
    const query = discoveryQuery.trim();
    if (query.length < 2) {
      setDiscoveryResults([]);
      setDiscoveryLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDiscoveryLoading(true);
      try {
        const response = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        setDiscoveryResults(Array.isArray(payload.results) ? payload.results : []);
      } catch {
        if (!controller.signal.aborted) {
          setDiscoveryResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDiscoveryLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [discoveryQuery]);

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

  async function runFriendAction(actionKey, callback) {
    if (pendingAction) return;
    setPendingAction(actionKey);
    try {
      await callback();
    } finally {
      setPendingAction("");
    }
  }

  const hasFriends = state.friends.list.length > 0;

  return (
    <section className="page active">
      <SectionHead
        title="Friends"
        body="Invite friends, track your records, and see what they're betting on."
      />
      <p className="page-inline-links">
        <Link href="/groups">Groups</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/feed">Full activity feed</Link>
      </p>

      <div className="friends-layout">
        {/* Left column: friends list */}
        <div className="friends-main">
          <div className="friends-page-stack">
            {pendingCount > 0 && (
              <div className="pending-banner">
                <div className="pending-banner-summary">
                  <span className="pending-dot" aria-hidden="true" />
                  <strong>{pendingCount} friend request{pendingCount !== 1 ? "s" : ""} waiting</strong>
                  <button
                    className="pending-banner-toggle"
                    type="button"
                    onClick={() => setPendingExpanded((v) => !v)}
                  >
                    {pendingExpanded ? "Hide" : "Review"}
                  </button>
                </div>
                {pendingExpanded && (
                  <div className="pending-banner-list">
                    {state.friends.pending.map((request) => (
                      <div className="pending-request-row" key={request.username}>
                        <div>
                          <strong>{request.name}</strong>
                          <span className="caption">
                            {" "}{request.username} - {request.direction}
                          </span>
                        </div>
                        <div className="inline-actions">
                          {request.direction === "incoming" ? (
                            <>
                              <button
                                className="btn btn-secondary"
                                type="button"
                                disabled={!!pendingAction}
                                onClick={() => runFriendAction(`accept-${request.username}`, () => actions.handleFriendRequest(request.username, "accept"))}
                              >
                                {pendingAction === `accept-${request.username}` ? "Accepting..." : "Accept"}
                              </button>
                              <button
                                className="btn btn-ghost"
                                type="button"
                                disabled={!!pendingAction}
                                onClick={() => runFriendAction(`decline-${request.username}`, () => actions.handleFriendRequest(request.username, "decline"))}
                              >
                                {pendingAction === `decline-${request.username}` ? "Declining..." : "Decline"}
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-ghost"
                              type="button"
                              disabled={!!pendingAction}
                              onClick={() => runFriendAction(`cancel-${request.username}`, () => actions.handleFriendRequest(request.username, "cancel"))}
                            >
                              {pendingAction === `cancel-${request.username}` ? "Canceling..." : "Cancel"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="friends-search-row">
              <label className="visually-hidden" htmlFor="friend-invite-input">
                Friend username
              </label>
              <input
                id="friend-invite-input"
                type="text"
                placeholder="Invite by @username"
                value={state.friendInviteDraft}
                onChange={(e) => actions.updateFriendInviteDraft(e.currentTarget.value)}
              />
              <button
                className="btn btn-primary"
                type="button"
                disabled={!!pendingAction}
                onClick={() => runFriendAction("invite", actions.sendFriendInvite)}
              >
                {pendingAction === "invite" ? "Sending..." : "Invite"}
              </button>
            </div>

            <div className="friends-demo-note">
              Test accounts: test@example.com / password123 and taylor@example.com / password123.
            </div>

            <div className="friends-discovery-card">
              <div>
                <h3>Find friends</h3>
                <p className="caption">Search by name or username, then invite directly from the results.</p>
              </div>
              <label className="visually-hidden" htmlFor="friend-discovery-input">
                Search people
              </label>
              <input
                id="friend-discovery-input"
                type="search"
                placeholder="Search @username or name"
                value={discoveryQuery}
                onChange={(event) => setDiscoveryQuery(event.currentTarget.value)}
              />
              <div className="friends-discovery-results" aria-live="polite">
                {discoveryLoading ? (
                  <div className="empty-note empty-note--sm">Searching...</div>
                ) : discoveryQuery.trim().length < 2 ? (
                  <div className="empty-note empty-note--sm">Type at least 2 characters.</div>
                ) : discoveryResults.length ? (
                  discoveryResults.map((person) => (
                    <FriendDiscoveryRow
                      key={person.id}
                      person={person}
                      pendingAction={pendingAction}
                      onInvite={() =>
                        runFriendAction(`invite-${person.username}`, async () => {
                          await actions.sendFriendInvite(person.username);
                        })
                      }
                    />
                  ))
                ) : (
                  <div className="empty-note empty-note--sm">No matching accounts found.</div>
                )}
              </div>
            </div>

            <div className="friends-stat-bar">
              <div className="friends-stat-chip">
                <strong>{state.friends.list.length}</strong>
                <span>Friends</span>
              </div>
              <div className="friends-stat-divider" aria-hidden="true" />
              <div className="friends-stat-chip">
                <strong>{pendingCount}</strong>
                <span>Pending</span>
              </div>
              <div className="friends-stat-divider" aria-hidden="true" />
              <div className="friends-stat-chip">
                <strong>{incomingCount}</strong>
                <span>Incoming</span>
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

            <div className="friends-hero-list">
              {hasFriends ? (
                state.friends.list.map((friend) => {
                  const boostName = selectors.getFriendBoostName(friend);
                  const isBoosting = selectedMarket.friendGroup.includes(boostName);
                  const disabled = !isBoosting && boostSlotsRemaining <= 0;
                  return (
                    <FriendCard
                      key={friend.username}
                      friend={friend}
                      isBoosting={isBoosting}
                      disabled={disabled}
                      pendingAction={pendingAction}
                      onBoost={() => setBoostPanelFriend(friend)}
                      onH2H={() => setH2hPanelFriend(friend)}
                    />
                  );
                })
              ) : (
                <div className="friends-empty">
                  <strong>No friends yet.</strong>
                  <p>Send an invite to @taylor above to get started.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: activity feed */}
        <aside className="friends-feed-aside">
          <div className="friends-feed-card">
            <div className="friends-feed-header">
              <h4 className="friends-feed-title">Friend Activity</h4>
              <span className="friends-feed-subtitle caption">Last 24 hours</span>
            </div>

            {feedLoading ? (
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
            ) : feedItems.length === 0 ? (
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
                {feedItems.map((item) => (
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

            <div className="friends-feed-footer caption">
              Refreshes every 30s
            </div>
          </div>
        </aside>
      </div>

      {h2hPanelFriend && (
        <H2HPanel
          friend={h2hPanelFriend}
          onClose={() => setH2hPanelFriend(null)}
        />
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
    </section>
  );
}

function labelForDiscoveryStatus(status) {
  if (status === "friends") return "Friend";
  if (status === "pending_outgoing") return "Invite sent";
  if (status === "pending_incoming") return "Respond in pending";
  return "Invite";
}

function FriendDiscoveryRow({ person, pendingAction, onInvite }) {
  const inviteKey = `invite-${person.username}`;
  const canInvite = person.status === "not_connected";

  return (
    <div className="friend-discovery-row">
      <div className="friend-avatar" aria-hidden="true">
        {getInitials(person.name)}
      </div>
      <div className="friend-card-body">
        <strong className="friend-card-name">{person.name}</strong>
        <div className="friend-card-username caption">{person.username}</div>
      </div>
      <button
        className={canInvite ? "btn btn-secondary" : "btn btn-ghost"}
        type="button"
        disabled={!canInvite || pendingAction === inviteKey}
        onClick={onInvite}
      >
        {pendingAction === inviteKey ? "Sending..." : labelForDiscoveryStatus(person.status)}
      </button>
    </div>
  );
}

function FriendCard({ friend, isBoosting, disabled, pendingAction, onBoost, onH2H }) {
  const initials = getInitials(friend.name);
  const actionKey = `boost-${friend.username}`;

  return (
    <div className={`friend-card${isBoosting ? " friend-card--boosting" : ""}`}>
      <div className="friend-avatar" aria-hidden="true">
        {initials}
      </div>
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
        <button
          className="btn btn-ghost friend-h2h-btn"
          type="button"
          onClick={onH2H}
        >
          Record
        </button>
        <button
          className={`btn friend-boost-btn ${isBoosting ? "btn-secondary" : "btn-ghost"}`}
          type="button"
          disabled={disabled || pendingAction === actionKey}
          onClick={onBoost}
        >
          {isBoosting ? "Boosting" : "Boost"}
        </button>
      </div>
    </div>
  );
}

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

  useEffect(() => {
    fetchH2H();
  }, [fetchH2H]);

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
          <div className="h2h-loading caption">Loading record...</div>
        ) : error ? (
          <div className="h2h-error caption">{error}</div>
        ) : !hasMatchups ? (
          <div className="h2h-empty">
            <strong>No matchups yet.</strong>
            <p className="caption">A matchup happens when you and {friend.name.split(" ")[0]} bet on opposite sides of the same market.</p>
          </div>
        ) : (
          <>
            <div className="h2h-record-row">
              <div className="h2h-stat h2h-stat--win">
                <strong>{record.wins}</strong>
                <span className="caption">Wins</span>
              </div>
              <div className="h2h-stat-divider" aria-hidden="true">/</div>
              <div className="h2h-stat h2h-stat--loss">
                <strong>{record.losses}</strong>
                <span className="caption">Losses</span>
              </div>
              {record.pushes > 0 && (
                <>
                  <div className="h2h-stat-divider" aria-hidden="true">/</div>
                  <div className="h2h-stat">
                    <strong>{record.pushes}</strong>
                    <span className="caption">Push</span>
                  </div>
                </>
              )}
              {record.open > 0 && (
                <>
                  <div className="h2h-stat-divider" aria-hidden="true">/</div>
                  <div className="h2h-stat">
                    <strong>{record.open}</strong>
                    <span className="caption">Open</span>
                  </div>
                </>
              )}
            </div>
            <div className={`h2h-net ${netAmount >= 0 ? "h2h-net--up" : "h2h-net--down"}`}>
              {netAmount >= 0
                ? `You're up ${formatMoney(netAmount)} lifetime`
                : `You're down ${formatMoney(netAmount)} lifetime`}
            </div>
            <div className="h2h-summary-grid">
              <div>
                <strong>{summary.settled ? `${summary.winRate}%` : "-"}</strong>
                <span className="caption">Settled win rate</span>
              </div>
              <div>
                <strong>{summary.open}</strong>
                <span className="caption">Open overlaps</span>
              </div>
              <div>
                <strong>{formatAbsoluteMoney(summary.stakeAtRisk)}</strong>
                <span className="caption">Stake at risk</span>
              </div>
            </div>
            {recentMatchups.length > 0 && (
              <div className="h2h-recent">
                <div className="h2h-recent-label caption">Last {recentMatchups.length} matchup{recentMatchups.length !== 1 ? "s" : ""}</div>
                {recentMatchups.map((m, i) => (
                  <div key={i} className="h2h-matchup-row">
                    <span className={`h2h-matchup-result h2h-matchup-result--${(m.myStatus || "open").toLowerCase()}`}>
                      {m.myBadge || "O"}
                    </span>
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

function BoostPanel({ friend, selectedMarket, boostSlotsRemaining, state, actions, selectors, pendingAction, runFriendAction, onClose }) {
  const boostName = selectors.getFriendBoostName(friend);
  const isBoosting = selectedMarket.friendGroup.includes(boostName);
  const disabled = !isBoosting && boostSlotsRemaining <= 0;
  const multiplierNow = getMultiplier(selectedMarket, state.adminConfig);
  const friendsAfter = isBoosting
    ? Math.max(0, selectedMarket.friendsBoosting - 1)
    : selectedMarket.friendsBoosting + 1;
  const multiplierAfter = getMultiplier(
    { ...selectedMarket, friendsBoosting: friendsAfter },
    state.adminConfig,
  );

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
            {boostSlotsRemaining > 0 && !isBoosting && (
              <> - {boostSlotsRemaining} slot{boostSlotsRemaining !== 1 ? "s" : ""} left</>
            )}
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
            This market's boost group is full ({state.adminConfig.maxGroupSize} / {state.adminConfig.maxGroupSize}).
          </div>
        ) : (
          <button
            className={`btn boost-panel-cta ${isBoosting ? "btn-ghost" : "btn-primary"}`}
            type="button"
            disabled={!!pendingAction}
            onClick={() =>
              runFriendAction(`boost-${friend.username}`, () =>
                actions.toggleFriendBoost(friend.username),
              )
            }
          >
            {pendingAction === `boost-${friend.username}`
              ? "Updating..."
              : isBoosting
                ? `Remove ${friend.name.split(" ")[0]} from boost`
                : `Add ${friend.name.split(" ")[0]} to boost`}
          </button>
        )}
      </div>
    </>
  );
}
