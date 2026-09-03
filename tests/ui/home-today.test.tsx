import { useLearningApp } from "../../src/app/LearningAppContext";
import { HomePage } from "../../src/routes/home/HomePage";
import { TodayPage } from "../../src/routes/today/TodayPage";
import type { LearningRepository } from "../../src/application/contracts";
import { act, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHomeSnapshot,
  buildTodaySnapshot,
  createRepository,
  renderWithLearningApp
} from "./fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
});

function ApplyResearchResult() {
  const { applyRatingResult } = useLearningApp();

  return (
    <button
      type="button"
      onClick={() => {
        applyRatingResult({
          eventId: "event-research-7",
          summary: {
            module: "research_english",
            new: { completed: 7, total: 10 },
            review: { completed: 12, total: 18 },
            wordsLearned: 129
          },
          nextCardId: null,
          syncStatus: "pending"
        });
      }}
    >
      Apply saved Research rating
    </button>
  );
}

function TodayRoute() {
  return (
    <Routes>
      <Route path="/today/:module" element={<TodayPage />} />
    </Routes>
  );
}

describe("Home and Today", () => {
  it("shows an honest offline empty state without inventing a Home assignment", async () => {
    const getCachedHome = vi.fn<LearningRepository["getCachedHome"]>(() => Promise.resolve(null));
    const getToday = vi.fn<LearningRepository["getToday"]>();
    const getStudyQueue = vi.fn<LearningRepository["getStudyQueue"]>();
    const repository = createRepository({
      getCachedHome,
      getToday,
      getStudyQueue
    });

    renderWithLearningApp(<HomePage />, {
      repository,
      initialHome: null,
      syncState: { status: "offline", pendingCount: 0 }
    });

    expect(
      await screen.findByRole("heading", {
        name: "No learning day is cached on this device."
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Connect once to receive an assignment. No replacement cards were generated."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Offline");
    expect(screen.queryByRole("article", { name: "Research English" })).not.toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Medical English" })).not.toBeInTheDocument();
    expect(getCachedHome).toHaveBeenCalledTimes(1);
    expect(getToday).not.toHaveBeenCalled();
    expect(getStudyQueue).not.toHaveBeenCalled();
  });

  it("shows the passed local Home snapshot with lexicon search first and a secondary next session", async () => {
    const getCachedHome = vi.fn<LearningRepository["getCachedHome"]>(() =>
      Promise.resolve(buildHomeSnapshot())
    );
    const repository = createRepository({
      initialize: vi.fn<LearningRepository["initialize"]>(() => new Promise<void>(() => undefined)),
      getCachedHome
    });
    renderWithLearningApp(<HomePage />, { repository });

    const search = screen.getByRole("search", { name: "Search learned Context Cards" });
    const nextSession = screen.getByRole("heading", { name: "Start the next card" });
    expect(search).toBeInTheDocument();
    expect(within(search).getByRole("heading", { name: "词库" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search learned Context Cards" })).toHaveAttribute(
      "placeholder",
      ""
    );
    expect(screen.queryByPlaceholderText("用中文搜学过的词")).not.toBeInTheDocument();
    expect(screen.queryByText("用中文搜学过的词")).not.toBeInTheDocument();
    expect(search.compareDocumentPosition(nextSession) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(nextSession.closest("section")).toHaveClass("next-session--secondary");
    expect(screen.getByRole("link", { name: "Start next session" })).toHaveAttribute(
      "href",
      "/study/research?queue=review"
    );
    expect(screen.getByRole("link", { name: "Continue Research English" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue Medical English" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /continue/i })).toHaveLength(2);

    const research = screen.getByRole("article", { name: "Research English" });
    const medical = screen.getByRole("article", { name: "Medical English" });

    expect(within(research).getByText("6 / 10")).toBeInTheDocument();
    expect(within(research).getByText("128 words learned")).toBeInTheDocument();
    expect(within(medical).getByText("3 / 10")).toBeInTheDocument();
    expect(within(medical).getByText("74 words learned")).toBeInTheDocument();
    expect(screen.getByText("12").closest(".streak-line")).toHaveTextContent(
      "12 days in your current streak"
    );
    expect(screen.getByRole("status")).toHaveTextContent("Synced");
    expect(getCachedHome).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "The association was substantially attenuated after adjustment for age and BMI."
      )
    ).toBeInTheDocument();
  });

  it("searches local Context Cards by Chinese gloss and English lemma", async () => {
    const user = userEvent.setup();
    const repository = createRepository();
    renderWithLearningApp(<HomePage />, { repository });

    const field = screen.getByRole("searchbox", { name: "Search learned Context Cards" });
    await user.type(field, "减弱");

    const results = await screen.findByRole("list");
    expect(within(results).getByText("attenuate")).toBeInTheDocument();
    expect(within(results).getByText("减弱；降低")).toBeInTheDocument();
    expect(
      within(results).getByText(
        "The association was substantially attenuated after adjustment for age and BMI."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("还没有学过相关的词")).not.toBeInTheDocument();

    await user.clear(field);
    await user.type(field, "xyz-not-a-learned-word");
    expect(await screen.findByText("还没有学过相关的词")).toBeInTheDocument();
    expect(screen.queryByText("attenuate")).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(field).toHaveValue("");
    expect(screen.queryByText("还没有学过相关的词")).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(field);
  });

  it("keeps Next Session below open search results and still starts the selected queue", async () => {
    const user = userEvent.setup();
    renderWithLearningApp(<HomePage />);

    const field = screen.getByRole("searchbox", { name: "Search learned Context Cards" });
    await user.type(field, "attenuate");

    const results = await screen.findByRole("list");
    const nextSession = screen.getByRole("heading", { name: "Start the next card" });
    expect(within(results).getByText("attenuate")).toBeInTheDocument();
    expect(results.compareDocumentPosition(nextSession) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(screen.getByRole("link", { name: "Start next session" })).toHaveAttribute(
      "href",
      "/study/research?queue=review"
    );
  });

  it("shows a calm empty-study state when nothing is due", () => {
    renderWithLearningApp(<HomePage />, {
      initialHome: buildHomeSnapshot({
        modules: {
          research_english: {
            module: "research_english",
            new: { completed: 10, total: 10 },
            review: { completed: 18, total: 18 },
            wordsLearned: 128
          },
          medical_english: {
            module: "medical_english",
            new: { completed: 10, total: 10 },
            review: { completed: 4, total: 4 },
            wordsLearned: 74
          }
        }
      })
    });

    expect(screen.getByRole("heading", { name: "Nothing is due right now." })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Nothing is due right now." }).closest("section")
    ).toHaveClass("next-session--secondary");
    expect(screen.queryByRole("link", { name: "Start next session" })).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Research English" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Medical English" })).toBeInTheDocument();
  });

  it("waits until after Home paint and browser idle before prefetching the likely module", () => {
    let idleCallback: IdleRequestCallback | null = null;
    const requestIdleCallback = vi.fn((callback: IdleRequestCallback) => {
      idleCallback = callback;
      return 19;
    });
    vi.stubGlobal("requestAnimationFrame", undefined);
    vi.stubGlobal("requestIdleCallback", requestIdleCallback);
    vi.stubGlobal("cancelIdleCallback", vi.fn());
    const prefetchToday = vi.fn<LearningRepository["prefetchToday"]>(() => Promise.resolve());
    const repository = createRepository({ prefetchToday });

    renderWithLearningApp(<HomePage />, { repository });

    expect(requestIdleCallback).toHaveBeenCalledOnce();
    expect(prefetchToday).not.toHaveBeenCalled();
    act(() => {
      idleCallback?.({ didTimeout: false, timeRemaining: () => 50 });
    });
    expect(prefetchToday).toHaveBeenCalledWith("research_english");
  });

  it("updates only the rated module and leaves the other module unchanged", async () => {
    const user = userEvent.setup();
    renderWithLearningApp(
      <>
        <HomePage />
        <ApplyResearchResult />
      </>
    );

    await user.click(screen.getByRole("button", { name: /apply saved research rating/i }));

    const research = screen.getByRole("article", { name: "Research English" });
    const medical = screen.getByRole("article", { name: "Medical English" });
    expect(within(research).getByText("7 / 10")).toBeInTheDocument();
    expect(within(medical).getByText("3 / 10")).toBeInTheDocument();
  });

  it("describes local-only persistence without offering a fake cloud sync", async () => {
    const user = userEvent.setup();
    renderWithLearningApp(
      <>
        <HomePage />
        <ApplyResearchResult />
      </>,
      { syncState: { status: "local-only", pendingCount: 0 } }
    );

    expect(screen.getByRole("status")).toHaveTextContent("Saved on this device");
    expect(screen.queryByRole("button", { name: "Sync now" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /apply saved research rating/i }));

    expect(screen.getByRole("status")).toHaveTextContent("Saved on this device · 1 local review");
    expect(screen.queryByRole("button", { name: "Sync now" })).not.toBeInTheDocument();
  });

  it("keeps New, Review, and Total progress separate and reports pending sync", async () => {
    const getToday = vi.fn<LearningRepository["getToday"]>(() =>
      Promise.resolve(buildTodaySnapshot())
    );
    const repository = createRepository({
      getToday
    });

    renderWithLearningApp(<TodayRoute />, {
      repository,
      initialEntries: ["/today/research"],
      syncState: { status: "pending", pendingCount: 3 }
    });

    expect(await screen.findByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(getToday).toHaveBeenCalledWith("research_english");
    const progress = screen.getByRole("definition", { name: "New" });
    expect(progress).toHaveTextContent("6");
    expect(progress).toHaveTextContent("10");
    expect(screen.getByRole("definition", { name: "Review" })).toHaveTextContent("12");
    const total = screen.getByRole("definition", { name: "Total today" });
    expect(within(total).getByText("18")).toBeInTheDocument();
    expect(within(total).getByText("28")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("3 changes pending");
  });

  it("renders honest no-review and content-shortage states without a New action", async () => {
    const repository = createRepository({
      getToday: vi.fn<LearningRepository["getToday"]>(() =>
        Promise.resolve(
          buildTodaySnapshot("research_english", {
            new: { completed: 0, total: 0 },
            review: { completed: 0, total: 0 },
            contentShortage: {
              code: "content_shortage",
              category: "bioinformatics",
              required: 3,
              available: 1,
              message: "Not enough new Bioinformatics cards are available."
            }
          })
        )
      )
    });

    renderWithLearningApp(<TodayRoute />, {
      repository,
      initialEntries: ["/today/research"],
      syncState: { status: "offline", pendingCount: 2 }
    });

    expect(
      await screen.findByText("Not enough new Bioinformatics cards are available.")
    ).toBeInTheDocument();
    expect(screen.getByText("No reviews are due today.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Continue New" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Offline · 2 changes pending");
  });

  it("does not invent progress while the saved Today snapshot is loading", async () => {
    let resolveToday: ((value: ReturnType<typeof buildTodaySnapshot>) => void) | undefined;
    const getToday = vi.fn<LearningRepository["getToday"]>(
      () =>
        new Promise<ReturnType<typeof buildTodaySnapshot>>((resolve) => {
          resolveToday = resolve;
        })
    );
    const repository = createRepository({
      getToday
    });

    renderWithLearningApp(<TodayRoute />, {
      repository,
      initialEntries: ["/today/research"]
    });

    expect(screen.getByText("Opening Today…")).toBeInTheDocument();
    expect(screen.queryByText("0 / 10")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(getToday).toHaveBeenCalledTimes(1);
    });
    resolveToday?.(buildTodaySnapshot());
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    });
  });

  it("shows the offline uncached Today prompt without generating replacement queues", async () => {
    const getToday = vi.fn<LearningRepository["getToday"]>(() =>
      Promise.reject(new Error("No cached assignment."))
    );
    const getStudyQueue = vi.fn<LearningRepository["getStudyQueue"]>();
    const repository = createRepository({ getToday, getStudyQueue });

    renderWithLearningApp(<TodayRoute />, {
      repository,
      initialEntries: ["/today/research"],
      syncState: { status: "offline", pendingCount: 0 }
    });

    expect(
      await screen.findByRole("heading", { name: "Today is not cached on this device." })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Reconnect once to download the stable assignment. No replacement cards were generated."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Offline");
    expect(screen.queryByRole("link", { name: /continue new/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /continue review/i })).not.toBeInTheDocument();
    expect(getToday).toHaveBeenCalledWith("research_english");
    expect(getStudyQueue).not.toHaveBeenCalled();
  });
});
