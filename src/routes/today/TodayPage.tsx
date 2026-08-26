import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import type { ModuleSlug, QueueKind, TodaySnapshot } from "../../application/contracts";
import { preloadStudyRoute } from "../../app/lazyRoutes";
import { getModuleName, getModuleRoute, parseModuleRoute } from "../../app/moduleRoutes";
import { useLearningApp } from "../../app/LearningAppContext";
import { ProgressBreakdown } from "../../components/ProgressBreakdown";
import { RouteNotice } from "../../components/RouteNotice";
import { SyncStatus } from "../../components/SyncStatus";

type TodayResource =
  | { status: "loading" }
  | { status: "ready"; module: ModuleSlug; snapshot: TodaySnapshot }
  | { status: "error"; module: ModuleSlug; message: string };

const loadingTodayResource: TodayResource = { status: "loading" };

function learningErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Today’s saved assignment could not be opened.";
}

function warmStudyRoute() {
  void preloadStudyRoute().catch(() => {
    // Navigation retries the lazy import and the app boundary handles a real failure.
  });
}

function QueueAction({
  module,
  queue,
  completed,
  total,
  blocked
}: {
  module: ModuleSlug;
  queue: QueueKind;
  completed: number;
  total: number;
  blocked: boolean;
}) {
  const moduleRoute = getModuleRoute(module);
  const title = queue === "new" ? "New" : "Review";

  if (blocked) {
    return <p>New cards are unavailable until the content shortage is resolved.</p>;
  }

  if (total === 0) {
    return (
      <p>{queue === "new" ? "No new words are assigned today." : "No reviews are due today."}</p>
    );
  }

  if (completed >= total) {
    return <p>{title} completed for today.</p>;
  }

  return (
    <Link
      className="button button--secondary"
      to={`/study/${moduleRoute}?queue=${queue}`}
      onFocus={warmStudyRoute}
      onPointerEnter={warmStudyRoute}
    >
      Continue {title}
    </Link>
  );
}

export function TodayPage() {
  const { module: moduleParam } = useParams();
  const module = parseModuleRoute(moduleParam);
  const { repository, ensureInitialized, syncState } = useLearningApp();
  const [resource, setResource] = useState<TodayResource>({ status: "loading" });

  useEffect(() => {
    if (module === null) {
      return;
    }

    const selectedModule = module;
    let active = true;

    async function loadToday() {
      try {
        await ensureInitialized();
        const snapshot = await repository.getToday(selectedModule);
        if (active) {
          setResource({ status: "ready", module: selectedModule, snapshot });
        }
      } catch (error) {
        if (active) {
          setResource({
            status: "error",
            module: selectedModule,
            message: learningErrorMessage(error)
          });
        }
      }
    }

    void loadToday();

    return () => {
      active = false;
    };
  }, [ensureInitialized, module, repository]);

  if (module === null) {
    return (
      <RouteNotice
        eyebrow="Unknown module"
        title="This learning module does not exist."
        message="Choose Research English or Medical English from Home."
      />
    );
  }

  const moduleName = getModuleName(module);
  const activeResource =
    resource.status !== "loading" && resource.module === module ? resource : loadingTodayResource;

  if (activeResource.status === "loading") {
    return (
      <section className="today-page route-state" aria-busy="true" aria-live="polite">
        <p className="eyebrow">{moduleName}</p>
        <h1>Opening Today…</h1>
        <p>Reading the stable assignment saved on this device.</p>
      </section>
    );
  }

  if (activeResource.status === "error") {
    const offline = syncState.status === "offline";

    return (
      <section className="today-page panel panel--centered" role="alert">
        <p className="eyebrow">{moduleName}</p>
        <h1>{offline ? "Today is not cached on this device." : "Today could not be opened."}</h1>
        <p>
          {offline
            ? "Reconnect once to download the stable assignment. No replacement cards were generated."
            : activeResource.message}
        </p>
        <SyncStatus state={syncState} />
      </section>
    );
  }

  const { snapshot } = activeResource;
  const noAssignments = snapshot.new.total === 0 && snapshot.review.total === 0;

  return (
    <section className="today-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{moduleName}</span>
      </nav>

      <header className="today-heading">
        <div>
          <p className="eyebrow">{moduleName}</p>
          <h1>Today</h1>
        </div>
        <SyncStatus state={syncState} />
      </header>

      {snapshot.contentShortage === null ? null : (
        <div className="notice notice--warning" role="alert">
          <strong>Not enough new cards</strong>
          <p>{snapshot.contentShortage.message}</p>
        </div>
      )}

      {noAssignments && snapshot.contentShortage === null ? (
        <div className="notice" role="status">
          Nothing is assigned for this learning day.
        </div>
      ) : null}

      <ProgressBreakdown newProgress={snapshot.new} reviewProgress={snapshot.review} />

      <div className="queue-grid">
        <section className="queue-card" aria-labelledby="new-queue-title">
          <p className="eyebrow">Assigned cards</p>
          <h2 id="new-queue-title">New</h2>
          <p className="queue-card__count">
            {snapshot.new.completed} of {snapshot.new.total} completed
          </p>
          <QueueAction
            module={module}
            queue="new"
            completed={snapshot.new.completed}
            total={snapshot.new.total}
            blocked={snapshot.contentShortage !== null}
          />
        </section>

        <section className="queue-card" aria-labelledby="review-queue-title">
          <p className="eyebrow">Due cards</p>
          <h2 id="review-queue-title">Review</h2>
          <p className="queue-card__count">
            {snapshot.review.completed} of {snapshot.review.total} completed
          </p>
          <QueueAction
            module={module}
            queue="review"
            completed={snapshot.review.completed}
            total={snapshot.review.total}
            blocked={false}
          />
        </section>
      </div>
    </section>
  );
}

export default TodayPage;
