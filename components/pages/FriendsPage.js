"use client";

import { useState } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { getMultiplier } from "../../lib/marketMath";
import { SectionHead } from "../ui";

export default function FriendsPage() {
  const { state, actions, selectors } = useFriendMarket();
  const [pendingAction, setPendingAction] = useState("");
  const [boostPanelFriend, setBoostPanelFriend] = useState(null);
  const [pendingExpanded, setPendingExpanded] = useState(false);

  const selectedMarket = selectors.getSelectedMarket();
  const boostSlotsRemaining = Math.max(
    0,
    state.adminConfig.maxGroupSize - selectedMarket.friendGroup.length,
  );
  const pendingCount = state.friends.pending.length;
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

  return (
    <section className="page active">
      <SectionHead
        title="Friends"
        body="Invite friends and boost each other's markets for better odds."
      />
      <div className="friends-page-stack">

        {/* ── Pending requests banner ── */}
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
                      <span className="caption"> · @{request.username} · {request.direction}</span>
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

        {/* ── Add friends search bar ── */}
        <div className="friends-search-row">
          <label className="visually-hidden" htmlFor="friend-invite-input">
            Friend username
          </label>
          <input
            id="friend-invite-input"
            type="text"
            placeholder="Search @username or enter an invite link"
            value={state.friendInviteDraft}
            onChange={(event) => actions.updateFriendInviteDraft(event.currentTarget.value)}
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

        {/* ── Stat bar ── */}
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
            <strong>{bestMultiplier.toFixed(2)}×</strong>
            <span>Best multiplier</span>
          </div>
        </div>

        {/* ── Friends hero list ── */}
        <div className="friends-hero-list">
          {state.friends.list.length ? (
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
                />
              );
            })
          ) : (
            <div className="friends-empty">
              <p>No friends yet — send an invite above to get started.</p>
            </div>
          )}
        </div>

      </div>

      {/* ── Boost slide-in panel ── */}
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

function FriendCard({ friend, isBoosting, disabled, pendingAction, onBoost }) {
  const initials = friend.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const actionKey = `boost-${friend.username}`;

  return (
    <div className={`friend-card${isBoosting ? " friend-card--boosting" : ""}`}>
      <div className="friend-avatar" aria-hidden="true">
        {initials}
      </div>
      <div className="friend-card-body">
        <strong className="friend-card-name">{friend.name}</strong>
        <div className="friend-card-username caption">@{friend.username.replace("@", "")}</div>
        {friend.boostCount > 0 && (
          <div className="friend-card-boosts caption">
            {friend.boostCount} market{friend.boostCount !== 1 ? "s" : ""} together
          </div>
        )}
      </div>
      <button
        className={`btn friend-boost-btn ${isBoosting ? "btn-secondary" : "btn-ghost"}`}
        type="button"
        disabled={disabled || pendingAction === actionKey}
        onClick={onBoost}
      >
        {isBoosting ? "✓ Boosting" : "+ Boost"}
      </button>
    </div>
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

  const initials = friend.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <div className="boost-panel-overlay" onClick={onClose} aria-hidden="true" />
      <div className="boost-panel" role="dialog" aria-label={`Boost with ${friend.name}`}>
        <div className="boost-panel-header">
          <div className="boost-panel-friend">
            <div className="friend-avatar friend-avatar--lg" aria-hidden="true">
              {initials}
            </div>
            <div>
              <strong>{friend.name}</strong>
              <div className="caption">@{friend.username.replace("@", "")}</div>
            </div>
          </div>
          <button className="btn btn-ghost boost-panel-close" type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="boost-panel-market">
          <div className="boost-panel-market-label caption">Boosting on</div>
          <strong>{selectedMarket.title}</strong>
          <div className="boost-panel-market-meta caption">
            {selectedMarket.friendGroup.length} / {state.adminConfig.maxGroupSize} boosters
            {boostSlotsRemaining > 0 && !isBoosting && (
              <> · {boostSlotsRemaining} slot{boostSlotsRemaining !== 1 ? "s" : ""} left</>
            )}
          </div>
        </div>

        <div className="boost-panel-multiplier">
          <div className="boost-panel-multiplier-row">
            <span className="caption">Current multiplier</span>
            <strong>{multiplierNow.toFixed(2)}×</strong>
          </div>
          {multiplierAfter !== multiplierNow && (
            <div className="boost-panel-multiplier-row boost-panel-multiplier-after">
              <span className="caption">After this boost</span>
              <strong className="accent">{multiplierAfter.toFixed(2)}×</strong>
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
