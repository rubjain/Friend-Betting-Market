export function InfoRow({ label, value, mutedClass = "" }) {
  return (
    <div className="info-row">
      <span className={mutedClass}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", body }) {
  return (
    <div className="list-card">
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
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
