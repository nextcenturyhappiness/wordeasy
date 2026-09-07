import demoSeedCards from "virtual:article-english-demo-seed";

import {
  RESEARCH_CATEGORY_QUOTAS,
  type DomainModuleSlug,
  type NormalizedContextCard,
  type ResearchCategory
} from "../../domain/learning";
import { normalizeSeedCard, type SeedCard } from "../local/seedCardNormalization";

const seedCards = demoSeedCards as SeedCard[];

function requireCards(
  module: DomainModuleSlug,
  predicate: (card: SeedCard) => boolean,
  count: number
): NormalizedContextCard[] {
  const selected = seedCards
    .filter((card) => card.module === module && card.active && predicate(card))
    .slice(0, count)
    .map(normalizeSeedCard);

  if (selected.length !== count) {
    throw new Error(
      `Canonical seed has only ${String(selected.length)} eligible ${module} demo cards.`
    );
  }
  return selected;
}

export const DEMO_RESEARCH_CARDS: NormalizedContextCard[] = (
  Object.entries(RESEARCH_CATEGORY_QUOTAS) as Array<[ResearchCategory, number]>
).flatMap(([category, quota]) =>
  requireCards("research_english", (card) => card.category === category, quota)
);

const medicalClinicalDemoCategories = [
  "symptoms",
  "signs",
  "clinical_expressions",
  "treatment",
  "diagnosis",
  "laboratory",
  "imaging"
] as const;

export const DEMO_MEDICAL_CARDS: NormalizedContextCard[] = [
  ...medicalClinicalDemoCategories.flatMap((category) =>
    requireCards("medical_english", (card) => card.category === category, 1)
  ),
  ...requireCards("medical_english", (card) => card.category === "morphology", 3)
];

export const DEMO_CARDS: NormalizedContextCard[] = [...DEMO_RESEARCH_CARDS, ...DEMO_MEDICAL_CARDS];
