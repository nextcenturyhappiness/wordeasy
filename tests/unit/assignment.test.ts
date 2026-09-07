import { describe, expect, it } from "vitest";

import { selectMedicalAssignment, selectResearchAssignment } from "../../src/domain/assignment";

function cards(categories: Array<[string, number]>): Array<{ cardId: string; category: string }> {
  const result: Array<{ cardId: string; category: string }> = [];
  for (const [category, count] of categories) {
    for (let index = 0; index < count; index += 1) {
      result.push({ cardId: `${category}-${String(index)}`, category });
    }
  }
  return result;
}

describe("daily assignment quotas", () => {
  it("selects Research 5+2+3 and freezes a category shortage", () => {
    const ready = selectResearchAssignment(
      cards([
        ["general_research", 5],
        ["statistics_methodology", 2],
        ["bioinformatics", 3]
      ]),
      "user-a",
      "2026-09-07"
    );
    expect(ready.status).toBe("ready");
    if (ready.status === "ready") {
      expect(ready.cards.filter((card) => card.category === "general_research")).toHaveLength(5);
      expect(ready.cards.filter((card) => card.category === "statistics_methodology")).toHaveLength(
        2
      );
      expect(ready.cards.filter((card) => card.category === "bioinformatics")).toHaveLength(3);
    }

    const shortage = selectResearchAssignment(
      cards([
        ["general_research", 5],
        ["statistics_methodology", 2],
        ["bioinformatics", 2]
      ]),
      "user-a",
      "2026-09-07"
    );
    expect(shortage).toMatchObject({
      status: "shortage",
      shortage: { category: "bioinformatics", required: 3, available: 2 }
    });
  });

  it("selects Medical 7 chart/class + 3 morphology and does not backfill across buckets", () => {
    const ready = selectMedicalAssignment(
      cards([
        ["symptoms", 4],
        ["signs", 3],
        ["morphology", 5]
      ]),
      "user-a",
      "2026-09-07"
    );
    expect(ready.status).toBe("ready");
    if (ready.status === "ready") {
      expect(ready.cards.filter((card) => card.category === "morphology")).toHaveLength(3);
      expect(ready.cards.filter((card) => card.category !== "morphology")).toHaveLength(7);
      expect(ready.cards).toHaveLength(10);
    }

    expect(
      selectMedicalAssignment(cards([["symptoms", 10], ["morphology", 2]]), "user-a", "2026-09-07")
    ).toMatchObject({
      status: "shortage",
      shortage: { category: "morphology", required: 3, available: 2 }
    });
    expect(
      selectMedicalAssignment(cards([["symptoms", 6], ["morphology", 10]]), "user-a", "2026-09-07")
    ).toMatchObject({
      status: "shortage",
      shortage: { category: "clinical", required: 7, available: 6 }
    });
  });

  it("keeps the same Medical 7+3 set for the same user and study date", () => {
    const candidates = cards([
      ["symptoms", 8],
      ["clinical_expressions", 8],
      ["morphology", 8]
    ]);
    const first = selectMedicalAssignment(candidates, "user-a", "2026-09-07");
    const second = selectMedicalAssignment(candidates, "user-a", "2026-09-07");
    expect(first).toEqual(second);
  });
});
