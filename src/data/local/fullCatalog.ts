import {
  MODULE_SLUGS,
  type DomainModuleSlug,
  type NormalizedContextCard
} from "../../domain/learning";
import type { LearningDatabase } from "../../db/learningDatabase";

export const FULL_CATALOG_SIZE: Record<DomainModuleSlug, number> = {
  research_english: 60,
  medical_english: 177,
  essential_medical: 663
};

export const FULL_CATALOG_VERSION = "canonical-essential-medical-v5";
export const FULL_CATALOG_TOTAL = 900;

export async function cachedFullCatalogIsComplete(
  database: LearningDatabase,
  userId: string,
  versionKey: string,
  options?: { allowExtraCards?: boolean }
): Promise<boolean> {
  const [version, ...counts] = await Promise.all([
    database.sync_metadata.get([userId, versionKey]),
    ...MODULE_SLUGS.map((module) =>
      database.cached_cards.where("[userId+module]").equals([userId, module]).count()
    )
  ]);
  return (
    version?.value === FULL_CATALOG_VERSION &&
    MODULE_SLUGS.every((module, index) =>
      options?.allowExtraCards === true
        ? counts[index] >= FULL_CATALOG_SIZE[module]
        : counts[index] === FULL_CATALOG_SIZE[module]
    )
  );
}

export function assertCompleteFullCatalog(cards: NormalizedContextCard[]): void {
  if (new Set(cards.map((card) => card.card.id)).size !== cards.length) {
    throw new Error("The full local catalog contains duplicate card IDs.");
  }
  if (cards.length !== FULL_CATALOG_TOTAL) {
    throw new Error(
      `The full local catalog must contain exactly ${String(FULL_CATALOG_TOTAL)} cards.`
    );
  }
  for (const module of MODULE_SLUGS) {
    const moduleCards = cards.filter((card) => card.sense.module === module);
    if (moduleCards.length !== FULL_CATALOG_SIZE[module]) {
      throw new Error(
        `The full local ${module} catalog must contain exactly ${String(FULL_CATALOG_SIZE[module])} cards.`
      );
    }
    if (new Set(moduleCards.map((card) => card.card.id)).size !== FULL_CATALOG_SIZE[module]) {
      throw new Error(`The full local ${module} catalog contains duplicate card IDs.`);
    }
  }
}
