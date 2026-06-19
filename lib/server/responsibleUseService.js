import { defaultState } from "../defaultState.js";
import { getDatabaseState, ensureDemoDatabaseSeed } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function updateResponsibleUseSettings({
  userId = defaultState.currentUser.id,
  dailyDepositLimit,
  selfExcludedDays,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "Responsible-use settings require a database connection." };
  }

  await ensureDemoDatabaseSeed(client);
  const data = {};

  if (dailyDepositLimit !== undefined) {
    const limit = toNumber(dailyDepositLimit);
    if (limit == null || limit < 0) {
      return { ok: false, message: "Enter a valid daily deposit limit." };
    }
    if (limit > 10000) {
      return { ok: false, message: "Daily deposit limit cannot exceed $10,000." };
    }
    data.dailyDepositLimit = limit;
  }

  if (selfExcludedDays !== undefined) {
    const days = Number(selfExcludedDays);
    if (!Number.isFinite(days) || days < 0) {
      return { ok: false, message: "Enter a valid cooling-off period." };
    }
    data.selfExcludedUntil =
      days === 0 ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  if (!Object.keys(data).length) {
    return { ok: false, message: "No responsible-use settings were provided." };
  }

  await client.$transaction([
    client.user.update({ where: { id: userId }, data }),
    client.auditTrail.create({
      data: {
        actorId: userId,
        action: "responsible_use.updated",
        metadata: {
          dailyDepositLimit: data.dailyDepositLimit ?? undefined,
          selfExcludedUntil: data.selfExcludedUntil?.toISOString?.() ?? null,
        },
      },
    }),
  ]);

  return {
    ok: true,
    message: "Responsible-use settings updated.",
    state: await getDatabaseState(client, userId),
  };
}
