import { useEffect } from "react";

import { markPerformanceAfterPaint } from "../application/performance";

export function BootstrapShell() {
  useEffect(() => {
    markPerformanceAfterPaint("app-shell-visible");
  }, []);

  return (
    <div className="app-shell" aria-busy="true">
      <header className="app-header">
        <span className="wordmark">wordeasy</span>
      </header>
      <main className="app-main">
        <section className="panel panel--centered" aria-live="polite">
          <p className="eyebrow">Opening your local library</p>
          <h1>Context first. Progress stays on this device.</h1>
          <p className="muted-copy">Loading today&rsquo;s cached learning plan…</p>
        </section>
      </main>
    </div>
  );
}

export function ConfigurationFailure({ message }: { message: string }) {
  return (
    <div className="fatal-error" role="alert">
      <section className="panel panel--centered">
        <p className="eyebrow">Configuration needed</p>
        <h1>wordeasy could not open.</h1>
        <p>{message}</p>
      </section>
    </div>
  );
}
