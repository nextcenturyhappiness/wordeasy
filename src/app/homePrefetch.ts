import type { HomeSnapshot, LearningRepository, ModuleSlug } from "../application/contracts";
import { preloadStudyRoute, preloadTodayRoute } from "./lazyRoutes";

const MODULE_PREFETCH_ORDER: readonly ModuleSlug[] = ["research_english", "medical_english"];

function remaining(completed: number, total: number): number {
  return Math.max(total - completed, 0);
}

export function selectHomePrefetchModule(snapshot: HomeSnapshot): ModuleSlug | null {
  let selected: ModuleSlug | null = null;
  let selectedRemaining = 0;

  for (const module of MODULE_PREFETCH_ORDER) {
    const summary = snapshot.modules[module];
    const moduleRemaining =
      remaining(summary.new.completed, summary.new.total) +
      remaining(summary.review.completed, summary.review.total);
    if (moduleRemaining > selectedRemaining) {
      selected = module;
      selectedRemaining = moduleRemaining;
    }
  }

  return selected;
}

export async function prefetchHomeLearning(
  repository: LearningRepository,
  snapshot: HomeSnapshot
): Promise<void> {
  const module = selectHomePrefetchModule(snapshot);
  const tasks: Promise<unknown>[] = [preloadTodayRoute(), preloadStudyRoute()];
  if (module !== null) {
    tasks.push(repository.prefetchToday(module));
  }
  await Promise.allSettled(tasks);
}

export function scheduleIdlePrefetch(callback: () => void): () => void {
  const idleWindow = window as unknown as {
    cancelIdleCallback?: Window["cancelIdleCallback"];
    requestIdleCallback?: Window["requestIdleCallback"];
  };
  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(callback, { timeout: 2_000 });
    return () => {
      idleWindow.cancelIdleCallback?.(handle);
    };
  }

  const handle = window.setTimeout(callback, 1_000);
  return () => {
    window.clearTimeout(handle);
  };
}
