import { Suspense } from "react";
import { Link, Outlet } from "react-router-dom";

function RouteLoading() {
  return (
    <section className="route-state" aria-busy="true" aria-live="polite">
      <p>Opening your saved learning view…</p>
    </section>
  );
}

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to learning content
      </a>
      <header className="app-header">
        <Link className="wordmark" to="/" aria-label="Article English home">
          Article English
        </Link>
      </header>
      <main className="app-main" id="main-content" tabIndex={-1}>
        <Suspense fallback={<RouteLoading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
