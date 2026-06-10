"use client";

import { useEffect, useState } from "react";
import { money } from "../../lib/formatters";
import { SectionHead } from "../ui";

export default function StrategyCreatorDashboardPage() {
  const [strategies, setStrategies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [revenueCents, setRevenueCents] = useState(0);
  const [pending, setPending] = useState("");
  const [flash, setFlash] = useState("");
  const [draft, setDraft] = useState({
    strategyId: "",
    name: "",
    description: "",
    marketsSupported: "Sports",
    riskLevel: "Medium",
    priceCents: 0,
  });

  async function load() {
    const [strategyRes, creatorRes] = await Promise.all([
      fetch("/api/v1/strategies"),
      fetch("/api/strategies/creator"),
    ]);
    const strategyPayload = await strategyRes.json().catch(() => ({}));
    const creatorPayload = await creatorRes.json().catch(() => ({}));
    setStrategies(strategyPayload.ok ? strategyPayload.strategies || [] : []);
    setProfiles(creatorPayload.ok ? creatorPayload.profiles || [] : []);
    setRevenueCents(creatorPayload.revenueCents || 0);
  }

  useEffect(() => {
    load();
  }, []);

  async function publish(event) {
    event.preventDefault();
    if (pending) return;
    setPending("publish");
    setFlash("");
    try {
      const res = await fetch("/api/strategies/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          marketsSupported: draft.marketsSupported.split(",").map((item) => item.trim()).filter(Boolean),
        }),
      });
      const payload = await res.json();
      setFlash(payload.ok ? "Strategy published to marketplace." : payload.message || "Could not publish strategy.");
      if (payload.ok) await load();
    } finally {
      setPending("");
    }
  }

  async function setProfileStatus(profileId, status) {
    setPending(`${profileId}-${status}`);
    try {
      const profile = profiles.find((item) => item.id === profileId);
      const res = await fetch(`/api/strategies/creator/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, status }),
      });
      const payload = await res.json();
      setFlash(payload.ok ? `Profile ${status.toLowerCase()}.` : payload.message || "Could not update profile.");
      await load();
    } finally {
      setPending("");
    }
  }

  return (
    <section className="page active strategy-creator-page">
      <SectionHead
        title="Creator Dashboard"
        body="Publish paper strategies and track aggregate subscriber activity."
      />
      {flash ? <div className="flash-banner" role="status">{flash}</div> : null}

      <div className="strategy-detail-layout">
        <form className="list-card strategy-subscribe-panel" onSubmit={publish}>
          <h3>Publish paper strategy</h3>
          <label className="field">
            <span className="label">Private strategy</span>
            <select value={draft.strategyId} onChange={(e) => {
              const strategy = strategies.find((item) => item.id === e.currentTarget.value);
              setDraft((d) => ({ ...d, strategyId: e.currentTarget.value, name: d.name || strategy?.name || "" }));
            }}>
              <option value="">Choose a paper strategy</option>
              {strategies.filter((strategy) => strategy.mode === "PAPER").map((strategy) => (
                <option value={strategy.id} key={strategy.id}>{strategy.name} ({strategy.status})</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Public name</span>
            <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.currentTarget.value }))} />
          </label>
          <label className="field">
            <span className="label">Description</span>
            <textarea rows="4" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.currentTarget.value }))} />
          </label>
          <label className="field">
            <span className="label">Markets supported</span>
            <input value={draft.marketsSupported} onChange={(e) => setDraft((d) => ({ ...d, marketsSupported: e.currentTarget.value }))} />
          </label>
          <div className="developer-3col-row">
            <label className="field">
              <span className="label">Risk</span>
              <select value={draft.riskLevel} onChange={(e) => setDraft((d) => ({ ...d, riskLevel: e.currentTarget.value }))}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <label className="field">
              <span className="label">Display price cents</span>
              <input type="number" min="0" value={draft.priceCents} onChange={(e) => setDraft((d) => ({ ...d, priceCents: e.currentTarget.value }))} />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={!!pending || !draft.strategyId}>
            {pending === "publish" ? "Publishing..." : "Publish"}
          </button>
        </form>

        <div className="strategy-detail-main">
          <div className="list-card">
            <div className="row-between">
              <h3>Marketplace profiles</h3>
              <span className="pill">Estimated revenue: {money(revenueCents / 100)}</span>
            </div>
            <div className="bet-list">
              {profiles.length ? profiles.map((profile) => (
                <div className="bet-row" key={profile.id}>
                  <div className="bet-row-left">
                    <strong>{profile.name}</strong>
                    <div className="caption">
                      {profile.status} / {profile.activeSubscriberCount || 0} active / {money(profile.copiedVolume || 0)} copied volume
                    </div>
                  </div>
                  <div className="inline-actions">
                    {profile.status === "PUBLISHED" ? (
                      <button className="btn btn-ghost" type="button" disabled={!!pending} onClick={() => setProfileStatus(profile.id, "PAUSED")}>
                        Pause
                      </button>
                    ) : (
                      <button className="btn btn-secondary" type="button" disabled={!!pending} onClick={() => setProfileStatus(profile.id, "PUBLISHED")}>
                        Publish
                      </button>
                    )}
                    <button className="btn btn-ghost" type="button" disabled={!!pending} onClick={() => setProfileStatus(profile.id, "ARCHIVED")}>
                      Archive
                    </button>
                  </div>
                </div>
              )) : <div className="empty-note">No marketplace profiles yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
