"use client";

import { useEffect, useMemo, useState } from "react";
import { useAgora } from "../../context/AgoraContext";
import { SectionHead } from "../ui";

const scopeOptions = [
  {
    value: "read:markets",
    label: "Read markets",
    detail: "View market catalog, prices, and live games.",
  },
  {
    value: "read:portfolio",
    label: "Read portfolio",
    detail: "View balances, open bets, and paper results.",
  },
  {
    value: "trade:paper",
    label: "Paper trade",
    detail: "Place paper bets and paper limit orders.",
  },
  {
    value: "manage:strategies",
    label: "Manage strategies",
    detail: "Create and run saved paper strategy configs.",
  },
];

const scopeLabelByValue = Object.fromEntries(scopeOptions.map((scope) => [scope.value, scope.label]));

function formatScopeList(scopes = []) {
  return scopes.map((scope) => scopeLabelByValue[scope] || scope).join(", ");
}

export default function DeveloperPage() {
  const { state: agoraState, actions } = useAgora();
  const [keys, setKeys] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [apiHealth, setApiHealth] = useState(null);
  const [flash, setFlash] = useState("");
  const [pending, setPending] = useState("");
  const [lastPlaintextKey, setLastPlaintextKey] = useState("");
  const [apiKeyForPlayground, setApiKeyForPlayground] = useState("");
  const [keyDraft, setKeyDraft] = useState({
    name: "Paper bot key",
    scopes: ["read:markets", "read:portfolio", "trade:paper", "manage:strategies"],
  });
  const [apiBaseUrl, setApiBaseUrl] = useState("http://127.0.0.1:3000");
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

  useEffect(() => {
    if (!apiKeyForPlayground && lastPlaintextKey) {
      setApiKeyForPlayground(lastPlaintextKey);
    }
  }, [apiKeyForPlayground, lastPlaintextKey]);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiBaseUrl(window.location.origin);
    }
  }, []);

  const scopesLabel = useMemo(() => formatScopeList(keyDraft.scopes), [keyDraft.scopes]);
  const isAuthenticated = Boolean(agoraState.auth.authenticated);
  const apiKeyPlaceholder = apiKeyForPlayground || "<YOUR_API_KEY>";
  const quickstartExamples = useMemo(
    () => [
      {
        title: "1. List markets",
        description: "Pull active paper markets into your model.",
        text: `curl -X GET ${apiBaseUrl}/api/v1/markets \\\n  -H "Authorization: Bearer ${apiKeyPlaceholder}"`,
      },
      {
        title: "2. Place a paper trade",
        description: "Send a decision from your model to Agora.",
        text: `curl -X POST ${apiBaseUrl}/api/v1/bets \\\n  -H "Authorization: Bearer ${apiKeyPlaceholder}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "marketId": "market_1",\n    "side": "YES",\n    "stake": 5,\n    "mode": "paper"\n  }'`,
      },
      {
        title: "3. Read portfolio",
        description: "Check paper balances, open bets, and results.",
        text: `curl -X GET "${apiBaseUrl}/api/v1/portfolio?mode=paper" \\\n  -H "Authorization: Bearer ${apiKeyPlaceholder}"`,
      },
    ],
    [apiBaseUrl, apiKeyPlaceholder],
  );

  function toggleScope(scope) {
    setKeyDraft((draft) => {
      const selected = new Set(draft.scopes);
      if (selected.has(scope)) {
        selected.delete(scope);
      } else {
        selected.add(scope);
      }
      return { ...draft, scopes: Array.from(selected) };
    });
  }

  async function refreshAll() {
    await Promise.all([loadKeys(), loadStrategies(), loadExecutions(), loadApiHealth()]);
  }

  async function loadApiHealth() {
    const res = await fetch("/api/health");
    const payload = await res.json().catch(() => null);
    setApiHealth(payload ? { ...payload, status: res.status } : null);
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
    if (!isAuthenticated) {
      setFlash("Sign in before creating an API key. Keys are attached to your account.");
      return;
    }
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
    if (!isAuthenticated) {
      setFlash("Sign in before managing API keys.");
      return;
    }
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
          mode: "PAPER",
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

  async function signInDemoUser() {
    if (pending) return;
    setPending("demo-login");
    setFlash("");
    try {
      const ok = await actions.login("test@example.com", "password123");
      setFlash(ok ? "Signed in as the test user. You can create an API key now." : "Could not sign in.");
      await refreshAll();
    } finally {
      setPending("");
    }
  }

  return (
    <section className="page active developer-page">
      <SectionHead
        title="Developer"
        body="Connect your own model to Agora with scoped API keys. Paper trading is live; real-money trading is disabled for beta."
      />
      {flash ? (
        <div className="flash-banner" role="status" aria-live="polite">
          {flash}
        </div>
      ) : null}

      <div className="developer-shell">
        {!isAuthenticated ? (
          <div className="developer-auth-banner">
            <div>
              <strong>Sign in to create API keys</strong>
              <p>Keys belong to your Agora account so your bots can trade against your paper portfolio.</p>
            </div>
            <button className="btn btn-primary" type="button" disabled={!!pending} onClick={signInDemoUser}>
              {pending === "demo-login" ? "Signing in..." : "Use test account"}
            </button>
          </div>
        ) : null}

        <div className="developer-hero-panel">
          <div>
            <span className="developer-kicker">External bot workflow</span>
            <h3>Build your model outside Agora. Trade here with a paper API key.</h3>
          </div>
          <div className="developer-status-grid">
            <StatusPill label="API" value={apiHealth?.ok ? "Ready" : "Checking"} tone={apiHealth?.ok ? "good" : "warn"} />
            <StatusPill label="Mode" value={apiHealth?.mode || "Local"} />
            <StatusPill label="Trading" value="Paper only" tone="good" />
          </div>
        </div>

        <div className="developer-step-grid" aria-label="Developer setup steps">
          <DeveloperStep number="1" title="Create a key" body="Use paper scopes for model testing. Keys can be revoked anytime." />
          <DeveloperStep number="2" title="Call the API" body="Fetch markets, place paper trades, and read your portfolio from your own bot." />
          <DeveloperStep number="3" title="Watch results" body="Review balances, positions, and executions before changing your model." />
        </div>

        <div className="developer-layout">
          <div className="list-card developer-panel">
            <div className="developer-card-head">
              <div>
                <h3>Create API key</h3>
                <p>Start with the default paper-trading scopes.</p>
              </div>
              <span className="pill">Paper beta</span>
            </div>
            <form onSubmit={createKey} className="developer-form-grid">
              <div className="field">
                <label className="label" htmlFor="key-name">Name</label>
                <input id="key-name" value={keyDraft.name} onChange={(e) => setKeyDraft((d) => ({ ...d, name: e.currentTarget.value }))} />
              </div>
              <div className="field developer-full developer-scope-field">
                <span className="label" id="key-scopes-label">Scopes</span>
                <div className="developer-scope-grid" role="group" aria-labelledby="key-scopes-label">
                  {scopeOptions.map((scope) => {
                    const checked = keyDraft.scopes.includes(scope.value);
                    return (
                      <label className={`developer-scope-option${checked ? " active" : ""}`} key={scope.value}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleScope(scope.value)}
                        />
                        <span className="developer-scope-check" aria-hidden="true" />
                        <span>
                          <strong>{scope.label}</strong>
                          <small>{scope.detail}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <small className="caption">Selected: {scopesLabel}</small>
              </div>
              <button className="btn btn-primary" type="submit" disabled={!!pending || !isAuthenticated}>
                {pending === "key-create" ? "Creating..." : "Create key"}
              </button>
            </form>
            {lastPlaintextKey ? (
              <div className="developer-secret-box">
                <h4>Copy now (shown once)</h4>
                <code>{lastPlaintextKey}</code>
              </div>
            ) : null}
          </div>

          <div className="list-card developer-panel">
            <div className="developer-card-head">
              <div>
                <h3>Active keys</h3>
                <p>Use one key per bot or experiment.</p>
              </div>
            </div>
            <div className="bet-list">
              {keys.length === 0 ? <div className="empty-note">No keys yet.</div> : keys.map((key) => (
                <div className="bet-row" key={key.id}>
                  <div className="bet-row-left">
                    <strong>{key.name}</strong>
                    <div className="caption">{formatScopeList(key.scopes || []) || "No scopes"}</div>
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
        </div>

        <div className="list-card developer-panel developer-quickstart">
          <div className="developer-card-head">
            <div>
              <h3>Bot quickstart</h3>
              <p>Paste your key once, then copy these paper-trading calls into your model runner.</p>
            </div>
          </div>
          <label className="field developer-key-field" htmlFor="playground-api-key">
            <span className="label">API key for examples</span>
            <input
              id="playground-api-key"
              value={apiKeyForPlayground}
              onChange={(e) => setApiKeyForPlayground(e.currentTarget.value)}
              placeholder="Paste plaintextKey here, or create a key above."
            />
          </label>
          <div className="developer-code-grid">
            {quickstartExamples.map((example) => (
              <ApiCodeBlock key={example.title} {...example} />
            ))}
          </div>
        </div>

        <div className="developer-lab-grid">
          <div className="list-card developer-panel">
            <div className="developer-card-head">
              <div>
                <h3>Built-in strategy sandbox</h3>
                <p>This is a small in-app rules tester. Use it to sanity-check simple logic; serious AI models should connect through the API above.</p>
              </div>
            </div>
            <form onSubmit={createStrategy} className="developer-form-grid">
              <div className="field">
                <label className="label" htmlFor="strategy-name">Name</label>
                <input id="strategy-name" value={strategyDraft.name} onChange={(e) => setStrategyDraft((d) => ({ ...d, name: e.currentTarget.value }))} />
              </div>
              <div className="developer-3col-row">
                <div className="field">
                  <label className="label" htmlFor="strategy-mode">Mode</label>
                  <select id="strategy-mode" value="PAPER" disabled>
                    <option value="PAPER">PAPER</option>
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
                {pending === "strategy-create" ? "Creating..." : "Create paper strategy"}
              </button>
            </form>
          </div>

          <div className="developer-side-stack">
            <div className="list-card developer-panel">
              <h3>Strategies</h3>
              <div className="bet-list">
                {strategies.length === 0 ? <div className="empty-note">No strategies yet.</div> : strategies.map((strategy) => (
                  <div className="bet-row" key={strategy.id}>
                    <div className="bet-row-left">
                      <strong>{strategy.name}</strong>
                      <div className="caption">{strategy.mode} / {strategy.type} / {strategy.status}</div>
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
                        <button className="btn btn-ghost" type="button" disabled={!!pending} onClick={() => activateStrategy(strategy.id)}>
                          {pending === `strategy-activate-${strategy.id}` ? "Activating..." : "Activate"}
                        </button>
                      ) : (
                        <button className="btn btn-ghost" type="button" disabled={!!pending} onClick={() => pauseStrategy(strategy.id)}>
                          {pending === `strategy-pause-${strategy.id}` ? "Pausing..." : "Pause"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="list-card developer-panel">
              <h3>Recent executions</h3>
              <div className="bet-list">
                {executions.length === 0 ? <div className="empty-note">No execution logs yet.</div> : executions.map((execution) => (
                  <div className="bet-row" key={execution.id}>
                    <div className="bet-row-left">
                      <strong>{execution.strategy?.name || execution.strategyId}</strong>
                      <div className="caption">{execution.status} / {execution.isPaper ? "PAPER" : "REAL"} / {execution.message || "-"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeveloperStep({ number, title, body }) {
  return (
    <div className="developer-step-card">
      <span>{number}</span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function StatusPill({ label, value, tone = "" }) {
  return (
    <div className={`developer-status-pill ${tone ? `developer-status-pill--${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ApiCodeBlock({ title, description, text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <div className="developer-code-card">
      <div className="developer-code-head">
        <div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
        <button className="btn btn-ghost" type="button" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{text}</code>
      </pre>
    </div>
  );
}
