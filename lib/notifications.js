const PRIORITY_RANK = {
  urgent: 0,
  action: 1,
  info: 2,
};

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function notification(id, priority, title, body, href) {
  return { id, priority, title, body, href };
}

export function buildNotifications(state = {}) {
  const items = [];
  const auth = state.auth || {};
  const currentUser = state.currentUser || {};
  const settings = currentUser.settings || {};
  const friends = state.friends || {};
  const portfolio = state.portfolio || {};

  if (auth.expiresSoon) {
    items.push(
      notification(
        "session-expiring",
        "urgent",
        "Session expiring soon",
        "Save your work or sign in again to keep the desk active.",
        "/login",
      ),
    );
  }

  const incomingRequests = (friends.pending || []).filter((request) => request.direction === "incoming");
  if (incomingRequests.length > 0) {
    items.push(
      notification(
        "incoming-friends",
        "action",
        `${pluralize(incomingRequests.length, "friend request")} waiting`,
        "Review incoming requests before they get buried in activity.",
        "/friends",
      ),
    );
  }

  const openPositions = portfolio.openBets?.length || 0;
  if (openPositions > 0) {
    items.push(
      notification(
        "open-positions",
        "info",
        `${pluralize(openPositions, "open position")}`,
        "Track active exposure and recent settlement movement.",
        "/portfolio",
      ),
    );
  }

  if (settings.emailVerificationStatus === "pending") {
    items.push(
      notification(
        "email-verification",
        "action",
        "Email verification pending",
        "Verify email before production-money features are enabled.",
        "/profile",
      ),
    );
  }

  const paymentNeedsReview = ["pending", "required", "placeholder"].includes(
    settings.paymentVerificationStatus,
  );
  if (paymentNeedsReview && (currentUser.withdrawable_balance || 0) > 0) {
    items.push(
      notification(
        "payment-verification",
        "action",
        "Payment checks incomplete",
        "Complete payment readiness before withdrawals move beyond demo review.",
        "/settings#account",
      ),
    );
  }

  if (currentUser.isAdmin && (state.pendingMarkets?.length || 0) > 0) {
    items.push(
      notification(
        "admin-market-review",
        "action",
        `${pluralize(state.pendingMarkets.length, "market")} awaiting review`,
        "Approve, reject, or edit queued market submissions.",
        "/admin",
      ),
    );
  }

  return items.sort((a, b) => {
    const priorityDelta = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return priorityDelta || a.title.localeCompare(b.title);
  });
}

export function countActionableNotifications(items = []) {
  return items.filter((item) => item.priority !== "info").length;
}

export function diffStateForEvents(previousState = {}, nextState = {}) {
  const previousIds = new Set((previousState.eventNotifications || []).map((item) => item.id));
  return (nextState.eventNotifications || []).filter((item) => item?.id && !previousIds.has(item.id));
}
