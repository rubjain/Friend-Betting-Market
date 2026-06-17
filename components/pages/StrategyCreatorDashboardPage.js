"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAgora } from "../../context/AgoraContext";
import { money } from "../../lib/formatters";
import { SectionHead } from "../ui";

const STATUS_LABELS = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under review",
  REJECTED: "Rejected",
  PUBLISHED: "Live",
  PAUSED: "Paused",
  ARCHIVED: "Archived",
};

function statusLabel(status) {
  return STATUS_LABELS[String(status || "").toUpperCase()] || status || "Unknown";
}

function statusTone(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PUBLISHED") return "good";
  if (normalized === "UNDER_REVIEW") return "warn";
  if (normalized === "REJECTED") return "danger";
  return "";
}

function emptyDraft() {
  return {
    strategyId: "",
    name: "",
    description: "",
    marketsSupported: "Sports",
    riskLevel: "Medium",
    priceCents: 0,
  };
}

export default function StrategyCreatorDashboardPage() {
  const { state, actions } = useAgora();
  const [strategies, setStrategies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [revenueCents, setRevenueCents] = useState(0);
  const [pending, setPending] = useState("");
  const [flash, setFlash] = useState("");
  const [loading, setLoading] = useState(true);
  const [revenueSummary, setRevenueSummary] = useState({ grossCents: 0, feeCents: 0, netCents: 0 });
  const [draft, setDraft] = useState(emptyDraft);
  const [expandedProfileId, setExpandedProfileId] = useState("");
  const [analyticsByProfile, setAnalyticsByProfile] = useState({});

  const load = useCallback(async () => {
    if (!state.auth.authenticated) {
      setStrategies([]);
      setProfiles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [strategyPayload, creatorPayload, revenuePayload] = await Promise.all([
      actions.listCreatorPrivateStrategies(),
      actions.listCreatorMarketplaceProfiles(),
      actions.getCreatorRevenueSummary(),
    ]);

    setStrategies(strategyPayload.ok ? strategyPayload.strategies || [] : []);
    setProfiles(creatorPayload.ok ? creatorPayload.profiles || [] : []);
    setRevenueCents(creatorPayload.revenueCents || 0);
    if (revenuePayload.ok) setRevenueSummary(revenuePayload);
    setLoading(false);
  }, [actions, state.auth.authenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const publishableStrategies = useMemo(
    () => strategies.filter((strategy) => strategy.mode === "PAPER"),
    [strategies],
  );

  const unpublishedStrategies = useMemo(
    () => publishableStrategies.filter((strategy) => !strategy.marketplaceProfile),
    [publishableStrategies],
  );

  const publishedProfileCount = useMemo(
    () => profiles.filter((profile) => String(profile.status || "").toUpperCase() === "PUBLISHED").length,
    [profiles],
  );

  const activeSubscriberCount = useMemo(
    () => profiles.reduce((total, profile) => total + Number(profile.activeSubscriberCount || 0), 0),
    [profiles],
  );

  async function publish(event) {
    event.preventDefault();
    if (pending || !draft.strategyId) return;
    setPending("publish");
    setFlash("");
    try {
      const payload = await actions.publishCreatorMarketplaceProfile({
        ...draft,
        priceCents: Number(draft.priceCents) || 0,
        marketsSupported: draft.marketsSupported.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setFlash(
        payload.ok
          ? "Strategy submitted for marketplace review. You can keep trading it privately on the Developer page."
          : payload.message || "Could not publish strategy.",
      );
      if (payload.ok) {
        setDraft(emptyDraft());
        await load();
      }
    } finally {
      setPending("");
    }
  }

  async function setProfileStatus(profileId, status) {
    setPending(`${profileId}-${status}`);
    setFlash("");
    try {
      const profile = profiles.find((item) => item.id === profileId);
      const payload = await actions.updateCreatorMarketplaceProfile(profileId, { ...profile, status });
      setFlash(payload.ok ? `Listing ${statusLabel(status).toLowerCase()}.` : payload.message || "Could not update profile.");
      await load();
    } finally {
      setPending("");
    }
  }

  async function resubmitProfile(profile) {
    if (pending || !profile?.strategyId) return;
    setPending(`resubmit-${profile.id}`);
    setFlash("");
    try {
      const payload = await actions.publishCreatorMarketplaceProfile({
        strategyId: profile.strategyId,
        name: profile.name,
        description: profile.description,
        marketsSupported: profile.marketsSupported || [],
        riskLevel: profile.riskLevel,
        priceCents: profile.priceCents ?? 0,
      });
      setFlash(payload.ok ? "Listing resubmitted for review." : payload.message || "Could not resubmit listing.");
      await load();
    } finally {
      setPending("");
    }
  }

  async function toggleAnalytics(profileId) {
    if (expandedProfileId === profileId) {
      setExpandedProfileId("");
      return;
    }
    setExpandedProfileId(profileId);
    if (analyticsByProfile[profileId]) return;
    const payload = await actions.getCreatorProfileAnalytics(profileId);
    setAnalyticsByProfile((current) => ({
      ...current,
      [profileId]: payload.ok ? payload : { ok: false, message: payload.message || "Could not load analytics." },
    }));
  }

  async function runStrategy(strategyId) {
    setPending(`run-${strategyId}`);
    setFlash("");
    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}/run`, { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      setFlash(payload.ok ? "Strategy run completed." : payload.message || "Run failed.");
      await load();
    } finally {
      setPending("");
    }
  }

  async function setStrategyStatus(strategyId, action) {
    setPending(`${action}-${strategyId}`);
    setFlash("");
    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}/${action}`, { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      setFlash(payload.ok ? `Strategy ${action === "activate" ? "activated" : "paused"}.` : payload.message || "Could not update strategy.");
      await load();
    } finally {
      setPending("");
    }
  }

  if (!state.auth.authenticated) {
    return (
      <section className="page active strategy-creator-page">
        <SectionHead
          title="Creator Dashboard"
          body="Sign in to manage private paper strategies and publish them to the marketplace."
        />
        <div className="list-card empty-note">
          <Link href="/login">Log in</Link> to access your private strategies and creator tools, or visit the{" "}
          <Link href="/developer">Developer page</Link> to create a paper strategy first.
        </div>
      </section>
    );
  }

  return (
    <section className="page active strategy-creator-page">
      <div className="creator-dashboard-hero">
        <div className="creator-dashboard-copy">
          <span className="eyebrow">Creator workspace</span>
          <h2>Creator Dashboard</h2>
          <p>
            Manage private paper strategies, publish clean marketplace listings, and monitor subscriber copying from one place.
          </p>
        </div>
        <div className="creator-hero-actions" aria-label="Creator navigation">
          <Link className="btn btn-secondary" href="/developer">Developer</Link>
          <Link className="btn btn-ghost" href="/strategies">Marketplace</Link>
          <Link className="btn btn-ghost" href="/strategies/subscriptions">Subscriptions</Link>
        </div>
      </div>

      <div className="creator-summary-grid">
        <div className="creator-summary-card">
          <span>Private strategies</span>
          <strong>{loading ? "--" : publishableStrategies.length}</strong>
        </div>
        <div className="creator-summary-card">
          <span>Live listings</span>
          <strong>{loading ? "--" : publishedProfileCount}</strong>
        </div>
        <div className="creator-summary-card">
          <span>Active subscribers</span>
          <strong>{loading ? "--" : activeSubscriberCount}</strong>
        </div>
        <div className="creator-summary-card">
          <span>Estimated MRR</span>
          <strong>{loading ? "--" : money(revenueCents / 100)}</strong>
        </div>
      </div>

      {flash ? <div className="creator-local-alert" role="status">{flash}</div> : null}

      <div className="creator-dashboard-grid">
        <div className="creator-dashboard-main">
          <div className="creator-section-card">
            <div className="creator-section-head">
              <div>
                <h3>My private strategies</h3>
                <p className="caption">These are yours only. Config, prompts, and API keys never appear in the marketplace.</p>
              </div>
              <Link className="btn btn-secondary" href="/developer">Create strategy</Link>
            </div>
            <div className="creator-list">
              {loading ? (
                <div className="empty-note">Loading strategies...</div>
              ) : publishableStrategies.length ? (
                publishableStrategies.map((strategy) => (
                  <div className="creator-strategy-row" key={strategy.id}>
                    <div className="creator-row-copy">
                      <strong>{strategy.name}</strong>
                      <div className="creator-row-meta">
                        <span>{strategy.mode}</span>
                        <span>{strategy.type}</span>
                        <span>{strategy.status}</span>
                        <span>{strategy.marketplaceProfile ? `Listing: ${statusLabel(strategy.marketplaceProfile.status)}` : "Not published"}</span>
                      </div>
                      <div className="caption">Strategy ID: <code>{strategy.id}</code></div>
                    </div>
                    <div className="creator-row-actions">
                      <button
                        className="btn btn-secondary"
                        type="button"
                        disabled={!!pending || String(strategy.status || "").toUpperCase() !== "ACTIVE"}
                        onClick={() => runStrategy(strategy.id)}
                      >
                        {pending === `run-${strategy.id}` ? "Running..." : "Run"}
                      </button>
                      {String(strategy.status || "").toUpperCase() !== "ACTIVE" ? (
                        <button className="btn btn-ghost" type="button" disabled={!!pending} onClick={() => setStrategyStatus(strategy.id, "activate")}>
                          {pending === `activate-${strategy.id}` ? "Activating..." : "Activate"}
                        </button>
                      ) : (
                        <button className="btn btn-ghost" type="button" disabled={!!pending} onClick={() => setStrategyStatus(strategy.id, "pause")}>
                          {pending === `pause-${strategy.id}` ? "Pausing..." : "Pause"}
                        </button>
                      )}
                      {!strategy.marketplaceProfile ? (
                        <button
                          className="btn btn-ghost"
                          type="button"
                          disabled={!!pending}
                          onClick={() => {
                            setDraft((current) => ({
                              ...current,
                              strategyId: strategy.id,
                              name: current.name || strategy.name,
                            }));
                          }}
                        >
                          Publish
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-note">
                  No private paper strategies yet. Create one on the <Link href="/developer">Developer page</Link>.
                </div>
              )}
            </div>
          </div>

          <div className="creator-section-card">
            <div className="creator-section-head">
              <div>
                <h3>Marketplace profiles</h3>
                <p className="caption">
                  Billed this month: {money((revenueSummary.grossCents || 0) / 100)} | Platform fees: {money((revenueSummary.feeCents || 0) / 100)} | Net: {money((revenueSummary.netCents || 0) / 100)}
                </p>
              </div>
              <span className="pill">Estimated MRR {money(revenueCents / 100)}</span>
            </div>
            <div className="creator-list">
              {loading ? (
                <div className="empty-note">Loading profiles...</div>
              ) : profiles.length ? (
                profiles.map((profile) => {
                  const analytics = analyticsByProfile[profile.id];
                  const expanded = expandedProfileId === profile.id;
                  return (
                    <div className="creator-profile-block" key={profile.id}>
                      <div className="creator-profile-row">
                        <div className="creator-row-copy">
                          <strong>{profile.name}</strong>
                          <div className="creator-row-meta">
                            <span className={`creator-status creator-status--${statusTone(profile.status)}`}>
                              {statusLabel(profile.status)}
                            </span>
                            <span>{profile.activeSubscriberCount || 0} subscribers</span>
                            <span>ROI {profile.roiPct ?? 0}%</span>
                            <span>Win {profile.winRatePct ?? 0}%</span>
                            <span>{money(profile.copiedVolume || 0)} copied</span>
                          </div>
                          {profile.strategy ? (
                            <div className="caption">Private strategy: {profile.strategy.name} ({profile.strategy.status})</div>
                          ) : null}
                        </div>
                        <div className="creator-row-actions">
                          {profile.status === "PUBLISHED" ? (
                            <>
                              <Link className="btn btn-secondary" href={`/strategies/${profile.id}`}>View listing</Link>
                              <button className="btn btn-ghost" type="button" disabled={!!pending} onClick={() => setProfileStatus(profile.id, "PAUSED")}>
                                Pause
                              </button>
                            </>
                          ) : null}
                          {profile.status === "PAUSED" ? (
                            <button className="btn btn-secondary" type="button" disabled={!!pending} onClick={() => setProfileStatus(profile.id, "PUBLISHED")}>
                              Resume
                            </button>
                          ) : null}
                          {profile.status === "REJECTED" ? (
                            <button className="btn btn-secondary" type="button" disabled={!!pending} onClick={() => resubmitProfile(profile)}>
                              {pending === `resubmit-${profile.id}` ? "Resubmitting..." : "Resubmit"}
                            </button>
                          ) : null}
                          {profile.status === "UNDER_REVIEW" ? (
                            <span className="caption">Awaiting admin review</span>
                          ) : null}
                          <button className="btn btn-ghost" type="button" disabled={!!pending} onClick={() => toggleAnalytics(profile.id)}>
                            {expanded ? "Hide analytics" : "Analytics"}
                          </button>
                          {profile.status !== "ARCHIVED" ? (
                            <button className="btn btn-ghost" type="button" disabled={!!pending} onClick={() => setProfileStatus(profile.id, "ARCHIVED")}>
                              Archive
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {expanded ? (
                        <CreatorProfileAnalytics analytics={analytics} />
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="empty-note">No marketplace profiles yet. Publish a private strategy using the form.</div>
              )}
            </div>
          </div>
        </div>

        <form className="creator-publish-panel" onSubmit={publish}>
          <div className="creator-section-head creator-section-head--stacked">
            <div>
              <h3>Publish listing</h3>
              <p className="caption">
                Choose a paper strategy and submit the public listing for review.
              </p>
            </div>
          </div>
          <label className="field creator-form-field">
            <span className="label">Private strategy</span>
            <select
              value={draft.strategyId}
              onChange={(e) => {
                const strategy = publishableStrategies.find((item) => item.id === e.currentTarget.value);
                setDraft((current) => ({
                  ...current,
                  strategyId: e.currentTarget.value,
                  name: current.name || strategy?.name || "",
                }));
              }}
            >
              <option value="">Choose a paper strategy</option>
              {unpublishedStrategies.map((strategy) => (
                <option value={strategy.id} key={strategy.id}>
                  {strategy.name} ({strategy.status})
                </option>
              ))}
            </select>
            {!unpublishedStrategies.length ? (
              <small className="creator-field-help">All paper strategies already have listings, or none exist yet.</small>
            ) : null}
          </label>
          <label className="field creator-form-field">
            <span className="label">Public name</span>
            <input value={draft.name} onChange={(e) => setDraft((current) => ({ ...current, name: e.currentTarget.value }))} />
          </label>
          <label className="field creator-form-field">
            <span className="label">Description</span>
            <textarea rows="4" value={draft.description} onChange={(e) => setDraft((current) => ({ ...current, description: e.currentTarget.value }))} />
          </label>
          <label className="field creator-form-field">
            <span className="label">Markets supported</span>
            <input value={draft.marketsSupported} onChange={(e) => setDraft((current) => ({ ...current, marketsSupported: e.currentTarget.value }))} placeholder="NBA, NFL, Tennis" />
          </label>
          <div className="creator-form-row">
            <label className="field creator-form-field">
              <span className="label">Risk</span>
              <select value={draft.riskLevel} onChange={(e) => setDraft((current) => ({ ...current, riskLevel: e.currentTarget.value }))}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <label className="field creator-form-field">
              <span className="label">Monthly price (cents)</span>
              <input type="number" min="0" value={draft.priceCents} onChange={(e) => setDraft((current) => ({ ...current, priceCents: e.currentTarget.value }))} />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={!!pending || !draft.strategyId || !draft.description.trim()}>
            {pending === "publish" ? "Submitting..." : "Submit for review"}
          </button>
        </form>
      </div>
    </section>
  );
}

function CreatorProfileAnalytics({ analytics }) {
  if (!analytics) return <div className="creator-analytics-panel caption">Loading analytics...</div>;
  if (!analytics.ok) return <div className="creator-analytics-panel note-banner">{analytics.message || "Could not load analytics."}</div>;

  const recentDays = (analytics.copiesByDay || []).slice(-7);
  const skipReasons = Object.entries(analytics.skipReasons || {});

  return (
    <div className="creator-analytics-panel">
      <div className="strategy-stat-grid strategy-stat-grid--wide">
        <div className="strategy-stat"><span>Est. MRR</span><strong>{money((analytics.estimatedRevenueCents || 0) / 100)}</strong></div>
        <div className="strategy-stat"><span>Gross (month)</span><strong>{money((analytics.payoutSummary?.grossCents || 0) / 100)}</strong></div>
        <div className="strategy-stat"><span>Net (month)</span><strong>{money((analytics.payoutSummary?.netCents || 0) / 100)}</strong></div>
      </div>
      {recentDays.length ? (
        <div className="creator-analytics-days">
          <strong>Copy activity (last 7 days)</strong>
          <div className="bet-list">
            {recentDays.map((day) => (
              <div className="bet-row" key={day.date}>
                <div className="bet-row-left">
                  <strong>{day.date}</strong>
                  <div className="caption">{day.copied} copied / {day.skipped} skipped / {day.failed} failed / {money(day.volume || 0)} volume</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="caption">No copy activity recorded yet.</div>
      )}
      {skipReasons.length ? (
        <div className="creator-analytics-skips">
          <strong>Skip reasons</strong>
          <div className="caption">
            {skipReasons.map(([reason, count]) => `${reason}: ${count}`).join(" | ")}
          </div>
        </div>
      ) : null}
    </div>
  );
}
