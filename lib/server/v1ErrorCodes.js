export function inferV1ErrorCode(message) {
  const m = String(message || "").toLowerCase();

  if (!m) return "UNKNOWN_ERROR";

  if (m.includes("missing required fields")) return "BAD_REQUEST";
  if (m.includes("invalid mode")) return "INVALID_MODE";
  if (m.includes("missing orderid") || m.includes("missing order id")) return "BAD_REQUEST";
  if (m.includes("missing apikeyid")) return "BAD_REQUEST";
  if (m.includes("not authenticated")) return "UNAUTHORIZED";
  if (m.includes("not authorized")) return "UNAUTHORIZED";
  if (m.includes("invalid api key")) return "INVALID_API_KEY";
  if (m.includes("api key missing scope")) return "INVALID_SCOPE";
  if (m.includes("real-money") && m.includes("disabled")) return "REAL_MONEY_DISABLED";
  if (m.includes("public beta requires database_url")) return "DATABASE_REQUIRED";

  if (m.includes("market was not found") || m.includes("market not found")) return "NOT_FOUND";
  if (m.includes("strategy not found")) return "NOT_FOUND";

  if (m.includes("strategy is not active")) return "STRATEGY_NOT_ACTIVE";
  if (m.includes("strategy status") && m.includes("active")) return "STRATEGY_NOT_ACTIVE";

  if (m.includes("account is frozen") || m.includes("frozen") && m.includes("account")) return "ACCOUNT_FROZEN";
  if (m.includes("insufficient") && (m.includes("balance") || m.includes("paper"))) return "INSUFFICIENT_BALANCE";

  if (m.includes("real-money trading requirements are not satisfied")) return "COMPLIANCE_BLOCKED";
  if (m.includes("real-money") && m.includes("requirements")) return "COMPLIANCE_BLOCKED";

  if (m.includes("not accepting bets") || m.includes("not accepting bet")) return "MARKET_NOT_ACTIVE";
  if (m.includes("not accepting")) return "MARKET_NOT_ACTIVE";

  if (m.includes("enter a valid stake")) return "INVALID_STAKE";

  if (m.includes("insufficient paper balance")) return "INSUFFICIENT_BALANCE";
  if (m.includes("insufficient balance for this funding mix")) return "INSUFFICIENT_BALANCE";

  if (m.includes("strategy not found")) return "NOT_FOUND";

  return "UNKNOWN_ERROR";
}
