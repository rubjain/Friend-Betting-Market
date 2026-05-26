export function evaluateRules({ strategy, markets, liveGames }) {
  const config = strategy?.config || {};
  const rules = Array.isArray(config.rules) ? config.rules : [];
  const actions = [];

  for (const rule of rules) {
    const when = rule?.when || {};
    const action = rule?.action || {};
    if (!action.side || !action.stake) continue;

    for (const market of markets || []) {
      if (when.marketStatus && String(market.status || "").toUpperCase() !== String(when.marketStatus).toUpperCase()) {
        continue;
      }
      if (when.category && String(market.category || "") !== String(when.category)) {
        continue;
      }
      if (when.yesPriceLt != null && Number(market.yesPrice ?? 0.5) >= Number(when.yesPriceLt)) {
        continue;
      }
      if (when.noPriceLt != null && Number(market.noPrice ?? 0.5) >= Number(when.noPriceLt)) {
        continue;
      }

      actions.push({
        marketId: market.id,
        side: action.side,
        stake: Number(action.stake),
        reason: rule.name || "rule_match",
      });
    }
  }

  return { ok: true, actions };
}

