import { defaultState } from "../defaultState.js";
import { getDatabaseState, ensureDemoDatabaseSeed } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

const numericAdminFields = new Set([
  "maxGroupSize",
  "multiplierPerFriend",
  "maxMultiplier",
  "maxBonusPayoutPerUser",
  "maxBonusPayoutPerMarket",
  "dailyBonusPayoutLimit",
  "maxBonusStakePercent",
  "bonusLiability",
]);

export async function updateDatabaseAdminConfig({
  field,
  value,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);

  if (!(field in defaultState.adminConfig)) {
    return { ok: false, message: "Admin setting was not found.", state: await getDatabaseState(client, userId) };
  }

  const normalized = numericAdminFields.has(field) ? Number(value) : value;
  await client.$transaction([
    client.adminConfig.upsert({
      where: { key: field },
      update: { value: normalized },
      create: { key: field, value: normalized },
    }),
    client.auditTrail.create({
      data: {
        actorId: userId,
        action: "admin.config.updated",
        metadata: { field, value: normalized },
      },
    }),
  ]);

  return {
    ok: true,
    message: "Admin settings updated.",
    state: await getDatabaseState(client, userId),
  };
}
