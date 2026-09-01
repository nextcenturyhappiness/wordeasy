import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import type { ContextCardView, QueueKind, ReviewRating } from "../../application/contracts";
import { markPerformanceAfterPaint, measurePerformance } from "../../application/performance";
import { useLearningApp } from "../../app/LearningAppContext";
import { getModuleName, getModuleRoute, parseModuleRoute } from "../../app/moduleRoutes";
import { ContextCard } from "../../components/ContextCard";
import { RatingControls } from "../../components/RatingControls";
import { RouteNotice } from "../../components/RouteNotice";
import { SyncStatus } from "../../components/SyncStatus";
import { setPwaUpdateSafety } from "../../pwa/updateCoordinator";

type StudyPhase = "prompt" | "revealed" | "committing" | "completed";

type QueueResource =
  | { status: "loading" }
  | { status: "ready"; routeKey: string; studyDate: string; cards: ContextCardView[] }
  | { status: "error"; routeKey: string; message: string };

const loadingQueueResource: QueueResource = { status: "loading" };

const ratingKeys: Partial<Record<string, ReviewRating>> = {
  "1": "again",
  "2": "hard",
  "3": "good",
  "4": "easy"
};

function parseQueueKind(value: string | null): QueueKind | null {
  if (value === null) {
    return "new";
  }

  return value === "new" || value === "review" ? value : null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

function localSaveMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return `Your answer was not saved locally. ${error.message}`;
  }

  return "Your answer was not saved locally. Try again before moving on.";
}

