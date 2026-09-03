import { Link } from "react-router-dom";

import type { ContextCardView } from "../application/contracts";
import { getModuleName, getModuleRoute } from "../app/moduleRoutes";
import { preloadStudyRoute } from "../app/lazyRoutes";
import type { NextSessionTarget } from "../app/nextSession";

interface NextSessionCardProps {
  target: NextSessionTarget | null;
  nextCard: ContextCardView | null;
}

function warmStudyRoute() {
  void preloadStudyRoute().catch(() => {
    // Navigation retries the lazy import and the app boundary handles a real failure.
  });
}

function queueLabel(target: NextSessionTarget): string {
  if (target.queue === "review") {
    return `${String(target.remainingReview)} ${target.remainingReview === 1 ? "review" : "reviews"} due`;
  }

  return `${String(target.remainingNew)} ${target.remainingNew === 1 ? "new card" : "new cards"}`;
}

export function NextSessionCard({ target, nextCard }: NextSessionCardProps) {
  if (target === null) {
    return (
      <section
        className="next-session next-session--secondary next-session--empty"
        aria-labelledby="next-session-title"
      >
        <p className="eyebrow">Study</p>
        <h2 id="next-session-title">Nothing is due right now.</h2>
        <p className="muted-copy">
          Today&apos;s New and Review queues are clear. The next Context Card will appear here when
          it is due.
        </p>
      </section>
    );
  }

  const moduleName = getModuleName(target.module);
  const href = `/study/${getModuleRoute(target.module)}?queue=${target.queue}`;

  return (
    <section className="next-session next-session--secondary" aria-labelledby="next-session-title">
      <p className="eyebrow">Next session</p>
      <h2 id="next-session-title">Start the next card</h2>
      <p className="next-session__queue">
        {moduleName} · {target.queue === "review" ? "Review" : "New"} · {queueLabel(target)}
      </p>
      {nextCard === null ? (
        <p className="next-session__sentence muted-copy">
          Start the next assigned Context Card. The sentence appears here once this device has
          cached it.
        </p>
      ) : (
        <blockquote className="next-session__sentence">{nextCard.contextSentence}</blockquote>
      )}
      <Link
        className="button button--secondary"
        to={href}
        onFocus={warmStudyRoute}
        onPointerEnter={warmStudyRoute}
      >
        Start next session
      </Link>
    </section>
  );
}
