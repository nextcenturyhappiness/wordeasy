#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";

import {
  BATCH2_CARD_KEYS,
  CANONICAL_CARD_TOTAL,
  DEACTIVATED_MEDICAL_CARD_KEYS,
  ORIGINAL_BATCH_CARD_KEYS,
  contentUuid
} from "./lib/content-contract.mjs";
import { MEDICAL_PDF_EXPANSION_CARD_KEYS } from "./lib/medical-pdf-expansion-cards.mjs";
import { MEDICAL_RESHAPE_CARD_KEYS } from "./lib/medical-reshape-cards.mjs";
import { formatIssues, validateDataset } from "./lib/content-validator.mjs";

const seedUrl = new URL("../data/seed-data.json", import.meta.url);
const originalMigrationUrl = new URL(
  "../supabase/migrations/20260826000500_seed_content.sql",
  import.meta.url
);
const batch2MigrationUrl = new URL(
  "../supabase/migrations/20260903000700_seed_content_batch2.sql",
  import.meta.url
);
const reshapeMigrationUrl = new URL(
  "../supabase/migrations/20260907000800_medical_morphology.sql",
  import.meta.url
);
const pdfExpansionMigrationUrl = new URL(
  "../supabase/migrations/20260907001000_medical_pdf_expansion.sql",
  import.meta.url
);

const MODULE_NAMES = {
  research_english: "Research English",
  medical_english: "Medical English"
};

const CATEGORY_NAMES = {
  general_research: "General Research",
  statistics_methodology: "Statistics / Methodology",
  bioinformatics: "Bioinformatics",
  anatomy: "Anatomy",
  physiology: "Physiology",
  pathology: "Pathology",
  symptoms: "Symptoms",
  signs: "Signs",
  diseases: "Diseases",
  diagnosis: "Diagnosis",
  laboratory: "Laboratory",
  imaging: "Imaging",
  treatment: "Treatment",
  pharmacology: "Pharmacology",
  surgery_procedures: "Surgery / Procedures",
  clinical_expressions: "Clinical expressions",
  morphology: "词根构词"
};

const CATEGORY_ORDER = Object.fromEntries(
  Object.keys(CATEGORY_NAMES).map((category, index) => [category, index + 1])
);

