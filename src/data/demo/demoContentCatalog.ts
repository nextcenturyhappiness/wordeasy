import { assertNormalizedContextCard, type NormalizedContextCard } from "../../domain/learning";
import { cachedCardFromNormalized } from "../../db/records";
import type { LearningDatabase } from "../../db/learningDatabase";

export class DemoContentCatalog {
  constructor(
    private readonly database: LearningDatabase,
    private readonly userId: string,
    private readonly cards: NormalizedContextCard[]
  ) {}

  async seed(cachedAt: string): Promise<void> {
    for (const card of this.cards) {
      assertNormalizedContextCard(card);
    }

    await this.database.transaction("rw", this.database.cached_cards, async () => {
      await this.database.cached_cards.bulkPut(
        this.cards.map((card) => cachedCardFromNormalized(this.userId, card, cachedAt))
      );
    });
  }
}
