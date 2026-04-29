"use client";

import Link from "next/link";
import { useEffect } from "react";
import BettingPanel from "../BettingPanel";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { formatPercent, money } from "../../lib/formatters";
import { getLinkedLiveGame, getLiveGameClock, getMarketAlgorithmSnapshot } from "../../lib/marketAlgorithms";
import { getMultiplier } from "../../lib/marketMath";
import { getResolutionTemplate } from "../../lib/marketTaxonomy";
import { EmptyState, InfoRow } from "../ui";

export default function MarketDetailPage({ marketId }) {
  const { state, actions, selectors } = useFriendMarket();
  const market = selectors.getSelectedMarket(marketId);

  useEffect(() => {
    if (market?.id) {
      actions.setSelectedMarket(market.id);
    }
  }, [actions, market?.id]);

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
  const linkedGame = getLinkedLiveGame(market, state.liveGames);
  const algorithm = getMarketAlgorithmSnapshot(market, state.liveGames);

  return (
    <section className="page active">
      <div className="section-head">
        <div>
          <h3>{market.title}</h3>
          <p>{market.category} · YES {formatPercent(market.yesPrice)} · NO {formatPercent(market.noPrice)}</p>
        </div>
        <Link className="btn btn-secondary" href="/markets">
          Back to Markets
        </Link>
      </div>
      <div className="detail-grid">
        <div className="detail-stack">
          <div className="detail-panel">
            <h3>Market information</h3>
            <p>{market.description}</p>
            <div className="quote-strip">
              <div>
                <span className="label">YES</span>
                <strong>{formatPercent(market.yesPrice)}</strong>
              </div>
              <div>
                <span className="label">NO</span>
                <strong>{formatPercent(market.noPrice)}</strong>
              </div>
              <div>
                <span className="label">Volume</span>
                <strong>{money(market.volume)}</strong>
              </div>
              <div>
                <span className="label">Closes</span>
                <strong>{market.endDate}</strong>
              </div>
            </div>
            <div className="info-list">
              <InfoRow label="Status" value={market.status ?? "active"} />
              <InfoRow label="Close time" value={market.closeTime ?? "Not configured"} />
              <InfoRow label="Settlement time" value={market.settlementTime ?? "After resolution"} />
            </div>
          </div>
          <div className="detail-panel">
            <h3>Algorithm signal</h3>
            <p>{market.algorithm?.model ?? algorithm.model}</p>
            <div className="model-meter-grid">
              <div>
                <span className="label">Confidence</span>
                <strong>{formatPercent(algorithm.confidence)}</strong>
              </div>
              <div>
                <span className="label">Movement</span>
                <strong>{algorithm.movementScore}/100</strong>
              </div>
              <div>
                <span className="label">Liquidity</span>
                <strong>{algorithm.liquidityScore}/100</strong>
              </div>
            </div>
            <div className="info-list">
              {(market.algorithm?.dataFeeds ?? ["Resolution source", "Market price", "Friend boost velocity"]).map((feed) => (
                <InfoRow key={feed} label={feed} value="Tracked" />
              ))}
              <InfoRow label="Refresh" value={market.algorithm?.refreshCadence ?? "Daily baseline"} />
              <InfoRow label="Signal" value={algorithm.recommendation} />
            </div>
          </div>
          {linkedGame ? (
            <div className="detail-panel live-detail-panel">
              <h3>Live game feed</h3>
              <p>{linkedGame.feedStatus}</p>
              <div className="game-scoreboard">
                <div>
                  <span>{linkedGame.awayTeam}</span>
                  <strong>{linkedGame.awayScore}</strong>
                </div>
                <div>
                  <span>{linkedGame.homeTeam}</span>
                  <strong>{linkedGame.homeScore}</strong>
                </div>
              </div>
              <div className="info-list">
                <InfoRow label="League" value={linkedGame.league} />
                <InfoRow label="Clock" value={getLiveGameClock(linkedGame)} />
              </div>
            </div>
          ) : null}
          <div className="detail-panel">
            <h3>Resolution criteria</h3>
            <p>{market.resolutionTemplate ?? resolutionTemplate.template}</p>
            <div className="info-list">
              {checklist.map((item) => (
                <InfoRow key={item} label={item} value="Required" />
              ))}
            </div>
            <div className="source-list">
              {evidenceLinks.length ? (
                evidenceLinks.map((source) => (
                  source.url ? (
                    <a key={`${source.label}-${source.url}`} href={source.url} target="_blank" rel="noreferrer">
                      {source.label}
                    </a>
                  ) : (
                    <span key={source.label} className="empty-note">
                      Planned source: {source.label}
                    </span>
                  )
                ))
              ) : (
                <div className="empty-note">No evidence sources configured yet.</div>
              )}
            </div>
          </div>
          <div className="detail-panel">
            <h3>Recent activity</h3>
            <div className="activity-list">
              {market.recentActivity.length ? (
                market.recentActivity.map((item, index) => (
                  <div className="activity-item" key={`${item.user}-${item.action}-${index}`}>
                    <div>
                      <strong>{item.user}</strong>
                      <div className="caption">
                        {item.action}
                        {item.amount ? <> &middot; {money(item.amount)}</> : null}
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
        </div>
        <div className="detail-stack">
          <BettingPanel market={market} />
          <div className="detail-panel">
            <h3>Friend multiplier</h3>
            <p>Boosts apply to the total normal payout, but the extra amount always lands in bonus balance.</p>
            <div className="multiplier-box">
              <div className="label">Current multiplier</div>
              <div className="multiplier-value">{getMultiplier(market, state.adminConfig).toFixed(2)}x</div>
              <div className="caption">
                {market.friendsBoosting} friends boosting this market &middot; Max{" "}
                {state.adminConfig.maxMultiplier.toFixed(2)}x
              </div>
            </div>
            <div className="info-list">
              {market.friendGroup.length ? (
                market.friendGroup.map((friend) => <InfoRow key={friend} label={friend} value="Boosting" />)
              ) : (
                <div className="empty-note">No friends are boosting this market yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
