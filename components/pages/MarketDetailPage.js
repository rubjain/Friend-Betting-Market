"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import BettingPanel from "../BettingPanel";
import MarketGamePanel from "../MarketGamePanel";
import MarketPriceChart from "../MarketPriceChart";
import TennisPremiumMarketPage from "../TennisPremiumMarketPage";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { formatMarketDate, formatPercent, money } from "../../lib/formatters";
import { getLinkedLiveGame, getLiveGameClock, getMarketAlgorithmSnapshot } from "../../lib/marketAlgorithms";
import { getMultiplier } from "../../lib/marketMath";
import { getResolutionTemplate } from "../../lib/marketTaxonomy";
import { getContractSideLabels } from "../../lib/marketLabels";
import { EmptyState, InfoRow } from "../ui";

function cents(price) {
  if (price == null || Number.isNaN(Number(price))) {
    return "—";
  }
  return `${Math.round(Number(price) * 100)}¢`;
}

// Route tennis ATP markets to the premium layout; everything else uses the default.
export default function MarketDetailPage({ marketId }) {
  const isAtp =
    typeof marketId === "string" && marketId.startsWith("espn_tennis_atp");

  if (isAtp) {
    return <TennisPremiumMarketPage marketId={marketId} />;
  }
  return <DefaultMarketDetailPage marketId={marketId} />;
}

