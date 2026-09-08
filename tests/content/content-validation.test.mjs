import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CANONICAL_ACTIVE_CARD_TOTAL,
  CANONICAL_CARD_TOTAL,
  CANONICAL_MEDICAL_ACTIVE_TOTAL,
  CANONICAL_MEDICAL_TOTAL,
  CANONICAL_RESEARCH_TOTAL,
  DEACTIVATED_MEDICAL_CARD_KEYS,
  CARD_FIELDS,
  CSV_FIELDS,
  MEDICAL_CONTEXT_GENRES,
  MEDICAL_COUNTS,
  ORIGINAL_BATCH_CARD_KEYS,
  RESEARCH_CONTEXT_GENRES,
  RESEARCH_COUNTS,
  ESSENTIAL_DATASET_KEY,
  ESSENTIAL_MEDICAL_MIN_TOTAL,
  addStableIdentity,
  contentUuid,
  parseCsv
} from "../../scripts/lib/content-contract.mjs";
import {
  validateDataset,
  validateEssentialDataset,
  validateImportTemplate
} from "../../scripts/lib/content-validator.mjs";

const seedPath = resolve(process.cwd(), "data/seed-data.json");
const essentialPath = resolve(process.cwd(), "data/essential-medical/cards.json");
const templatePath = resolve(process.cwd(), "data/import-template.csv");
const dataset = JSON.parse(readFileSync(seedPath, "utf8"));
const essentialDataset = JSON.parse(readFileSync(essentialPath, "utf8"));
const template = readFileSync(templatePath, "utf8");

function copyDataset() {
  return structuredClone(dataset);
}

function issueCodes(result) {
  return result.errors.map((issue) => issue.code);
}

function removeIdentity(card) {
  const copy = structuredClone(card);
  for (const field of [
    "id",
    "word_id",
    "word_key",
    "word_sense_id",
    "word_sense_key",
    "context_id",
    "context_key"
  ]) {
    Reflect.deleteProperty(copy, field);
  }
  return copy;
}

describe("formal seed dataset", () => {
  it("passes the complete versioned content contract", () => {
    const result = validateDataset(dataset);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("contains 60 Research cards and the reshaped Medical catalog", () => {
    const result = validateDataset(dataset);
    expect(result.counts).toMatchObject({
      total: CANONICAL_CARD_TOTAL,
      research: CANONICAL_RESEARCH_TOTAL,
      medical: CANONICAL_MEDICAL_ACTIVE_TOTAL,
      researchCategories: RESEARCH_COUNTS,
      medicalCategories: MEDICAL_COUNTS
    });
    expect(result.counts.research + result.counts.medical).toBe(CANONICAL_ACTIVE_CARD_TOTAL);
    expect(dataset.cards.filter((card) => card.module === "medical_english")).toHaveLength(
      CANONICAL_MEDICAL_TOTAL
    );
  });

  it("keeps the original 60 card keys in place and ahead of the second batch", () => {
    expect(
      dataset.cards.slice(0, ORIGINAL_BATCH_CARD_KEYS.length).map((card) => card.card_key)
    ).toEqual([...ORIGINAL_BATCH_CARD_KEYS]);
    expect(dataset.cards).toHaveLength(CANONICAL_CARD_TOTAL);
  });

  it("deactivates culled specialty cards instead of recycling their identities", () => {
    const culled = dataset.cards.filter((card) =>
      DEACTIVATED_MEDICAL_CARD_KEYS.includes(card.card_key)
    );
    expect(culled).toHaveLength(DEACTIVATED_MEDICAL_CARD_KEYS.length);
    expect(culled.every((card) => card.active === false)).toBe(true);
    expect(
      dataset.cards.filter((card) => card.category === "morphology" && card.active)
    ).toHaveLength(MEDICAL_COUNTS.morphology);
  });

  it("covers every required Research and Medical material genre", () => {
    const result = validateDataset(dataset);
    expect(result.counts.researchGenres).toEqual([...RESEARCH_CONTEXT_GENRES].sort());
    expect(result.counts.medicalGenres).toEqual([...MEDICAL_CONTEXT_GENRES].sort());
  });

  it("stores stable normalized word, sense, context, and card identities", () => {
    for (const card of dataset.cards) {
      expect(card.id).toBe(contentUuid("card", card.card_key));
      expect(card.word_id).toBe(contentUuid("word", card.word_key));
      expect(card.word_sense_id).toBe(contentUuid("word-sense", card.word_sense_key));
      expect(card.context_id).toBe(contentUuid("context", card.context_key));
      expect(card.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u
      );
    }
  });

  it("keeps every original example free of invented citation metadata", () => {
    for (const card of dataset.cards) {
      expect(card.source_type).toBe("original_example");
      expect([card.source_title, card.source_url, card.doi, card.pmid]).toEqual([
        null,
        null,
        null,
        null
      ]);
    }
  });

  it("provides every required field and an exact, unique highlight target", () => {
    for (const card of dataset.cards) {
      expect(Object.keys(card).sort()).toEqual([...CARD_FIELDS].sort());
      expect(card.context_sentence.split(card.target_text)).toHaveLength(2);
      expect(card.display_form).toBe(card.target_text);
      expect(card.collocations.length).toBeGreaterThanOrEqual(2);
      expect(card.collocations.length).toBeLessThanOrEqual(4);
    }
  });
});

describe("flat CSV import contract", () => {
  it("uses the exact versioned header and a parseable example row", () => {
    const parsed = parseCsv(template);
    expect(parsed.headers).toEqual(CSV_FIELDS);
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].collocations).toContain("|");
  });

  it("round-trips the first JSON card without field drift", () => {
    expect(validateImportTemplate(template, dataset.cards[0])).toEqual([]);
  });
});

