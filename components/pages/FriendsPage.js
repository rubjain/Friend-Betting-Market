"use client";

import { useFriendMarket } from "../../context/FriendMarketContext";
import { getMultiplier } from "../../lib/marketMath";
import { InfoRow, SectionHead } from "../ui";

export default function FriendsPage() {
  const { state, actions, selectors } = useFriendMarket();
  const selectedMarket = selectors.getSelectedMarket();
  const boostSlotsRemaining = Math.max(
    0,
    state.adminConfig.maxGroupSize - selectedMarket.friendGroup.length,
  );

  return (
    <section className="page active">
      <SectionHead
        title="Friends"
        body="Add people, manage requests, and keep social boost relationships easy to understand."
      />
      <div className="friends-grid">
        <div className="list-card">
          <h3>Add friends</h3>
          <p>Search by username or invite directly.</p>
          <div className="toolbar">
            <div className="field">
              <label className="visually-hidden" htmlFor="friend-invite-input">
                Friend username
              </label>
              <input
                id="friend-invite-input"
                type="text"
                placeholder="Search @username"
                value={state.friendInviteDraft}
                onChange={(event) => actions.updateFriendInviteDraft(event.currentTarget.value)}
              />
            </div>
            <button className="btn btn-primary" type="button" onClick={actions.sendFriendInvite}>
              Send Invite
            </button>
          </div>
          <div className="note-banner">
            Future anti-abuse checks can inspect suspicious reciprocal boosting, shared-device
            signals, and repeated invite loops.
          </div>
        </div>
        <div className="list-card">
          <h3>Boost selected market</h3>
          <p>{selectedMarket.title}</p>
          <div className="info-list">
            <InfoRow label="Current multiplier" value={`${getMultiplier(selectedMarket, state.adminConfig).toFixed(2)}x`} />
            <InfoRow label="Boost group" value={`${selectedMarket.friendGroup.length} / ${state.adminConfig.maxGroupSize}`} />
            <InfoRow label="Slots remaining" value={boostSlotsRemaining} />
          </div>
          <div className="friend-list">
            {state.friends.list.length ? (
              state.friends.list.map((friend) => {
                const boostName = selectors.getFriendBoostName(friend);
                const isBoosting = selectedMarket.friendGroup.includes(boostName);
                const disabled = !isBoosting && boostSlotsRemaining <= 0;

                return (
                  <div className="friend-item" key={friend.username}>
                    <div>
                      <strong>{friend.name}</strong>
                      <div className="caption">
                        {friend.username} &middot;{" "}
                        {isBoosting ? "Currently boosting" : `${friend.boostCount} shared boosts`}
                      </div>
                    </div>
                    <button
                      className={`btn ${isBoosting ? "btn-ghost" : "btn-secondary"}`}
                      type="button"
                      disabled={disabled}
                      onClick={() => actions.toggleFriendBoost(friend.username)}
                    >
                      {isBoosting ? "Remove Boost" : "Add Boost"}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="empty-note">Accept a friend request to add boosters.</div>
            )}
          </div>
        </div>
        <div className="list-card">
          <h3>Pending requests</h3>
          <div className="request-list">
            {state.friends.pending.length ? (
              state.friends.pending.map((request) => (
                <div className="request-item" key={request.username}>
                  <div>
                    <strong>{request.name}</strong>
                    <div className="caption">
                      {request.username} &middot; {request.direction}
                    </div>
                  </div>
                  <div className="inline-actions">
                    {request.direction === "incoming" ? (
                      <>
                        <button className="btn btn-secondary" type="button" onClick={() => actions.handleFriendRequest(request.username, "accept")}>
                          Accept
                        </button>
                        <button className="btn btn-ghost" type="button" onClick={() => actions.handleFriendRequest(request.username, "decline")}>
                          Decline
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-ghost" type="button" onClick={() => actions.handleFriendRequest(request.username, "cancel")}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-note">No pending friend requests.</div>
            )}
          </div>
        </div>
        <div className="list-card">
          <h3>Friends list</h3>
          <div className="friend-list">
            {state.friends.list.length ? (
              state.friends.list.map((friend) => (
                <div className="friend-item" key={friend.username}>
                  <div>
                    <strong>{friend.name}</strong>
                    <div className="caption">
                      {friend.username} &middot; {friend.boostCount} shared boosts
                    </div>
                  </div>
                  <span className="pill">{friend.status}</span>
                </div>
              ))
            ) : (
              <div className="empty-note">No friends yet.</div>
            )}
          </div>
        </div>
        <div className="list-card">
          <h3>Social boost rules</h3>
          <div className="info-list">
            <InfoRow label="Max group size" value={state.adminConfig.maxGroupSize} />
            <InfoRow label="Multiplier per friend" value={`${(state.adminConfig.multiplierPerFriend * 100).toFixed(0)}%`} />
            <InfoRow label="Max multiplier" value={`${state.adminConfig.maxMultiplier.toFixed(2)}x`} />
          </div>
        </div>
      </div>
    </section>
  );
}
