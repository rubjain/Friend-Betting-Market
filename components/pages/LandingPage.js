"use client";

import Link from "next/link";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { money } from "../../lib/formatters";

export default function LandingPage() {
  const { state } = useFriendMarket();

  return (
    <section className="page active">
      <div className="hero">
        <div className="hero-copy card">
          <span className="eyebrow">Responsive web MVP</span>
          <h2>Prediction markets that feel simple, social, and trustworthy.</h2>
          <p>
            FriendMarket lets people create and join clear yes-or-no markets with friends, while
            keeping withdrawable funds and bonus boosts separate in the ledger.
          </p>
          <div className="button-row">
            <Link className="btn btn-primary" href="/markets">
              Browse Markets
            </Link>
            <Link className="btn btn-secondary" href="/profile">
              Sign Up
            </Link>
          </div>
        </div>
        <div className="hero-panel">
          <div>
            <div className="label">Example payout flow</div>
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-label">Normal payout</div>
                <div className="metric-value">$20</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Social boost</div>
                <div className="metric-value">$4</div>
              </div>
            </div>
          </div>
          <div className="note-banner">
            A $10 winning bet with a 1.20x multiplier returns $20 to withdrawable balance and $4 to
            bonus balance.
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Current markets</div>
          <div className="stat-value">{state.markets.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Tracked bonus liability</div>
          <div className="stat-value">{money(state.adminConfig.bonusLiability)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Mobile-ready layout</div>
          <div className="stat-value">Desktop first</div>
        </div>
      </div>

      <section>
        <div className="section-head">
          <div>
            <h3>How it works</h3>
            <p>Clear actions, minimal friction, and transparent money movement.</p>
          </div>
        </div>
        <div className="step-grid">
          <article className="step-card">
            <div className="step-number">1</div>
            <h4>Browse or create a market</h4>
            <p>Pick a simple yes-or-no market or submit your own idea for admin approval.</p>
          </article>
          <article className="step-card">
            <div className="step-number">2</div>
            <h4>Bet with clear balances</h4>
            <p>Each bet shows how much comes from withdrawable funds versus bonus funds before you confirm.</p>
          </article>
          <article className="step-card">
            <div className="step-number">3</div>
            <h4>Settle transparently</h4>
            <p>Normal winnings route by funding source, while social boosts always credit to bonus balance.</p>
          </article>
        </div>
      </section>
    </section>
  );
}
