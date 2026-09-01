import type { HomeSnapshot, LearningRepository, ModuleSlug } from "../application/contracts";
import { selectNextSession } from "./nextSession";
import { preloadStudyRoute, preloadTodayRoute } from "./lazyRoutes";

export function selectHomePrefetchModule(snapshot: HomeSnapshot): ModuleSlug | null {
  return selectNextSession(snapshot)?.module ?? null;
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
