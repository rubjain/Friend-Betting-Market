"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFriendMarket } from "../context/FriendMarketContext";
import { money } from "../lib/formatters";
import { getContractSideLabels } from "../lib/marketLabels";
import { calculatePayout } from "../lib/marketMath";
import { hasValidationErrors, validateBetDraft } from "../lib/validation";

export default function BettingPanel({ market, linkedGame = null }) {
  const { state, actions } = useFriendMarket();
  const [submitted, setSubmitted] = useState(false);
  const [pendingSide, setPendingSide] = useState("");
  const side = state.betDraft.side || "YES";

  const payout = calculatePayout({
    stake: state.betDraft.stake,
    withdrawableShare: state.betDraft.withdrawableShare,
    bonusShare: state.betDraft.bonusShare,
    market,
    adminConfig: state.adminConfig,
  });
  const errors = useMemo(
    () => validateBetDraft({ payout, currentUser: state.currentUser }),
    [payout, state.currentUser],
  );
  const { yesLabel, noLabel } = useMemo(
    () => getContractSideLabels(market, linkedGame, { shortSides: true }),
    [market, linkedGame],
  );
  const marketAcceptsBets = !market.status || market.status === "active";

  async function submitBet() {
    setSubmitted(true);
    if (pendingSide) return;
    if (!marketAcceptsBets) {
      actions.setFlashMessage(`This market is ${market.status} and is not accepting bets.`);
      return;
    }
    if (hasValidationErrors(errors)) {
      actions.setFlashMessage("Fix the highlighted bet fields before placing this bet.");
      return;
    }
    setPendingSide(side);
    try {
      await actions.placeBet(market.id, side);
    } finally {
      setPendingSide("");
    }
  }

  return (
    <div className="bet-panel">
      <div className="bet-side-toggle" role="group" aria-label="Choose side">
        <button
          type="button"
          className={`bet-side-btn ${side === "YES" ? "active-yes" : ""}`}
          onClick={() => actions.updateBetDraft("side", "YES")}
        >
          {yesLabel} {market.yesPrice ? `${Math.round(market.yesPrice * 100)}¢` : ""}
        </button>
        <button
          type="button"
          className={`bet-side-btn ${side === "NO" ? "active-no" : ""}`}
          onClick={() => actions.updateBetDraft("side", "NO")}
        >
          {noLabel} {market.noPrice ? `${Math.round(market.noPrice * 100)}¢` : ""}
        </button>
      </div>

      <div className="stake-field">
        <label className="stake-label" htmlFor="stake-input">Amount</label>
        <div className="stake-input-wrap">
          <input
            id="stake-input"
            type="number"
            min="1"
            step="1"
            value={state.betDraft.stake}
            aria-invalid={submitted && !!errors.stake}
            onChange={(e) => actions.updateBetDraft("stake", e.currentTarget.value)}
          />
        </div>
        {submitted && errors.stake ? (
          <div className="field-error">{errors.stake}</div>
        ) : null}
      </div>

      <div className="payout-row">
        <span>Potential payout</span>
        <strong>{money(payout.boostedPayout)}</strong>
      </div>
      {payout.socialBonus > 0 ? (
        <div className="payout-row payout-boost">
          <span>Includes social boost</span>
          <strong>+{money(payout.socialBonus)}</strong>
        </div>
      ) : null}

      {!marketAcceptsBets ? (
        <div className="note-banner panel-note">Market is {market.status} - not accepting bets.</div>
      ) : null}
      {payout.note ? <div className="note-banner panel-note">{payout.note}</div> : null}

      <button
        className="bet-submit-btn"
        type="button"
        disabled={!marketAcceptsBets || !!pendingSide}
        onClick={submitBet}
      >
        {pendingSide ? "Placing..." : `Buy ${side === "YES" ? yesLabel : noLabel}`}
      </button>

      <div className="bet-panel-footer">
        <Link className="btn btn-ghost btn-sm" href="/friends">Invite friends to boost</Link>
      </div>
    </div>
  );
}
