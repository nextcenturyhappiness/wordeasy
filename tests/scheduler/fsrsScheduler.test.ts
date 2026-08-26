import { describe, expect, it } from "vitest";

import type { SchedulerCard } from "../../src/application/contracts";
import {
  FSRS_IMPLEMENTATION_VERSION,
  FsrsSchedulerAdapter
} from "../../src/scheduler/fsrsScheduler";

describe("FsrsSchedulerAdapter", () => {
  const now = new Date("2026-08-26T08:00:00.000Z");
  const newCard: SchedulerCard = { state: {}, dueAt: null, revision: 0 };

  it("keeps the precise package version and third-party state behind the adapter", () => {
    const scheduler = new FsrsSchedulerAdapter();

    expect(scheduler.implementationVersion).toBe("ts-fsrs@5.4.1/default-v1");
    expect(FSRS_IMPLEMENTATION_VERSION).toBe(scheduler.implementationVersion);

    const preview = scheduler.preview(newCard, now);
    expect(Object.keys(preview.intervals)).toEqual(["again", "hard", "good", "easy"]);
    for (const dueAt of Object.values(preview.intervals)) {
      expect(new Date(dueAt).toISOString()).toBe(dueAt);
    }
  });

  it("rates a persisted scheduler state without exposing ts-fsrs types", () => {
    const scheduler = new FsrsSchedulerAdapter();
    const first = scheduler.rate(newCard, "good", now);
    const second = scheduler.rate(
      { state: first.stateAfter, dueAt: first.dueAt, revision: 1 },
      "again",
      new Date(first.dueAt)
    );

    expect(first.stateBefore.format).toBe("wordeasy-fsrs-card-v1");
    expect(first.stateAfter.format).toBe("wordeasy-fsrs-card-v1");
    expect(second.stateBefore).toEqual(first.stateAfter);
    expect(new Date(second.dueAt).getTime()).toBeGreaterThanOrEqual(
      new Date(first.dueAt).getTime()
    );
  });

  it("surfaces an unsupported persisted scheduler format", () => {
    const scheduler = new FsrsSchedulerAdapter();
    expect(() =>
      scheduler.rate({ state: { format: "unknown" }, dueAt: null, revision: 1 }, "good", now)
    ).toThrow("Unsupported persisted FSRS state format");
  });
});
