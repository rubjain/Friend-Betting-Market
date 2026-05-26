"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionHead } from "../ui";

const defaultScopes = [
  "read:markets",
  "read:portfolio",
  "trade:paper",
  "trade:real",
  "manage:strategies",
];

export default function DeveloperPage() {
  const [keys, setKeys] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [flash, setFlash] = useState("");
  const [pending, setPending] = useState("");
  const [lastPlaintextKey, setLastPlaintextKey] = useState("");
  const [keyDraft, setKeyDraft] = useState({
    name: "Practice key",
    scopes: ["read:markets", "read:portfolio", "trade:paper", "manage:strategies"],
  });
  const [strategyDraft, setStrategyDraft] = useState({
    name: "Paper rule strategy",
    mode: "PAPER",
    type: "RULES",
    status: "ACTIVE",
    config: JSON.stringify({
      rules: [
        {
          name: "demo_rule",
          when: { marketStatus: "ACTIVE", yesPriceLt: 0.45 },
          action: { side: "YES", stake: 10 },
        },
      ],
    }, null, 2),
  });
  const [apiKeyForPlayground, setApiKeyForPlayground] = useState("");

  useEffect(() => {
    if (!apiKeyForPlayground && lastPlaintextKey) {
      setApiKeyForPlayground(lastPlaintextKey);
    }
  }, [lastPlaintextKey]); // only seed from lastPlaintextKey once

  useEffect(() => {
    refreshAll();
  }, []);

  const scopesLabel = useMemo(() => keyDraft.scopes.join(", "), [keyDraft.scopes]);

  async function refreshAll() {
    await Promise.all([loadKeys(), loadStrategies(), loadExecutions()]);
  }

  async function loadKeys() {
    const res = await fetch("/api/v1/keys");
    const payload = await res.json();
    if (payload.ok) {
      setKeys(payload.keys || []);
    }
  }

  async function loadStrategies() {
    const res = await fetch("/api/v1/strategies");
    const payload = await res.json();
    if (payload.ok) {
      setStrategies(payload.strategies || []);
    }
  }

  async function loadExecutions() {
    const res = await fetch("/api/v1/strategies/executions?limit=20");
    const payload = await res.json();
    if (payload.ok) {
      setExecutions(payload.executions || []);
    }
  }

  async function createKey(event) {
    event.preventDefault();
    if (pending) return;
    setPending("key-create");
    setFlash("");
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keyDraft),
      });
      const payload = await res.json();
      if (payload.ok) {
        setLastPlaintextKey(payload.plaintextKey || "");
        setFlash("API key created. Copy it now; it is only shown once.");
        await loadKeys();
      } else {
        setFlash(payload.message || "Could not create API key.");
      }
    } finally {
      setPending("");
    }
  }

  async function revokeKey(apiKeyId) {
    if (pending) return;
    setPending(`key-revoke-${apiKeyId}`);
    setFlash("");
    try {
      const res = await fetch("/api/v1/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKeyId }),
      });
      const payload = await res.json();
      setFlash(payload.message || (payload.ok ? "Key revoked." : "Could not revoke key."));
      await loadKeys();
    } finally {
      setPending("");
    }
  }

  async function createStrategy(event) {
    event.preventDefault();
    if (pending) return;
    setPending("strategy-create");
    setFlash("");
    try {
      let config;
      try {
        config = JSON.parse(strategyDraft.config);
      } catch {
        setFlash("Strategy config must be valid JSON.");
        return;
      }
      const res = await fetch("/api/v1/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: strategyDraft.name,
          mode: strategyDraft.mode,
          type: strategyDraft.type,
          status: strategyDraft.status,
          config,
        }),
      });
      const payload = await res.json();
      setFlash(payload.ok ? "Strategy created." : (payload.message || "Could not create strategy."));
      await loadStrategies();
    } finally {
      setPending("");
    }
  }

  async function runStrategy(strategyId) {
    if (pending) return;
    setPending(`strategy-run-${strategyId}`);
    setFlash("");
    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}/run`, { method: "POST" });
      const payload = await res.json();
      setFlash(payload.ok ? "Strategy run completed." : (payload.message || "Run failed."));
      await Promise.all([loadStrategies(), loadExecutions()]);
    } finally {
      setPending("");
    }
  }

  async function activateStrategy(strategyId) {
    if (pending) return;
    setPending(`strategy-activate-${strategyId}`);
    setFlash("");
    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}/activate`, { method: "POST" });
      const payload = await res.json();
      setFlash(payload.ok ? "Strategy activated." : (payload.message || "Activation failed."));
      await loadStrategies();
    } finally {
      setPending("");
    }
  }

  async function pauseStrategy(strategyId) {
    if (pending) return;
    setPending(`strategy-pause-${strategyId}`);
    setFlash("");
    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}/pause`, { method: "POST" });
      const payload = await res.json();
      setFlash(payload.ok ? "Strategy paused." : (payload.message || "Pause failed."));
      await loadStrategies();
    } finally {
      setPending("");
    }
  }

  async function promoteStrategy(strategyId) {
    if (pending) return;
    setPending(`strategy-promote-${strategyId}`);
    setFlash("");
    try {
      const res = await fetch(`/api/v1/strategies/${strategyId}/promote`, { method: "POST" });
      const payload = await res.json();
      setFlash(payload.ok ? "Promoted to real strategy draft." : (payload.message || "Promotion failed."));
      await loadStrategies();
    } finally {
      setPending("");
    }
  }

  return (
    <section className="page active developer-page">
      <SectionHead
        title="Developer"
        body="Create API keys, run paper strategies, and promote proven models to real Agora mode."
      />
      {flash ? (
        <div className="flash-banner" role="status" aria-live="polite">
          {flash}
        </div>
      ) : null}

      <div className="portfolio-stack">
        <div className="list-card">
          <h3>API Playground</h3>
          <p className="caption" style={{ marginTop: 0 }}>
            Copy/paste examples for paper practice. For Authorization, use your API key.
          </p>

          <div className="developer-form-grid" style={{ marginTop: 12 }}>
            <div className="field developer-full">
              <label className="label" htmlFor="playground-api-key">API key</label>
              <input
                id="playground-api-key"
                value={apiKeyForPlayground}
                onChange={(e) => setApiKeyForPlayground(e.currentTarget.value)}
                placeholder="Paste plaintextKey here (or leave empty to use the last created key)."
              />
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
            <ApiCodeBlock
              title="Reset paper balance"
              text={`curl -X POST http://127.0.0.1:3000/api/v1/paper/reset \\\n  -H "Authorization: Bearer ${apiKeyForPlayground || "<YOUR_API_KEY>"}" \\\n  -H "Content-Type: application/json"`}
            />
            <ApiCodeBlock
              title="Place paper bet"
              text={`curl -X POST http://127.0.0.1:3000/api/v1/bets \\\n  -H "Authorization: Bearer ${apiKeyForPlayground || "<YOUR_API_KEY>"}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "marketId": "market_1",\n    "side": "YES",\n    "stake": 5,\n    "mode": "paper"\n  }'`}
            />
            <ApiCodeBlock
              title="List paper portfolio"
              text={`curl -X GET "http://127.0.0.1:3000/api/v1/portfolio?mode=paper" \\\n  -H "Authorization: Bearer ${apiKeyForPlayground || "<YOUR_API_KEY>"}"`}
            />
            <ApiCodeBlock
              title="Run strategy (paper rules)"
              text={`curl -X POST http://127.0.0.1:3000/api/v1/strategies/strategyId/run \\\n  -H "Authorization: Bearer ${apiKeyForPlayground || "<YOUR_API_KEY>"}" \\\n  -H "Content-Type: application/json"`}
            />
            <ApiCodeBlock
              title="Promote paper strategy → real draft"
              text={`curl -X POST http://127.0.0.1:3000/api/v1/strategies/strategyId/promote \\\n  -H "Authorization: Bearer ${apiKeyForPlayground || "<YOUR_API_KEY>"}" \\\n  -H "Content-Type: application/json"`}
            />
          </div>
        </div>

        <div className="list-card">
          <h3>Create API key</h3>
          <form onSubmit={createKey} className="developer-form-grid">
            <div className="field">
              <label className="label" htmlFor="key-name">Name</label>
              <input id="key-name" value={keyDraft.name} onChange={(e) => setKeyDraft((d) => ({ ...d, name: e.currentTarget.value }))} />
            </div>
            <div className="field developer-full">
              <label className="label" htmlFor="key-scopes">Scopes</label>
              <select
                id="key-scopes"
                multiple
                value={keyDraft.scopes}
                onChange={(e) =>
                  setKeyDraft((d) => ({
                    ...d,
                    scopes: Array.from(e.currentTarget.selectedOptions).map((o) => o.value),
                  }))
                }
              >
                {defaultScopes.map((scope) => (
                  <option key={scope} value={scope}>{scope}</option>
                ))}
              </select>
              <small className="caption">Selected: {scopesLabel}</small>
            </div>
            <button className="btn btn-primary" type="submit" disabled={!!pending}>
              {pending === "key-create" ? "Creating..." : "Create key"}
            </button>
          </form>
          {lastPlaintextKey ? (
            <div className="note-banner" style={{ marginTop: "0.75rem" }}>
              <h4>Copy now (shown once)</h4>
              <code style={{ wordBreak: "break-all" }}>{lastPlaintextKey}</code>
            </div>
          ) : null}
        </div>

        <div className="list-card">
          <h3>API keys</h3>
          <div className="bet-list">
            {keys.length === 0 ? <div className="empty-note">No keys yet.</div> : keys.map((key) => (
              <div className="bet-row" key={key.id}>
                <div className="bet-row-left">
                  <strong>{key.name}</strong>
                  <div className="caption">{(key.scopes || []).join(", ") || "No scopes"}</div>
                </div>
                <div className="inline-actions">
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={!!pending || !!key.revokedAt}
                    onClick={() => revokeKey(key.id)}
                  >
                    {key.revokedAt ? "Revoked" : (pending === `key-revoke-${key.id}` ? "Revoking..." : "Revoke")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="list-card">
          <h3>Create strategy</h3>
          <form onSubmit={createStrategy} className="developer-form-grid">
            <div className="field">
              <label className="label" htmlFor="strategy-name">Name</label>
              <input id="strategy-name" value={strategyDraft.name} onChange={(e) => setStrategyDraft((d) => ({ ...d, name: e.currentTarget.value }))} />
            </div>
            <div className="developer-3col-row">
              <div className="field">
                <label className="label" htmlFor="strategy-mode">Mode</label>
                <select id="strategy-mode" value={strategyDraft.mode} onChange={(e) => setStrategyDraft((d) => ({ ...d, mode: e.currentTarget.value }))}>
                  <option value="PAPER">PAPER</option>
                  <option value="REAL">REAL</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="strategy-type">Type</label>
                <select id="strategy-type" value={strategyDraft.type} onChange={(e) => setStrategyDraft((d) => ({ ...d, type: e.currentTarget.value }))}>
                  <option value="RULES">RULES</option>
                  <option value="ML">ML</option>
                </select>
              </div>
              <div className="field">
                <label className="label" htmlFor="strategy-status">Status</label>
                <select id="strategy-status" value={strategyDraft.status} onChange={(e) => setStrategyDraft((d) => ({ ...d, status: e.currentTarget.value }))}>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PAUSED">PAUSED</option>
                </select>
              </div>
            </div>
            <div className="field developer-full">
              <label className="label" htmlFor="strategy-config">Config JSON</label>
              <textarea
                id="strategy-config"
                rows={8}
                value={strategyDraft.config}
                onChange={(e) => setStrategyDraft((d) => ({ ...d, config: e.currentTarget.value }))}
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!!pending}>
              {pending === "strategy-create" ? "Creating..." : "Create strategy"}
            </button>
          </form>
        </div>

        <div className="list-card">
          <h3>Strategies</h3>
          <div className="bet-list">
            {strategies.length === 0 ? <div className="empty-note">No strategies yet.</div> : strategies.map((strategy) => (
              <div className="bet-row" key={strategy.id}>
                <div className="bet-row-left">
                  <strong>{strategy.name}</strong>
                  <div className="caption">{strategy.mode} · {strategy.type} · {strategy.status}</div>
                </div>
                <div className="inline-actions">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={!!pending || String(strategy.status || "").toUpperCase() !== "ACTIVE"}
                    onClick={() => runStrategy(strategy.id)}
                  >
                    {pending === `strategy-run-${strategy.id}` ? "Running..." : "Run"}
                  </button>
                  {String(strategy.status || "").toUpperCase() !== "ACTIVE" ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={!!pending}
                      onClick={() => activateStrategy(strategy.id)}
                    >
                      {pending === `strategy-activate-${strategy.id}` ? "Activating..." : "Activate"}
                    </button>
                  ) : (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={!!pending}
                      onClick={() => pauseStrategy(strategy.id)}
                    >
                      {pending === `strategy-pause-${strategy.id}` ? "Pausing..." : "Pause"}
                    </button>
                  )}
                  {strategy.mode === "PAPER" ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      disabled={!!pending}
                      onClick={() => promoteStrategy(strategy.id)}
                    >
                      {pending === `strategy-promote-${strategy.id}` ? "Promoting..." : "Promote to real"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="list-card">
          <h3>Recent strategy executions</h3>
          <div className="bet-list">
            {executions.length === 0 ? <div className="empty-note">No execution logs yet.</div> : executions.map((execution) => (
              <div className="bet-row" key={execution.id}>
                <div className="bet-row-left">
                  <strong>{execution.strategy?.name || execution.strategyId}</strong>
                  <div className="caption">{execution.status} · {execution.isPaper ? "PAPER" : "REAL"} · {execution.message || "—"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ApiCodeBlock({ title, text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <div className="note-banner" style={{ marginTop: 0 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <strong style={{ fontSize: "0.92rem" }}>{title}</strong>
        <button className="btn btn-ghost" type="button" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: "10px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        <code>{text}</code>
      </pre>
    </div>
  );
}

