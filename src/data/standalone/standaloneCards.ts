import standaloneSeedCards from "virtual:article-english-standalone-seed";

import type { DomainModuleSlug, NormalizedContextCard } from "../../domain/learning";
import { FULL_CATALOG_SIZE, FULL_CATALOG_TOTAL } from "../local/fullCatalog";
import { normalizeSeedCard, type SeedCard } from "../local/seedCardNormalization";

const seedCards = standaloneSeedCards as SeedCard[];
const EXPECTED_CARD_COUNTS = FULL_CATALOG_SIZE;

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

  const inactiveMedical = seedCards.filter(
    (card) => card.module === "medical_english" && !card.active
  ).length;
  if (inactiveMedical !== 0) {
    throw new Error(
      `Merged local Medical catalog includes ${String(inactiveMedical)} inactive cards; expected none.`
    );
  }

  const activeMedical = seedCards.filter(
    (card) => card.module === "medical_english" && card.active
  ).length;
  if (activeMedical !== FULL_CATALOG_SIZE.medical_english) {
    throw new Error(
      `Canonical standalone seed has ${String(activeMedical)} active Medical cards; expected ${String(FULL_CATALOG_SIZE.medical_english)}.`
    );
  }

  if (seedCards.length !== FULL_CATALOG_TOTAL) {
    throw new Error(
      `Canonical standalone seed has ${String(seedCards.length)} cards; expected ${String(FULL_CATALOG_TOTAL)}.`
    );
  }

  return seedCards.map(normalizeSeedCard);
}

export const STANDALONE_CARDS = requireCompleteCatalog();
