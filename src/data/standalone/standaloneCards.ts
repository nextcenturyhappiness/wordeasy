import standaloneSeedCards from "virtual:article-english-standalone-seed";

import type { DomainModuleSlug, NormalizedContextCard } from "../../domain/learning";
import { normalizeSeedCard, type SeedCard } from "../local/seedCardNormalization";

const seedCards = standaloneSeedCards as SeedCard[];
const EXPECTED_CARD_COUNTS: Record<DomainModuleSlug, number> = {
  research_english: 30,
  medical_english: 30
};

function requireCompleteActiveSeed(): NormalizedContextCard[] {
  const activeCards = seedCards.filter((card) => card.active);

  for (const [module, expected] of Object.entries(EXPECTED_CARD_COUNTS) as Array<
    [DomainModuleSlug, number]
  >) {
    const actual = activeCards.filter((card) => card.module === module).length;
    if (actual !== expected) {
      throw new Error(
        `Canonical standalone seed has ${String(actual)} active ${module} cards; expected ${String(expected)}.`
      );
    }
  }

  if (activeCards.length !== 60) {
    throw new Error(
      `Canonical standalone seed has ${String(activeCards.length)} active cards; expected 60.`
    );
  }

  return activeCards.map(normalizeSeedCard);
}

export const STANDALONE_CARDS = requireCompleteActiveSeed();
