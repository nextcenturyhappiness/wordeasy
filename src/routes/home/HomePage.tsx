import { ModuleSummaryCard } from "../../components/ModuleSummaryCard";
import { SyncStatus } from "../../components/SyncStatus";
import { useLearningApp } from "../../app/LearningAppContext";

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
  const { home, syncState } = useLearningApp();

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
    return (
      <section className="home-page panel panel--centered">
        <p className="eyebrow">Saved progress</p>
        <h1>No learning day is cached on this device.</h1>
        <p>Connect once to receive an assignment. No replacement cards were generated.</p>
        <SyncStatus state={syncState} />
      </section>
    );
  }

  const { snapshot } = home;

  return (
    <section className="home-page">
      <header className="home-heading">
        <div>
          <p className="eyebrow">{snapshot.studyDate}</p>
          <h1>{greetingFor(snapshot.timezone)}</h1>
        </div>
        <SyncStatus state={syncState} />
      </header>

      <div className="module-grid">
        <ModuleSummaryCard summary={snapshot.modules.research_english} />
        <ModuleSummaryCard summary={snapshot.modules.medical_english} />
      </div>

      <p className="streak-line">
        <strong>{snapshot.streak}</strong> {snapshot.streak === 1 ? "day" : "days"} in your current
        streak
      </p>
    </section>
  );
}
