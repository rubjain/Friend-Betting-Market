"use client";

import { useState } from "react";
import Link from "next/link";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { money } from "../../lib/formatters";
import PortfolioLedger from "../PortfolioLedger";
import { SectionHead } from "../ui";

export default function PortfolioPage() {
  const { state, actions } = useFriendMarket();
  const [tab, setTab] = useState("real");
  const [disputeDraft, setDisputeDraft] = useState({ betId: "", reason: "" });
  const [pendingAction, setPendingAction] = useState("");
  const [showTxHistory, setShowTxHistory] = useState(false);

  async function runPortfolioAction(actionKey, callback) {
    if (pendingAction) return;
    setPendingAction(actionKey);
    try {
      return await callback();
    } finally {
      setPendingAction("");
    }
  }

  async function submitDispute(bet) {
    const ok = await runPortfolioAction(`dispute-${bet.id}`, () =>
      actions.submitDispute({
        marketId: bet.marketId,
        betId: bet.id,
        reason: disputeDraft.reason,
      }),
    );
    if (ok) setDisputeDraft({ betId: "", reason: "" });
  }

  const realOpenBets = state.portfolio.openBets.filter((b) => !b.isPaper);
  const paperOpenBets = state.portfolio.openBets.filter((b) => b.isPaper);
  const realPastBets = state.portfolio.pastBets.filter((b) => !b.isPaper);
  const paperPastBets = state.portfolio.pastBets.filter((b) => b.isPaper);
  const realOpenOrders = (state.openOrders || []).filter((o) => !o.isPaper);
  const paperOpenOrders = (state.openOrders || []).filter((o) => o.isPaper);

  const paperPnl = paperPastBets.reduce((sum, b) => sum + (b.pnl ?? (b.payout ?? 0) - (b.stake ?? 0)), 0);
  const paperWinRate = paperPastBets.length
    ? Math.round((paperPastBets.filter((b) => (b.pnl ?? (b.payout ?? 0) - (b.stake ?? 0)) > 0).length / paperPastBets.length) * 100)
    : null;

  const realPnl = realPastBets.reduce((sum, b) => sum + (b.pnl ?? 0), 0);
  const realSettled = realPastBets.length;
  const realWins = realPastBets.filter((b) => b.status === "WON").length;
  const realWinRate = realSettled ? Math.round((realWins / realSettled) * 100) : null;

  return (
    <section className="page active">
      <SectionHead
        title="Portfolio"
        body="Track your real and paper trading activity separately."
      />
      <div className="portfolio-stack">

        {/* Tab switcher */}
        <div className="portfolio-tabs">
          <button
            className={`portfolio-tab${tab === "real" ? " active" : ""}`}
            type="button"
            onClick={() => setTab("real")}
          >
            Real trading
            {(realOpenBets.length + realOpenOrders.length) > 0 && <span className="tab-badge">{realOpenBets.length + realOpenOrders.length}</span>}
          </button>
          <button
            className={`portfolio-tab portfolio-tab--paper${tab === "paper" ? " active" : ""}`}
            type="button"
            onClick={() => setTab("paper")}
          >
            <span className="paper-dot" aria-hidden="true" />
            Paper trading
            {(paperOpenBets.length + paperOpenOrders.length) > 0 && <span className="tab-badge tab-badge--paper">{paperOpenBets.length + paperOpenOrders.length}</span>}
          </button>
        </div>

        {tab === "real" ? (
          <>
            <div className="balance-hero">
              <div className="balance-hero-total">
                <span className="label">Total real balance</span>
                <strong>{money((state.currentUser.withdrawable_balance ?? 0) + (state.currentUser.bonus_balance ?? 0))}</strong>
              </div>
              <div className="balance-hero-breakdown">
                <BalanceBox label="Withdrawable" value={money(state.currentUser.withdrawable_balance)} body="Deposits and normal winnings." />
                <BalanceBox label="Bonus" value={money(state.currentUser.bonus_balance)} body="Social boosts, promos, referrals." />
                {realSettled > 0 && (
                  <BalanceBox
                    label="Settled P&L"
                    value={`${realPnl >= 0 ? "+" : ""}${money(realPnl)}`}
                    body={realWinRate !== null ? `${realWinRate}% win rate · ${realSettled} settled` : `${realSettled} settled`}
                    highlight={realPnl >= 0 ? "positive" : "negative"}
                  />
                )}
              </div>
              <div className="inline-actions">
                <button className="btn btn-secondary" type="button" disabled={!!pendingAction} onClick={() => runPortfolioAction("deposit", actions.addDemoDeposit)}>
                  {pendingAction === "deposit" ? "Adding..." : "Add $25 Deposit"}
                </button>
                <button className="btn btn-ghost" type="button" disabled={!!pendingAction} onClick={() => runPortfolioAction("bonus", actions.grantDemoBonus)}>
                  {pendingAction === "bonus" ? "Granting..." : "Grant $10 Bonus"}
                </button>
              </div>
            </div>

            <div className="list-card open-bets-hero">
              <h2 className="open-bets-heading">Open bets</h2>
              <div className="bet-list">
                {realOpenBets.length ? (
                  realOpenBets.map((bet) => (
                    <BetRow key={bet.id} bet={bet} />
                  ))
                ) : (
                  <div className="empty-note">No open real bets yet. <Link href="/markets">Browse markets</Link></div>
                )}
              </div>
            </div>

            <OpenOrdersList orders={realOpenOrders} onCancel={actions.cancelOrder} pendingAction={pendingAction} runAction={runPortfolioAction} />

            {realPastBets.length > 0 && (
              <div className="list-card">
                <h3>Settled bets</h3>
                <div className="bet-list">
                  {realPastBets.map((bet, index) => (
                    <div className="bet-row" key={`${bet.market}-${index}`}>
                      <div className="bet-row-left">
                        <Link className="bet-row-market" href={`/markets/${bet.marketId}`}>
                          {bet.market}
                        </Link>
                        <div className="caption">
                          <span className={`order-side-badge order-side-badge--${bet.side.toLowerCase()}`}>{bet.side}</span>
                          {" "}· {money(bet.stake)} staked · {bet.settlement}
                          {bet.settledAt && <> · {bet.settledAt}</>}
                        </div>
                        {disputeDraft.betId === bet.id ? (
                          <div className="dispute-box">
                            <label className="label" htmlFor={`dispute-${bet.id}`}>Dispute reason</label>
                            <textarea
                              id={`dispute-${bet.id}`}
                              rows="3"
                              value={disputeDraft.reason}
                              onChange={(e) => setDisputeDraft((d) => ({ ...d, reason: e.currentTarget.value }))}
                              placeholder="Explain what evidence or settlement detail should be reviewed."
                            />
                            <div className="inline-actions">
                              <button className="btn btn-secondary" type="button" disabled={!!pendingAction} onClick={() => submitDispute(bet)}>
                                {pendingAction === `dispute-${bet.id}` ? "Submitting..." : "Submit dispute"}
                              </button>
                              <button className="btn btn-ghost" type="button" disabled={!!pendingAction} onClick={() => setDisputeDraft({ betId: "", reason: "" })}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="bet-row-actions">
                        <strong className={bet.pnl > 0 ? "pnl-positive" : bet.pnl < 0 ? "pnl-negative" : ""}>
                          {bet.pnl > 0 ? "+" : ""}{money(bet.pnl ?? 0)}
                        </strong>
                        {bet.marketId && bet.id && disputeDraft.betId !== bet.id ? (
                          <button className="btn btn-ghost btn-xs" type="button" onClick={() => setDisputeDraft({ betId: bet.id, reason: "" })}>
                            Dispute
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="txn-collapse-wrap">
              <button className="txn-toggle" type="button" onClick={() => setShowTxHistory((v) => !v)} aria-expanded={showTxHistory}>
                <span>{showTxHistory ? "Hide transaction history" : "Show transaction history"}</span>
                <span className="txn-toggle-chevron" aria-hidden="true">{showTxHistory ? "^" : "v"}</span>
              </button>
              {showTxHistory && <PortfolioLedger />}
            </div>
          </>
        ) : (
          <>
            {/* Paper balance hero */}
            <div className="balance-hero balance-hero--paper">
              <div className="balance-hero-paper-header">
                <span className="paper-mode-pill">PAPER</span>
                <span className="balance-hero-paper-tagline">Practice with virtual money. No real funds at risk.</span>
              </div>
              <div className="balance-hero-total">
                <span className="label">Paper balance</span>
                <strong className="paper-balance-value">{money(state.currentUser.paper_balance ?? 0)}</strong>
              </div>
              <div className="balance-hero-breakdown">
                <BalanceBox label="Starting balance" value="$10,000.00" body="Virtual starting funds." isPaper />
                <BalanceBox label="Open positions" value={String(paperOpenBets.length)} body="Active paper bets." isPaper />
                {paperPastBets.length > 0 && (
                  <BalanceBox
                    label="Settled P&L"
                    value={`${paperPnl >= 0 ? "+" : ""}${money(paperPnl)}`}
                    body={paperWinRate !== null ? `${paperWinRate}% win rate` : "From settled bets."}
                    isPaper
                    highlight={paperPnl >= 0 ? "positive" : "negative"}
                  />
                )}
              </div>
              <div className="paper-actions">
                <button className="btn btn-primary paper-start-btn" type="button" onClick={actions.togglePaperMode}>
                  {state.paperMode ? "Exit paper mode" : "Start paper trading"}
                </button>
                <button className="btn btn-ghost" type="button" disabled={!!pendingAction} onClick={() => runPortfolioAction("paperReset", actions.resetPaperBalance)}>
                  {pendingAction === "paperReset" ? "Resetting..." : "Reset to $10,000"}
                </button>
              </div>
              <p className="paper-explainer">
                Paper trading uses the same markets, odds, and payouts as real trading — the only difference is no real money changes hands.
                Use it to test strategies before committing real funds.
              </p>
            </div>

            <OpenOrdersList orders={paperOpenOrders} onCancel={actions.cancelOrder} pendingAction={pendingAction} runAction={runPortfolioAction} isPaper />

            {/* Paper open bets */}
            <div className="list-card list-card--paper open-bets-hero">
              <h2 className="open-bets-heading">Open paper bets</h2>
              <div className="bet-list">
                {paperOpenBets.length ? (
                  paperOpenBets.map((bet) => (
                    <BetRow key={bet.id} bet={bet} isPaper />
                  ))
                ) : (
                  <div className="empty-note">
                    No open paper bets.{" "}
                    <Link href="/markets">Browse markets</Link> to place your first paper trade.
                  </div>
                )}
              </div>
            </div>

            {/* Paper past bets */}
            {paperPastBets.length > 0 && (
              <div className="list-card list-card--paper">
                <h3>Settled paper bets</h3>
                <div className="bet-list">
                  {paperPastBets.map((bet, index) => {
                    const pnl = bet.pnl ?? ((bet.payout ?? 0) - (bet.stake ?? 0));
                    return (
                      <div className="bet-row" key={`${bet.market}-${index}`}>
                        <div className="bet-row-left">
                          <Link className="bet-row-market" href={`/markets/${bet.marketId}`}>{bet.market}</Link>
                          <div className="caption">
                            <span className={`order-side-badge order-side-badge--${bet.side.toLowerCase()}`}>{bet.side}</span>
                            {" "}· {money(bet.stake ?? 0)} staked · {bet.settlement}
                          </div>
                        </div>
                        <strong className={pnl > 0 ? "pnl-positive" : pnl < 0 ? "pnl-negative" : ""}>
                          {pnl > 0 ? "+" : ""}{money(pnl)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function BetRow({ bet, isPaper }) {
  return (
    <div className="bet-row" key={bet.id}>
      <div className="bet-row-left">
        <Link className="bet-row-market" href={`/markets/${bet.marketId}`}>
          {bet.market}
        </Link>
        <div className="caption">
          <span className={`order-side-badge order-side-badge--${bet.side.toLowerCase()}`}>{bet.side}</span>
          {" "}· {money(bet.stake)} staked
          {isPaper && <span className="order-paper-tag">PAPER</span>}
          {bet.placedAt && <> · {bet.placedAt}</>}
        </div>
      </div>
      <div className="bet-row-right">
        <span className="bet-potential-payout">
          If wins: <strong>{money(bet.potentialPayout ?? bet.stake * (bet.oddsMultiplier ?? 2))}</strong>
        </span>
        <span className={`pill${isPaper ? " pill--paper" : ""}`}>{bet.status}</span>
      </div>
    </div>
  );
}

function BalanceBox({ label, value, body, isPaper, highlight }) {
  return (
    <div className={`balance-box${isPaper ? " balance-box--paper" : ""}`}>
      <span className="label">{label}</span>
      <strong className={highlight === "positive" ? "pnl-positive" : highlight === "negative" ? "pnl-negative" : ""}>{value}</strong>
      <span className="caption">{body}</span>
    </div>
  );
}

function OpenOrdersList({ orders, onCancel, pendingAction, runAction, isPaper }) {
  if (!orders.length) return null;
  return (
    <div className={`list-card${isPaper ? " list-card--paper" : ""} open-orders-card`}>
      <div className="open-orders-header">
        <h3>Open limit orders</h3>
        <span className="open-orders-count">{orders.length}</span>
      </div>
      <div className="bet-list">
        {orders.map((order) => {
          const hitTarget = order.currentPrice <= order.limitPrice;
          return (
            <div className="order-row" key={order.id}>
              <div className="order-row-main">
                <div className="order-row-info">
                  <strong>{order.market}</strong>
                  <div className="caption">
                    <span className={`order-side-badge order-side-badge--${order.side.toLowerCase()}`}>{order.side}</span>
                    {" "}· {order.quantity.toFixed(2)} shares · limit {order.limitPriceCents}¢
                    &nbsp;·&nbsp;cost {money(order.dollarCost)}
                    {order.isPaper && <span className="order-paper-tag">PAPER</span>}
                  </div>
                  <div className="order-price-status">
                    <span className="caption">Current: {Math.round(order.currentPrice * 100)}¢</span>
                    {hitTarget
                      ? <span className="order-status-badge order-status-badge--fill">At target — filling soon</span>
                      : <span className="order-status-badge">Waiting for {order.limitPriceCents}¢</span>
                    }
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm order-cancel-btn"
                  type="button"
                  disabled={!!pendingAction}
                  onClick={() => runAction(`cancel-${order.id}`, () => onCancel(order.id))}
                >
                  {pendingAction === `cancel-${order.id}` ? "Cancelling..." : "Cancel"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
