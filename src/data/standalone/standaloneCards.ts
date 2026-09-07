import standaloneSeedCards from "virtual:article-english-standalone-seed";

import type { DomainModuleSlug, NormalizedContextCard } from "../../domain/learning";
import { normalizeSeedCard, type SeedCard } from "../local/seedCardNormalization";

const seedCards = standaloneSeedCards as SeedCard[];
const EXPECTED_CARD_COUNTS: Record<DomainModuleSlug, number> = {
  research_english: 60,
  medical_english: 153
};

function requireCompleteCatalog(): NormalizedContextCard[] {
  for (const [module, expected] of Object.entries(EXPECTED_CARD_COUNTS) as Array<
    [DomainModuleSlug, number]
  >) {
    const actual = seedCards.filter((card) => card.module === module).length;
    if (actual !== expected) {
      throw new Error(
        `Canonical standalone seed has ${String(actual)} ${module} cards; expected ${String(expected)}.`
      );
    }
  }

  const activeMedical = seedCards.filter(
    (card) => card.module === "medical_english" && card.active
  ).length;
  if (activeMedical !== 137) {
    throw new Error(
      `Canonical standalone seed has ${String(activeMedical)} active Medical cards; expected 137.`
    );
  }

  if (seedCards.length !== 213) {
    throw new Error(
      `Canonical standalone seed has ${String(seedCards.length)} cards; expected 213.`
    );
  }

  return seedCards.map(normalizeSeedCard);
}

export const STANDALONE_CARDS = requireCompleteCatalog();
