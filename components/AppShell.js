"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFriendMarket } from "../context/FriendMarketContext";
import { money } from "../lib/formatters";

const routes = [
  ["/markets", "Markets"],
  ["/portfolio", "Portfolio"],
  ["/deposit", "Deposit"],
  ["/withdraw", "Withdraw"],
  ["/friends", "Friends"],
  ["/leaderboard", "Leaderboard"],
  ["/create", "Create"],
  ["/profile", "Profile"],
];

const settingsRoutes = [
  ["/settings#account", "Account"],
  ["/settings#balances", "Balances"],
  ["/settings#appearance", "Appearance"],
  ["/settings#referrals", "Referrals"],
  ["/settings#ledger", "Transaction history"],
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, actions } = useFriendMarket();
  const [sessionPending, setSessionPending] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(true);
  const navCloseTimerRef = useRef(null);
  const openPositions = state.portfolio.openBets.length;

  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash.length <= 1) {
      return;
    }

    const legacyRoute = window.location.hash.slice(1);
    const routeMap = {
      landing: "/",
      markets: "/markets",
      "market-detail": `/markets/${state.selectedMarketId}`,
      friends: "/friends",
      portfolio: "/portfolio",
      deposit: "/deposit",
      withdraw: "/withdraw",
      create: "/create",
      profile: "/profile",
      admin: "/admin",
    };

    if (routeMap[legacyRoute]) {
      router.replace(routeMap[legacyRoute]);
    }
  }, [router, state.selectedMarketId]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  useEffect(() => {
    return () => {
      if (navCloseTimerRef.current) {
        window.clearTimeout(navCloseTimerRef.current);
      }
    };
  }, []);

  function isActive(path) {
    if (path === "/markets") {
      return pathname === "/markets" || pathname.startsWith("/markets/");
    }
    return pathname === path;
  }

  function handleAdminToggle(event) {
    const checked = event.currentTarget.checked;
    actions.toggleAdminMode(checked);
    if (!checked && pathname === "/admin") {
      router.push("/profile");
    }
  }

  async function logout() {
    if (sessionPending) return;
    setSessionPending(true);
    try {
      await actions.logout();
    } finally {
      setSessionPending(false);
    }
  }

  function closeNavigation() {
    if (navCloseTimerRef.current) {
      window.clearTimeout(navCloseTimerRef.current);
      navCloseTimerRef.current = null;
    }
    actions.closeMobileNav();
    setNavCollapsed(true);
  }

  function scheduleNavigationClose(delay = 320) {
    if (navCloseTimerRef.current) {
      window.clearTimeout(navCloseTimerRef.current);
    }
    navCloseTimerRef.current = window.setTimeout(() => {
      closeNavigation();
    }, delay);
  }

  return (
    <div className="shell" data-theme={state.theme}>
      <header className="site-header">
        <div className="nav-wrap">
          <button
            className="hamburger-button"
            type="button"
            aria-label={navCollapsed ? "Open navigation" : "Close navigation"}
            aria-expanded={!navCollapsed}
            onClick={() => setNavCollapsed((value) => !value)}
          >
            <span />
            <span />
            <span />
          </button>
          <Link className="brand" href="/" onClick={() => scheduleNavigationClose()}>
            <div className="brand-mark">FM</div>
            <div className="brand-copy">
              <h1>FriendMarket</h1>
              <p>Social markets desk</p>
            </div>
          </Link>
          <div className="top-account-strip" aria-label="Account summary">
            <Link className="top-account-metric" href="/portfolio">
              <span>Balance</span>
              <strong>{money(state.currentUser.play_credit_balance)}</strong>
            </Link>
            <Link className="top-account-metric" href="/portfolio">
              <span>Positions</span>
              <strong>{openPositions}</strong>
            </Link>
            <Link className="btn btn-primary top-deposit-button" href="/deposit">
              Deposit
            </Link>
          </div>
          <div className={`nav-actions ${navCollapsed ? "collapsed" : "expanded"}`}>
            <nav className={`nav-links ${state.mobileNavOpen ? "open" : ""}`} aria-label="Primary">
              <Link
                className={`nav-link ${pathname === "/" ? "active" : ""}`}
                href="/"
                aria-current={pathname === "/" ? "page" : undefined}
                onClick={() => scheduleNavigationClose()}
              >
                Home
              </Link>
              {routes.map(([path, label]) => (
                <Link
                  key={path}
                  className={`nav-link ${isActive(path) ? "active" : ""}`}
                  href={path}
                  aria-current={isActive(path) ? "page" : undefined}
                  onClick={() => scheduleNavigationClose()}
                >
                  {label}
                </Link>
              ))}
              <div className="nav-flyout-item">
                <Link
                  className={`nav-link ${pathname === "/settings" ? "active" : ""}`}
                  href="/settings"
                  aria-current={pathname === "/settings" ? "page" : undefined}
                  onClick={() => scheduleNavigationClose()}
                >
                  Settings
                </Link>
                <div className="nav-flyout" aria-label="Settings sections">
                  {settingsRoutes.map(([path, label]) => (
                    <Link className="nav-flyout-link" href={path} key={path} onClick={() => scheduleNavigationClose()}>
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
              {state.currentUser.isAdmin ? (
                <Link
                  className={`nav-link admin-link ${pathname === "/admin" ? "active" : ""}`}
                  href="/admin"
                  aria-current={pathname === "/admin" ? "page" : undefined}
                  onClick={() => scheduleNavigationClose()}
                >
                  Admin
                </Link>
              ) : null}
            </nav>
            {state.auth.devAdminShortcut ? (
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={state.currentUser.isAdmin}
                  onChange={handleAdminToggle}
                />
                <span>Dev admin</span>
              </label>
            ) : null}
            {state.auth.authenticated ? (
              <button className="btn btn-ghost" type="button" disabled={sessionPending} onClick={logout}>
                {sessionPending ? "Logging out..." : "Log out"}
              </button>
            ) : (
              <Link className="btn btn-ghost" href="/login" onClick={() => scheduleNavigationClose()}>
                Log in
              </Link>
            )}
            <button className="btn btn-ghost theme-toggle" type="button" onClick={actions.toggleTheme}>
              {state.theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
          </div>
        </div>
      </header>
      <main className="page-wrap">
        {state.flashMessage ? (
          <div className="note-banner flash-banner">
            <div className="row-between">
              <span>{state.flashMessage}</span>
              <button className="btn btn-ghost" type="button" onClick={actions.dismissFlashMessage}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
        {children}
      </main>
      <footer className="footer-wrap">
        <p>FriendMarket keeps market prices, balances, boosts, and audit state in one workspace.</p>
      </footer>
    </div>
  );
}
