import type { IndexedDbBootstrapContext } from "../indexedDbLearningRepository";
import {
  assertCompleteFullCatalog,
  cachedFullCatalogIsComplete,
  FULL_CATALOG_VERSION
} from "../local/fullCatalog";

export const DESKTOP_LEXICON_CATALOG_VERSION_KEY = "desktop-lexicon-catalog-version";

export async function seedDesktopLexiconCatalog(context: IndexedDbBootstrapContext): Promise<void> {
  if (
    await cachedFullCatalogIsComplete(
      context.database,
      context.userId,
      DESKTOP_LEXICON_CATALOG_VERSION_KEY,
      { allowExtraCards: true }
    )
  ) {
    return;
  }

  const { STANDALONE_CARDS } = await import("../standalone/standaloneCards");
  assertCompleteFullCatalog(STANDALONE_CARDS);
  const { DemoContentCatalog } = await import("../demo/demoContentCatalog");
  await new DemoContentCatalog(context.database, context.userId, STANDALONE_CARDS).seed(
    context.initializedAt
  );
  const catalogIds = new Set(STANDALONE_CARDS.map((card) => card.card.id));
  const staleCards = (
    await context.database.cached_cards.where("userId").equals(context.userId).toArray()
  ).filter(
    (row) =>
      !catalogIds.has(row.cardId) &&
      (row.module === "essential_medical" || row.module === "medical_english")
  );
  if (staleCards.length > 0) {
    await context.database.cached_cards.bulkDelete(
      staleCards.map((row) => [row.userId, row.cardId] as [string, string])
    );
  }
  await context.database.sync_metadata.put({
    userId: context.userId,
    key: DESKTOP_LEXICON_CATALOG_VERSION_KEY,
    value: FULL_CATALOG_VERSION,
    updatedAt: context.initializedAt
  });
}
