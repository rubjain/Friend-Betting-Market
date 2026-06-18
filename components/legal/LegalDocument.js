import Link from "next/link";

function Notice({ variant, text }) {
  const className = `legal-callout legal-callout--${variant ?? "note"}`;
  return (
    <div className={className} role="note">
      <p>{text}</p>
    </div>
  );
}

function Block({ block, index }) {
  const b = block;
  switch (b.type) {
    case "paragraph":
      return <p key={index}>{b.text}</p>;
    case "subheading":
      return (
        <h3 className="legal-subheading" key={index}>
          {b.text}
        </h3>
      );
    case "list":
      if (b.ordered) {
        return (
          <ol className="legal-list legal-list--ordered" key={index}>
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="legal-list" key={index}>
          {b.items.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>
      );
    case "definitionList":
      return (
        <dl className="legal-definition-list" key={index}>
          {b.items.map((row, j) => (
            <div className="legal-definition-row" key={j}>
              <dt>{row.term}</dt>
              <dd>{row.def}</dd>
            </div>
          ))}
        </dl>
      );
    case "notice":
      return <Notice key={index} variant={b.variant} text={b.text} />;
    default:
      return null;
  }
}

export function LegalBlocks({ blocks }) {
  if (!Array.isArray(blocks)) {
    return null;
  }
  return blocks.map((block, index) => <Block block={block} key={`b-${index}`} index={index} />);
}

export function LegalTableOfContents({ sections }) {
  return (
    <ol className="legal-toc-list">
      {sections.map((sec, i) => (
        <li key={sec.id}>
          <a href={`#${sec.id}`}>
            <span className="legal-toc-num">{i + 1}</span>
            <span className="legal-toc-label">{sec.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * @param {{ variant?: "terms" | "privacy" }} props
 */
export function LegalDocFooterLinks({ variant }) {
  return (
    <div className="legal-doc-footer-card">
      <p className="legal-doc-footer-title">Also see</p>
      <div className="legal-doc-footer-links">
        <Link href="/faq">FAQ</Link>
        {variant !== "terms" ? (
          <Link href="/legal">Terms of Use</Link>
        ) : null}
        {variant !== "privacy" ? (
          <Link href="/privacy">Privacy Policy</Link>
        ) : null}
      </div>
    </div>
  );
}
