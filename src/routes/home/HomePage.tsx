import { useEffect, useState } from "react";

import { ModuleSummaryCard } from "../../components/ModuleSummaryCard";
import { LexiconSearch } from "../../components/LexiconSearch";
import { SyncStatus } from "../../components/SyncStatus";
import { useLearningApp } from "../../app/LearningAppContext";
import { prefetchHomeLearning, scheduleIdlePrefetch } from "../../app/homePrefetch";
import { homeModuleOrder } from "../../app/moduleRoutes";
import { markPerformanceAfterPaint, measurePerformance } from "../../application/performance";

function greetingFor(timeZone: string): string {
  try {
    const hourPart = new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone
    })
      .formatToParts(new Date())
      .find((part) => part.type === "hour");
    const hour = Number(hourPart?.value ?? 12);

    if (hour < 12) {
      return "Good morning";
    }

    if (hour < 18) {
      return "Good afternoon";
    }

    return "Good evening";
  } catch {
    return "Welcome back";
  }
}

export function HomePage() {
  const { home, repository, syncState, syncNow } = useLearningApp();
  const [localLexiconAvailable, setLocalLexiconAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    void repository
      .hasLocalLexicon()
      .then((available) => {
        if (active) {
          setLocalLexiconAvailable(available);
        }
      })
      .catch(() => {
        if (active) {
          setLocalLexiconAvailable(false);
        }
      });
    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    if (home.status !== "ready") {
      return;
    }

    const snapshot = home.snapshot;
    let active = true;
    let cancelIdlePrefetch: () => void = () => undefined;

    const cancelAfterPaint = markPerformanceAfterPaint("cached-home-ready", () => {
      measurePerformance("app-shell-to-cached-home", "app-shell-visible", "cached-home-ready");
      if (!active) {
        return;
      }
      cancelIdlePrefetch = scheduleIdlePrefetch(() => {
        void prefetchHomeLearning(repository, snapshot);
      });
    });

    return () => {
      active = false;
      cancelAfterPaint();
      cancelIdlePrefetch();
    };
  }, [home, repository]);

  const triggerSync = () => {
    void syncNow().catch(() => undefined);
  };

  if (home.status === "loading") {
    return (
      <section className="home-page route-state" aria-busy="true" aria-live="polite">
        <p className="eyebrow">Saved progress</p>
        <h1>Opening your learning day…</h1>
        <p>Reading the summary stored on this device.</p>
      </section>
    );
  }

  if (home.status === "error") {
    return (
      <section className="home-page panel panel--centered" role="alert">
        <p className="eyebrow">Local data unavailable</p>
        <h1>Your saved progress could not be opened.</h1>
        <p>{home.message}</p>
      </section>
    );
  }

  if (home.status === "empty") {
    if (localLexiconAvailable) {
      return (
        <section className="home-page">
          <header className="home-heading">
            <div>
              <p className="eyebrow">Saved progress</p>
              <h1>No learning day is cached on this device.</h1>
            </div>
            <SyncStatus state={syncState} onSync={triggerSync} />
          </header>
          <LexiconSearch repository={repository} />
          <p>Connect once to receive an assignment. No replacement cards were generated.</p>
        </section>
      );
    }

    return (
      <section className="home-page panel panel--centered">
        <p className="eyebrow">Saved progress</p>
        <h1>No learning day is cached on this device.</h1>
        <p>Connect once to receive an assignment. No replacement cards were generated.</p>
        <SyncStatus state={syncState} onSync={triggerSync} />
      </section>
    );
  }

  const { snapshot } = home;
  const moduleOrder = homeModuleOrder();

  return (
    <section className="home-page">
      <header className="home-heading">
        <div>
          <p className="eyebrow">{snapshot.studyDate}</p>
          <h1>{greetingFor(snapshot.timezone)}</h1>
        </div>
        <SyncStatus state={syncState} onSync={triggerSync} />
      </header>

      <LexiconSearch repository={repository} />

      <div className="module-grid">
        {moduleOrder.map((module) => (
          <ModuleSummaryCard key={module} summary={snapshot.modules[module]} />
        ))}
      </div>

      <p className="streak-line">
        <strong>{snapshot.streak}</strong> {snapshot.streak === 1 ? "day" : "days"} in your current
        streak
      </p>
    </section>
  );
}
