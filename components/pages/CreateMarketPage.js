"use client";

import { useMemo, useState } from "react";
import { useFriendMarket } from "../../context/FriendMarketContext";
import { getMarketCategory, sportMarketCategories } from "../../lib/marketTaxonomy";
import { hasValidationErrors, validateCreateMarketDraft } from "../../lib/validation";
import { SectionHead } from "../ui";

export default function CreateMarketPage() {
  const { state, actions } = useFriendMarket();
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const draft = state.createMarketDraft;
  const errors = useMemo(() => validateCreateMarketDraft(draft), [draft]);
  const selectedCategory = getMarketCategory(draft.category);

  async function submitMarket(event) {
    event.preventDefault();
    if (pending) {
      return;
    }
    setSubmitted(true);
    if (hasValidationErrors(errors)) {
      actions.setFlashMessage("Fix the highlighted market fields before submitting for review.");
      return;
    }
    setPending(true);
    try {
      await actions.createMarket();
      setSubmitted(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="page active">
      <SectionHead
        title="Create Market"
        body="Keep submissions simple. Admin review comes before a market goes live."
      />
      <div className="list-card">
        <div className="note-banner">
          Every new market submission requires admin approval before it appears in the live markets list.
        </div>
        <form className="form-grid create-market-form" onSubmit={submitMarket}>
          <div className="field">
            <label className="label" htmlFor="market-title">
              Market title
            </label>
            <input
              id="market-title"
              name="title"
              value={draft.title}
              placeholder="Will Team X make the playoffs?"
              aria-invalid={submitted && !!errors.title}
              aria-describedby={submitted && errors.title ? "market-title-error" : undefined}
              onChange={(event) => actions.updateCreateMarketDraft("title", event.currentTarget.value)}
            />
            {submitted && errors.title ? (
              <div className="field-error" id="market-title-error">
                {errors.title}
              </div>
            ) : null}
          </div>
          <div className="field">
            <label className="label" htmlFor="market-category-create">
              Category
            </label>
            <select
              id="market-category-create"
              name="category"
              value={draft.category}
              onChange={(event) => actions.updateCreateMarketDraft("category", event.currentTarget.value)}
            >
              {sportMarketCategories.map((category) => (
                <option value={category.label} key={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field full">
            <label className="label" htmlFor="market-description">
              Description
            </label>
            <textarea
              id="market-description"
              name="description"
              placeholder="Describe the event, resolution rules, and timing."
              value={draft.description}
              aria-invalid={submitted && !!errors.description}
              aria-describedby={
                submitted && errors.description ? "market-description-error" : undefined
              }
              onChange={(event) => actions.updateCreateMarketDraft("description", event.currentTarget.value)}
            />
            {submitted && errors.description ? (
              <div className="field-error" id="market-description-error">
                {errors.description}
              </div>
            ) : null}
          </div>
          <div className="field">
            <label className="label" htmlFor="market-close-date">
              Close date
            </label>
            <input
              id="market-close-date"
              name="closeDate"
              type="date"
              value={draft.closeDate}
              aria-invalid={submitted && !!errors.closeDate}
              aria-describedby={submitted && errors.closeDate ? "market-close-date-error" : undefined}
              onChange={(event) => actions.updateCreateMarketDraft("closeDate", event.currentTarget.value)}
            />
            {submitted && errors.closeDate ? (
              <div className="field-error" id="market-close-date-error">
                {errors.closeDate}
              </div>
            ) : null}
          </div>
          <div className="field">
            <label className="label" htmlFor="market-source-url">
              Source URL
            </label>
            <input
              id="market-source-url"
              name="sourceUrl"
              type="url"
              placeholder="https://official-source.example"
              value={draft.sourceUrl}
              aria-invalid={submitted && !!errors.sourceUrl}
              aria-describedby={submitted && errors.sourceUrl ? "market-source-url-error" : undefined}
              onChange={(event) => actions.updateCreateMarketDraft("sourceUrl", event.currentTarget.value)}
            />
            {submitted && errors.sourceUrl ? (
              <div className="field-error" id="market-source-url-error">
                {errors.sourceUrl}
              </div>
            ) : null}
          </div>
          <div className="field">
            <label className="label" htmlFor="market-admin-note">
              Admin approval
            </label>
            <input id="market-admin-note" value="Required before launch" disabled readOnly />
          </div>
          <div className="field full">
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </form>
        <div className="taxonomy-card">
          <div>
            <h3>{selectedCategory.label} market checklist</h3>
            <p>{selectedCategory.description}</p>
          </div>
          <div className="taxonomy-grid">
            <div>
              <span className="label">Common market types</span>
              <strong>{selectedCategory.examples.join(", ")}</strong>
            </div>
            <div>
              <span className="label">Resolution needs</span>
              <strong>{selectedCategory.resolutionNeeds.join(", ")}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
