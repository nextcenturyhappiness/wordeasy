/**
 * Local Mac / standalone catalog union (DEC-060).
 *
 * Input is the unchanged Research/Medical seed plus the unchanged 必备医学英语
 * seed. Output is one Medical English library:
 * - every active Medical card
 * - every essential card whose lemma is not already represented by a richer card
 * - no inactive Medical cards
 *
 * Overlap key is the trimmed, lowercased lemma. The richer card stays.
 * Richness is non-empty collocations, then a non-empty usage note, then a
 * verified source, then context-sentence length (capped). Ties keep the active
 * card, then the original medical_english card, then the lower card id.
 * A kept essential card is rewritten to module medical_english and stays core.
 */

export interface CatalogMergeCard {
  id: string;
  word_sense_id: string;
  lemma: string;
  module: string;
  category: string;
  active: boolean;
  collocations: readonly string[];
  usage_note: string;
  context_sentence: string;
  source_type: string;
}

export interface DroppedEssentialCard {
  lemma: string;
  droppedCardId: string;
  droppedSenseId: string;
  keptCardId: string;
  keptSenseId: string;
}

export interface CatalogMergeResult<T extends CatalogMergeCard> {
  cards: T[];
  droppedEssential: DroppedEssentialCard[];
}

export const MERGED_LOCAL_RESEARCH_COUNT = 60;
export const MERGED_LOCAL_MEDICAL_COUNT = 731;
export const MERGED_LOCAL_CATALOG_TOTAL = MERGED_LOCAL_RESEARCH_COUNT + MERGED_LOCAL_MEDICAL_COUNT;

const SENTENCE_LENGTH_CAP = 400;

export function contextRichness(card: CatalogMergeCard): number {
  const collocations = card.collocations.filter((item) => item.trim().length > 0).length;
  const usage = card.usage_note.trim().length > 0 ? 1 : 0;
  const verified = card.source_type === "verified_source" ? 1 : 0;
  const sentence = Math.min(card.context_sentence.trim().length, SENTENCE_LENGTH_CAP);
  return collocations * 1_000 + usage * 100 + verified * 50 + sentence;
}

function normalizeLemma(lemma: string): string {
  return lemma.trim().toLowerCase();
}

function preferCard<T extends CatalogMergeCard>(left: T, right: T): T {
  const score = contextRichness(left) - contextRichness(right);
  if (score !== 0) {
    return score > 0 ? left : right;
  }
  if (left.active !== right.active) {
    return left.active ? left : right;
  }
  if (left.module !== right.module) {
    return left.module === "medical_english" ? left : right;
  }
  return left.id < right.id ? left : right;
}

function asMedicalEnglish<T extends CatalogMergeCard>(card: T): T {
  if (card.module === "medical_english") {
    return card;
  }
  return { ...card, module: "medical_english" };
}

export function mergeLocalMedicalCatalog<T extends CatalogMergeCard>(
  canonicalCards: readonly T[],
  essentialCards: readonly T[]
): CatalogMergeResult<T> {
  const passthrough = canonicalCards.filter((card) => card.module !== "medical_english");
  const medicalActive = canonicalCards.filter(
    (card) => card.module === "medical_english" && card.active
  );
  const grouped = new Map<string, T[]>();

  for (const card of [...medicalActive, ...essentialCards]) {
    const key = normalizeLemma(card.lemma);
    const group = grouped.get(key);
    if (group === undefined) {
      grouped.set(key, [card]);
    } else {
      group.push(card);
    }
  }

  const kept: T[] = [];
  const droppedEssential: DroppedEssentialCard[] = [];
  for (const group of grouped.values()) {
    const winner = group.reduce((best, card) => preferCard(best, card));
    const stored = asMedicalEnglish(winner);
    kept.push(stored);
    for (const card of group) {
      if (card === winner || card.module !== "essential_medical") {
        continue;
      }
      droppedEssential.push({
        lemma: card.lemma,
        droppedCardId: card.id,
        droppedSenseId: card.word_sense_id,
        keptCardId: stored.id,
        keptSenseId: stored.word_sense_id
      });
    }
  }

  return {
    cards: [...passthrough, ...kept],
    droppedEssential
  };
}
