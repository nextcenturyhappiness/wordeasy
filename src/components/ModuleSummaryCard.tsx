import { Link } from "react-router-dom";

import type { ModuleSummary } from "../application/contracts";
import { essentialMedicalQuotaCopy, medicalQuotaCopy } from "../app/categoryLabels";
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
    <article className="module-card module-card--compact" aria-labelledby={`${route}-module-title`}>
      <div>
        <p className="eyebrow">Module</p>
        <h2
          id={`${route}-module-title`}
          lang={summary.module === "essential_medical" ? "zh-CN" : undefined}
        >
          {moduleName}
        </h2>
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
      {summary.module === "medical_english" ? (
        <p className="muted-copy" lang="zh-CN">
          {medicalQuotaCopy()}
        </p>
      ) : null}
      {summary.module === "essential_medical" ? (
        <p className="muted-copy" lang="zh-CN">
          {essentialMedicalQuotaCopy()}
        </p>
      ) : null}
      <Link
        className="button button--secondary"
        to={`/today/${route}`}
        onFocus={warmTodayRoute}
        onPointerEnter={warmTodayRoute}
      >
        Continue <span className="sr-only">{moduleName}</span>
      </Link>
    </article>
  );
}
