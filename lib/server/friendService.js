import { defaultState } from "../defaultState.js";
import { applyRiskSignalsToUser, getBoostRiskSignals } from "../riskEngine.js";
import { getDatabaseState, ensureDemoDatabaseSeed } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

function normalizeUsername(value) {
  const cleaned = String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");

  return cleaned ? `@${cleaned}` : "";
}

function nameFromUsername(username) {
  return username
    .slice(1)
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

async function getAdminConfig(client) {
  const rows = await client.adminConfig.findMany();
  return Object.fromEntries(
    Object.keys(defaultState.adminConfig).map((key) => {
      const row = rows.find((item) => item.key === key);
      return [key, row ? row.value : defaultState.adminConfig[key]];
    }),
  );
}

export async function sendDatabaseFriendInvite({
  username,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return { ok: false, message: "Enter a username to send an invite.", state: await getDatabaseState(client, userId) };
  }

  const requester = await client.user.findUnique({ where: { id: userId } });
  if (!requester) {
    return { ok: false, message: "User was not found.", state: await getDatabaseState(client, userId) };
  }

  if (normalized === requester.username.toLowerCase()) {
    return { ok: false, message: "You cannot invite your own account.", state: await getDatabaseState(client, userId) };
  }

  let addressee = await client.user.findUnique({ where: { username: normalized } });
  if (!addressee) {
    addressee = await client.user.create({
      data: {
        name: nameFromUsername(normalized),
        username: normalized,
        email: `${normalized.replace(/^@/, "")}@example.com`,
        balanceAccounts: {
          create: [
            { currency: "WITHDRAWABLE", balance: 0 },
            { currency: "BONUS", balance: 0 },
          ],
        },
      },
    });
  }

  const existing = await client.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: addressee.id },
        { requesterId: addressee.id, addresseeId: userId },
      ],
      status: { in: ["PENDING", "ACCEPTED"] },
    },
  });

  if (existing) {
    return {
      ok: false,
      message: `${normalized} is already in your friend graph or pending queue.`,
      state: await getDatabaseState(client, userId),
    };
  }

  await client.$transaction([
    client.friendship.create({
      data: {
        requesterId: userId,
        addresseeId: addressee.id,
        status: "PENDING",
      },
    }),
    client.auditTrail.create({
      data: {
        actorId: userId,
        action: "friend.invited",
        metadata: { username: normalized },
      },
    }),
  ]);

  return {
    ok: true,
    message: `Sent a friend invite to ${normalized}.`,
    state: await getDatabaseState(client, userId),
  };
}

export async function handleDatabaseFriendRequest({
  username,
  action,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const normalized = normalizeUsername(username);
  const other = await client.user.findUnique({ where: { username: normalized } });

  if (!other) {
    return { ok: false, message: "Friend request was not found.", state: await getDatabaseState(client, userId) };
  }

  const request = await client.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: other.id },
        { requesterId: other.id, addresseeId: userId },
      ],
      status: "PENDING",
    },
  });

  if (!request) {
    return { ok: false, message: "Friend request was not found.", state: await getDatabaseState(client, userId) };
  }

  const incoming = request.addresseeId === userId;
  const nextStatus = action === "accept" && incoming ? "ACCEPTED" : action === "decline" ? "DECLINED" : "CANCELED";
  await client.$transaction([
    client.friendship.update({ where: { id: request.id }, data: { status: nextStatus } }),
    client.auditTrail.create({
      data: {
        actorId: userId,
        action: "friend.request.updated",
        metadata: { username: normalized, status: nextStatus },
      },
    }),
  ]);

  return {
    ok: true,
    message:
      nextStatus === "ACCEPTED"
        ? `Accepted ${normalized} as a friend.`
        : nextStatus === "DECLINED"
          ? `Declined ${normalized}'s friend request.`
          : `Canceled the pending invite to ${normalized}.`,
    state: await getDatabaseState(client, userId),
  };
}

export async function toggleDatabaseFriendBoost({
  username,
  marketId,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const normalized = normalizeUsername(username);
  const [friend, market, adminConfig] = await Promise.all([
    client.user.findUnique({ where: { username: normalized }, include: { boostsGiven: true } }),
    client.market.findUnique({ where: { id: marketId }, include: { boosts: true } }),
    getAdminConfig(client),
  ]);

  if (!friend || !market) {
    return { ok: false, message: "Friend or market was not found.", state: await getDatabaseState(client, userId) };
  }

  const friendship = await client.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: friend.id },
        { requesterId: friend.id, addresseeId: userId },
      ],
      status: "ACCEPTED",
    },
  });

  if (!friendship) {
    return { ok: false, message: "Friend or market was not found.", state: await getDatabaseState(client, userId) };
  }

  if (!adminConfig.socialBoostsEnabled) {
    return {
      ok: false,
      message: "Social boosts are currently disabled by admin policy.",
      state: await getDatabaseState(client, userId),
    };
  }

  const existing = market.boosts.find((boost) => boost.actorId === friend.id);
  const boostName = friend.name.split(" ")[0];

  if (existing) {
    await client.$transaction([
      client.friendBoost.delete({ where: { id: existing.id } }),
      client.auditTrail.create({
        data: {
          actorId: userId,
          marketId,
          action: "friend.boost.removed",
          metadata: { friendId: friend.id },
        },
      }),
    ]);

    return {
      ok: true,
      message: `${boostName} is no longer boosting "${market.title}".`,
      state: await getDatabaseState(client, userId),
    };
  }

  if (market.boosts.length >= Number(adminConfig.maxGroupSize)) {
    return {
      ok: false,
      message: `This market already has the max boost group size of ${adminConfig.maxGroupSize}.`,
      state: await getDatabaseState(client, userId),
    };
  }

  const signalTarget = {
    name: friend.name,
    risk_status: friend.riskStatus,
    risk_score: friend.riskScore,
    risk_signals: [],
  };
  const signals = getBoostRiskSignals({
    friend: { name: friend.name, boostCount: friend.boostsGiven.length, username: friend.username },
    market: {
      id: market.id,
      title: market.title,
      friendGroup: market.boosts.map((boost) => boost.actorId),
    },
    markets: [],
    adminConfig,
  });
  applyRiskSignalsToUser(signalTarget, signals);

  await client.$transaction(async (tx) => {
    await tx.friendBoost.create({ data: { marketId, actorId: friend.id } });
    if (signals.length) {
      await tx.user.update({
        where: { id: friend.id },
        data: {
          riskStatus: signalTarget.risk_status,
          riskScore: signalTarget.risk_score,
        },
      });
      await tx.riskReview.create({
        data: {
          userId: friend.id,
          marketId,
          score: signalTarget.risk_score,
          signals,
          notes: "Social boost risk signals detected.",
        },
      });
    }
    await tx.auditTrail.create({
      data: {
        actorId: userId,
        marketId,
        action: "friend.boost.added",
        metadata: { friendId: friend.id, signals },
      },
    });
  });

  return {
    ok: true,
    message: signals.length
      ? `${boostName} is now boosting "${market.title}". Risk signals added for review.`
      : `${boostName} is now boosting "${market.title}".`,
    state: await getDatabaseState(client, userId),
  };
}
