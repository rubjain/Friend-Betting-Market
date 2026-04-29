"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFriendMarket } from "../context/FriendMarketContext";
import { money } from "../lib/formatters";
import { calculatePayout } from "../lib/marketMath";
import { hasValidationErrors, validateBetDraft } from "../lib/validation";
import { InfoRow } from "./ui";

export default function BettingPanel({ market }) {
  const { state, actions } = useFriendMarket();
  const [submitted, setSubmitted] = useState(false);
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
  const marketAcceptsBets = !market.status || market.status === "active";

  function submitBet(side) {
    setSubmitted(true);
    if (!marketAcceptsBets) {
      actions.setFlashMessage(`This market is ${market.status} and is not accepting bets.`);
      return;
    }
    if (hasValidationErrors(errors)) {
      actions.setFlashMessage("Fix the highlighted bet fields before placing this bet.");
      return;
    }
    actions.placeBet(market.id, side);
  }

  return (
    <div className="detail-panel">
      <h3>Betting panel</h3>
      <p>
        Normal winnings stay tied to their original funding source. Social boosts always credit to
        bonus balance.
      </p>
      <div className="form-grid">
        <div className="field">
          <label className="label" htmlFor="stake-input">
            Stake
          </label>
          <input
            id="stake-input"
            type="number"
            min="1"
            step="1"
            value={state.betDraft.stake}
            aria-invalid={submitted && !!errors.stake}
            aria-describedby={submitted && errors.stake ? "stake-input-error" : undefined}
            onChange={(event) => actions.updateBetDraft("stake", event.currentTarget.value)}
          />
          {submitted && errors.stake ? (
            <div className="field-error" id="stake-input-error">
              {errors.stake}
            </div>
          ) : null}
        </div>
        <div className="field">
          <label className="label" htmlFor="side-select">
            Side
          </label>
          <select
            id="side-select"
            value={state.betDraft.side}
            onChange={(event) => actions.updateBetDraft("side", event.currentTarget.value)}
          >
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="withdrawable-input">
            Withdrawable used
          </label>
          <input
            id="withdrawable-input"
            type="number"
            min="0"
            step="1"
            value={state.betDraft.withdrawableShare}
            aria-invalid={submitted && !!errors.withdrawableShare}
            aria-describedby={
              submitted && errors.withdrawableShare ? "withdrawable-input-error" : undefined
            }
            onChange={(event) => actions.updateBetDraft("withdrawableShare", event.currentTarget.value)}
          />
          {submitted && errors.withdrawableShare ? (
            <div className="field-error" id="withdrawable-input-error">
              {errors.withdrawableShare}
            </div>
          ) : null}
        </div>
        <div className="field">
          <label className="label" htmlFor="bonus-input">
            Bonus used
          </label>
          <input
            id="bonus-input"
            type="number"
            min="0"
            step="1"
            value={state.betDraft.bonusShare}
            aria-invalid={submitted && !!errors.bonusShare}
            aria-describedby={submitted && errors.bonusShare ? "bonus-input-error" : undefined}
            onChange={(event) => actions.updateBetDraft("bonusShare", event.currentTarget.value)}
          />
          {submitted && errors.bonusShare ? (
            <div className="field-error" id="bonus-input-error">
              {errors.bonusShare}
            </div>
          ) : null}
        </div>
      </div>
      <div className="market-actions">
        <button className="btn btn-success" type="button" disabled={!marketAcceptsBets} onClick={() => submitBet("YES")}>
          Bet Yes
        </button>
        <button className="btn btn-danger" type="button" disabled={!marketAcceptsBets} onClick={() => submitBet("NO")}>
          Bet No
        </button>
        <Link className="btn btn-secondary" href="/friends">
          Invite Friends
        </Link>
      </div>
      {!marketAcceptsBets ? (
        <div className="note-banner panel-note">This market is {market.status} and is not accepting bets.</div>
      ) : null}
      {payout.note ? <div className="note-banner panel-note">{payout.note}</div> : null}
      <div className="multiplier-box">
        <div className="label">Projected payout</div>
        <div className="multiplier-value">{money(payout.boostedPayout)}</div>
        <div className="caption">
          Normal payout {money(payout.normalPayout)} &middot; Bonus social boost{" "}
          {money(payout.socialBonus)}
          {payout.uncappedSocialBonus > payout.socialBonus ? (
            <> &middot; capped from {money(payout.uncappedSocialBonus)}</>
          ) : null}
        </div>
      </div>
      <div className="info-list">
        <InfoRow label="Normalized stake" value={money(payout.totalStake)} />
        <InfoRow label="Withdrawable used" value={money(payout.withdrawableStake)} />
        <InfoRow label="Bonus used" value={money(payout.bonusStake)} />
        <InfoRow label="Withdrawable settlement" value={money(payout.totalWithdrawableReturn)} />
        <InfoRow label="Bonus settlement" value={money(payout.totalBonusReturn)} />
      </div>
    </div>
  );
}
