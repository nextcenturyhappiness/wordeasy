import { createElement, type ReactElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import type {
  ContextCardView,
  HomeSnapshot,
  LearningRepository,
  ModuleSlug,
  SyncState,
  TodaySnapshot
} from "../../src/application/contracts";
import { LearningAppProvider } from "../../src/app/LearningAppProvider";

afterEach(cleanup);

export const researchCard: ContextCardView = {
  cardId: "card-research-1",
  wordSenseId: "sense-attenuate",
  module: "research_english",
  category: "general_research",
  lemma: "attenuate",
  displayForm: "attenuated",
  partOfSpeech: "verb",
  ipa: "/əˈtenjueɪt/",
  contextSentence: "The association was substantially attenuated after adjustment for age and BMI.",
  targetText: "attenuated",
  meaningEn: "to make an effect, association, or signal weaker",
  meaningZh: "减弱；降低",
  usageNote: "Common in Results and Discussion when an effect becomes smaller after adjustment.",
  plainEnglishParaphrase: "Adjusting for age and BMI made the observed association weaker.",
  sentenceTranslationZh: "调整年龄和 BMI 后，该关联明显减弱。",
  collocations: ["attenuate the association", "attenuate an effect"],
  source: {
    type: "original_example",
    title: null,
    url: null,
    doi: null,
    pmid: null
  }
};

export const secondResearchCard: ContextCardView = {
  ...researchCard,
  cardId: "card-research-2",
  wordSenseId: "sense-robust",
  lemma: "robust",
  displayForm: "robust",
  partOfSpeech: "adjective",
  ipa: "/rəʊˈbʌst/",
  contextSentence: "The association remained robust in every sensitivity analysis.",
  targetText: "robust",
  meaningEn: "remaining reliable despite changes in analysis",
  meaningZh: "稳健的；可靠的",
  usageNote: "Used when results remain consistent under alternative assumptions.",
  plainEnglishParaphrase: "The result stayed reliable when the analysis was changed.",
  sentenceTranslationZh: "在每项敏感性分析中，该关联仍然稳健。",
  collocations: ["robust association", "robust estimate"]
};

export function buildHomeSnapshot(overrides: Partial<HomeSnapshot> = {}): HomeSnapshot {
  return {
    userId: "demo-user",
    studyDate: "2026-08-26",
    timezone: "Asia/Shanghai",
    streak: 12,
    modules: {
      research_english: {
        module: "research_english",
        new: { completed: 6, total: 10 },
        review: { completed: 12, total: 18 },
        wordsLearned: 128
      },
      medical_english: {
        module: "medical_english",
        new: { completed: 3, total: 10 },
        review: { completed: 2, total: 4 },
        wordsLearned: 74
      }
    },
    pendingSyncCount: 0,
    cachedAt: "2026-08-26T08:00:00.000Z",
    ...overrides
  };
}

export function buildTodaySnapshot(
  module: ModuleSlug = "research_english",
  overrides: Partial<TodaySnapshot> = {}
): TodaySnapshot {
  return {
    module,
    studyDate: "2026-08-26",
    new: { completed: 6, total: 10 },
    review: { completed: 12, total: 18 },
    contentShortage: null,
    ...overrides
  };
}

export function createRepository(overrides: Partial<LearningRepository> = {}): LearningRepository {
  return {
    initialize: vi.fn<LearningRepository["initialize"]>(() => Promise.resolve()),
    getCachedHome: vi.fn<LearningRepository["getCachedHome"]>(() =>
      Promise.resolve(buildHomeSnapshot())
    ),
    getToday: vi.fn<LearningRepository["getToday"]>((module) =>
      Promise.resolve(buildTodaySnapshot(module))
    ),
    getStudyQueue: vi.fn<LearningRepository["getStudyQueue"]>(() =>
      Promise.resolve([researchCard, secondResearchCard])
    ),
    rateCard: vi.fn<LearningRepository["rateCard"]>((input) =>
      Promise.resolve({
        eventId: `event-${input.presentationActionId}`,
        summary: {
          module: input.module,
          new: { completed: 7, total: 10 },
          review: { completed: 12, total: 18 },
          wordsLearned: 129
        },
        nextCardId: secondResearchCard.cardId,
        syncStatus: "pending"
      })
    ),
    ...overrides
  };
}

interface RenderWithLearningAppOptions {
  repository?: LearningRepository;
  initialHome?: HomeSnapshot | null;
  syncState?: SyncState;
  initialEntries?: string[];
}

export function renderWithLearningApp(
  ui: ReactElement,
  options: RenderWithLearningAppOptions = {}
) {
  const repository = options.repository ?? createRepository();
  const initialHome = options.initialHome === undefined ? buildHomeSnapshot() : options.initialHome;
  const syncState = options.syncState ?? { status: "synced", pendingCount: 0 };
  const initialEntries = options.initialEntries ?? ["/"];
  const router = createElement(MemoryRouter, { initialEntries }, ui);
  const view = createElement(LearningAppProvider, {
    repository,
    initialHome,
    initialSyncState: syncState,
    children: router
  });

  return { repository, ...render(view) };
}
