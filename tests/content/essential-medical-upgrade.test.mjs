import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  analyzeEssentialLemma,
  buildUsageNote
} from "../../scripts/lib/essential-medical-morphology.mjs";
import {
  CLASSROOM_RE,
  LAZY_SENTENCE_RE,
  patternKey,
  sentenceFailsQuality
} from "../../scripts/lib/essential-medical-sentences.mjs";

const essentialPath = resolve(process.cwd(), "data/essential-medical/cards.json");
const essentialDataset = JSON.parse(readFileSync(essentialPath, "utf8"));
const CLASSROOM_PROBE =
  /ward round|teaching example|classroom|juniors|registrar|tutor pointed|chapter on/iu;

describe("essential medical clinical sentence upgrade", () => {
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
    expect(card.context_sentence).not.toMatch(CLASSROOM_RE);
    expect(card.target_text).toBe("bronchiectasis");
  });

  it("places phagocytosis in a real cell and bacteria context", () => {
    const card = essentialDataset.cards.find((item) => item.lemma === "phagocytosis");
    expect(card).toBeDefined();
    expect(card.id).toBe("4e95ceb7-e9ac-56f9-8bb4-f7cb1fa0fdeb");
    expect(card.word_sense_id).toBe("c268e973-e801-5ff5-a810-996194ee4959");
    expect(card.context_id).toBe("4c07b9d7-f594-59fc-9551-5514640d6cfb");
    expect(card.meaning_en).toBe("engulfment of particles by a cell");
    expect(card.meaning_zh).toBe("吞噬作用");
    expect(card.context_sentence).toMatch(/phagocytosis/u);
    expect(card.context_sentence).toMatch(/bacteria/iu);
    expect(card.context_sentence).toMatch(/engulf/iu);
    expect(card.context_sentence).not.toMatch(CLASSROOM_RE);
    expect(card.plain_english_paraphrase).not.toMatch(CLASSROOM_RE);
    expect(card.sentence_translation_zh).toMatch(/吞噬作用/u);
    expect(card.sentence_translation_zh).toMatch(/细菌/u);
  });

  it("rewrites previously mad-lib lemmas into real clinical or physiological English", () => {
    const cube = essentialDataset.cards.find((item) => item.lemma === "cube-shaped");
    expect(cube?.context_sentence).toMatch(/crystals were cube-shaped/u);
    expect(cube?.context_sentence).not.toMatch(/episode was/u);

    const collarbone = essentialDataset.cards.find((item) => item.lemma === "collarbone");
    expect(collarbone?.context_sentence).toMatch(/fracture of the collarbone/u);
    expect(collarbone?.context_sentence).not.toMatch(/host response/u);

    const offspring = essentialDataset.cards.find((item) => item.lemma === "offspring");
    expect(offspring?.context_sentence).toMatch(/affected offspring had inherited/u);

    const hyperthyroidism = essentialDataset.cards.find((item) => item.lemma === "hyperthyroidism");
    expect(hyperthyroidism?.context_sentence).toMatch(/suppressed TSH fitted hyperthyroidism/u);
    expect(hyperthyroidism?.context_sentence).not.toMatch(/Pain mapped over/u);

    const alkali = essentialDataset.cards.find((item) => item.lemma === "alkali");
    expect(alkali?.context_sentence).toMatch(/alkali spill raised the pH/u);
    expect(alkali?.context_sentence).not.toMatch(/Neighboring tissue/u);

    const psychology = essentialDataset.cards.find((item) => item.lemma === "psychology");
    expect(psychology?.context_sentence).toMatch(/psychology input was needed/u);
    expect(psychology?.context_sentence).not.toMatch(/operative report used/u);

    const globulin = essentialDataset.cards.find((item) => item.lemma === "globulin");
    expect(globulin?.context_sentence).toMatch(/antibody protein/u);
    expect(globulin?.context_sentence).not.toMatch(/Normal function in this region/u);
  });

  it("fails lazy mad-lib sentence patterns", () => {
    expect(
      sentenceFailsQuality("The progress line mentioned alkali in one plain sentence.", {
        lemma: "alkali",
        pos: "noun",
        meaningEn: "a base that can neutralize acid"
      })
    ).toBe(true);
    expect(
      sentenceFailsQuality("The episode was cube-shaped enough to need the monitor overnight.", {
        lemma: "cube-shaped",
        pos: "adjective",
        meaningEn: "having the shape of a cube, as some short bones do"
      })
    ).toBe(true);
    expect(
      sentenceFailsQuality("The operative report used psychology to map the injured structures.", {
        lemma: "psychology",
        pos: "noun",
        meaningEn: "the study of mind, emotion, and behavior"
      })
    ).toBe(true);
    expect(
      LAZY_SENTENCE_RE.test("The progress line mentioned collarbone in one plain sentence.")
    ).toBe(true);
  });

  it("leaves usage_note empty when no useful root story exists", () => {
    expect(buildUsageNote("elbow")).toBe("");
    expect(analyzeEssentialLemma("function")).toBeNull();
    const elbow = essentialDataset.cards.find((item) => item.lemma === "elbow");
    expect(elbow?.usage_note).toBe("");
  });

  it("keeps essential sentences clinical rather than classroom and avoids one dominant pattern", () => {
    const counts = new Map();
    let classroomHits = 0;
    for (const card of essentialDataset.cards) {
      const key = patternKey(card.context_sentence, card.lemma);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      expect(card.target_text).toBe(card.lemma);
      expect(card.context_sentence.includes(card.lemma)).toBe(true);
      const surface = `${card.context_sentence}\n${card.plain_english_paraphrase}\n${card.sentence_translation_zh}`;
      expect(surface).not.toMatch(CLASSROOM_RE);
      expect(surface).not.toMatch(LAZY_SENTENCE_RE);
      expect(
        sentenceFailsQuality(card.context_sentence, {
          lemma: card.lemma,
          pos: card.part_of_speech,
          meaningEn: card.meaning_en
        })
      ).toBe(false);
      if (CLASSROOM_PROBE.test(surface)) {
        classroomHits += 1;
      }
    }
    const withNotes = essentialDataset.cards.filter((card) => card.usage_note.length > 0);
    const ranked = [...counts.values()].sort((left, right) => right - left);
    expect(classroomHits).toBe(0);
    expect(withNotes.length).toBeGreaterThanOrEqual(120);
    expect(counts.size).toBeGreaterThanOrEqual(20);
    expect(ranked[0] / essentialDataset.cards.length).toBeLessThan(0.1);
  });
});
