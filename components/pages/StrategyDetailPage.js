"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CopyTradeList from "../CopyTradeList";
import { useAgora } from "../../context/AgoraContext";
import { money } from "../../lib/formatters";
import { SectionHead } from "../ui";

function draftFromSubscription(subscription) {
  return {
    allocationPct: subscription?.allocationPct ?? 10,
    maxTradeSize: subscription?.maxTradeSize ?? "",
    maxDailyLoss: subscription?.maxDailyLoss ?? "",
    maxOpenPositions: subscription?.maxOpenPositions ?? "",
    allowedMarketIds: subscription?.allowedMarketIds || [],
    autoCopyEnabled: subscription?.autoCopyEnabled ?? true,
    status: subscription?.status === "PAUSED" ? "PAUSED" : "ACTIVE",
  };
}

export default function StrategyDetailPage({ profileId }) {
  const { state, actions } = useAgora();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [draft, setDraft] = useState(draftFromSubscription(null));
  const [copyTrades, setCopyTrades] = useState([]);
  const [copyTradesLoading, setCopyTradesLoading] = useState(false);
  const activeMarkets = useMemo(
    () => actions.getMergedMarkets().filter((market) => market.status === "ACTIVE").slice(0, 40),
    [actions, state.markets, state.liveGames],
  );

  async function load() {
    setLoading(true);
    const payload = await actions.getStrategyMarketplaceProfile(profileId);
    if (payload.ok) {
      setProfile(payload.profile);
      setDraft(draftFromSubscription(payload.profile.subscription));
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [profileId]);

  useEffect(() => {
    let active = true;
    async function loadCopyTrades() {
      if (!profile?.subscription || profile.subscription.status === "CANCELED") {
        setCopyTrades([]);
        return;
      }
      setCopyTradesLoading(true);
      const payload = await actions.getStrategyCopyTrades(profileId);
      if (active) {
        setCopyTrades(payload.ok ? payload.copyTrades || [] : []);
        setCopyTradesLoading(false);
      }
    }
    if (profile) loadCopyTrades();
    return () => {
      active = false;
    };
  }, [profileId, profile?.subscription?.id, profile?.subscription?.status, actions]);

  const subscribed = Boolean(profile?.subscription && profile.subscription.status !== "CANCELED");
  const paperBalance = state.currentUser.paper_balance ?? 0;
  const allocated = useMemo(() => money(paperBalance * (Number(draft.allocationPct) || 0) / 100), [paperBalance, draft.allocationPct]);

  async function saveSubscription(event) {
    event.preventDefault();
    if (pending) return;
    setPending("save");
    try {
      const result = subscribed
        ? await actions.updateStrategySubscription(profile.id, draft)
        : await actions.subscribeToStrategy(profile.id, draft);
      if (result.ok) {
        await load();
        const copyPayload = await actions.getStrategyCopyTrades(profile.id);
        if (copyPayload.ok) setCopyTrades(copyPayload.copyTrades || []);
      }
    } finally {
      setPending("");
    }
  }

  async function cancel() {
    if (!profile || pending) return;
    setPending("cancel");
    try {
      const result = await actions.unsubscribeFromStrategy(profile.id);
      if (result.ok) await load();
    } finally {
      setPending("");
    }
  }

  if (loading) return <section className="page active"><div className="list-card">Loading strategy...</div></section>;
  if (!profile) return <section className="page active"><div className="list-card">Strategy not found.</div></section>;

  return (
    <section className="page active strategy-detail-page">
      <SectionHead
        title={profile.name}
        body="Paper copy trading gives you execution access without exposing private strategy logic."
      />
      <div className="strategy-detail-layout">
        <div className="strategy-detail-main">
          <div className="list-card">
            <div className="strategy-card-head">
              <span className="paper-mode-pill">PAPER</span>
              <span className="strategy-price">{profile.priceCents ? `${money(profile.priceCents / 100)}/mo` : "Free paper beta"}</span>
            </div>
            <p className="strategy-description">{profile.description}</p>
            <div className="strategy-stat-grid strategy-stat-grid--wide">
              <Stat label="ROI" value={`${profile.roiPct}%`} />
              <Stat label="Win rate" value={`${profile.winRatePct}%`} />
              <Stat label="Drawdown" value={`${profile.maxDrawdownPct}%`} />
              <Stat label="Copied volume" value={money(profile.copiedVolume ?? 0)} />
            </div>
            <div className="strategy-meta-list">
              <span>Creator: {profile.creator?.username || profile.creator?.name || "Unknown"}</span>
              <span>Risk: {profile.riskLevel}</span>
              <span>Markets: {(profile.marketsSupported || []).join(", ") || "All active markets"}</span>
            </div>
          </div>
        </div>

        <form className="list-card strategy-subscribe-panel" onSubmit={saveSubscription}>
          <h3>{subscribed ? "Paper copy settings" : "Subscribe in paper mode"}</h3>
          <p className="caption">Real-money copying is disabled for the MVP. Your copied trades use paper balance only.</p>
          <label className="field">
            <span className="label">Allocation percentage</span>
            <input type="number" min="1" max="100" value={draft.allocationPct} onChange={(e) => setDraft((d) => ({ ...d, allocationPct: e.currentTarget.value }))} />
            <small className="caption">Current paper allocation: {allocated}</small>
          </label>
          <label className="field">
            <span className="label">Max trade size</span>
            <input type="number" min="0" step="0.01" value={draft.maxTradeSize} placeholder="No cap" onChange={(e) => setDraft((d) => ({ ...d, maxTradeSize: e.currentTarget.value }))} />
          </label>
          <label className="field">
            <span className="label">Max daily loss</span>
            <input type="number" min="0" step="0.01" value={draft.maxDailyLoss} placeholder="No cap" onChange={(e) => setDraft((d) => ({ ...d, maxDailyLoss: e.currentTarget.value }))} />
          </label>
          <label className="field">
            <span className="label">Max open copied positions</span>
            <input type="number" min="0" step="1" value={draft.maxOpenPositions} placeholder="No cap" onChange={(e) => setDraft((d) => ({ ...d, maxOpenPositions: e.currentTarget.value }))} />
          </label>
          <fieldset className="field strategy-market-filter">
            <legend className="label">Allowed markets (optional)</legend>
            <p className="caption">Leave empty to copy all markets. Select specific markets to restrict copies.</p>
            <div className="strategy-market-checkboxes">
              {activeMarkets.map((market) => {
                const checked = draft.allowedMarketIds.includes(market.id);
                return (
                  <label className="strategy-market-checkbox" key={market.id}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setDraft((d) => {
                          const next = new Set(d.allowedMarketIds || []);
                          if (e.currentTarget.checked) next.add(market.id);
                          else next.delete(market.id);
                          return { ...d, allowedMarketIds: [...next] };
                        });
                      }}
                    />
                    <span>{market.title}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <label className="toggle strategy-toggle">
            <input type="checkbox" checked={draft.autoCopyEnabled && draft.status !== "PAUSED"} onChange={(e) => setDraft((d) => ({ ...d, autoCopyEnabled: e.currentTarget.checked, status: e.currentTarget.checked ? "ACTIVE" : "PAUSED" }))} />
            <span>{draft.autoCopyEnabled && draft.status !== "PAUSED" ? "Auto-copy enabled" : "Auto-copy paused"}</span>
          </label>
          <button className="btn btn-primary" type="submit" disabled={!!pending || !state.auth.authenticated}>
            {pending === "save" ? "Saving..." : subscribed ? "Save settings" : "Subscribe with paper"}
          </button>
          {!state.auth.authenticated ? <Link className="btn btn-ghost" href="/login">Log in to subscribe</Link> : null}
          {subscribed ? (
            <button className="btn btn-ghost" type="button" disabled={!!pending} onClick={cancel}>
              {pending === "cancel" ? "Canceling..." : "Cancel subscription"}
            </button>
          ) : null}
        </form>

        {subscribed ? <CopyTradeList trades={copyTrades} loading={copyTradesLoading} /> : null}
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="strategy-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
