"use client";

import { useEffect, useState } from "react";

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value) {
  return value ? new Date(value).toISOString() : "";
}

function draftForm(draft) {
  return {
    question: draft.question || "",
    closeTime: toDatetimeLocal(draft.closeTime),
    resolutionSource: draft.resolutionSource || "",
    resolutionRules: draft.resolutionRules || "",
  };
}

async function requestJson(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const payload = await response.json();
  return { response, payload };
}

export default function AdminDraftMarkets({ onMessage }) {
  const [drafts, setDrafts] = useState([]);
  const [forms, setForms] = useState({});
  const [pendingAction, setPendingAction] = useState("");

  async function loadDrafts() {
    const { response, payload } = await requestJson("/api/admin/markets/drafts");
    if (!response.ok) {
      onMessage?.(payload.message || "Unable to load generated drafts.");
      return;
    }
    setDrafts(payload.drafts || []);
    setForms(
      Object.fromEntries((payload.drafts || []).map((draft) => [draft.id, draftForm(draft)])),
    );
  }

  useEffect(() => {
    loadDrafts();
  }, []);

  function updateField(draftId, field, value) {
    setForms((previous) => ({
      ...previous,
      [draftId]: {
        ...previous[draftId],
        [field]: value,
      },
    }));
  }

  async function runAction(actionKey, callback) {
    if (pendingAction) return;
    setPendingAction(actionKey);
    try {
      await callback();
    } finally {
      setPendingAction("");
    }
  }

  async function generateDrafts() {
    await runAction("generate", async () => {
      const { payload } = await requestJson("/api/admin/markets/generate", { method: "POST" });
      onMessage?.(payload.message || "Draft generators finished.");
      await loadDrafts();
    });
  }

  async function saveDraft(draftId) {
    await runAction(`save-${draftId}`, async () => {
      const form = forms[draftId];
      const { response, payload } = await requestJson(`/api/admin/markets/${draftId}`, {
        method: "PATCH",
        body: JSON.stringify({
          question: form.question,
          closeTime: fromDatetimeLocal(form.closeTime),
          resolutionSource: form.resolutionSource,
          resolutionRules: form.resolutionRules,
        }),
      });
      onMessage?.(payload.message || (response.ok ? "Draft saved." : "Unable to save draft."));
      await loadDrafts();
    });
  }

  async function approveDraft(draftId) {
    await runAction(`approve-${draftId}`, async () => {
      const { payload } = await requestJson(`/api/admin/markets/${draftId}/approve`, {
        method: "POST",
      });
      onMessage?.(payload.message || "Draft approved and published.");
      await loadDrafts();
    });
  }

  async function rejectDraft(draftId) {
    await runAction(`reject-${draftId}`, async () => {
      const { payload } = await requestJson(`/api/admin/markets/${draftId}/reject`, {
        method: "POST",
      });
      onMessage?.(payload.message || "Draft rejected.");
      await loadDrafts();
    });
  }

  return (
    <div className="table-card admin-wide">
      <div className="section-head compact-section-head">
        <div>
          <h3>Generated draft markets</h3>
          <p>System-created markets stay in draft until an admin edits, rejects, or publishes them.</p>
        </div>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={!!pendingAction}
          onClick={generateDrafts}
        >
          {pendingAction === "generate" ? "Generating..." : "Generate drafts"}
        </button>
      </div>
      {drafts.length ? (
        <div className="draft-market-list">
          {drafts.map((draft) => {
            const form = forms[draft.id] || draftForm(draft);
            return (
              <div className="draft-market-card" key={draft.id}>
                <div className="draft-market-meta">
                  <span className="pill">{draft.category}</span>
                  <span className="muted">{draft.externalSourceName || "system"}</span>
                  <span className="muted">YES {(draft.yesPrice * 100).toFixed(0)}%</span>
                  <span className="muted">NO {(draft.noPrice * 100).toFixed(0)}%</span>
                </div>
                <div className="form-grid">
                  <div className="field full">
                    <label className="label" htmlFor={`draft-question-${draft.id}`}>
                      Question
                    </label>
                    <input
                      id={`draft-question-${draft.id}`}
                      value={form.question}
                      onChange={(event) => updateField(draft.id, "question", event.currentTarget.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor={`draft-close-${draft.id}`}>
                      Close time
                    </label>
                    <input
                      id={`draft-close-${draft.id}`}
                      type="datetime-local"
                      value={form.closeTime}
                      onChange={(event) => updateField(draft.id, "closeTime", event.currentTarget.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="label" htmlFor={`draft-source-${draft.id}`}>
                      Resolution source
                    </label>
                    <input
                      id={`draft-source-${draft.id}`}
                      value={form.resolutionSource}
                      onChange={(event) =>
                        updateField(draft.id, "resolutionSource", event.currentTarget.value)
                      }
                    />
                  </div>
                  <div className="field full">
                    <label className="label" htmlFor={`draft-rules-${draft.id}`}>
                      Resolution rules
                    </label>
                    <textarea
                      id={`draft-rules-${draft.id}`}
                      value={form.resolutionRules}
                      onChange={(event) =>
                        updateField(draft.id, "resolutionRules", event.currentTarget.value)
                      }
                    />
                  </div>
                </div>
                <div className="inline-actions">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={!!pendingAction}
                    onClick={() => saveDraft(draft.id)}
                  >
                    {pendingAction === `save-${draft.id}` ? "Saving..." : "Save edits"}
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={!!pendingAction}
                    onClick={() => approveDraft(draft.id)}
                  >
                    {pendingAction === `approve-${draft.id}` ? "Publishing..." : "Approve and publish"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={!!pendingAction}
                    onClick={() => rejectDraft(draft.id)}
                  >
                    {pendingAction === `reject-${draft.id}` ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-note">No generated drafts yet. Run the generators to create reviewable markets.</div>
      )}
    </div>
  );
}
