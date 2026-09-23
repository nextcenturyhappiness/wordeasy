import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { selectMergedMedicalAssignment } from "../../src/domain/assignment";
import {
  contextRichness,
  MERGED_LOCAL_CATALOG_TOTAL,
  MERGED_LOCAL_MEDICAL_COUNT,
  mergeLocalMedicalCatalog,
  type CatalogMergeCard
} from "../../src/data/local/mergeMedicalCatalog";
import { STANDALONE_CARDS } from "../../src/data/standalone/standaloneCards";

function loadCards(path: string): CatalogMergeCard[] {
  const dataset = JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as {
    cards: CatalogMergeCard[];
  };
  return dataset.cards;
}

function card(
  overrides: Partial<CatalogMergeCard> & Pick<CatalogMergeCard, "id" | "lemma" | "module">
): CatalogMergeCard {
  return {
    word_sense_id: `${overrides.id}-sense`,
    category: overrides.module === "essential_medical" ? "core" : "symptoms",
    active: true,
    collocations: [],
    usage_note: "",
    context_sentence: "A short sentence.",
    source_type: "original_example",
    ...overrides
  };
}

describe("local medical catalog union", () => {
  const canonical = loadCards("data/seed-data.json");
  const essential = loadCards("data/essential-medical/cards.json");
  const merged = mergeLocalMedicalCatalog(canonical, essential);

  it("keeps the richer card for a shared lemma and rewrites essential cards onto Medical", () => {
    expect(merged.cards).toHaveLength(MERGED_LOCAL_CATALOG_TOTAL);
    expect(merged.cards.filter((entry) => entry.module === "research_english")).toHaveLength(60);
    expect(merged.cards.filter((entry) => entry.module === "medical_english")).toHaveLength(
      MERGED_LOCAL_MEDICAL_COUNT
    );
    expect(merged.cards.filter((entry) => entry.module === "essential_medical")).toHaveLength(0);
    expect(merged.droppedEssential).toHaveLength(72);
    expect(merged.cards.every((entry) => entry.module !== "medical_english" || entry.active)).toBe(
      true
    );

    const necrosis = merged.cards.filter((entry) => entry.lemma === "necrosis");
    expect(necrosis).toHaveLength(1);
    expect(necrosis[0]).toMatchObject({ module: "medical_english", category: "pathology" });
    const hepatitis = merged.cards.filter((entry) => entry.lemma === "hepatitis");
    expect(hepatitis).toHaveLength(1);
    expect(hepatitis[0]).toMatchObject({ module: "medical_english", category: "morphology" });

    const abdomen = merged.cards.find((entry) => entry.lemma === "abdomen");
    expect(abdomen).toMatchObject({ module: "medical_english", category: "core" });
    expect(merged.cards.some((entry) => entry.lemma === "fever")).toBe(false);
    expect(merged.cards.some((entry) => entry.lemma === "phagocytosis")).toBe(true);

    const standaloneIds = STANDALONE_CARDS.map((entry) => entry.card.id).sort();
    expect(merged.cards.map((entry) => entry.id).sort()).toEqual(standaloneIds);
  });

  it("can fill one local Medical day from the merged pools", () => {
    const medical = merged.cards.filter((entry) => entry.module === "medical_english");
    expect(medical.filter((entry) => entry.category === "morphology")).toHaveLength(70);
    expect(medical.filter((entry) => entry.category === "core")).toHaveLength(591);
    expect(
      medical.filter((entry) => entry.category !== "morphology" && entry.category !== "core")
    ).toHaveLength(70);

    const selected = selectMergedMedicalAssignment(
      medical.map((entry) => ({ cardId: entry.id, category: entry.category })),
      "local-user",
      "2026-09-23"
    );
    expect(selected.status).toBe("ready");
    if (selected.status === "ready") {
      expect(selected.cards.filter((entry) => entry.category === "morphology")).toHaveLength(1);
      expect(selected.cards.filter((entry) => entry.category === "core")).toHaveLength(8);
      expect(
        selected.cards.filter(
          (entry) => entry.category !== "morphology" && entry.category !== "core"
        )
      ).toHaveLength(1);
    }
  });

  it("prefers richer context, then the active medical card", () => {
    const research = card({
      id: "research",
      lemma: "attenuate",
      module: "research_english",
      category: "general_research",
      collocations: ["one"]
    });
    const thinMedical = card({ id: "medical-thin", lemma: "alpha", module: "medical_english" });
    const richEssential = card({
      id: "essential-rich",
      lemma: "alpha",
      module: "essential_medical",
      collocations: ["alpha cell", "alpha wave"],
      usage_note: "课堂构词",
      context_sentence: "Alpha cells release glucagon when plasma glucose falls."
    });
    const richWins = mergeLocalMedicalCatalog([research, thinMedical], [richEssential]);
    expect(richWins.cards.map((entry) => entry.id).sort()).toEqual(["essential-rich", "research"]);
    expect(richWins.cards.find((entry) => entry.lemma === "alpha")?.module).toBe("medical_english");
    expect(richWins.droppedEssential).toEqual([]);
    expect(contextRichness(richEssential)).toBeGreaterThan(contextRichness(thinMedical));

    const tiedMedical = card({
      id: "medical-tie",
      lemma: "beta",
      module: "medical_english",
      collocations: ["beta cell"],
      context_sentence: "Beta cells secrete insulin."
    });
    const tiedEssential = card({
      id: "essential-tie",
      lemma: "beta",
      module: "essential_medical",
      collocations: ["beta cell"],
      context_sentence: "Beta cells secrete insulin."
    });
    const tie = mergeLocalMedicalCatalog([tiedMedical], [tiedEssential]);
    expect(tie.cards.map((entry) => entry.id)).toEqual(["medical-tie"]);
    expect(tie.droppedEssential).toEqual([
      {
        lemma: "beta",
        droppedCardId: "essential-tie",
        droppedSenseId: "essential-tie-sense",
        keptCardId: "medical-tie",
        keptSenseId: "medical-tie-sense"
      }
    ]);

    const inactive = card({
      id: "retired",
      lemma: "fever",
      module: "medical_english",
      active: false,
      collocations: ["high fever"]
    });
    const essentialFever = card({
      id: "essential-fever",
      lemma: "fever",
      module: "essential_medical"
    });
    const retired = mergeLocalMedicalCatalog([inactive], [essentialFever]);
    expect(retired.cards.map((entry) => entry.id)).toEqual(["essential-fever"]);
    expect(retired.cards[0]?.module).toBe("medical_english");
  });
});
