import { Suspense, useEffect } from "react";
import { Link, Outlet } from "react-router-dom";

import { PwaUpdateNotice } from "../components/PwaUpdateNotice";
import { markPerformanceAfterPaint } from "../application/performance";
import { useOptionalAuthSession } from "./AuthSessionContext";

function RouteLoading() {
  return (
    <section className="route-state" aria-busy="true" aria-live="polite">
      <p>Opening your saved learning view…</p>
    </section>
  );
}

export function AppShell({
  authenticationEnabled,
  environmentNotice
}: {
  authenticationEnabled: boolean;
  environmentNotice?: string;
}) {
  const auth = useOptionalAuthSession();
  const remoteNotice =
    auth?.remoteSession.status === "unavailable" ? auth.remoteSession.message : null;

  useEffect(() => markPerformanceAfterPaint("app-shell-visible"), []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to learning content
      </a>
      <header className="app-header">
        <Link className="wordmark" to="/" aria-label="wordeasy home">
          wordeasy
        </Link>
        {authenticationEnabled ? (
          <nav className="app-nav" aria-label="Primary navigation">
            <Link to="/">Home</Link>
            <Link to={auth?.session.status === "authenticated" ? "/settings" : "/login"}>
              {auth?.session.status === "authenticated" ? "Settings" : "Sign in"}
            </Link>
          </nav>
        ) : null}
      </header>
      {environmentNotice === undefined ? null : (
        <div className="app-status-notice" role="status" aria-label="Deployment status">
          {environmentNotice}
        </div>
      )}
      {remoteNotice === null ? null : (
        <div className="app-status-notice" role="status">
          {remoteNotice}
        </div>
      )}
      <PwaUpdateNotice />
      <main className="app-main" id="main-content" tabIndex={-1}>
        <Suspense fallback={<RouteLoading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
