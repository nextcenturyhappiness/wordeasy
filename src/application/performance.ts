const recordedMarks = new Set<string>();

function canMark(): boolean {
  return typeof performance !== "undefined" && typeof performance.mark === "function";
}

export function markPerformanceOnce(name: string): void {
  if (!canMark() || recordedMarks.has(name)) {
    return;
  }
  recordedMarks.add(name);
  performance.mark(name);
}

export function markPerformanceAfterPaint(name: string, onMarked?: () => void): () => void {
  if (typeof requestAnimationFrame !== "function") {
    markPerformanceOnce(name);
    onMarked?.();
    return () => undefined;
  }

  let secondFrame = 0;
  let afterPaintTask: ReturnType<typeof setTimeout> | undefined;
  let paintObserver: PerformanceObserver | undefined;
  const recordVisibleMark = (): void => {
    markPerformanceOnce(name);
    onMarked?.();
  };
  const firstFrame = requestAnimationFrame(() => {
    secondFrame = requestAnimationFrame(() => {
      // rAF callbacks run before the frame is painted. Queue a task from the
      // second frame, then wait for FCP evidence when the Paint Timing API is
      // available, so the mark describes committed, visibly painted UI.
      afterPaintTask = setTimeout(() => {
        const hasPaintEvidence =
          typeof performance.getEntriesByName === "function" &&
          performance.getEntriesByName("first-contentful-paint", "paint").length > 0;
        if (hasPaintEvidence || typeof PerformanceObserver === "undefined") {
          recordVisibleMark();
          return;
        }
        try {
          paintObserver = new PerformanceObserver((entries, observer) => {
            if (entries.getEntries().some((entry) => entry.name === "first-contentful-paint")) {
              observer.disconnect();
              paintObserver = undefined;
              recordVisibleMark();
            }
          });
          paintObserver.observe({ type: "paint", buffered: true });
        } catch {
          recordVisibleMark();
        }
      }, 0);
    });
  });

  return () => {
    cancelAnimationFrame(firstFrame);
    if (secondFrame !== 0) {
      cancelAnimationFrame(secondFrame);
    }
    if (afterPaintTask !== undefined) {
      clearTimeout(afterPaintTask);
    }
    paintObserver?.disconnect();
  };
}

export function measurePerformance(name: string, startMark: string, endMark: string): void {
  if (
    typeof performance === "undefined" ||
    typeof performance.measure !== "function" ||
    !recordedMarks.has(startMark) ||
    !recordedMarks.has(endMark)
  ) {
    return;
  }
  performance.measure(name, startMark, endMark);
}
