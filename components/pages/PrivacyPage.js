import Link from "next/link";
import { LegalBlocks, LegalDocFooterLinks, LegalTableOfContents } from "../legal/LegalDocument";
import { PRIVACY_META, PRIVACY_SECTIONS } from "../../lib/privacyPolicy";

export default function PrivacyPage() {
  return (
    <section className="page active legal-page legal-page--privacy" aria-labelledby="privacy-page-title">
      <header className="legal-page-hero">
        <div className="section-head legal-hero-section-head">
          <div>
            <h1 className="legal-page-title" id="privacy-page-title">
              {PRIVACY_META.documentTitle}
            </h1>
            <p>
              How we handle personal information when you use Agora. Use this together with our{" "}
              <Link href="/legal">Terms of Use</Link>.
            </p>
          </div>
        </div>
        <div className="legal-hero-meta" aria-label="Document information">
          <span>
            <strong>Effective</strong> {PRIVACY_META.effectiveDate}
          </span>
          <span className="legal-meta-dot" aria-hidden="true">
            ·
          </span>
          <span>
            <strong>Version</strong> {PRIVACY_META.version}
          </span>
          <span className="legal-meta-dot" aria-hidden="true">
            ·
          </span>
          <Link className="legal-hero-privacy-link" href="/legal">
            Terms of Use
          </Link>
        </div>
      </header>

      <details className="legal-toc-mobile">
        <summary className="legal-toc-mobile-summary">Jump to section</summary>
        <nav aria-label="Table of contents">
          <LegalTableOfContents sections={PRIVACY_SECTIONS} />
        </nav>
      </details>

      <div className="legal-layout">
        <aside className="legal-sidebar" aria-label="Table of contents">
          <div className="legal-sidebar-sticky">
            <p className="legal-sidebar-kicker">On this page</p>
            <nav>
              <LegalTableOfContents sections={PRIVACY_SECTIONS} />
            </nav>
            <p className="legal-sidebar-note">
              Privacy practices must match your actual data flows; update this policy with counsel as your product changes.
            </p>
          </div>
        </aside>

        <div className="legal-main">
          <article className="legal-article">
            {PRIVACY_SECTIONS.map((sec) => (
              <section className="legal-section" key={sec.id} id={sec.id}>
                <h2 className="legal-section-title">{sec.title}</h2>
                <div className="legal-section-body">
                  <LegalBlocks blocks={sec.blocks} />
                </div>
              </section>
            ))}
            <LegalDocFooterLinks variant="privacy" />
          </article>
        </div>
      </div>
    </section>
  );
}
