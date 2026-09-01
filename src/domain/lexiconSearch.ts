import type { DomainModuleSlug } from "./learning";

export const LEXICON_SEARCH_LIMIT = 12;

export interface LexiconSearchCard {
  cardId: string;
  wordSenseId: string;
  module: DomainModuleSlug;
  lemma: string;
  displayForm: string;
  meaningEn: string;
  meaningZh: string;
  contextSentence: string;
  sentenceTranslationZh: string;
  collocations: readonly string[];
  targetText: string;
}

export interface LexiconSearchHit {
  cardId: string;
  module: DomainModuleSlug;
  lemma: string;
  meaningEn: string;
  meaningZh: string;
  contextSentence: string;
  learned: boolean;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function includesNormalized(value: string, needle: string): boolean {
  return normalize(value).includes(needle);
}

function scoreCard(card: LexiconSearchCard, needle: string): number {
  if (
    normalize(card.lemma) === needle ||
    normalize(card.displayForm) === needle ||
    normalize(card.targetText) === needle
  ) {
    return 100;
  }

  if (includesNormalized(card.lemma, needle) || includesNormalized(card.displayForm, needle)) {
    return 80;
  }

  if (includesNormalized(card.meaningZh, needle) || includesNormalized(card.meaningEn, needle)) {
    return 60;
  }

  if (card.collocations.some((collocation) => includesNormalized(collocation, needle))) {
    return 40;
  }

  if (
    includesNormalized(card.contextSentence, needle) ||
    includesNormalized(card.sentenceTranslationZh, needle) ||
    includesNormalized(card.targetText, needle)
  ) {
    return 20;
  }

  return 0;
}

export function searchLocalLexicon(
  cards: readonly LexiconSearchCard[],
  learnedSenseIds: ReadonlySet<string>,
  query: string
): LexiconSearchHit[] {
  const needle = normalize(query);
  if (needle.length === 0) {
    return [];
  }

  return cards
    .map((card) => {
      const score = scoreCard(card, needle);
      if (score === 0) {
        return null;
      }

      const learned = learnedSenseIds.has(card.wordSenseId);
      return { card, score, learned };
    })
    .filter((entry): entry is { card: LexiconSearchCard; score: number; learned: boolean } => {
      return entry !== null;
    })
    .sort((left, right) => {
      if (left.learned !== right.learned) {
        return left.learned ? -1 : 1;
      }
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      return left.card.lemma.localeCompare(right.card.lemma);
    })
    .slice(0, LEXICON_SEARCH_LIMIT)
    .map(({ card, learned }) => ({
      cardId: card.cardId,
      module: card.module,
      lemma: card.lemma,
      meaningEn: card.meaningEn,
      meaningZh: card.meaningZh,
      contextSentence: card.contextSentence,
      learned
    }));
}
