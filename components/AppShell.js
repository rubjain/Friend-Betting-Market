"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFriendMarket } from "../context/FriendMarketContext";

const routes = [
  ["/markets", "Markets"],
  ["/friends", "Friends"],
  ["/portfolio", "Portfolio"],
  ["/create", "Create Market"],
  ["/profile", "Profile"],
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, actions } = useFriendMarket();
  const [sessionPending, setSessionPending] = useState(false);

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

  return (
    <div className="shell" data-theme={state.theme}>
      <header className="site-header">
        <div className="nav-wrap">
          <Link className="brand" href="/" onClick={actions.closeMobileNav}>
            <div className="brand-mark">FM</div>
            <div className="brand-copy">
              <h1>FriendMarket</h1>
              <p>Social prediction markets, designed for trust.</p>
            </div>
          </Link>
          <button
            className="btn btn-ghost mobile-menu-button"
            type="button"
            aria-expanded={state.mobileNavOpen}
            onClick={actions.toggleMobileNav}
          >
            {state.mobileNavOpen ? "Close" : "Menu"}
          </button>
          <div className="nav-actions">
            <nav className={`nav-links ${state.mobileNavOpen ? "open" : ""}`} aria-label="Primary">
              <Link
                className={`nav-link ${pathname === "/" ? "active" : ""}`}
                href="/"
                aria-current={pathname === "/" ? "page" : undefined}
                onClick={actions.closeMobileNav}
              >
                Home
              </Link>
              {routes.map(([path, label]) => (
                <Link
                  key={path}
                  className={`nav-link ${isActive(path) ? "active" : ""}`}
                  href={path}
                  aria-current={isActive(path) ? "page" : undefined}
                  onClick={actions.closeMobileNav}
                >
                  {label}
                </Link>
              ))}
              {state.currentUser.isAdmin ? (
                <Link
                  className={`nav-link admin-link ${pathname === "/admin" ? "active" : ""}`}
                  href="/admin"
                  aria-current={pathname === "/admin" ? "page" : undefined}
                  onClick={actions.closeMobileNav}
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
              <Link className="btn btn-ghost" href="/profile" onClick={actions.closeMobileNav}>
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
        <p>
          FriendMarket MVP prototype for a responsive web app with separate withdrawable and bonus
          ledger balances.
        </p>
      </footer>
    </div>
  );
}