describe("strict content validation failures", () => {
  it("reports a card id and missing-field reason", () => {
    const invalid = copyDataset();
    delete invalid.cards[0].meaning_en;
    const result = validateDataset(invalid);
    expect(issueCodes(result)).toContain("missing_field");
    expect(result.errors.some((issue) => issue.cardKey === "res-general-attenuate-001")).toBe(true);
  });

  it("rejects an illegal category for the selected module", () => {
    const invalid = copyDataset();
    invalid.cards[0].category = "imaging";
    expect(issueCodes(validateDataset(invalid))).toContain("category_module");
  });

  it("rejects an illegal module", () => {
    const invalid = copyDataset();
    invalid.cards[0].module = "general_english";
    expect(issueCodes(validateDataset(invalid))).toContain("module");
  });

  it("rejects a target absent from its context", () => {
    const invalid = copyDataset();
    invalid.cards[0].target_text = "weakened";
    invalid.cards[0].display_form = "weakened";
    expect(issueCodes(validateDataset(invalid))).toContain("target_occurrence");
  });

  it("rejects an English-only usage note", () => {
    const invalid = copyDataset();
    invalid.cards[0].usage_note = "Used in Results and Discussion when an effect becomes smaller.";
    expect(issueCodes(validateDataset(invalid))).toContain("usage_note");
  });

  it("rejects contradictory citation metadata on an original example", () => {
    const invalid = copyDataset();
    invalid.cards[0].doi = "10.1000/invented";
    expect(issueCodes(validateDataset(invalid))).toContain("original_source_metadata");
  });

  it("rejects wrong total and category counts", () => {
    const invalid = copyDataset();
    invalid.cards.pop();
    const codes = issueCodes(validateDataset(invalid));
    expect(codes).toContain("total_count");
    expect(codes).toContain("category_count");
  });

  it("rejects duplicate card ids", () => {
    const invalid = copyDataset();
    invalid.cards[1].id = invalid.cards[0].id;
    expect(issueCodes(validateDataset(invalid))).toContain("duplicate_identity");
  });

  it("rejects contexts duplicated after case and punctuation normalization", () => {
    const invalid = copyDataset();
    invalid.cards[1].context_sentence = invalid.cards[0].context_sentence.toUpperCase();
    invalid.cards[1].target_text = invalid.cards[0].target_text.toUpperCase();
    invalid.cards[1].display_form = invalid.cards[1].target_text;
    expect(issueCodes(validateDataset(invalid))).toContain("duplicate_context");
  });

  it("rejects empty collocations", () => {
    const invalid = copyDataset();
    invalid.cards[0].collocations = [];
    expect(issueCodes(validateDataset(invalid))).toContain("collocations_count");
  });

  it("rejects a UUID that does not match its immutable key", () => {
    const invalid = copyDataset();
    invalid.cards[0].context_id = invalid.cards[1].context_id;
    expect(issueCodes(validateDataset(invalid))).toContain("stable_uuid");
  });

  it("rejects near-duplicate contexts for the same word sense", () => {
    const invalid = copyDataset();
    const source = invalid.cards[0];
    const duplicate = invalid.cards[1];
    for (const field of [
      "word_id",
      "word_key",
      "word_sense_id",
      "word_sense_key",
      "lemma",
      "part_of_speech",
      "ipa",
      "meaning_en",
      "meaning_zh",
      "usage_note",
      "category"
    ]) {
      duplicate[field] = source[field];
    }
    duplicate.display_form = source.display_form;
    duplicate.target_text = source.target_text;
    duplicate.context_sentence =
      "The association was attenuated after adjustment for age and body mass index.";
    duplicate.context_key = `${source.word_sense_key}:near-duplicate-test`;
    duplicate.context_id = contentUuid("context", duplicate.context_key);
    expect(issueCodes(validateDataset(invalid))).toContain("near_duplicate_context");
  });

  it("detects British-American spelling duplicates under different word identities", () => {
    const invalid = copyDataset();
    const source = invalid.cards.find((card) => card.card_key === "med-laboratory-hemolyzed-001");
    const duplicate = addStableIdentity({
      ...removeIdentity(source),
      card_key: "med-laboratory-haemolyzed-test-001",
      lemma: "haemolyze",
      display_form: "haemolyzed",
      target_text: "haemolyzed",
      context_sentence: "A second specimen was also haemolyzed before laboratory analysis."
    });
    invalid.cards.push(duplicate);
    expect(issueCodes(validateDataset(invalid))).toContain("duplicate_lexeme_identity");
  });

  it("detects lemma/display-form inflection duplicates", () => {
    const invalid = copyDataset();
    const source = invalid.cards.find((card) => card.card_key === "res-bio-ortholog-001");
    const duplicate = addStableIdentity({
      ...removeIdentity(source),
      card_key: "res-bio-orthologs-test-001",
      lemma: "orthologs",
      context_sentence:
        "The pipeline retained orthologs that passed the reciprocal sequence-similarity filter."
    });
    invalid.cards.push(duplicate);
    expect(issueCodes(validateDataset(invalid))).toContain("inflection_duplicate");
  });

  it("allows two distinct contexts to share one word sense", () => {
    const first = structuredClone(dataset.cards[0]);
    const second = {
      ...structuredClone(first),
      card_key: "res-general-attenuate-002",
      context_key: `${first.word_sense_key}:res-general-attenuate-002`,
      context_sentence:
        "Further adjustment attenuated the estimated treatment effect without reversing its direction.",
      target_text: "attenuated",
      display_form: "attenuated",
      plain_english_paraphrase:
        "Adding more variables made the estimated benefit smaller but did not change whether it was positive or negative.",
      sentence_translation_zh: "进一步调整减弱了估计的治疗效应，但没有改变其方向。"
    };
    second.id = contentUuid("card", second.card_key);
    second.context_id = contentUuid("context", second.context_key);
    const result = validateDataset(
      {
        ...dataset,
        cards: [first, second]
      },
      { enforceCounts: false }
    );
    expect(result.errors).toEqual([]);
  });
});

describe("essential medical dataset", () => {
  it("covers the classroom lemma list with empty collocations", () => {
    const result = validateEssentialDataset(essentialDataset);
    expect(result.errors).toEqual([]);
    expect(essentialDataset.dataset_key).toBe(ESSENTIAL_DATASET_KEY);
    expect(result.counts.essential).toBeGreaterThanOrEqual(ESSENTIAL_MEDICAL_MIN_TOTAL);
    expect(essentialDataset.cards.every((card) => card.module === "essential_medical")).toBe(true);
    expect(essentialDataset.cards.every((card) => card.collocations.length === 0)).toBe(true);
    expect(essentialDataset.cards.every((card) => card.source_type === "original_example")).toBe(
      true
    );
    expect(
      essentialDataset.cards.every((card) =>
        [card.source_title, card.source_url, card.doi, card.pmid].every((value) => value === null)
      )
    ).toBe(true);
  });

  it("rejects a non-empty collocation on an essential card", () => {
    const invalid = structuredClone(essentialDataset);
    invalid.cards[0].collocations = ["abdomen wall"];
    expect(issueCodes(validateEssentialDataset(invalid))).toContain("collocations_count");
  });
});
