import type { HomeSnapshot, ModuleSlug, Progress, QueueKind } from "../application/contracts";

const MODULE_ORDER: readonly ModuleSlug[] = ["research_english", "medical_english"];

export interface NextSessionTarget {
  module: ModuleSlug;
  queue: QueueKind;
  remainingNew: number;
  remainingReview: number;
}

export function remainingProgress(progress: Progress): number {
  return Math.max(progress.total - progress.completed, 0);
}

export function moduleRemaining(summary: { new: Progress; review: Progress }): number {
  return remainingProgress(summary.new) + remainingProgress(summary.review);
}

export function selectNextSession(snapshot: HomeSnapshot): NextSessionTarget | null {
  let selected: ModuleSlug | null = null;
  let selectedRemaining = 0;

  for (const module of MODULE_ORDER) {
    const remaining = moduleRemaining(snapshot.modules[module]);
    if (remaining > selectedRemaining) {
      selected = module;
      selectedRemaining = remaining;
    }
  }

  if (selected === null) {
    return null;
  }

  const summary = snapshot.modules[selected];
  const remainingNew = remainingProgress(summary.new);
  const remainingReview = remainingProgress(summary.review);
  if (remainingNew === 0 && remainingReview === 0) {
    return null;
  }

  return {
    module: selected,
    queue: remainingReview > 0 ? "review" : "new",
    remainingNew,
    remainingReview
  };
}
