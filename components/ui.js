export function InfoRow({ label, value, mutedClass = "" }) {
  return (
    <div className="info-row">
      <span className={mutedClass}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", body, action }) {
  return (
    <div className="list-card">
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? (
        <button className="btn btn-secondary btn-sm" type="button" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function SectionHead({ title, body, action }) {
  return (
    <div className="section-head">
      <div>
        <h3>{title}</h3>
        {body ? <p>{body}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Shown in AppShell until `/api/session` hydration completes (non-auth routes only). */
export function HydrateLoading({ label = "Loading your workspace" }) {
  return (
    <section className="page active hydrate-loading" aria-busy="true" aria-live="polite">
      <p className="hydrate-loading-label">{label}</p>
      <div className="hydrate-skeleton-grid" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="hydrate-skeleton-card" key={i}>
            <div className="skeleton-line skeleton-line--long" />
            <div className="skeleton-line skeleton-line--short" />
            <div className="skeleton-line" style={{ width: "55%" }} />
          </div>
        ))}
      </div>
    </section>
  );
}
