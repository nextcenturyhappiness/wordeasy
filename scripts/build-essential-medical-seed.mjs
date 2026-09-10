#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  addStableIdentity,
  CONTENT_SCHEMA_VERSION,
  ESSENTIAL_DATASET_KEY,
  ESSENTIAL_MEDICAL_MIN_TOTAL,
  slugify,
  UUID_NAMESPACE
} from "./lib/content-contract.mjs";
import { formatIssues, validateEssentialDataset } from "./lib/content-validator.mjs";
import {
  assembleEssentialSource,
  normalizeLemmaKey,
  parseSourceGlosses
} from "./lib/essential-medical-source.mjs";
import { sqlText, tuple } from "./lib/seed-sql.mjs";
import { buildUsageNote } from "./lib/essential-medical-morphology.mjs";
import {
  CLASSROOM_RE,
  FALLBACK_FRAMES,
  framesFor,
  lemmaOverride,
  patternKey
} from "./lib/essential-medical-sentences.mjs";

const rawUrl = new URL("./lib/essential-medical-raw.tsv", import.meta.url);
const pdfGlossesUrl = new URL("./lib/essential-medical-pdf-glosses.tsv", import.meta.url);
const dataDir = new URL("../data/essential-medical/", import.meta.url);
const cardsUrl = new URL("../data/essential-medical/cards.json", import.meta.url);
const lemmasUrl = new URL("../data/essential-medical/lemmas.txt", import.meta.url);
const sourceUrl = new URL("../data/essential-medical/source.txt", import.meta.url);
const originalSeedUrl = new URL(
  "../supabase/migrations/20260908001400_essential_medical_seed.sql",
  import.meta.url
);
const originalRefreshUrl = new URL(
  "../supabase/migrations/20260910001600_essential_medical_roots_sentences.sql",
  import.meta.url
);
const refreshMigrationUrl = new URL(
  "../supabase/migrations/20260910001700_essential_medical_clinical_sentences.sql",
  import.meta.url
);

const MODULE = "essential_medical";
const CATEGORY = "core";
const ALLOWED_POS = new Set(["noun", "adjective", "verb", "phrase", "adverb", "phrasal verb"]);
const checkOnly = process.argv.includes("--check");
const BANNED_SENTENCE = CLASSROOM_RE;

function parseTsv(text, pathLabel) {
  const lines = text.trim().split(/\r?\n/u);
  const header = lines[0]?.split("\t") ?? [];
  if (header.join("\t") !== "lemma\tpos\tipa\tzh\tmeaning_en") {
    throw new Error(`Unexpected TSV header in ${pathLabel}: ${header.join("\\t")}`);
  }
  const map = new Map();
  for (const [index, line] of lines.slice(1).entries()) {
    const cells = line.split("\t");
    if (cells.length !== 5) {
      throw new Error(
        `TSV row ${String(index + 2)} in ${pathLabel} has ${String(cells.length)} columns.`
      );
    }
    const [lemma, pos, ipa, zh, meaningEn] = cells.map((cell) => cell.trim());
    if (!ALLOWED_POS.has(pos)) {
      throw new Error(`Unsupported POS "${pos}" in ${pathLabel} for ${lemma}`);
    }
    if (!/^\/.+\/$/u.test(ipa)) {
      throw new Error(`Invalid IPA in ${pathLabel} for ${lemma}`);
    }
    const key = normalizeLemmaKey(lemma);
    if (!map.has(key)) {
      map.set(key, { lemma, pos, ipa, zh, meaningEn });
    }
  }
  return map;
}

function loadLemmas(text) {
  const lemmas = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lemmas.length < ESSENTIAL_MEDICAL_MIN_TOTAL) {
    throw new Error(
      `Canonical lemmas.txt has ${String(lemmas.length)} entries; expected >= ${String(ESSENTIAL_MEDICAL_MIN_TOTAL)}. Do not shrink the list.`
    );
  }
  return lemmas;
}

function inferPos(lemma) {
  if (lemma.includes(" ") || lemma.includes("\\") || lemma.includes("/")) {
    return "phrase";
  }
  return "noun";
}

function lookupGloss(lemma, maps) {
  const key = normalizeLemmaKey(lemma);
  for (const map of maps) {
    const hit = map.get(key);
    if (hit) return hit;
  }
  for (const piece of lemma.split(/\s*[/\\]\s*/u)) {
    const pieceKey = normalizeLemmaKey(piece);
    if (pieceKey.length === 0) continue;
    for (const map of maps) {
      const hit = map.get(pieceKey);
      if (hit) return hit;
    }
  }
  return null;
}