function DefaultMarketDetailPage({ marketId }) {
  const { state, actions, selectors } = useFriendMarket();
  const market = selectors.getSelectedMarket(marketId);
  const linkedGame = useMemo(
    () => (market ? getLinkedLiveGame(market, state.liveGames) : null),
    [market, state.liveGames],
  );
  const sides = useMemo(
    () => (market ? getContractSideLabels(market, linkedGame) : { yesLabel: "Yes", noLabel: "No" }),
    [market, linkedGame],
  );

  useEffect(() => {
    if (market?.id && state.selectedMarketId !== market.id) {
      actions.setSelectedMarket(market.id);
    }
  }, [actions, market?.id, state.selectedMarketId]);

  if (!market) {
    return (
      <section className="page active">
        <EmptyState title="Market not found" body="Pick another market from the market list." />
      </section>
    );
  }

  const resolutionTemplate = getResolutionTemplate(market.category);
  const checklist = market.resolutionChecklist ?? resolutionTemplate.checklist;
  const evidenceLinks = market.evidenceLinks ?? [];
  const algorithm = getMarketAlgorithmSnapshot(market, state.liveGames);
  const updateLog = linkedGame?.updates ?? market.liveUpdates ?? [
    `${market.algorithm?.refreshCadence ?? "Daily"}: source monitor checked with no settlement event.`,
    "Price engine recalculated YES/NO display from current signal inputs.",
  ];
  const mult = getMultiplier(market, state.adminConfig);
  const isLive = linkedGame?.status === "live";

  return (
    <section className="page active market-detail">
      <div className="market-detail-topbar">
        <div className="market-detail-badges">
          <span className="market-detail-category">{market.category}</span>
          {isLive ? (
            <span className="market-detail-live-badge" role="status">
              Live
            </span>
          ) : null}
          {market.status && market.status !== "active" ? (
            <span className="market-detail-status-pill">{market.status}</span>
          ) : null}
        </div>
        <Link className="btn btn-secondary btn-sm" href="/markets">
          Back to markets
        </Link>
      </div>

      {linkedGame ? (
        <MarketGamePanel market={market} game={linkedGame} />
      ) : (
        <header className="market-detail-header market-detail-header--solo">
          <h2 className="market-detail-title">{market.title}</h2>
          <p className="market-detail-sub">Closes {formatMarketDate(market.endDate)}</p>
        </header>
      )}

      <header className="market-detail-header market-detail-header--pricing">
        <div className="market-detail-price-row" aria-label="Contract prices">
          <div className="market-detail-price-card market-detail-price-card--yes">
            <span className="market-detail-price-label">{sides.yesLabel}</span>
            <strong className="market-detail-price-value">{cents(market.yesPrice)}</strong>
            <span className="market-detail-price-sub">{formatPercent(market.yesPrice)} implied</span>
          </div>
          <div className="market-detail-price-card market-detail-price-card--no">
            <span className="market-detail-price-label">{sides.noLabel}</span>
            <strong className="market-detail-price-value">{cents(market.noPrice)}</strong>
            <span className="market-detail-price-sub">{formatPercent(market.noPrice)} implied</span>
          </div>
          <div className="market-detail-price-meta">
            <div>
              <span className="label">Volume</span>
              <strong>{money(market.volume)}</strong>
            </div>
            <div>
              <span className="label">Signal</span>
              <strong>{algorithm.signal}</strong>
            </div>
            {linkedGame ? (
              <div>
                <span className="label">Game</span>
                <strong>
                  {linkedGame.league}
                  {linkedGame.status === "live" ? ` · ${getLiveGameClock(linkedGame)}` : ""}
                </strong>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="detail-grid market-detail-grid">
        <div className="detail-stack detail-stack--main">
          <div className="detail-panel detail-panel--chart">
            <MarketPriceChart market={market} linkedGame={linkedGame} />
          </div>

          <details className="detail-disclosure" open>
            <summary>About this market</summary>
            <div className="detail-disclosure-body">
              <p className="market-detail-desc">{market.description}</p>
              <div className="info-list info-list--tight">
                <InfoRow label="Market status" value={market.status ?? "active"} />
                <InfoRow label="Close time" value={market.closeTime ?? "—"} />
                <InfoRow label="Settlement" value={market.settlementTime ?? "After official resolution"} />
              </div>
            </div>
          </details>

          <details className="detail-disclosure" open>
            <summary>Rules &amp; resolution</summary>
            <div className="detail-disclosure-body">
              <p className="resolution-rule-text">{market.resolutionRule ?? market.resolutionTemplate ?? resolutionTemplate.template}</p>
              <p className="subsection-label">Checklist</p>
              <ul className="resolution-checklist">
                {checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </details>

          <details className="detail-disclosure">
            <summary>Outcome sources</summary>
            <div className="detail-disclosure-body">
              <div className="source-list source-card-list">
                {evidenceLinks.length ? (
                  evidenceLinks.map((source) =>
                    source.url ? (
                      <div className="source-card" key={`${source.label}-${source.url}`}>
                        <div>
                          <strong>{source.label}</strong>
                          <span>{source.sourceType ?? "source"}</span>
                        </div>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </div>
                    ) : (
                      <p key={source.label} className="empty-note">
                        Planned: {source.label}
                      </p>
                    ),
                  )
                ) : (
                  <p className="empty-note">No sources configured.</p>
                )}
              </div>
            </div>
          </details>

          <details className="detail-disclosure">
            <summary>Model &amp; feeds</summary>
            <div className="detail-disclosure-body">
              <p className="model-lede">{market.algorithm?.model ?? algorithm.model}</p>
              <div className="signal-chip-row">
                <span className="signal-chip">Confidence {formatPercent(algorithm.confidence)}</span>
                <span className="signal-chip">Movement {algorithm.movementScore}/100</span>
                <span className="signal-chip">Liquidity {algorithm.liquidityScore}/100</span>
              </div>
              <p className="caption model-hint">{algorithm.recommendation}</p>
              <p className="caption">Refresh: {market.algorithm?.refreshCadence ?? "Daily baseline"}</p>
            </div>
          </details>

          {!linkedGame ? (
            <details className="detail-disclosure">
              <summary>Feed updates</summary>
              <div className="detail-disclosure-body">
                <ul className="feed-update-list">
                  {updateLog.map((update, index) => (
                    <li key={`${market.id}-update-${index}`}>
                      <span className="feed-update-index">{index === 0 ? "Latest" : `#${index + 1}`}</span>
                      <span>{update}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ) : null}

          <details className="detail-disclosure">
            <summary>Recent activity</summary>
            <div className="detail-disclosure-body">
              <div className="activity-list">
                {market.recentActivity.length ? (
                  market.recentActivity.map((item, index) => (
                    <div className="activity-item" key={`${item.user}-${item.action}-${index}`}>
                      <div>
                        <strong>{item.user}</strong>
                        <div className="caption">
                          {item.action}
                          {item.amount ? <> · {money(item.amount)}</> : null}
                        </div>
                      </div>
                      <div className="caption">{item.time}</div>
                    </div>
                  ))
                ) : (
                  <div className="empty-note">No recent activity yet.</div>
                )}
              </div>
            </div>
          </details>
        </div>

        <aside className="detail-stack detail-stack--aside">
          <BettingPanel market={market} linkedGame={linkedGame} />
          <div className="detail-panel detail-panel--compact">
            <h3 className="aside-panel-title">Friend multiplier</h3>
            <p className="caption aside-panel-copy">
              Boosts apply to normal payout; extra lands in bonus balance. Max {state.adminConfig.maxMultiplier.toFixed(2)}x.
            </p>
            <div className="multiplier-box multiplier-box--compact">
              <div className="label">Current</div>
              <div className="multiplier-value">{mult.toFixed(2)}x</div>
              <div className="caption">{market.friendsBoosting} friends boosting</div>
            </div>
            {market.friendGroup.length ? (
              <ul className="friend-boost-list">
                {market.friendGroup.map((friend) => (
                  <li key={friend}>{friend}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-note empty-note--sm">No boost group yet.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
