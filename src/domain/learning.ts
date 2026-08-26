export const MODULE_SLUGS = ["research_english", "medical_english"] as const;

export type DomainModuleSlug = (typeof MODULE_SLUGS)[number];
export type DomainQueueKind = "new" | "review";
export type DomainReviewRating = "again" | "hard" | "good" | "easy";

export const RESEARCH_CATEGORY_QUOTAS = {
  general_research: 5,
  statistics_methodology: 2,
  bioinformatics: 3
} as const;

export type ResearchCategory = keyof typeof RESEARCH_CATEGORY_QUOTAS;

export interface WordEntity {
  id: string;
  lemma: string;
  displayForm: string;
  partOfSpeech: string;
  ipa: string;
}

export interface WordSenseEntity {
  id: string;
  wordId: string;
  module: DomainModuleSlug;
  category: string;
  meaningEn: string;
  meaningZh: string;
  usageNote: string;
}

export interface ContextEntity {
  id: string;
  wordSenseId: string;
  contextSentence: string;
  targetText: string;
  plainEnglishParaphrase: string;
  sentenceTranslationZh: string;
  collocations: string[];
  source: {
    type: "original_example" | "verified_source";
    title: string | null;
    url: string | null;
    doi: string | null;
    pmid: string | null;
  };
}

export interface CardEntity {
  id: string;
  wordSenseId: string;
  contextId: string;
  active: boolean;
}

export interface NormalizedContextCard {
  word: WordEntity;
  sense: WordSenseEntity;
  context: ContextEntity;
  card: CardEntity;
}

export interface ContentShortageRecord {
  code: "content_shortage";
  category: string | null;
  required: number;
  available: number;
  message: string;
}

export function assertNormalizedContextCard(value: NormalizedContextCard): void {
  if (value.sense.wordId !== value.word.id) {
    throw new Error(`Word sense ${value.sense.id} does not reference word ${value.word.id}.`);
  }
  if (value.context.wordSenseId !== value.sense.id) {
    throw new Error(`Context ${value.context.id} does not reference sense ${value.sense.id}.`);
  }
  if (value.card.wordSenseId !== value.sense.id || value.card.contextId !== value.context.id) {
    throw new Error(`Card ${value.card.id} is not linked to its sense and context.`);
  }
  if (!value.context.contextSentence.includes(value.context.targetText)) {
    throw new Error(`Card ${value.card.id} target text is absent from its context.`);
  }
  if (value.context.collocations.length === 0) {
    throw new Error(`Card ${value.card.id} must include collocations.`);
  }
}