export function StudyPage() {
  const { module: moduleParam } = useParams();
  const [searchParams] = useSearchParams();
  const module = parseModuleRoute(moduleParam);
  const queue = parseQueueKind(searchParams.get("queue"));
  const routeKey = module === null || queue === null ? null : `${module}:${queue}`;
  const { repository, ensureInitialized, applyRatingResult, syncState } = useLearningApp();
  const [resource, setResource] = useState<QueueResource>({ status: "loading" });
  const [cardIndex, setCardIndex] = useState(0);
  const [phase, setPhase] = useState<StudyPhase>("prompt");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const commitLockRef = useRef(false);
  const presentationActionIdRef = useRef(crypto.randomUUID());
  const answerRef = useRef<HTMLElement | null>(null);
  const questionRef = useRef<HTMLDivElement | null>(null);
  const sentenceAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPwaUpdateSafety(phase !== "committing");
    return () => {
      setPwaUpdateSafety(true);
    };
  }, [phase]);

  useEffect(() => {
    if (module === null || queue === null) {
      return;
    }

    const selectedModule = module;
    const selectedQueue = queue;
    const selectedRouteKey = `${selectedModule}:${selectedQueue}`;
    let active = true;

    async function loadQueue() {
      try {
        await ensureInitialized();
        const snapshot = await repository.getStudyQueue(selectedModule, selectedQueue);
        if (active) {
          setResource({
            status: "ready",
            routeKey: selectedRouteKey,
            studyDate: snapshot.studyDate,
            cards: snapshot.cards
          });
          setCardIndex(0);
          setPhase(snapshot.cards.length === 0 ? "completed" : "prompt");
          setSaveError(null);
          setAnnouncement("");
        }
      } catch (error) {
        if (active) {
          setResource({
            status: "error",
            routeKey: selectedRouteKey,
            message:
              error instanceof Error ? error.message : "The saved study queue could not be opened."
          });
        }
      }
    }

    void loadQueue();

    return () => {
      active = false;
    };
  }, [ensureInitialized, module, queue, repository]);

  const activeResource =
    resource.status !== "loading" && resource.routeKey === routeKey
      ? resource
      : loadingQueueResource;

  useEffect(() => {
    if (activeResource.status !== "ready" || activeResource.cards.length === 0) {
      return;
    }

    return markPerformanceAfterPaint("first-study-card-ready", () => {
      measurePerformance(
        "cached-home-to-first-study-card",
        "cached-home-ready",
        "first-study-card-ready"
      );
    });
  }, [activeResource]);

  const reveal = useCallback(() => {
    if (phase !== "prompt") {
      return;
    }

    setPhase("revealed");
    setAnnouncement("Answer revealed. Choose Again, Hard, Good, or Easy.");
  }, [phase]);

  useEffect(() => {
    if (phase !== "revealed") {
      return;
    }

    sentenceAnchorRef.current?.scrollIntoView({ block: "start", inline: "nearest" });
    answerRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const rate = useCallback(
    async (rating: ReviewRating) => {
      if (
        phase !== "revealed" ||
        commitLockRef.current ||
        activeResource.status !== "ready" ||
        module === null ||
        queue === null
      ) {
        return;
      }

      const card = activeResource.cards[cardIndex];
      if (card === undefined) {
        return;
      }

      commitLockRef.current = true;
      setPhase("committing");
      setSaveError(null);
      setAnnouncement("Saving your rating on this device…");

      try {
        const result = await repository.rateCard({
          presentationActionId: presentationActionIdRef.current,
          cardId: card.cardId,
          module,
          queue,
          studyDate: activeResource.studyDate,
          rating,
          reviewedAt: new Date().toISOString()
        });

        applyRatingResult(result);

        if (result.nextCardId === null) {
          setPhase("completed");
          setAnnouncement(`${rating} saved locally. This queue is complete.`);
          return;
        }

        const nextIndex = activeResource.cards.findIndex(
          (item) => item.cardId === result.nextCardId
        );
        const fallbackIndex = cardIndex + 1;
        const resolvedIndex = nextIndex >= 0 ? nextIndex : fallbackIndex;

        if (activeResource.cards[resolvedIndex] === undefined) {
          setPhase("completed");
          setAnnouncement(`${rating} saved locally. This queue is complete.`);
          return;
        }

        setCardIndex(resolvedIndex);
        presentationActionIdRef.current = crypto.randomUUID();
        setPhase("prompt");
        setAnnouncement(`${rating} saved locally. Next card.`);
        requestAnimationFrame(() => questionRef.current?.focus());
      } catch (error) {
        setPhase("revealed");
        setSaveError(localSaveMessage(error));
        setAnnouncement("The rating was not saved. The current card remains open.");
      } finally {
        commitLockRef.current = false;
      }
    },
    [activeResource, applyRatingResult, cardIndex, module, phase, queue, repository]
  );

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || isEditableTarget(event.target)) {
        return;
      }

      if ((event.code === "Space" || event.key === " ") && phase === "prompt") {
        event.preventDefault();
        reveal();
        return;
      }

      const rating = ratingKeys[event.key];
      if (rating !== undefined && phase === "revealed") {
        event.preventDefault();
        void rate(rating);
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, [phase, rate, reveal]);

  if (module === null) {
    return (
      <RouteNotice
        eyebrow="Unknown module"
        title="This learning module does not exist."
        message="Choose Research English or Medical English from Home."
      />
    );
  }

  if (queue === null) {
    return (
      <RouteNotice
        eyebrow="Unknown queue"
        title="Choose New or Review."
        message="Open Today to continue with a stable assigned queue."
      />
    );
  }

  const moduleName = getModuleName(module);
  const moduleRoute = getModuleRoute(module);

  if (activeResource.status === "loading") {
    return (
      <section className="study-page route-state" aria-busy="true" aria-live="polite">
        <p className="eyebrow">{moduleName}</p>
        <h1>Opening your saved cards…</h1>
      </section>
    );
  }

  if (activeResource.status === "error") {
    const offline = syncState.status === "offline";

    return (
      <section className="study-page panel panel--centered" role="alert">
        <p className="eyebrow">{moduleName}</p>
        <h1>
          {offline
            ? "These cards are not cached for offline study."
            : "The queue could not be opened."}
        </h1>
        <p>
          {offline
            ? "Reconnect once to cache the stable assignment. No replacement cards were generated."
            : activeResource.message}
        </p>
        <Link className="button button--secondary" to={`/today/${moduleRoute}`}>
          Return to Today
        </Link>
      </section>
    );
  }

  if (phase === "completed" || activeResource.cards.length === 0) {
    return (
      <section className="study-page panel panel--centered">
        <p className="eyebrow">{moduleName}</p>
        <h1>
          {activeResource.cards.length === 0 ? "No cards are in this queue." : "Queue complete."}
        </h1>
        <p>
          {activeResource.cards.length === 0
            ? queue === "new"
              ? "No new cards are assigned today."
              : "No reviews are due today."
            : "Every assigned card in this queue has been saved locally."}
        </p>
        <SyncStatus state={syncState} />
        <Link className="button button--primary" to={`/today/${moduleRoute}`}>
          Return to Today
        </Link>
      </section>
    );
  }

  const card = activeResource.cards[cardIndex];
  if (card === undefined) {
    return null;
  }

  const revealed = phase === "revealed" || phase === "committing";

  return (
    <section className="study-page">
      <header className="study-heading">
        <div>
          <Link className="back-link" to={`/today/${moduleRoute}`}>
            ← {moduleName} Today
          </Link>
          <p className="eyebrow">
            {queue === "new" ? "New" : "Review"} · Card {cardIndex + 1} of{" "}
            {activeResource.cards.length}
          </p>
        </div>
        <SyncStatus state={syncState} />
      </header>

      <div ref={questionRef} tabIndex={-1}>
        <ContextCard
          card={card}
          revealed={revealed}
          answerRef={answerRef}
          sentenceAnchorRef={sentenceAnchorRef}
        />
      </div>

      {saveError === null ? null : (
        <div className="notice notice--error" role="alert" id="rating-error">
          <strong>Not saved</strong>
          <p>{saveError}</p>
        </div>
      )}

      <div className="study-actions">
        {revealed ? (
          <RatingControls
            disabled={phase === "committing"}
            onRate={(rating) => {
              void rate(rating);
            }}
          />
        ) : (
          <button
            className="button button--primary reveal-button"
            type="button"
            aria-controls="context-answer"
            aria-expanded="false"
            aria-keyshortcuts="Space"
            onClick={reveal}
          >
            Reveal answer <kbd aria-hidden="true">Space</kbd>
          </button>
        )}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </section>
  );
}

export default StudyPage;
