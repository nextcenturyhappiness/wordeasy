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
      DESKTOP_LEXICON_CATALOG_VERSION_KEY
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
  await context.database.sync_metadata.put({
    userId: context.userId,
    key: DESKTOP_LEXICON_CATALOG_VERSION_KEY,
    value: FULL_CATALOG_VERSION,
    updatedAt: context.initializedAt
  });
}