function mergeGloss(lemma, sourceMap, pdfMap, rawMap) {
  const source = lookupGloss(lemma, [sourceMap]);
  const tsv = lookupGloss(lemma, [pdfMap, rawMap]);
  if (source == null && tsv == null) {
    throw new Error(`Missing gloss for canonical lemma: ${lemma}`);
  }
  const pos = tsv?.pos ?? inferPos(lemma);
  const sourceIpa = source?.ipa && /^\/.+\/$/u.test(source.ipa) ? source.ipa : "";
  const ipa = sourceIpa || tsv?.ipa;
  const zh = source?.zh || tsv?.zh;
  const meaningEn = tsv?.meaningEn ?? `the medical sense recorded as ${zh ?? lemma}`;
  if (!ALLOWED_POS.has(pos) || !ipa || !zh) {
    throw new Error(`Incomplete gloss for canonical lemma: ${lemma}`);
  }
  return { lemma, pos, ipa, zh, meaningEn };
}

function countLiteralOccurrences(text, target) {
  if (target.length === 0) return 0;
  let count = 0;
  let index = 0;
  while ((index = text.indexOf(target, index)) !== -1) {
    count += 1;
    index += target.length;
  }
  return count;
}

function pick(list, index) {
  return list[index % list.length];
}

function countWords(sentence) {
  return sentence.trim().split(/\s+/u).filter(Boolean).length;
}

function isUsableCopy(sentence, paraphrase, translation, lemma) {
  return (
    countLiteralOccurrences(sentence, lemma) === 1 &&
    countWords(sentence) >= 6 &&
    countWords(sentence) <= 40 &&
    !BANNED_SENTENCE.test(sentence) &&
    !BANNED_SENTENCE.test(paraphrase) &&
    !BANNED_SENTENCE.test(translation)
  );
}

function buildContext(entry, index) {
  const { lemma, zh, meaningEn } = entry;
  const override = lemmaOverride(entry);
  const primary = framesFor(entry);
  const ordered = [
    ...(override ? [override] : []),
    pick(primary, index),
    ...primary.filter((_, frameIndex) => frameIndex !== index % primary.length),
    ...FALLBACK_FRAMES
  ];
  const chosen = ordered.find((frame) => {
    const sentence = frame.sentence(lemma, meaningEn);
    const paraphrase = frame.paraphrase(lemma, meaningEn);
    const translation = frame.translation(zh, lemma, meaningEn);
    return isUsableCopy(sentence, paraphrase, translation, lemma);
  });
  if (chosen === undefined) {
    throw new Error(`Could not build a unique context sentence for ${lemma}.`);
  }

  const sentence = chosen.sentence(lemma, meaningEn);
  const paraphrase = chosen.paraphrase(lemma, meaningEn);
  const translation = chosen.translation(zh, lemma, meaningEn);
  return { sentence, paraphrase, translation, patternId: chosen.id };
}

function uniqueSlug(lemma, used) {
  const base = slugify(lemma) || "lemma";
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = `${base}-${String(n)}`;
    n += 1;
  }
  used.add(slug);
  return slug;
}

function toCard(entry, index, usedSlugs) {
  const slug = uniqueSlug(entry.lemma, usedSlugs);
  const { sentence, paraphrase, translation } = buildContext(entry, index);
  return addStableIdentity({
    card_key: `ess-core-${slug}-001`,
    word_key: `ess:${slug}:${slugify(entry.pos)}`,
    lemma: entry.lemma,
    display_form: entry.lemma,
    part_of_speech: entry.pos,
    ipa: entry.ipa,
    module: MODULE,
    category: CATEGORY,
    context_genre: "medical_textbook",
    meaning_en: entry.meaningEn,
    meaning_zh: entry.zh,
    usage_note: buildUsageNote(entry.lemma),
    context_sentence: sentence,
    target_text: entry.lemma,
    plain_english_paraphrase: paraphrase,
    sentence_translation_zh: translation,
    collocations: [],
    source_type: "original_example",
    source_title: null,
    source_url: null,
    doi: null,
    pmid: null,
    card_type: "context_recall",
    active: true
  });
}

