import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  analyzeEssentialLemma,
  buildUsageNote
} from "../../scripts/lib/essential-medical-morphology.mjs";
import { patternKey } from "../../scripts/lib/essential-medical-sentences.mjs";

const essentialPath = resolve(process.cwd(), "data/essential-medical/cards.json");
const essentialDataset = JSON.parse(readFileSync(essentialPath, "utf8"));

describe("essential medical classroom upgrade", () => {
  it("puts a Chinese root/affix story on bronchiectasis without changing the gloss", () => {
    const card = essentialDataset.cards.find((item) => item.lemma === "bronchiectasis");
    expect(card).toBeDefined();
    expect(card.id).toBe("7fa622ad-723d-5534-915c-3b81d3f6fb15");
    expect(card.word_sense_id).toBe("5d71a3cd-0f3c-5de7-b30e-9325e52ebc04");
    expect(card.context_id).toBe("05ef2ce7-3e32-5221-987a-c80433d929b7");
    expect(card.meaning_en).toBe("permanent abnormal widening of bronchi");
    expect(card.meaning_zh).toBe("支气管扩张");
    expect(card.usage_note).toMatch(/课堂构词/);
    expect(card.usage_note).toMatch(/bronchio-/);
    expect(card.usage_note).toMatch(/-ectasis/);
    expect(card.usage_note).toMatch(/支气管/);
    expect(card.usage_note).toMatch(/扩张/);
    expect(card.context_sentence).toContain("bronchiectasis");
    expect(card.context_sentence).not.toMatch(/opens with the .+ as a teaching example/iu);
    expect(card.target_text).toBe("bronchiectasis");
  });

  it("leaves usage_note empty when no useful root story exists", () => {
    expect(buildUsageNote("elbow")).toBe("");
    expect(analyzeEssentialLemma("function")).toBeNull();
    const elbow = essentialDataset.cards.find((item) => item.lemma === "elbow");
    expect(elbow?.usage_note).toBe("");
  });

  it("does not let one sentence pattern dominate the essential set", () => {
    const counts = new Map();
    for (const card of essentialDataset.cards) {
      const key = patternKey(card.context_sentence, card.lemma);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      expect(card.context_sentence).not.toMatch(/opens with the .+ as a teaching example/iu);
      expect(card.target_text).toBe(card.lemma);
      expect(card.context_sentence.includes(card.lemma)).toBe(true);
    }
    const withNotes = essentialDataset.cards.filter((card) => card.usage_note.length > 0);
    const ranked = [...counts.values()].sort((left, right) => right - left);
    expect(withNotes.length).toBeGreaterThanOrEqual(120);
    expect(counts.size).toBeGreaterThanOrEqual(20);
    expect(ranked[0] / essentialDataset.cards.length).toBeLessThan(0.1);
  });
});
