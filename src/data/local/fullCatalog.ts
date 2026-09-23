import {
  MODULE_SLUGS,
  type DomainModuleSlug,
  type NormalizedContextCard
} from "../../domain/learning";
import type { LearningDatabase } from "../../db/learningDatabase";
import {
  MERGED_LOCAL_CATALOG_TOTAL,
  MERGED_LOCAL_MEDICAL_COUNT,
  MERGED_LOCAL_RESEARCH_COUNT
} from "./mergeMedicalCatalog";

export const FULL_CATALOG_SIZE: Record<DomainModuleSlug, number> = {
  research_english: MERGED_LOCAL_RESEARCH_COUNT,
  medical_english: MERGED_LOCAL_MEDICAL_COUNT,
  essential_medical: 0
};

export const FULL_CATALOG_VERSION = "canonical-merged-medical-v1";
export const FULL_CATALOG_TOTAL = MERGED_LOCAL_CATALOG_TOTAL;

function requiredCatalogSize(module: DomainModuleSlug): number {
  switch (module) {
    case "research_english":
      return FULL_CATALOG_SIZE.research_english;
    case "medical_english":
      return FULL_CATALOG_SIZE.medical_english;
    case "essential_medical":
      return FULL_CATALOG_SIZE.essential_medical;
  }
}

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
  if (version?.value !== FULL_CATALOG_VERSION) {
    return false;
  }
  return MODULE_SLUGS.every((module, index) => {
    const actual = counts[index];
    if (actual === undefined) {
      return false;
    }
    const expected = requiredCatalogSize(module);
    return options?.allowExtraCards === true ? actual >= expected : actual === expected;
  });
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
    const expected = requiredCatalogSize(module);
    if (moduleCards.length !== expected) {
      throw new Error(
        `The full local ${module} catalog must contain exactly ${String(expected)} cards.`
      );
    }
    if (new Set(moduleCards.map((card) => card.card.id)).size !== expected) {
      throw new Error(`The full local ${module} catalog contains duplicate card IDs.`);
    }
  }
}
