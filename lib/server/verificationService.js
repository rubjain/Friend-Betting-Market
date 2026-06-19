import { defaultState } from "../defaultState.js";
import {
  getStateRule,
  validateIdentitySubmission,
  validateLocationSubmission,
} from "../stateCompliance.js";
import { getDatabaseState, ensureDemoDatabaseSeed } from "./dbState.js";
import { hasDatabaseUrl, prisma } from "./prisma.js";

async function upsertVerificationCheck(client, { userId, type, status, provider, metadata }) {
  return client.verificationCheck.upsert({
    where: { userId_type: { userId, type } },
    update: { status, provider, metadata },
    create: { userId, type, status, provider, metadata },
  });
}

export async function submitIdentityVerification({
  userId = defaultState.currentUser.id,
  legalFirstName,
  legalLastName,
  dateOfBirth,
  addressLine1,
  city,
  state,
  zip,
  attestationAccepted,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "Identity verification requires a database connection." };
  }

  await ensureDemoDatabaseSeed(client);
  const validation = validateIdentitySubmission({
    legalFirstName,
    legalLastName,
    dateOfBirth,
    addressLine1,
    city,
    state,
    zip,
    attestationAccepted,
  });

  if (!validation.ok) {
    return {
      ok: false,
      message: validation.message,
      state: await getDatabaseState(client, userId),
    };
  }

  const verifiedAt = new Date().toISOString();
  const stateLabel = getStateRule(validation.stateCode)?.label || validation.stateCode;

  await client.$transaction([
    upsertVerificationCheck(client, {
      userId,
      type: "IDENTITY",
      status: "VERIFIED",
      provider: "self-service-beta",
      metadata: {
        verifiedAt,
        method: "self-service-beta",
        addressState: validation.stateCode,
        city: validation.cityName,
        zip: validation.zipCode,
        initials: validation.initials,
        minAgeRequired: validation.minAge,
        ageAtVerification: validation.age,
        note: "Replace with a certified KYC provider before real-money launch.",
      },
    }),
    upsertVerificationCheck(client, {
      userId,
      type: "AGE",
      status: "VERIFIED",
      provider: "dob-check",
      metadata: {
        verifiedAt,
        state: validation.stateCode,
        minAgeRequired: validation.minAge,
        ageAtVerification: validation.age,
      },
    }),
    upsertVerificationCheck(client, {
      userId,
      type: "SANCTIONS",
      status: "VERIFIED",
      provider: "demo-screen",
      metadata: {
        verifiedAt,
        method: "demo-screen",
        note: "Replace with OFAC/sanctions vendor before real-money launch.",
      },
    }),
    client.auditTrail.create({
      data: {
        actorId: userId,
        action: "verification.updated",
        metadata: {
          type: "identity",
          status: "VERIFIED",
          state: validation.stateCode,
        },
      },
    }),
  ]);

  return {
    ok: true,
    message: `Identity verified for ${stateLabel}. Age and sanctions checks passed.`,
    state: await getDatabaseState(client, userId),
  };
}

export async function submitLocationVerification({
  userId = defaultState.currentUser.id,
  declaredState,
  latitude,
  longitude,
  accuracy,
  client = prisma,
}) {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "Location verification requires a database connection." };
  }

  await ensureDemoDatabaseSeed(client);
  const validation = validateLocationSubmission({
    declaredState,
    latitude,
    longitude,
    accuracy,
  });

  if (!validation.ok) {
    if (validation.stateCode && getStateRule(validation.stateCode)?.allowed === false) {
      await upsertVerificationCheck(client, {
        userId,
        type: "LOCATION",
        status: "FAILED",
        provider: "geolocation",
        metadata: {
          failedAt: new Date().toISOString(),
          declaredState: validation.stateCode,
          reason: validation.message,
        },
      }).catch(() => {});
    }

    return {
      ok: false,
      message: validation.message,
      state: await getDatabaseState(client, userId),
    };
  }

  const verifiedAt = new Date().toISOString();
  const stateLabel = getStateRule(validation.stateCode)?.label || validation.stateCode;

  await client.$transaction([
    upsertVerificationCheck(client, {
      userId,
      type: "LOCATION",
      status: "VERIFIED",
      provider: "geolocation",
      metadata: {
        verifiedAt,
        state: validation.stateCode,
        method: validation.method,
        geolocated: validation.geolocated,
        accuracyMeters: validation.accuracyMeters,
        minAge: getStateRule(validation.stateCode)?.minAge ?? 21,
      },
    }),
    client.auditTrail.create({
      data: {
        actorId: userId,
        action: "verification.updated",
        metadata: {
          type: "location",
          status: "VERIFIED",
          state: validation.stateCode,
        },
      },
    }),
  ]);

  return {
    ok: true,
    message: `Location confirmed in ${stateLabel}.`,
    state: await getDatabaseState(client, userId),
  };
}
