/**
 * Lightweight in-memory store for bet invites.
 * In production this would be a DB table; for now it persists per-process.
 */

import crypto from "node:crypto";

const invites = new Map(); // id -> invite object

export function createBetInvite({ fromUserId, fromName, fromUsername, toUserId, marketId, marketTitle, message, side }) {
  const id = crypto.randomUUID();
  const invite = {
    id,
    fromUserId,
    fromName,
    fromUsername,
    toUserId,
    marketId,
    marketTitle,
    message: message || null,
    side: side || null,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  invites.set(id, invite);
  return invite;
}

export function getInvitesForUser(userId) {
  return Array.from(invites.values())
    .filter((inv) => inv.toUserId === userId)
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export function getSentInvites(userId) {
  return Array.from(invites.values())
    .filter((inv) => inv.fromUserId === userId)
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

export function updateInviteStatus(id, status) {
  const invite = invites.get(id);
  if (!invite) return null;
  invite.status = status;
  return invite;
}
