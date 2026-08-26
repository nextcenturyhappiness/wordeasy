import { Link } from "react-router-dom";

import type { ModuleSummary } from "../application/contracts";
import { getModuleName, getModuleRoute } from "../app/moduleRoutes";
import { preloadTodayRoute } from "../app/lazyRoutes";

interface ModuleSummaryCardProps {
  summary: ModuleSummary;
}

function warmTodayRoute() {
  void preloadTodayRoute().catch(() => {
    // Navigation retries the lazy import and the app boundary handles a real failure.
  });
}

export function ModuleSummaryCard({ summary }: ModuleSummaryCardProps) {
  const moduleName = getModuleName(summary.module);
  const route = getModuleRoute(summary.module);

  return (
    <article className="module-card" aria-labelledby={`${route}-module-title`}>
      <div>
        <p className="eyebrow">Learning module</p>
        <h2 id={`${route}-module-title`}>{moduleName}</h2>
      </div>
      <p className="module-card__progress">
        <strong>
          {summary.new.completed} / {summary.new.total}
        </strong>{" "}
        new today
      </p>
      <p className="muted-copy">
        {summary.wordsLearned} {summary.wordsLearned === 1 ? "word" : "words"} learned
      </p>
      <Link
        className="button button--primary"
        to={`/today/${route}`}
        onFocus={warmTodayRoute}
        onPointerEnter={warmTodayRoute}
      >
        Continue <span className="sr-only">{moduleName}</span>
      </Link>
    </article>
  );
}