function generateAdditiveRefresh(cards) {
  const contextRows = cards.map((card) =>
    tuple([
      sqlText(card.context_id),
      sqlText(card.context_sentence),
      sqlText(card.plain_english_paraphrase),
      sqlText(card.sentence_translation_zh)
    ])
  );
  return [
    "-- Additive refresh for 必备医学英语 clinical/physiological sentences.",
    "-- Generated by scripts/build-essential-medical-seed.mjs.",
    "-- Updates context_sentence, paraphrase, and translation only.",
    "-- Card / word / sense IDs stay unchanged. usage_note is not rewritten here.",
    "-- Do not rewrite 20260908001400_essential_medical_seed.sql",
    "-- or 20260910001600_essential_medical_roots_sentences.sql.",
    "begin;",
    [
      "update public.contexts as c",
      "set",
      "  context_sentence = v.context_sentence,",
      "  plain_english_paraphrase = v.plain_english_paraphrase,",
      "  sentence_translation_zh = v.sentence_translation_zh",
      "from (values",
      contextRows.join(",\n"),
      ") as v(id, context_sentence, plain_english_paraphrase, sentence_translation_zh)",
      "where c.id = v.id::uuid;"
    ].join("\n"),
    "commit;",
    ""
  ].join("\n\n");
}

function summarizePatterns(cards) {
  const counts = new Map();
  for (const card of cards) {
    const key = patternKey(card.context_sentence, card.lemma);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function logContentStats(cards) {
  const withNotes = cards.filter((card) => card.usage_note.length > 0);
  const patterns = summarizePatterns(cards);
  const top = patterns.slice(0, 8);
  console.log(
    `Essential medical content: ${String(cards.length)} cards, ${String(withNotes.length)} with root/affix usage_note, ${String(patterns.length)} sentence patterns.`
  );
  for (const [pattern, count] of top) {
    console.log(`  ${String(count)} × ${pattern}`);
  }
}

const lemmas = loadLemmas(await readFile(lemmasUrl, "utf8"));
const assembled = await assembleEssentialSource(dataDir, { write: !checkOnly });
const sourceMap = parseSourceGlosses(assembled.text);
const pdfMap = parseTsv(await readFile(pdfGlossesUrl, "utf8"), "essential-medical-pdf-glosses.tsv");
const rawMap = parseTsv(await readFile(rawUrl, "utf8"), "essential-medical-raw.tsv");
const glosses = lemmas.map((lemma) => mergeGloss(lemma, sourceMap, pdfMap, rawMap));
const usedSlugs = new Set();
const cards = glosses.map((entry, index) => toCard(entry, index, usedSlugs));
const dataset = {
  schema_version: CONTENT_SCHEMA_VERSION,
  dataset_key: ESSENTIAL_DATASET_KEY,
  uuid_namespace: UUID_NAMESPACE,
  cards
};
const validation = validateEssentialDataset(dataset);
if (validation.errors.length > 0) {
  throw new Error(`Essential medical validation failed:\n${formatIssues(validation.errors)}`);
}

const generatedSql = generateAdditiveRefresh(cards);
const generatedCards = `${JSON.stringify(dataset, null, 2)}\n`;

if (checkOnly) {
  const existingCards = await readFile(cardsUrl, "utf8");
  const existingSql = await readFile(refreshMigrationUrl, "utf8");
  const existingSource = await readFile(sourceUrl, "utf8");
  const originalSeed = await readFile(originalSeedUrl, "utf8");
  const sourceMismatch = assembled.assembledFromParts && existingSource !== assembled.text;
  if (existingCards !== generatedCards || existingSql !== generatedSql || sourceMismatch) {
    throw new Error("Essential medical seed is stale. Run npm run content:essential-medical.");
  }
  if (!originalSeed.includes("Generated from data/essential-medical")) {
    throw new Error("Original essential medical seed migration is missing.");
  }
  const originalRefresh = await readFile(originalRefreshUrl, "utf8");
  if (!originalRefresh.includes("update public.word_senses")) {
    throw new Error("Original essential medical roots/sentences refresh migration is missing.");
  }
  for (const [index, card] of cards.entries()) {
    if (card.lemma !== lemmas[index] || card.target_text !== lemmas[index]) {
      throw new Error(`Lemma order mismatch at ${String(index)}: ${card.lemma}`);
    }
  }
  logContentStats(cards);
  console.log(`Essential medical seed is current: ${String(cards.length)} cards from lemmas.txt.`);
} else {
  await mkdir(dataDir, { recursive: true });
  await writeFile(cardsUrl, generatedCards, "utf8");
  await writeFile(refreshMigrationUrl, generatedSql, "utf8");
  logContentStats(cards);
  console.log(
    `Wrote ${String(cards.length)} 必备医学英语 cards and additive refresh SQL (${assembled.assembledFromParts ? "source assembled from parts" : "source.txt used as-is"}).`
  );
}
