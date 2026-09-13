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

export interface LexiconSearchOptions {
  fuzzy?: boolean;
}

export function isFuzzyLexiconSearchEnabled(
  appMode: string | undefined = import.meta.env.VITE_APP_MODE
): boolean {
  return appMode === "desktop" || appMode === "standalone";
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function includesNormalized(value: string, needle: string): boolean {
  return normalize(value).includes(needle);
}

function containsHan(value: string): boolean {
  return /\p{Script=Han}/u.test(value);
}

function lemmaEditBudget(needleLength: number): number {
  if (needleLength < 3) {
    return 0;
  }
  if (needleLength < 6) {
    return 1;
  }
  return 2;
}

function meaningEditBudget(needleLength: number): number {
  return needleLength >= 2 ? 1 : 0;
}

function boundedEditDistance(left: string, right: string, maxDistance: number): number {
  if (left === right) {
    return 0;
  }

  if (Math.abs(left.length - right.length) > maxDistance) {
    return maxDistance + 1;
  }

  if (left.length === 0) {
    return right.length;
  }
  if (right.length === 0) {
    return left.length;
  }

  const previous: number[] = [];
  for (let index = 0; index <= right.length; index += 1) {
    previous.push(index);
  }

  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let rowMinimum = row;
    const leftCode = left.charCodeAt(row - 1);

    for (let column = 1; column <= right.length; column += 1) {
      const substitution = leftCode === right.charCodeAt(column - 1) ? 0 : 1;
      const deletion = previous[column];
      const insertion = current[column - 1];
      const replacement = previous[column - 1];
      if (deletion === undefined || insertion === undefined || replacement === undefined) {
        return maxDistance + 1;
      }
      const value = Math.min(deletion + 1, insertion + 1, replacement + substitution);
      current.push(value);
      if (value < rowMinimum) {
        rowMinimum = value;
      }
    }

    if (rowMinimum > maxDistance) {
      return maxDistance + 1;
    }

    previous.length = 0;
    previous.push(...current);
  }

  const distance = previous[right.length];
  return distance === undefined ? maxDistance + 1 : distance;
}

function scoreSubstring(card: LexiconSearchCard, needle: string): number {
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

function scoreFuzzyLemma(needle: string, candidate: string, budget: number): number {
  if (budget <= 0) {
    return 0;
  }

  const distance = boundedEditDistance(needle, normalize(candidate), budget);
  if (distance === 1) {
    return 70;
  }
  if (distance === 2 && budget >= 2) {
    return 55;
  }
  return 0;
}

function scoreFuzzy(card: LexiconSearchCard, needle: string): number {
  const lemmaBudget = lemmaEditBudget(needle.length);
  const lemmaScore = Math.max(
    scoreFuzzyLemma(needle, card.lemma, lemmaBudget),
    scoreFuzzyLemma(needle, card.displayForm, lemmaBudget)
  );

  if (!containsHan(needle)) {
    return lemmaScore;
  }

  const meaningBudget = meaningEditBudget(needle.length);
  if (meaningBudget <= 0) {
    return lemmaScore;
  }

  const meaningDistance = boundedEditDistance(needle, normalize(card.meaningZh), meaningBudget);
  const meaningScore = meaningDistance <= meaningBudget && meaningDistance > 0 ? 50 : 0;
  return Math.max(lemmaScore, meaningScore);
}

function scoreCard(card: LexiconSearchCard, needle: string, fuzzy: boolean): number {
  const substringScore = scoreSubstring(card, needle);
  if (substringScore > 0 || !fuzzy) {
    return substringScore;
  }

  return scoreFuzzy(card, needle);
}

export function searchLocalLexicon(
  cards: readonly LexiconSearchCard[],
  learnedSenseIds: ReadonlySet<string>,
  query: string,
  options: LexiconSearchOptions = {}
): LexiconSearchHit[] {
  const needle = normalize(query);
  if (needle.length === 0) {
    return [];
  }

  const fuzzy = options.fuzzy === true;

  return cards
    .map((card) => {
      const score = scoreCard(card, needle, fuzzy);
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
