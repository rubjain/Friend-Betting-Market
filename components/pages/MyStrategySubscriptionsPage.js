"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAgora } from "../../context/AgoraContext";
import { money } from "../../lib/formatters";

export default function MyStrategySubscriptionsPage() {
  const { state, actions } = useAgora();
  const [subscriptions, setSubscriptions] = useState([]);
  const [billingByProfile, setBillingByProfile] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const payload = await actions.listMyStrategySubscriptions();
      if (active) {
        const next = payload.ok ? payload.subscriptions || [] : [];
        setSubscriptions(next);
        const billingEntries = await Promise.all(
          next.map(async ({ profile }) => {
            const billing = await actions.getStrategyBilling(profile.id);
            return [profile.id, billing.ok ? billing : { invoices: [], hasEntitlement: false }];
          }),
        );
        if (!active) return;
        setBillingByProfile(Object.fromEntries(billingEntries));
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [actions]);

  const activeCount = useMemo(
    () => subscriptions.filter(({ subscription }) => subscription.status === "ACTIVE").length,
    [subscriptions],
  );

  const autoCopyCount = useMemo(
    () => subscriptions.filter(({ subscription }) => subscription.autoCopyEnabled && subscription.status === "ACTIVE").length,
    [subscriptions],
  );

  const entitledCount = useMemo(
    () => subscriptions.filter(({ profile }) => billingByProfile[profile.id]?.hasEntitlement).length,
    [subscriptions, billingByProfile],
  );

  return (
    <section className="page active strategy-subscriptions-page">
      <div className="strategy-subscriptions-hero">
        <div className="strategy-subscriptions-copy">
          <span className="eyebrow">Copy trading</span>
          <h2>My Strategy Subscriptions</h2>
          <p>Paper strategies you follow. Review allocation, copy status, and entitlement without exposing private bot logic.</p>
        </div>
        <div className="strategy-subscriptions-actions">
          <Link className="btn btn-secondary" href="/strategies">Browse marketplace</Link>
          <Link className="btn btn-ghost" href="/strategies/creator">Creator dashboard</Link>
        </div>
      </div>

      <div className="strategy-subscriptions-summary">
        <div className="strategy-subscriptions-stat">
          <span>Following</span>
          <strong>{loading ? "--" : subscriptions.length}</strong>
        </div>
        <div className="strategy-subscriptions-stat">
          <span>Active</span>
          <strong>{loading ? "--" : activeCount}</strong>
        </div>
        <div className="strategy-subscriptions-stat">
          <span>Auto-copy on</span>
          <strong>{loading ? "--" : autoCopyCount}</strong>
        </div>
        <div className="strategy-subscriptions-stat">
          <span>Entitled</span>
          <strong>{loading ? "--" : entitledCount}</strong>
        </div>
      </div>

      {loading ? (
        <div className="strategy-subscriptions-empty list-card">Loading subscriptions...</div>
      ) : subscriptions.length ? (
        <div className="strategy-subscriptions-grid">
          {subscriptions.map(({ profile, subscription }) => (
            <Link className="strategy-subscription-card" href={`/strategies/${profile.id}`} key={subscription.id}>
              <div className="strategy-subscription-card-head">
                <div>
                  <span className="paper-mode-pill">PAPER</span>
                  <h3>{profile.name}</h3>
                </div>
                <span className={`strategy-subscription-status strategy-subscription-status--${subscription.status === "ACTIVE" ? "active" : "paused"}`}>
                  {subscription.status}
                </span>
              </div>
              <p>{profile.description?.slice(0, 120) || "Paper copy trading subscription."}</p>
              <div className="strategy-subscription-stats">
                <div className="strategy-stat"><span>Allocation</span><strong>{subscription.allocationPct}%</strong></div>
                <div className="strategy-stat"><span>ROI</span><strong>{profile.roiPct}%</strong></div>
                <div className="strategy-stat"><span>Auto-copy</span><strong>{subscription.autoCopyEnabled && subscription.status === "ACTIVE" ? "On" : "Paused"}</strong></div>
                <div className="strategy-stat"><span>Entitlement</span><strong>{billingByProfile[profile.id]?.hasEntitlement ? "Active" : "Inactive"}</strong></div>
              </div>
              <div className="strategy-subscription-card-foot">
                <span>Paper balance: {money(state.currentUser.paper_balance ?? 0)}</span>
                <span>Open settings</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="strategy-subscriptions-empty list-card empty-note">
          <div>
            <h3>No strategy subscriptions yet</h3>
            <p>Follow a paper strategy from the marketplace to track allocation, auto-copy status, and entitlement here.</p>
          </div>
          <Link className="btn btn-secondary" href="/strategies">Browse marketplace</Link>
        </div>
      )}
    </section>
  );
}
