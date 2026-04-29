export function getTodayString(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function validateCreateMarketDraft(draft, today = getTodayString()) {
  const errors = {};

  if (!draft.title?.trim()) {
    errors.title = "Enter a market title.";
  } else if (draft.title.trim().length < 10) {
    errors.title = "Use at least 10 characters so admins can understand the market.";
  }

  if (!draft.description?.trim()) {
    errors.description = "Describe the event and resolution criteria.";
  } else if (draft.description.trim().length < 20) {
    errors.description = "Add more detail about resolution criteria and timing.";
  }

  if (!draft.closeDate) {
    errors.closeDate = "Choose a close date.";
  } else if (draft.closeDate <= today) {
    errors.closeDate = "Choose a future close date.";
  }

  if (draft.sourceUrl?.trim()) {
    try {
      const url = new URL(draft.sourceUrl.trim());
      if (!["http:", "https:"].includes(url.protocol)) {
        errors.sourceUrl = "Use a public http or https source URL.";
      }
    } catch {
      errors.sourceUrl = "Enter a valid source URL or leave it blank.";
    }
  }

  return errors;
}

export function validateBetDraft({ payout, currentUser }) {
  const errors = {};

  if (payout.totalStake <= 0) {
    errors.stake = "Enter a stake and funding mix above zero.";
  }

  if (payout.withdrawableStake > currentUser.withdrawable_balance) {
    errors.withdrawableShare = "Withdrawable amount exceeds your balance.";
  }

  if (payout.bonusStake > currentUser.bonus_balance) {
    errors.bonusShare = "Bonus amount exceeds your balance.";
  }

  return errors;
}

export function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0;
}
