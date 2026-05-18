"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFriendMarket } from "../context/FriendMarketContext";
import { money } from "../lib/formatters";
import { getContractSideLabels } from "../lib/marketLabels";
import { calculateOrderPreview, calculatePayout, dollarsToShares, sharesToDollars, priceForSideExported } from "../lib/marketMath";
import { hasValidationErrors, validateBetDraft } from "../lib/validation";

function cents(value) {
  return `${Math.round(Number(value || 0) * 100)}¢`;
}

function expiryLabel(val) {
  return val === "1d" ? "1 day" : val === "7d" ? "7 days" : val === "30d" ? "30 days" : "Never";
}

export default function BettingPanel({ market, linkedGame = null }) {
  const { state, actions } = useFriendMarket();
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const draft = state.betDraft;
  const side = draft.side || "YES";
  const inputMode = draft.inputMode || "dollars";
  const orderType = draft.orderType || "market";
  const isPaper = state.paperMode;

  const currentPrice = priceForSideExported(market, side);

  const dollarStake = inputMode === "shares"
    ? sharesToDollars(draft.shareCount || 0, currentPrice)
    : Number(draft.stake) || 0;

  const shareCount = inputMode === "dollars"
    ? dollarsToShares(draft.stake, currentPrice)
    : Number(draft.shareCount) || 0;

  const limitPriceDecimal = Number(draft.limitPrice) / 100 || currentPrice;

  const payout = useMemo(() => calculatePayout({
    stake: dollarStake,
    withdrawableShare: isPaper ? dollarStake : (inputMode === "shares" ? dollarStake : draft.withdrawableShare),
    bonusShare: isPaper ? 0 : (inputMode === "shares" ? 0 : draft.bonusShare),
    market,
    adminConfig: state.adminConfig,
  }), [dollarStake, draft.withdrawableShare, draft.bonusShare, market, state.adminConfig, isPaper, inputMode]);

  const errors = useMemo(
    () => validateBetDraft({ payout, currentUser: state.currentUser }),
    [payout, state.currentUser],
  );
  const { yesLabel, noLabel } = useMemo(
    () => getContractSideLabels(market, linkedGame, { shortSides: true }),
    [market, linkedGame],
  );
  const orderPreview = useMemo(
    () => calculateOrderPreview({ stake: dollarStake, side, market }),
    [dollarStake, side, market],
  );
  const marketAcceptsBets = !market.status || market.status === "active";
  const sideLabel = side === "YES" ? yesLabel : noLabel;

  function handleDollarInput(value) {
    actions.updateBetDraft("stake", value);
    actions.updateBetDraft("inputMode", "dollars");
  }

  function handleShareInput(value) {
    actions.updateBetDraft("shareCount", value);
    actions.updateBetDraft("inputMode", "shares");
  }

  function openReview() {
    setSubmitted(true);
    if (!marketAcceptsBets) {
      actions.setFlashMessage(`This market is ${market.status} and is not accepting bets.`);
      return;
    }
    if (orderType === "market" && hasValidationErrors(errors)) {
      actions.setFlashMessage("Fix the highlighted bet fields before placing this bet.");
      return;
    }
    if (orderType === "limit") {
      if (!draft.limitPrice || draft.limitPrice <= 0 || draft.limitPrice >= 100) {
        actions.setFlashMessage("Enter a valid limit price between 1¢ and 99¢.");
        return;
      }
      if (!shareCount || shareCount <= 0) {
        actions.setFlashMessage("Enter how many shares you want to buy.");
        return;
      }
    }
    setShowReview(true);
  }

  async function confirmOrder() {
    if (pending) return;
    setPending(true);
    try {
      if (orderType === "limit") {
        await actions.createLimitOrder({
          marketId: market.id,
          side,
          quantity: shareCount,
          limitPrice: limitPriceDecimal,
          limitExpiry: draft.limitExpiry || "7d",
        });
      } else {
        await actions.placeBet(market.id, side);
      }
      setShowReview(false);
      setSubmitted(false);
    } finally {
      setPending(false);
    }
  }

  if (showReview) {
    return (
      <ReviewScreen
        market={market}
        side={side}
        sideLabel={sideLabel}
        orderType={orderType}
        dollarStake={dollarStake}
        shareCount={shareCount}
        payout={payout}
        limitPrice={draft.limitPrice}
        limitExpiry={draft.limitExpiry}
        isPaper={isPaper}
        pending={pending}
        onConfirm={confirmOrder}
        onBack={() => setShowReview(false)}
      />
    );
  }

  return (
    <div className={`bet-panel${isPaper ? " bet-panel--paper" : ""}`}>
      {isPaper && (
        <div className="bet-panel-paper-badge">
          <span className="paper-dot" aria-hidden="true" />
          Paper trade — virtual money only
        </div>
      )}

      {/* Side toggle */}
      <div className="bet-side-toggle" role="group" aria-label="Choose side">
        <button
          type="button"
          className={`bet-side-btn ${side === "YES" ? "active-yes" : ""}`}
          onClick={() => actions.updateBetDraft("side", "YES")}
        >
          {yesLabel} {market.yesPrice ? cents(market.yesPrice) : ""}
        </button>
        <button
          type="button"
          className={`bet-side-btn ${side === "NO" ? "active-no" : ""}`}
          onClick={() => actions.updateBetDraft("side", "NO")}
        >
          {noLabel} {market.noPrice ? cents(market.noPrice) : ""}
        </button>
      </div>

      {/* Order type toggle */}
      <div className="order-type-toggle" role="group" aria-label="Order type">
        <button
          type="button"
          className={`order-type-btn${orderType === "market" ? " active" : ""}`}
          onClick={() => actions.updateBetDraft("orderType", "market")}
        >
          Market
        </button>
        <button
          type="button"
          className={`order-type-btn${orderType === "limit" ? " active" : ""}`}
          onClick={() => actions.updateBetDraft("orderType", "limit")}
        >
          Limit
        </button>
      </div>

      {/* Amount input with $ / Shares toggle */}
      <div className="stake-field">
        <div className="stake-label-row">
          <label className="stake-label" htmlFor="stake-input">
            {inputMode === "shares" ? "Shares" : "Amount"}
          </label>
          <div className="input-mode-toggle" role="group" aria-label="Input mode">
            <button
              type="button"
              className={`input-mode-btn${inputMode === "dollars" ? " active" : ""}`}
              onClick={() => actions.updateBetDraft("inputMode", "dollars")}
            >$</button>
            <button
              type="button"
              className={`input-mode-btn${inputMode === "shares" ? " active" : ""}`}
              onClick={() => actions.updateBetDraft("inputMode", "shares")}
            >Shares</button>
          </div>
        </div>

        {inputMode === "dollars" ? (
          <div className="stake-input-wrap">
            <input
              id="stake-input"
              type="number"
              min="1"
              step="1"
              value={draft.stake}
              aria-invalid={submitted && !!errors.stake}
              onChange={(e) => handleDollarInput(e.currentTarget.value)}
            />
          </div>
        ) : (
          <div className="stake-input-wrap">
            <input
              id="stake-input"
              type="number"
              min="1"
              step="1"
              value={draft.shareCount || ""}
              placeholder="0"
              onChange={(e) => handleShareInput(e.currentTarget.value)}
            />
          </div>
        )}

        <div className="stake-conversion">
          {inputMode === "dollars" ? (
            <span>{shareCount.toFixed(2)} shares @ {cents(currentPrice)}</span>
          ) : (
            <span>≈ {money(dollarStake)} @ {cents(currentPrice)}</span>
          )}
        </div>

        {submitted && errors.stake && orderType === "market" ? (
          <div className="field-error">{errors.stake}</div>
        ) : null}
      </div>

      {/* Limit order fields */}
      {orderType === "limit" && (
        <div className="limit-order-fields">
          <div className="limit-price-row">
            <div className="stake-field">
              <label className="stake-label" htmlFor="limit-price-input">
                Limit price (¢)
              </label>
              <div className="stake-input-wrap limit-price-wrap">
                <input
                  id="limit-price-input"
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  placeholder={String(Math.round(currentPrice * 100))}
                  value={draft.limitPrice || ""}
                  onChange={(e) => actions.updateBetDraft("limitPrice", e.currentTarget.value)}
                />
                <span className="stake-unit">¢</span>
              </div>
            </div>
            <div className="stake-field">
              <label className="stake-label" htmlFor="limit-expiry-select">Expires</label>
              <select
                id="limit-expiry-select"
                className="limit-expiry-select"
                value={draft.limitExpiry || "7d"}
                onChange={(e) => actions.updateBetDraft("limitExpiry", e.currentTarget.value)}
              >
                <option value="1d">1 day</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="never">Never</option>
              </select>
            </div>
          </div>
          {draft.limitPrice > 0 && (
            <div className="limit-order-hint">
              Order fills when {sideLabel} price drops to {draft.limitPrice}¢ or below
              {draft.limitPrice >= Math.round(currentPrice * 100) && (
                <span className="limit-order-warn"> — current price is {Math.round(currentPrice * 100)}¢, order may fill immediately</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payout summary — market orders only */}
      {orderType === "market" && (
        <>
          <div className="payout-row">
            <span>Potential payout</span>
            <strong>{money(payout.boostedPayout)}</strong>
          </div>
          {payout.socialBonus > 0 ? (
            <div className="payout-row payout-boost">
              <span>Social boost</span>
              <strong>+{money(payout.socialBonus)}</strong>
            </div>
          ) : null}
          <div className="order-preview" aria-label="Execution estimate">
            <div className="order-preview-row">
              <span>Entry price</span>
              <strong>{cents(orderPreview.entryPrice)}</strong>
            </div>
            <div className="order-preview-row">
              <span>Contracts</span>
              <strong>{orderPreview.estimatedContracts.toFixed(2)}</strong>
            </div>
            <div className="order-preview-row">
              <span>Spread</span>
              <strong>{cents(orderPreview.spread)}</strong>
            </div>
            {orderPreview.feeBps > 0 ? (
              <div className="order-preview-row">
                <span>Fee</span>
                <strong>{money(orderPreview.feeAmount)}</strong>
              </div>
            ) : null}
          </div>
        </>
      )}

      {!marketAcceptsBets ? (
        <div className="note-banner panel-note">Market is {market.status} — not accepting bets.</div>
      ) : null}
      {payout.note && orderType === "market" ? <div className="note-banner panel-note">{payout.note}</div> : null}

      <button
        className={`bet-submit-btn${isPaper ? " bet-submit-btn--paper" : ""}`}
        type="button"
        disabled={!marketAcceptsBets}
        onClick={openReview}
      >
        {orderType === "limit" ? `Review limit order` : `Review ${isPaper ? "paper " : ""}trade`}
      </button>

      <div className="bet-panel-footer">
        <Link className="btn btn-ghost btn-sm" href="/friends">Invite friends to boost</Link>
      </div>
    </div>
  );
}

function ReviewScreen({ market, side, sideLabel, orderType, dollarStake, shareCount, payout, limitPrice, limitExpiry, isPaper, pending, onConfirm, onBack }) {
  const isLimit = orderType === "limit";
  const limitDec = Number(limitPrice) / 100;
  const limitDollarCost = shareCount * limitDec;

  return (
    <div className={`bet-panel bet-panel--review${isPaper ? " bet-panel--paper" : ""}`}>
      {isPaper && (
        <div className="bet-panel-paper-badge">
          <span className="paper-dot" aria-hidden="true" />
          Paper trade — virtual money only
        </div>
      )}

      <div className="review-header">
        <h3 className="review-title">Review {isLimit ? "limit order" : "trade"}</h3>
        <button className="btn btn-ghost btn-sm review-back" type="button" onClick={onBack}>
          Edit
        </button>
      </div>

      <div className="review-market-title">{market.title}</div>

      <div className="review-rows">
        <div className="review-row">
          <span>Side</span>
          <strong className={`review-side-badge review-side-badge--${side.toLowerCase()}`}>{sideLabel} ({side})</strong>
        </div>
        <div className="review-row">
          <span>Order type</span>
          <strong>{isLimit ? "Limit order" : "Market order"}</strong>
        </div>

        {isLimit ? (
          <>
            <div className="review-row">
              <span>Shares</span>
              <strong>{shareCount.toFixed(2)}</strong>
            </div>
            <div className="review-row">
              <span>Limit price</span>
              <strong>{limitPrice}¢</strong>
            </div>
            <div className="review-row">
              <span>Max cost</span>
              <strong>{money(limitDollarCost)}</strong>
            </div>
            <div className="review-row">
              <span>Max payout</span>
              <strong>{money(shareCount)}</strong>
            </div>
            <div className="review-row">
              <span>Expires</span>
              <strong>{limitExpiry === "never" ? "Never" : `In ${limitExpiry === "1d" ? "1 day" : limitExpiry === "7d" ? "7 days" : "30 days"}`}</strong>
            </div>
          </>
        ) : (
          <>
            <div className="review-row">
              <span>Amount</span>
              <strong>{money(dollarStake)}</strong>
            </div>
            <div className="review-row">
              <span>Shares</span>
              <strong>{shareCount.toFixed(2)}</strong>
            </div>
            <div className="review-row">
              <span>Potential payout</span>
              <strong className="review-payout">{money(payout.boostedPayout)}</strong>
            </div>
            {payout.socialBonus > 0 && (
              <div className="review-row review-row--boost">
                <span>Includes social boost</span>
                <strong>+{money(payout.socialBonus)}</strong>
              </div>
            )}
          </>
        )}

        <div className="review-row">
          <span>Account</span>
          <strong>{isPaper ? "Paper (virtual)" : "Real"}</strong>
        </div>
      </div>

      <div className="review-disclaimer">
        {isLimit
          ? "This order will fill automatically when the market price hits your limit. You can cancel it any time from your portfolio."
          : isPaper
            ? "This is a paper trade. No real money will be used."
            : "By confirming you agree to the bet terms. Bets are final once placed."
        }
      </div>

      <button
        className={`bet-submit-btn${isPaper ? " bet-submit-btn--paper" : ""}`}
        type="button"
        disabled={pending}
        onClick={onConfirm}
      >
        {pending
          ? "Placing..."
          : isLimit
            ? `Place limit order`
            : isPaper
              ? `Confirm paper trade`
              : `Confirm — ${money(dollarStake)}`
        }
      </button>
    </div>
  );
}
