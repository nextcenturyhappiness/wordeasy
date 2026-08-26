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
