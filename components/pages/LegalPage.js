import Link from "next/link";
import { LegalBlocks, LegalDocFooterLinks, LegalTableOfContents } from "../legal/LegalDocument";
import { TERMS_META, TERMS_SECTIONS } from "../../lib/termsOfUse";

export default function LegalPage() {
  return (
    <section className="page active legal-page" aria-labelledby="legal-page-title">
      <header className="legal-page-hero">
        <div className="section-head legal-hero-section-head">
          <div>
            <h1 className="legal-page-title" id="legal-page-title">
              {TERMS_META.documentTitle}
            </h1>
            <p>
              Read these Terms carefully. They govern your access to Agora and incorporate our{" "}
              <Link href="/privacy">Privacy Policy</Link> by reference.
            </p>
          </div>
        </div>
        <div className="legal-hero-meta" aria-label="Document information">
          <span>
            <strong>Effective</strong> {TERMS_META.effectiveDate}
          </span>
          <span className="legal-meta-dot" aria-hidden="true">
            ·
          </span>
          <span>
            <strong>Version</strong> {TERMS_META.version}
          </span>
          <span className="legal-meta-dot" aria-hidden="true">
            ·
          </span>
          <Link className="legal-hero-privacy-link" href="/privacy">
            Privacy Policy
          </Link>
        </div>
      </header>

      <details className="legal-toc-mobile">
        <summary className="legal-toc-mobile-summary">Jump to section</summary>
        <nav aria-label="Table of contents">
          <LegalTableOfContents sections={TERMS_SECTIONS} />
        </nav>
      </details>

      <div className="legal-layout">
        <aside className="legal-sidebar" aria-label="Table of contents">
          <div className="legal-sidebar-sticky">
            <p className="legal-sidebar-kicker">On this page</p>
            <nav>
              <LegalTableOfContents sections={TERMS_SECTIONS} />
            </nav>
            <p className="legal-sidebar-note">
              Deployments should obtain qualified legal review before relying on this template in production.
            </p>
          </div>
        </aside>

        <div className="legal-main">
          <article className="legal-article">
            {TERMS_SECTIONS.map((sec) => (
              <section className="legal-section" key={sec.id} id={sec.id}>
                <h2 className="legal-section-title">{sec.title}</h2>
                <div className="legal-section-body">
                  <LegalBlocks blocks={sec.blocks} />
                </div>
              </section>
            ))}
            <LegalDocFooterLinks variant="terms" />
          </article>
        </div>
      </div>
    </section>
  );
}