function sqlText(value) {
  if (value === null) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlBoolean(value) {
  return value ? "true" : "false";
}

function sqlArray(values) {
  return `array[${values.map(sqlText).join(", ")}]::text[]`;
}

function tuple(values) {
  return `  (${values.join(", ")})`;
}

function valuesStatement({ table, columns, rows, updates }) {
  return [
    `insert into public.${table} (${columns.join(", ")})`,
    "values",
    rows.join(",\n"),
    "on conflict (id) do update set",
    `  ${updates.map((column) => `${column} = excluded.${column}`).join(",\n  ")};`
  ].join("\n");
}

function uniqueBy(cards, idField) {
  return [...new Map(cards.map((card) => [card[idField], card])).values()];
}

function contentEntityStatements(cards) {
  const wordRows = uniqueBy(cards, "word_id").map((card) =>
    tuple([
      sqlText(card.word_id),
      sqlText(card.word_key),
      sqlText(card.lemma),
      sqlText(card.display_form),
      sqlText(card.ipa),
      sqlText(card.part_of_speech)
    ])
  );
  const senseRows = uniqueBy(cards, "word_sense_id").map((card) =>
    tuple([
      sqlText(card.word_sense_id),
      sqlText(card.word_sense_key),
      sqlText(card.word_id),
      sqlText(contentUuid("module", card.module)),
      sqlText(contentUuid("category", `${card.module}:${card.category}`)),
      sqlText(card.meaning_en),
      sqlText(card.meaning_zh),
      sqlText(card.usage_note)
    ])
  );
  const contextRows = uniqueBy(cards, "context_id").map((card) =>
    tuple([
      sqlText(card.context_id),
      sqlText(card.context_key),
      sqlText(card.word_sense_id),
      sqlText(card.context_sentence),
      sqlText(card.target_text),
      sqlText(card.plain_english_paraphrase),
      sqlText(card.sentence_translation_zh),
      sqlArray(card.collocations),
      sqlText(card.context_genre),
      sqlText(card.source_type),
      sqlText(card.source_title),
      sqlText(card.source_url),
      sqlText(card.doi),
      sqlText(card.pmid)
    ])
  );
  const cardRows = cards.map((card) =>
    tuple([
      sqlText(card.id),
      sqlText(card.card_key),
      sqlText(card.word_sense_id),
      sqlText(card.context_id),
      sqlText(card.card_type),
      sqlBoolean(card.active)
    ])
  );

  return [
    valuesStatement({
      table: "words",
      columns: ["id", "stable_key", "lemma", "display_form", "ipa", "part_of_speech"],
      rows: wordRows,
      updates: ["stable_key", "lemma", "display_form", "ipa", "part_of_speech"]
    }),
    valuesStatement({
      table: "word_senses",
      columns: [
        "id",
        "stable_key",
        "word_id",
        "module_id",
        "category_id",
        "meaning_en",
        "meaning_zh",
        "usage_note"
      ],
      rows: senseRows,
      updates: [
        "stable_key",
        "word_id",
        "module_id",
        "category_id",
        "meaning_en",
        "meaning_zh",
        "usage_note"
      ]
    }),
    valuesStatement({
      table: "contexts",
      columns: [
        "id",
        "stable_key",
        "word_sense_id",
        "context_sentence",
        "target_text",
        "plain_english_paraphrase",
        "sentence_translation_zh",
        "collocations",
        "context_genre",
        "source_type",
        "source_title",
        "source_url",
        "doi",
        "pmid"
      ],
      rows: contextRows,
      updates: [
        "stable_key",
        "word_sense_id",
        "context_sentence",
        "target_text",
        "plain_english_paraphrase",
        "sentence_translation_zh",
        "collocations",
        "context_genre",
        "source_type",
        "source_title",
        "source_url",
        "doi",
        "pmid"
      ]
    }),
    valuesStatement({
      table: "cards",
      columns: ["id", "stable_key", "word_sense_id", "context_id", "card_type", "active"],
      rows: cardRows,
      updates: ["stable_key", "word_sense_id", "context_id", "card_type", "active"]
    })
  ];
}

function generateMigration(dataset) {
  const cards = dataset.cards;
  const moduleRows = Object.entries(MODULE_NAMES).map(([slug, name]) =>
    tuple([sqlText(contentUuid("module", slug)), sqlText(slug), sqlText(name), "true"])
  );
  const categories = [...new Set(cards.map((card) => `${card.module}|${card.category}`))]
    .map((key) => {
      const [module, category] = key.split("|");
      return { module, category };
    })
    .sort(
      (left, right) =>
        left.module.localeCompare(right.module) ||
        (CATEGORY_ORDER[left.category] ?? 999) - (CATEGORY_ORDER[right.category] ?? 999)
    );
  const categoryRows = categories.map(({ module, category }) =>
    tuple([
      sqlText(contentUuid("category", `${module}:${category}`)),
      sqlText(contentUuid("module", module)),
      sqlText(category),
      sqlText(CATEGORY_NAMES[category]),
      String(CATEGORY_ORDER[category]),
      "true"
    ])
  );
  return [
    "-- Generated from data/seed-data.json by scripts/generate-seed-sql.mjs.",
    "-- Do not hand-edit; update the validated source dataset and regenerate.",
    "begin;",
    valuesStatement({
      table: "modules",
      columns: ["id", "slug", "name", "active"],
      rows: moduleRows,
      updates: ["slug", "name", "active"]
    }),
    valuesStatement({
      table: "categories",
      columns: ["id", "module_id", "slug", "name", "sort_order", "active"],
      rows: categoryRows,
      updates: ["module_id", "slug", "name", "sort_order", "active"]
    }),
    ...contentEntityStatements(cards),
    "commit;",
    ""
  ].join("\n\n");
}

function generateBatch2Migration(cards) {
  return [
    "-- Generated from data/seed-data.json batch 2 by scripts/generate-seed-sql.mjs.",
    "-- Additive insert of the second 60 Context Cards.",
    "-- Do not rewrite 20260826000500_seed_content.sql; original 60 rows stay unchanged.",
    "begin;",
    ...contentEntityStatements(cards),
    "commit;",
    ""
  ].join("\n\n");
}

function generatePdfExpansionMigration(cards) {
  return [
    "-- Generated from data/seed-data.json Medical PDF expansion by scripts/generate-seed-sql.mjs.",
    "-- Additive: insert owner-PDF morphology cards and easy chart lemmas.",
    "-- Do not rewrite 20260826000500_seed_content.sql, 20260903000700_seed_content_batch2.sql,",
    "-- or 20260907000800_medical_morphology.sql.",
    "begin;",
    ...contentEntityStatements(cards),
    "commit;",
    ""
  ].join("\n\n");
}

function generateReshapeMigration(cards, deactivatedKeys) {
  const morphologyCategory = tuple([
    sqlText(contentUuid("category", "medical_english:morphology")),
    sqlText(contentUuid("module", "medical_english")),
    sqlText("morphology"),
    sqlText("词根构词"),
    "14",
    "true"
  ]);
  const deactivateList = deactivatedKeys.map((key) => sqlText(key)).join(",\n  ");
  return [
    "-- Generated from data/seed-data.json Medical reshape by scripts/generate-seed-sql.mjs.",
    "-- Additive: deactivate shipped specialty cards, insert chart replacements and morphology.",
    "-- Do not rewrite 20260826000500_seed_content.sql or 20260903000700_seed_content_batch2.sql.",
    "begin;",
    [
      "insert into public.categories (id, module_id, slug, name, sort_order, active)",
      "values",
      morphologyCategory,
      "on conflict (id) do update set",
      "  module_id = excluded.module_id,\n  slug = excluded.slug,\n  name = excluded.name,\n  sort_order = excluded.sort_order,\n  active = excluded.active;"
    ].join("\n"),
    ...contentEntityStatements(cards),
    [
      "update public.cards",
      "set active = false",
      `where stable_key in (\n  ${deactivateList}\n);`
    ].join("\n"),
    "commit;",
    ""
  ].join("\n\n");
}

function withShippedActiveFlag(card) {
  return { ...card, active: true };
}

function splitCanonicalBatches(cards) {
  const originalKeys = new Set(ORIGINAL_BATCH_CARD_KEYS);
  const batch2Keys = new Set(BATCH2_CARD_KEYS);
  const reshapeKeys = new Set(MEDICAL_RESHAPE_CARD_KEYS);
  const pdfKeys = new Set(MEDICAL_PDF_EXPANSION_CARD_KEYS);
  const originalCards = [];
  const batch2Cards = [];
  const reshapeCards = [];
  const pdfCards = [];
  for (const card of cards) {
    if (originalKeys.has(card.card_key)) {
      originalCards.push(withShippedActiveFlag(card));
    } else if (batch2Keys.has(card.card_key)) {
      batch2Cards.push(withShippedActiveFlag(card));
    } else if (reshapeKeys.has(card.card_key)) {
      reshapeCards.push(card);
    } else if (pdfKeys.has(card.card_key)) {
      pdfCards.push(card);
    } else {
      throw new Error(`Unassigned seed card_key ${card.card_key}.`);
    }
  }
  if (originalCards.length !== ORIGINAL_BATCH_CARD_KEYS.length) {
    throw new Error(
      `Original seed batch has ${originalCards.length} cards; expected ${ORIGINAL_BATCH_CARD_KEYS.length}.`
    );
  }
  if (batch2Cards.length !== BATCH2_CARD_KEYS.length) {
    throw new Error(
      `Second seed batch has ${batch2Cards.length} cards; expected ${BATCH2_CARD_KEYS.length}.`
    );
  }
  if (reshapeCards.length !== MEDICAL_RESHAPE_CARD_KEYS.length) {
    throw new Error(
      `Medical reshape batch has ${reshapeCards.length} cards; expected ${MEDICAL_RESHAPE_CARD_KEYS.length}.`
    );
  }
  if (pdfCards.length !== MEDICAL_PDF_EXPANSION_CARD_KEYS.length) {
    throw new Error(
      `PDF expansion batch has ${pdfCards.length} cards; expected ${MEDICAL_PDF_EXPANSION_CARD_KEYS.length}.`
    );
  }
  return { originalCards, batch2Cards, reshapeCards, pdfCards };
}

const dataset = JSON.parse(await readFile(seedUrl, "utf8"));
const validation = validateDataset(dataset);
if (validation.errors.length > 0) {
  throw new Error(
    `Seed validation failed before SQL generation:\n${formatIssues(validation.errors)}`
  );
}

const { originalCards, batch2Cards, reshapeCards, pdfCards } = splitCanonicalBatches(dataset.cards);
const originalGenerated = generateMigration({ ...dataset, cards: originalCards });
const batch2Generated = generateBatch2Migration(batch2Cards);
const reshapeGenerated = generateReshapeMigration(reshapeCards, [...DEACTIVATED_MEDICAL_CARD_KEYS]);
const pdfGenerated = generatePdfExpansionMigration(pdfCards);
const existingOriginal = await readFile(originalMigrationUrl, "utf8");
if (existingOriginal !== originalGenerated) {
  throw new Error(
    "Original 60-card seed migration drifted. Keep those card identities and content stable."
  );
}

if (process.argv.includes("--check")) {
  const existingBatch2 = await readFile(batch2MigrationUrl, "utf8");
  if (existingBatch2 !== batch2Generated) {
    throw new Error("Generated batch-2 seed migration is stale. Run npm run content:seed-sql.");
  }
  const existingReshape = await readFile(reshapeMigrationUrl, "utf8");
  if (existingReshape !== reshapeGenerated) {
    throw new Error(
      "Generated Medical reshape seed migration is stale. Run npm run content:seed-sql."
    );
  }
  const existingPdf = await readFile(pdfExpansionMigrationUrl, "utf8");
  if (existingPdf !== pdfGenerated) {
    throw new Error(
      "Generated Medical PDF expansion seed migration is stale. Run npm run content:seed-sql."
    );
  }
  console.log(
    `Seed SQL is current: ${CANONICAL_CARD_TOTAL} validated cards across original, batch-2, Medical reshape, and PDF expansion migrations.`
  );
} else {
  await writeFile(pdfExpansionMigrationUrl, pdfGenerated, "utf8");
  console.log(
    `Generated additive Medical PDF expansion migration for ${pdfCards.length} new cards.`
  );
}
