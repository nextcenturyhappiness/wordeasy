#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";

import {
  addStableIdentity,
  CONTENT_SCHEMA_VERSION,
  contentUuid,
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
import { contentEntityStatements, sqlText, tuple, valuesStatement } from "./lib/seed-sql.mjs";

const rawUrl = new URL("./lib/essential-medical-raw.tsv", import.meta.url);
const pdfGlossesUrl = new URL("./lib/essential-medical-pdf-glosses.tsv", import.meta.url);
const dataDir = new URL("../data/essential-medical/", import.meta.url);
const cardsUrl = new URL("../data/essential-medical/cards.json", import.meta.url);
const lemmasUrl = new URL("../data/essential-medical/lemmas.txt", import.meta.url);
const sourceUrl = new URL("../data/essential-medical/source.txt", import.meta.url);
const migrationUrl = new URL(
  "../supabase/migrations/20260908001400_essential_medical_seed.sql",
  import.meta.url
);

const MODULE = "essential_medical";
const CATEGORY = "core";
const ALLOWED_POS = new Set(["noun", "adjective", "verb", "phrase", "adverb", "phrasal verb"]);
const checkOnly = process.argv.includes("--check");

const NOUN_SENTENCES = [
  (lemma) => `In class the tutor pointed to the ${lemma} while explaining the adjacent organ.`,
  (lemma) => `The chapter on body structure opens with the ${lemma} as a teaching example.`,
  (lemma) => `A short case note mentioned the ${lemma} before listing later findings.`,
  (lemma) => `Students were asked to locate the ${lemma} on the classroom diagram.`,
  (lemma) => `The ward round paused on the ${lemma} so juniors could name it correctly.`,
  (lemma) => `The textbook figure labels the ${lemma} beside the neighboring tissue.`,
  (lemma) => `After history taking, the intern wrote the ${lemma} into the problem list.`,
  (lemma) => `The lecture contrasted a healthy ${lemma} with the diseased counterpart.`
];

const ADJ_SENTENCES = [
  (lemma) => `The tutor called the finding ${lemma} rather than using a looser bedside word.`,
  (lemma) => `The case stem described a ${lemma} change that students had to interpret.`,
  (lemma) => `On the ward, the sign was documented as ${lemma} after the examination.`,
  (lemma) => `The textbook warns not to write ${lemma} unless the evidence actually fits.`,
  (lemma) => `Her presentation stayed ${lemma} from admission through the first night.`,
  (lemma) => `The note used ${lemma} to mark the direction or quality of the finding.`,
  (lemma) => `Students compared a ${lemma} pattern with the opposite classroom example.`,
  (lemma) => `The attending asked whether the process was truly ${lemma} in this patient.`
];

const VERB_SENTENCES = [
  (lemma) => `The intern had to ${lemma} the problem using only the history and exam.`,
  (lemma) => `In the skills lab, students practiced how to ${lemma} this finding safely.`,
  (lemma) => `The protocol tells the nurse when to ${lemma} and when to wait for review.`,
  (lemma) => `The case discussion asked who should ${lemma} first on the night shift.`,
  (lemma) => `The textbook example shows clinicians ${lemma} only after enough evidence.`,
  (lemma) => `Juniors were told not to ${lemma} from a single abnormal number alone.`
];

const PHRASE_SENTENCES = [
  (lemma) => `The lecture placed the ${lemma} next to related classroom structures.`,
  (lemma) => `The case note named the ${lemma} before describing what happened next.`,
  (lemma) => `Students had to explain the ${lemma} in one plain sentence of their own.`,
  (lemma) => `The diagram of the ${lemma} was the first figure in that chapter.`,
  (lemma) => `On rounds the registrar asked for the function of the ${lemma}.`,
  (lemma) => `The textbook treats the ${lemma} as core vocabulary, not exam trivia.`
];

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
  const meaningEn =
    tsv?.meaningEn ?? `the classroom medical sense recorded as ${zh ?? lemma}`;
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

function uniqueFallbacks(lemma) {
  return [
    `Classroom notes treat ${lemma} as core vocabulary in this chapter.`,
    `This lesson uses ${lemma} in its ordinary textbook sense.`,
    `Juniors must recognise ${lemma} before they write the case.`,
    `The glossary entry for ${lemma} sits with neighboring classroom terms.`,
    `Ward teaching returns to ${lemma} whenever the finding is discussed.`,
    `A labelled slide showed ${lemma} without extra commentary.`
  ];
}

function pick(list, index) {
  return list[index % list.length];
}

function countWords(sentence) {
  return sentence.trim().split(/\s+/u).filter(Boolean).length;
}

function buildContext(entry, index) {
  const { lemma, pos, zh, meaningEn } = entry;
  let frames = NOUN_SENTENCES;
  if (pos === "adjective") frames = ADJ_SENTENCES;
  else if (pos === "verb" || pos === "phrasal verb") frames = VERB_SENTENCES;
  else if (pos === "phrase" || lemma.includes(" ") || lemma.includes("\\")) frames = PHRASE_SENTENCES;
  else if (pos === "adverb") frames = ADJ_SENTENCES;

  const candidates = [
    pick(frames, index)(lemma),
    ...frames.map((frame) => frame(lemma)),
    ...uniqueFallbacks(lemma)
  ];
  const sentence = candidates.find(
    (value) =>
      countLiteralOccurrences(value, lemma) === 1 &&
      countWords(value) >= 6 &&
      countWords(value) <= 40
  );
  if (sentence === undefined) {
    throw new Error(`Could not build a unique context sentence for ${lemma}.`);
  }

  const paraphrase =
    pos === "adjective"
      ? `The classroom note used this word to say the finding was ${meaningEn}.`
      : pos === "verb" || pos === "phrasal verb"
        ? `In this lesson, students use the word to ${meaningEn}.`
        : `Here the term names ${meaningEn}.`;

  const translation =
    pos === "adjective"
      ? `课堂记录把这一发现写成「${zh}」。`
      : pos === "verb" || pos === "phrasal verb"
        ? `这一课里，这个词的意思是${zh}。`
        : `这里指${zh}。`;

  return { sentence, paraphrase, translation };
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
    usage_note: "",
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

function generateMigration(cards) {
  const moduleRow = tuple([
    sqlText(contentUuid("module", MODULE)),
    sqlText(MODULE),
    sqlText("必备医学英语"),
    "true"
  ]);
  const categoryRow = tuple([
    sqlText(contentUuid("category", `${MODULE}:${CATEGORY}`)),
    sqlText(contentUuid("module", MODULE)),
    sqlText(CATEGORY),
    sqlText("课堂词汇"),
    "1",
    "true"
  ]);
  return [
    "-- Generated from data/essential-medical by scripts/build-essential-medical-seed.mjs.",
    "-- Additive module + catalog for 必备医学英语. Do not rewrite earlier seed migrations.",
    "begin;",
    "alter table public.modules drop constraint if exists modules_supported_slug;",
    "alter table public.modules add constraint modules_supported_slug check (slug in ('research_english', 'medical_english', 'essential_medical'));",
    "alter table public.contexts drop constraint if exists contexts_collocations_not_empty;",
    valuesStatement({
      table: "modules",
      columns: ["id", "slug", "name", "active"],
      rows: [moduleRow],
      updates: ["slug", "name", "active"]
    }),
    valuesStatement({
      table: "categories",
      columns: ["id", "module_id", "slug", "name", "sort_order", "active"],
      rows: [categoryRow],
      updates: ["module_id", "slug", "name", "sort_order", "active"]
    }),
    ...contentEntityStatements(cards, contentUuid),
    "commit;",
    ""
  ].join("\n\n");
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

const generatedSql = generateMigration(cards);
const generatedCards = `${JSON.stringify(dataset, null, 2)}\n`;

if (checkOnly) {
  const existingCards = await readFile(cardsUrl, "utf8");
  const existingSql = await readFile(migrationUrl, "utf8");
  const existingSource = await readFile(sourceUrl, "utf8");
  const sourceMismatch = assembled.assembledFromParts && existingSource !== assembled.text;
  if (existingCards !== generatedCards || existingSql !== generatedSql || sourceMismatch) {
    throw new Error("Essential medical seed is stale. Run npm run content:essential-medical.");
  }
  for (const [index, card] of cards.entries()) {
    if (card.lemma !== lemmas[index] || card.target_text !== lemmas[index]) {
      throw new Error(`Lemma order mismatch at ${String(index)}: ${card.lemma}`);
    }
  }
  console.log(`Essential medical seed is current: ${String(cards.length)} cards from lemmas.txt.`);
} else {
  await mkdir(dataDir, { recursive: true });
  await writeFile(cardsUrl, generatedCards, "utf8");
  await writeFile(migrationUrl, generatedSql, "utf8");
  console.log(
    `Wrote ${String(cards.length)} 必备医学英语 cards from canonical lemmas.txt (${assembled.assembledFromParts ? "source assembled from parts" : "source.txt used as-is"}).`
  );
}
