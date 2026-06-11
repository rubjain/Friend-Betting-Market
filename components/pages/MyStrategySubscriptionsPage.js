"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAgora } from "../../context/AgoraContext";
import { money } from "../../lib/formatters";
import { SectionHead } from "../ui";

export default function MyStrategySubscriptionsPage() {
  const { state, actions } = useAgora();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const payload = await actions.listMyStrategySubscriptions();
      if (active) {
        setSubscriptions(payload.ok ? payload.subscriptions || [] : []);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [actions]);

  return (
    <section className="page active strategy-subscriptions-page">
      <SectionHead
        title="My Strategy Subscriptions"
        body="Paper strategies you follow. Pause or adjust allocation without seeing private bot logic."
      />
      <div className="strategy-marketplace-toolbar">
        <Link className="btn btn-secondary" href="/strategies">Browse marketplace</Link>
      </div>

      {loading ? (
        <div className="list-card">Loading subscriptions...</div>
      ) : subscriptions.length ? (
        <div className="strategy-card-grid">
          {subscriptions.map(({ profile, subscription }) => (
            <Link className="strategy-card" href={`/strategies/${profile.id}`} key={subscription.id}>
              <div className="strategy-card-head">
                <span className="paper-mode-pill">PAPER</span>
                <span className="strategy-price">{subscription.status}</span>
              </div>
              <h3>{profile.name}</h3>
              <p>{profile.description?.slice(0, 120) || "Paper copy trading subscription."}</p>
              <div className="strategy-stat-grid">
                <div className="strategy-stat"><span>Allocation</span><strong>{subscription.allocationPct}%</strong></div>
                <div className="strategy-stat"><span>ROI</span><strong>{profile.roiPct}%</strong></div>
                <div className="strategy-stat"><span>Auto-copy</span><strong>{subscription.autoCopyEnabled && subscription.status === "ACTIVE" ? "On" : "Paused"}</strong></div>
              </div>
              <div className="strategy-card-foot">
                <span>Paper balance: {money(state.currentUser.paper_balance ?? 0)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="list-card empty-note">
          You are not following any paper strategies yet. <Link href="/strategies">Browse the marketplace</Link>.
        </div>
      )}
    </section>
  );
}
