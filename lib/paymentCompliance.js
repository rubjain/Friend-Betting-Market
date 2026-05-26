const REAL_MONEY_FLAG = "FRIENDMARKET_REAL_MONEY_MODE";

const REQUIRED_VERIFICATIONS = {
  deposit: ["email", "age", "payment", "location", "sanctions"],
  withdrawal: ["email", "age", "identity", "payment", "location", "sanctions"],
  /** When FRIENDMARKET_REAL_MONEY_MODE=1, real (non-paper) bets require these checks */
  realMoneyTrade: ["email", "age", "identity", "payment", "location", "sanctions"],
};

function statusFromCheck(check) {
  if (typeof check === "string") {
    return check.trim().toLowerCase();
  }
  return String(check?.status || "").trim().toLowerCase();
}

function getVerificationStatus(user, type) {
  const normalizedType = String(type || "").toLowerCase();
  const checks = Array.isArray(user?.verificationChecks) ? user.verificationChecks : [];
  const check = checks.find((item) => String(item.type || "").toLowerCase() === normalizedType);
  if (check) return statusFromCheck(check);
  return statusFromCheck(user?.settings?.[`${normalizedType}VerificationStatus`]);
}

export function isRealMoneyModeEnabled(env = process.env) {
  return env?.[REAL_MONEY_FLAG] === "1";
}

function isFutureDate(value, now = Date.now()) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) && timestamp > now;
}

function numberSetting(user, key) {
  const value = Number(user?.settings?.[key]);
  return Number.isFinite(value) ? value : null;
}

export function evaluatePaymentCompliance({ user, action, amount, env = process.env, now = Date.now() } = {}) {
  const normalizedAction = action === "withdrawal" ? "withdrawal" : "deposit";
  const requiredChecks = REQUIRED_VERIFICATIONS[normalizedAction];
  const blockingReasons = [];
  const warnings = [];

  if (!user) {
    return {
      ok: false,
      mode: isRealMoneyModeEnabled(env) ? "real-money" : "demo",
      requiredChecks,
      blockingReasons: ["User was not found."],
      warnings,
    };
  }

  if (user.frozen || user.riskStatus === "frozen" || user.risk_status === "frozen") {
    blockingReasons.push("Account is frozen for manual review.");
  }

  if (isFutureDate(user.settings?.selfExcludedUntil, now)) {
    blockingReasons.push("Account is self-excluded until the selected cooling-off period ends.");
  }

  const realMoneyMode = isRealMoneyModeEnabled(env);
  if (!realMoneyMode) {
    warnings.push("Demo play-money mode: real-money compliance checks are not enforced.");
  } else {
    for (const check of requiredChecks) {
      if (getVerificationStatus(user, check) !== "verified") {
        blockingReasons.push(`${check} verification is required.`);
      }
    }

    const normalizedAmount = Number(amount) || 0;
    const depositLimit = numberSetting(user, "dailyDepositLimit");
    if (normalizedAction === "deposit" && depositLimit !== null && normalizedAmount > depositLimit) {
      blockingReasons.push(`Deposit exceeds the responsible-use limit of $${depositLimit.toFixed(2)}.`);
    }
  }

  return {
    ok: blockingReasons.length === 0,
    mode: realMoneyMode ? "real-money" : "demo",
    requiredChecks,
    blockingReasons,
    warnings,
  };
}

/** Non-paper (real ledger) bets when real-money flag is enabled. */
export function evaluateRealMoneyBetEligibility({
  user,
  env = process.env,
  now = Date.now(),
} = {}) {
  const requiredChecks = REQUIRED_VERIFICATIONS.realMoneyTrade;
  const blockingReasons = [];
  const warnings = [];

  if (!user) {
    return {
      ok: false,
      mode: isRealMoneyModeEnabled(env) ? "real-money" : "demo",
      requiredChecks,
      blockingReasons: ["User was not found."],
      warnings,
    };
  }

  if (user.frozen || user.riskStatus === "frozen" || user.risk_status === "frozen") {
    blockingReasons.push("Account is frozen for manual review.");
  }

  if (isFutureDate(user.settings?.selfExcludedUntil, now)) {
    blockingReasons.push("Account is self-excluded until the selected cooling-off period ends.");
  }

  const realMoneyMode = isRealMoneyModeEnabled(env);
  if (!realMoneyMode) {
    warnings.push("Demo play-money mode: strict real-money trade checks are not enforced.");
    return {
      ok: true,
      mode: "demo",
      requiredChecks,
      blockingReasons: [],
      warnings,
    };
  }

  for (const check of requiredChecks) {
    if (getVerificationStatus(user, check) !== "verified") {
      blockingReasons.push(`${check} verification is required before real-money trading.`);
    }
  }

  return {
    ok: blockingReasons.length === 0,
    mode: "real-money",
    requiredChecks,
    blockingReasons,
    warnings,
  };
}
