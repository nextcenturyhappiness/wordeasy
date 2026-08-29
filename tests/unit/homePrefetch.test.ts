import { afterEach, describe, expect, it, vi } from "vitest";

import { preloadStudyRoute, preloadTodayRoute } from "../../src/app/lazyRoutes";
import {
  prefetchHomeLearning,
  scheduleIdlePrefetch,
  selectHomePrefetchModule
} from "../../src/app/homePrefetch";
import { buildHomeSnapshot, createRepository } from "../ui/fixtures";

vi.mock("../../src/app/lazyRoutes", () => ({
  preloadStudyRoute: vi.fn(() => Promise.resolve()),
  preloadTodayRoute: vi.fn(() => Promise.resolve())
}));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Home idle prefetch", () => {
  it("selects the module with the most unfinished cards and keeps the Research tie-break", () => {
    expect(selectHomePrefetchModule(buildHomeSnapshot())).toBe("research_english");
    expect(
      selectHomePrefetchModule(
        buildHomeSnapshot({
          modules: {
            research_english: {
              module: "research_english",
              new: { completed: 10, total: 10 },
              review: { completed: 18, total: 18 },
              wordsLearned: 128
            },
            medical_english: {
              module: "medical_english",
              new: { completed: 9, total: 10 },
              review: { completed: 2, total: 4 },
              wordsLearned: 74
            }
          }
        })
      )
    ).toBe("medical_english");
  });

  it("preloads both learning routes and the likely module without surfacing background errors", async () => {
    const prefetchToday = vi.fn(() => Promise.reject(new Error("background prefetch failed")));
    const repository = createRepository({ prefetchToday });

    await expect(prefetchHomeLearning(repository, buildHomeSnapshot())).resolves.toBeUndefined();

    expect(preloadTodayRoute).toHaveBeenCalledOnce();
    expect(preloadStudyRoute).toHaveBeenCalledOnce();
    expect(prefetchToday).toHaveBeenCalledWith("research_english");
  });

  it("waits for an idle callback and cancels it during cleanup", () => {
    const callback = vi.fn();
    const requestIdleCallback = vi.fn(() => 27);
    const cancelIdleCallback = vi.fn();
    vi.stubGlobal("requestIdleCallback", requestIdleCallback);
    vi.stubGlobal("cancelIdleCallback", cancelIdleCallback);

    const cancel = scheduleIdlePrefetch(callback);

    expect(requestIdleCallback).toHaveBeenCalledWith(callback, { timeout: 2_000 });
    expect(callback).not.toHaveBeenCalled();
    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(27);
  });

  it("uses a cancellable timer when requestIdleCallback is unavailable", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const callback = vi.fn();

    const cancel = scheduleIdlePrefetch(callback);
    vi.advanceTimersByTime(999);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();

    cancel();
  });
});
