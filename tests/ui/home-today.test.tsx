import { useLearningApp } from "../../src/app/LearningAppContext";
import { HomePage } from "../../src/routes/home/HomePage";
import { StudyPage } from "../../src/routes/study/StudyPage";
import { TodayPage } from "../../src/routes/today/TodayPage";
import type {
  HomeSnapshot,
  LearningRepository,
  SyncGateway,
  SyncState
} from "../../src/application/contracts";
import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildHomeSnapshot,
  buildTodaySnapshot,
  createRepository,
  renderWithLearningApp,
  researchCard
} from "./fixtures";

afterEach(() => {
  vi.unstubAllEnvs();
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

function expectNoNextSession() {
  expect(screen.queryByRole("heading", { name: "Start the next card" })).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Nothing is due right now." })
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Start next session" })).not.toBeInTheDocument();
  expect(screen.queryByText(/^next session$/i)).not.toBeInTheDocument();
}

function TodayRoute() {
  return (
    <Routes>
      <Route path="/today/:module" element={<TodayPage />} />
    </Routes>
  );
}

function HomeStudyRoutes() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="/study/:module" element={<StudyPage />} />
    </Routes>
  );
}

describe("Home and Today", () => {
  it("shows only Research and Medical on the local surface", () => {
    vi.stubEnv("VITE_APP_MODE", "standalone");
    renderWithLearningApp(<HomePage />, {
      initialHome: buildHomeSnapshot({
        modules: {
          essential_medical: {
            module: "essential_medical",
            new: { completed: 0, total: 40 },
            review: { completed: 0, total: 0 },
            wordsLearned: 12
          }
        }
      })
    });

    expect(screen.getByRole("article", { name: "Research English" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Medical English" })).toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "必备医学英语" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /continue/i })).toHaveLength(2);
    expect(screen.getByText("1 词根构词 + 1 病历用语 + 8 课堂词汇")).toBeInTheDocument();
    expect(screen.queryByText(/必备医学英语/u)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Continue Research English" })).toHaveAttribute(
      "href",
      "/today/research"
    );
    expect(screen.getByRole("link", { name: "Continue Medical English" })).toHaveAttribute(
      "href",
      "/today/medical"
    );
    expectNoNextSession();
  });

  it("rejects the essential route on the local surface and keeps it for cloud", async () => {
    vi.stubEnv("VITE_APP_MODE", "desktop");
    const localRepository = createRepository();
    renderWithLearningApp(<TodayRoute />, {
      repository: localRepository,
      initialEntries: ["/today/essential"]
    });
    expect(
      screen.getByRole("heading", { name: "This learning module does not exist." })
    ).toBeInTheDocument();

    cleanup();
    vi.stubEnv("VITE_APP_MODE", "cloud");
    renderWithLearningApp(<TodayRoute />, { initialEntries: ["/today/essential"] });
    expect(await screen.findByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("每天 10 个新词")).toBeInTheDocument();
  });

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
    expect(
      screen.queryByRole("searchbox", { name: "Search learned Context Cards" })
    ).not.toBeInTheDocument();
    expect(getCachedHome).toHaveBeenCalledTimes(1);
    expect(getToday).not.toHaveBeenCalled();
    expect(getStudyQueue).not.toHaveBeenCalled();
  });

  it("upgrades the empty Home after Sync when only some modules have a cached day", async () => {
    const snapshot = buildHomeSnapshot({
      modules: {
        essential_medical: {
          module: "essential_medical",
          new: { completed: 0, total: 0 },
          review: { completed: 0, total: 0 },
          wordsLearned: 0
        }
      }
    });
    let cachedHome: HomeSnapshot | null = null;
    const getCachedHome = vi.fn<LearningRepository["getCachedHome"]>(() =>
      Promise.resolve(cachedHome)
    );
    let state: SyncState = { status: "syncing", pendingCount: 0 };
    const listeners = new Set<(nextState: SyncState) => void>();
    const syncGateway: SyncGateway = {
      getState: () => state,
      sync: vi.fn(() => Promise.resolve(state)),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }
    };
    const repository = createRepository({ getCachedHome });

    renderWithLearningApp(<HomePage />, {
      repository,
      initialHome: null,
      syncState: state,
      syncGateway
    });

    expect(
      await screen.findByRole("heading", {
        name: "No learning day is cached on this device."
      })
    ).toBeInTheDocument();

    cachedHome = snapshot;
    act(() => {
      state = { status: "synced", pendingCount: 0 };
      for (const listener of listeners) {
        listener(state);
      }
    });

    expect(await screen.findByRole("article", { name: "Research English" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Medical English" })).toBeInTheDocument();
    const essential = screen.getByRole("article", { name: "必备医学英语" });
    expect(within(essential).getByText("0 / 0")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "No learning day is cached on this device." })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Synced");
    expect(getCachedHome).toHaveBeenCalledTimes(2);
  });

  it("does not replace a post-sync Home with a later null cache read", async () => {
    const snapshot = buildHomeSnapshot();
    let resolveHydrate: ((value: HomeSnapshot | null) => void) | undefined;
    const hydrateRead = new Promise<HomeSnapshot | null>((resolve) => {
      resolveHydrate = resolve;
    });
    let reads = 0;
    const getCachedHome = vi.fn<LearningRepository["getCachedHome"]>(() => {
      reads += 1;
      return reads === 1 ? hydrateRead : Promise.resolve(snapshot);
    });
    let state: SyncState = { status: "syncing", pendingCount: 0 };
    const listeners = new Set<(nextState: SyncState) => void>();
    const syncGateway: SyncGateway = {
      getState: () => state,
      sync: vi.fn(() => Promise.resolve(state)),
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }
    };

    renderWithLearningApp(<HomePage />, {
      repository: createRepository({ getCachedHome }),
      initialHome: null,
      syncState: state,
      syncGateway
    });

    expect(await screen.findByText("Opening your learning day…")).toBeInTheDocument();
    await waitFor(() => {
      expect(getCachedHome).toHaveBeenCalledTimes(1);
    });

    act(() => {
      state = { status: "synced", pendingCount: 0 };
      for (const listener of listeners) {
        listener(state);
      }
    });

    expect(await screen.findByRole("article", { name: "Research English" })).toBeInTheDocument();

    await act(async () => {
      resolveHydrate?.(null);
      await Promise.resolve();
    });

    expect(screen.getByRole("article", { name: "Research English" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "No learning day is cached on this device." })
    ).not.toBeInTheDocument();
  });

  it("shows the passed local Home snapshot with lexicon search first and module continues", () => {
    const getCachedHome = vi.fn<LearningRepository["getCachedHome"]>(() =>
      Promise.resolve(buildHomeSnapshot())
    );
    const peekNextSessionCard = vi.fn<LearningRepository["peekNextSessionCard"]>();
    const repository = createRepository({
      initialize: vi.fn<LearningRepository["initialize"]>(() => new Promise<void>(() => undefined)),
      getCachedHome,
      peekNextSessionCard
    });
    renderWithLearningApp(<HomePage />, { repository });

    const search = screen.getByRole("search", { name: "Search learned Context Cards" });
    expect(search).toBeInTheDocument();
    expect(within(search).queryByRole("heading", { name: "词库" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "词库" })).not.toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search learned Context Cards" })).toHaveAttribute(
      "placeholder",
      ""
    );
    expect(screen.queryByPlaceholderText("用中文搜学过的词")).not.toBeInTheDocument();
    expect(screen.queryByText("用中文搜学过的词")).not.toBeInTheDocument();
    expectNoNextSession();
    expect(peekNextSessionCard).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Continue Research English" })).toHaveAttribute(
      "href",
      "/today/research"
    );
    expect(screen.getByRole("link", { name: "Continue Medical English" })).toHaveAttribute(
      "href",
      "/today/medical"
    );
    expect(screen.getByRole("link", { name: "Continue 必备医学英语" })).toHaveAttribute(
      "href",
      "/today/essential"
    );
    expect(screen.getAllByRole("link", { name: /continue/i })).toHaveLength(3);

    const research = screen.getByRole("article", { name: "Research English" });
    const medical = screen.getByRole("article", { name: "Medical English" });
    const essential = screen.getByRole("article", { name: "必备医学英语" });

    expect(within(research).getByText("6 / 10")).toBeInTheDocument();
    expect(within(research).getByText("128 words learned")).toBeInTheDocument();
    expect(within(medical).getByText("3 / 10")).toBeInTheDocument();
    expect(within(medical).getByText("74 words learned")).toBeInTheDocument();
    expect(within(medical).getByText("7 词根构词 + 3 病历用语")).toBeInTheDocument();
    expect(within(essential).getByText("0 / 10")).toBeInTheDocument();
    expect(within(essential).getByText("每天 10 个新词")).toBeInTheDocument();
    expect(screen.getByText("12").closest(".streak-line")).toHaveTextContent(
      "12 days in your current streak"
    );
    expect(screen.getByRole("status")).toHaveTextContent("Synced");
    expect(getCachedHome).not.toHaveBeenCalled();
    expect(
      screen.queryByText(
        "The association was substantially attenuated after adjustment for age and BMI."
      )
    ).not.toBeInTheDocument();
  });

  it("searches local Context Cards by Chinese gloss and English lemma", async () => {
    const user = userEvent.setup();
    const repository = createRepository();
    renderWithLearningApp(<HomePage />, { repository });

    const field = screen.getByRole("searchbox", { name: "Search learned Context Cards" });
    expect(field).toHaveAttribute("lang", "zh-CN");
    await user.type(field, "减弱");

    const results = await screen.findByRole("list");
    const lemma = within(results).getByText("attenuate");
    const gloss = within(results).getByText("减弱；降低");
    expect(lemma).toHaveClass("lexicon-search__lemma");
    expect(gloss).toHaveClass("lexicon-search__gloss");
    expect(gloss).toHaveAttribute("lang", "zh-CN");
    expect(lemma.parentElement).toBe(gloss.parentElement);
    expect(lemma.parentElement).toHaveClass("lexicon-search__lemma-row");
    expect(lemma.compareDocumentPosition(gloss) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(
      within(results).getByText("to make an effect, association, or signal weaker")
    ).toHaveClass("lexicon-search__meaning");
    const sentence = within(results).getByText(
      "The association was substantially attenuated after adjustment for age and BMI."
    );
    expect(sentence).toHaveClass("lexicon-search__sentence");
    expect(sentence).not.toHaveAttribute("lang");
    expect(within(results).queryByText("解释")).not.toBeInTheDocument();
    expect(screen.queryByText("还没有学过相关的词")).not.toBeInTheDocument();

    await user.clear(field);
    await user.type(field, "xyz-not-a-learned-word");
    expect(await screen.findByText("还没有学过相关的词")).toHaveAttribute("lang", "zh-CN");
    expect(screen.queryByText("attenuate")).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(field).toHaveValue("");
    expect(screen.queryByText("还没有学过相关的词")).not.toBeInTheDocument();
    expect(document.activeElement).not.toBe(field);
  });

  it("keeps many search hits inside a capped scrollable panel", async () => {
    const user = userEvent.setup();
    const manyHits = Array.from({ length: 8 }, (_, index) => ({
      cardId: `card-near-${String(index + 1)}`,
      module: "research_english" as const,
      lemma: index === 0 ? "attenuate" : `attenuate-${String(index + 1)}`,
      meaningEn: "to make an effect, association, or signal weaker",
      meaningZh: "减弱；降低",
      contextSentence: `Near-synonym example sentence ${String(index + 1)}.`,
      learned: index === 0
    }));
    const repository = createRepository({
      searchLocalCards: vi.fn<LearningRepository["searchLocalCards"]>(() =>
        Promise.resolve(manyHits)
      )
    });
    renderWithLearningApp(<HomePage />, { repository });

    await user.type(
      screen.getByRole("searchbox", { name: "Search learned Context Cards" }),
      "减弱"
    );

    const results = await screen.findByRole("list");
    expect(results).toHaveClass("lexicon-search__results");
    expect(results).toHaveAttribute("tabIndex", "0");
    expect(within(results).getAllByRole("listitem")).toHaveLength(8);
    expect(within(results).getByText("attenuate").parentElement).toHaveTextContent("减弱；降低");
    expectNoNextSession();
  });

  it("opens a search result already revealed, without a Reveal step", async () => {
    const user = userEvent.setup();
    const getStudyQueue = vi.fn<LearningRepository["getStudyQueue"]>();
    const getLocalCard = vi.fn<LearningRepository["getLocalCard"]>((cardId) =>
      Promise.resolve(cardId === researchCard.cardId ? researchCard : null)
    );
    const repository = createRepository({ getStudyQueue, getLocalCard });
    renderWithLearningApp(<HomeStudyRoutes />, { repository });

    await user.type(
      screen.getByRole("searchbox", { name: "Search learned Context Cards" }),
      "attenuate"
    );
    const result = await screen.findByRole("link", { name: /attenuate/ });
    expect(result).toHaveAttribute("href", "/study/research?card=card-research-1");
    await user.click(result);

    expect(await screen.findByRole("heading", { level: 1, name: "attenuate" })).toBeInTheDocument();
    expect(screen.getByText(researchCard.targetText, { selector: "mark" })).toBeInTheDocument();
    expect(document.getElementById("context-sentence-anchor")).toHaveTextContent(
      researchCard.contextSentence
    );
    expect(await screen.findByText(researchCard.meaningEn)).toBeInTheDocument();
    expect(screen.getByText(researchCard.meaningZh)).toBeInTheDocument();
    expect(screen.getByText(researchCard.usageNote)).toBeInTheDocument();
    expect(screen.queryByText(/what does this word mean in this context/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reveal answer/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /how well did you remember/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toBeInTheDocument();
    expect(getStudyQueue).not.toHaveBeenCalled();
    expect(getLocalCard).toHaveBeenCalledWith("card-research-1");
  });

  it("shows Home search when a local lexicon is present even if the day assignment is not ready", async () => {
    const user = userEvent.setup();
    const getCachedHome = vi.fn<LearningRepository["getCachedHome"]>(() => Promise.resolve(null));
    const hasLocalLexicon = vi.fn<LearningRepository["hasLocalLexicon"]>(() =>
      Promise.resolve(true)
    );
    const repository = createRepository({ getCachedHome, hasLocalLexicon });

    renderWithLearningApp(<HomePage />, {
      repository,
      initialHome: null,
      syncState: { status: "syncing", pendingCount: 0 }
    });

    expect(
      await screen.findByRole("heading", {
        name: "No learning day is cached on this device."
      })
    ).toBeInTheDocument();
    const field = await screen.findByRole("searchbox", { name: "Search learned Context Cards" });
    expect(screen.getByRole("status")).toHaveTextContent("Syncing");
    expect(screen.queryByRole("article", { name: "Research English" })).not.toBeInTheDocument();
    expect(getCachedHome).toHaveBeenCalledTimes(1);

    await user.type(field, "attenuate");
    const results = await screen.findByRole("list");
    expect(within(results).getByRole("link", { name: /attenuate/ })).toHaveAttribute(
      "href",
      "/study/research?card=card-research-1"
    );
  });

  it("keeps module continues when today's queues are complete", () => {
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
          },
          essential_medical: {
            module: "essential_medical",
            new: { completed: 10, total: 10 },
            review: { completed: 0, total: 0 },
            wordsLearned: 0
          }
        }
      })
    });

    expectNoNextSession();
    expect(screen.getByRole("link", { name: "Continue Research English" })).toHaveAttribute(
      "href",
      "/today/research"
    );
    expect(screen.getByRole("article", { name: "Research English" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Medical English" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "必备医学英语" })).toBeInTheDocument();
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

  it("hides sync status and Sync now on the local desktop path", () => {
    vi.stubEnv("VITE_APP_MODE", "desktop");
    renderWithLearningApp(<HomePage />, {
      syncState: { status: "pending", pendingCount: 2 }
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sync now" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Synced|Sync now|Saved on this device/u)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
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

  it("shows the Medical 词根构词 quota on Today without gamification", async () => {
    const getToday = vi.fn<LearningRepository["getToday"]>(() =>
      Promise.resolve(buildTodaySnapshot("medical_english"))
    );
    const repository = createRepository({
      getToday
    });

    renderWithLearningApp(<TodayRoute />, {
      repository,
      initialEntries: ["/today/medical"]
    });

    expect(await screen.findByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(getToday).toHaveBeenCalledWith("medical_english");
    expect(screen.getByText("7 词根构词 + 3 病历用语")).toBeInTheDocument();
    expect(screen.queryByText(/xp|streak goal|leaderboard/i)).not.toBeInTheDocument();
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
