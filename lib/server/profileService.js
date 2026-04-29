import { defaultState } from "../defaultState.js";
import { getDatabaseState, ensureDemoDatabaseSeed } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

const verificationTypes = new Set(["email", "phone", "identity", "payment", "device", "location"]);

function statusForVerification(type) {
  return type === "email" || type === "phone" ? "VERIFIED" : "PLACEHOLDER";
}

export async function updateDatabaseProfile({
  name,
  email,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const cleanedName = String(name || "").trim();
  const cleanedEmail = String(email || "").trim().toLowerCase();

  if (cleanedName.length < 2) {
    return {
      ok: false,
      message: "Enter a display name with at least 2 characters.",
      state: await getDatabaseState(client, userId),
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
    return {
      ok: false,
      message: "Enter a valid email address.",
      state: await getDatabaseState(client, userId),
    };
  }

  try {
    await client.$transaction([
      client.user.update({
        where: { id: userId },
        data: { name: cleanedName, email: cleanedEmail },
      }),
      client.auditTrail.create({
        data: {
          actorId: userId,
          action: "profile.updated",
          metadata: { name: cleanedName, email: cleanedEmail },
        },
      }),
    ]);
  } catch {
    return {
      ok: false,
      message: "Profile could not be updated.",
      state: await getDatabaseState(client, userId),
    };
  }

  return {
    ok: true,
    message: "Profile updated.",
    state: await getDatabaseState(client, userId),
  };
}

export async function updateDatabaseVerification({
  type,
  userId = defaultState.currentUser.id,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return null;
  }

  await ensureDemoDatabaseSeed(client);
  const normalized = String(type || "").toLowerCase();

  if (!verificationTypes.has(normalized)) {
    return {
      ok: false,
      message: "Verification type was not recognized.",
      state: await getDatabaseState(client, userId),
    };
  }

  const dbType = normalized.toUpperCase();
  const status = statusForVerification(normalized);
  await client.$transaction([
    client.verificationCheck.upsert({
      where: { userId_type: { userId, type: dbType } },
      update: {
        status,
        provider: status === "VERIFIED" ? "demo" : "future-provider",
        metadata: {
          note:
            status === "VERIFIED"
              ? `${normalized} verification marked complete for the demo.`
              : `${normalized} verification is reserved for a future real-money compliance provider.`,
        },
      },
      create: {
        userId,
        type: dbType,
        status,
        provider: status === "VERIFIED" ? "demo" : "future-provider",
      },
    }),
    client.auditTrail.create({
      data: {
        actorId: userId,
        action: "verification.updated",
        metadata: { type: normalized, status },
      },
    }),
  ]);

  return {
    ok: true,
    message:
      status === "VERIFIED"
        ? `${normalized} verification marked complete for the demo.`
        : `${normalized} verification is reserved for a future real-money compliance provider.`,
    state: await getDatabaseState(client, userId),
  };
}
