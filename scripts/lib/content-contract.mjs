import { createHash } from "node:crypto";

export const CONTENT_SCHEMA_VERSION = 1;
export const CONTENT_DATASET_KEY = "wordeasy-seed-v1";
export const UUID_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
export const UUID_NAME_PREFIX = "https://github.com/nextcenturyhappiness/wordeasy/content/v1/";

export const CANONICAL_CARD_TOTAL = 120;
export const CANONICAL_RESEARCH_TOTAL = 60;
export const CANONICAL_MEDICAL_TOTAL = 60;

export const RESEARCH_COUNTS = Object.freeze({
  general_research: 30,
  statistics_methodology: 12,
  bioinformatics: 18
});

export const MEDICAL_COUNTS = Object.freeze({
  anatomy: 4,
  physiology: 4,
  pathology: 4,
  symptoms: 6,
  signs: 4,
  diseases: 4,
  diagnosis: 6,
  laboratory: 4,
  imaging: 4,
  treatment: 6,
  pharmacology: 4,
  surgery_procedures: 4,
  clinical_expressions: 6
});

export const ORIGINAL_BATCH_CARD_KEYS = Object.freeze([
  "res-general-attenuate-001",
  "res-general-robust-001",
  "res-general-elucidate-001",
  "res-general-corroborate-001",
  "res-general-salient-001",
  "res-general-warrant-001",
  "res-general-delineate-001",
  "res-general-reconcile-001",
  "res-general-underpin-001",
  "res-general-confer-001",
  "res-general-encompass-001",
  "res-general-facilitate-001",
  "res-general-infer-001",
  "res-general-pertinent-001",
  "res-general-account-for-001",
  "res-stat-confounding-001",
  "res-stat-heterogeneity-001",
  "res-stat-impute-001",
  "res-stat-stratify-001",
  "res-stat-interaction-001",
  "res-stat-power-001",
  "res-bio-alignment-001",
  "res-bio-coverage-001",
  "res-bio-normalization-001",
  "res-bio-differential-001",
  "res-bio-enrichment-001",
  "res-bio-cluster-001",
  "res-bio-pseudotime-001",
  "res-bio-batch-effect-001",
  "res-bio-ortholog-001",
  "med-anatomy-lumen-001",
  "med-anatomy-hilum-001",
  "med-physiology-perfusion-001",
  "med-physiology-compliance-001",
  "med-pathology-necrosis-001",
  "med-pathology-fibrosis-001",
  "med-symptoms-dyspnea-001",
  "med-symptoms-paresthesia-001",
  "med-symptoms-satiety-001",
  "med-signs-palpable-001",
  "med-signs-pitting-edema-001",
  "med-diseases-cirrhosis-001",
  "med-diseases-vasculitis-001",
  "med-diagnosis-differential-001",
  "med-diagnosis-presumptive-001",
  "med-diagnosis-etiology-001",
  "med-laboratory-leukocytosis-001",
  "med-laboratory-hemolyzed-001",
  "med-imaging-opacity-001",
  "med-imaging-enhancement-001",
  "med-treatment-titrate-001",
  "med-treatment-supportive-001",
  "med-treatment-refractory-001",
  "med-pharmacology-bioavailability-001",
  "med-pharmacology-contraindicated-001",
  "med-surgery-debridement-001",
  "med-surgery-anastomosis-001",
  "med-clinical-deny-001",
  "med-clinical-unremarkable-001",
  "med-clinical-lost-follow-up-001"
]);

export const RESEARCH_CONTEXT_GENRES = Object.freeze([
  "research_abstract",
  "research_introduction",
  "research_methods",
  "research_results",
  "research_discussion",
  "figure_legend",
  "supplementary_methods"
]);

export const MEDICAL_CONTEXT_GENRES = Object.freeze([
  "medical_textbook",
  "clinical_guideline",
  "laboratory_report",
  "imaging_report",
  "case_report",
  "medical_record",
  "operative_note"
]);

export const CARD_FIELDS = Object.freeze([
  "id",
  "card_key",
  "word_id",
  "word_key",
  "word_sense_id",
  "word_sense_key",
  "context_id",
  "context_key",
  "lemma",
  "display_form",
  "part_of_speech",
  "ipa",
  "module",
  "category",
  "context_genre",
  "meaning_en",
  "meaning_zh",
  "usage_note",
  "context_sentence",
  "target_text",
  "plain_english_paraphrase",
  "sentence_translation_zh",
  "collocations",
  "source_type",
  "source_title",
  "source_url",
  "doi",
  "pmid",
  "card_type",
  "active"
]);

export const CSV_FIELDS = Object.freeze(["schema_version", ...CARD_FIELDS]);

function uuidToBytes(uuid) {
  const hex = uuid.replaceAll("-", "");
  if (!/^[0-9a-f]{32}$/iu.test(hex)) {
    throw new Error(`Invalid UUID namespace: ${uuid}`);
  }
  return Buffer.from(hex, "hex");
}

function bytesToUuid(bytes) {
  const hex = Buffer.from(bytes).toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join("-");
}

export function uuidV5(name, namespace = UUID_NAMESPACE) {
  const digest = createHash("sha1")
    .update(uuidToBytes(namespace))
    .update(Buffer.from(name, "utf8"))
    .digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

export function contentUuid(entity, key) {
  return uuidV5(`${UUID_NAME_PREFIX}${entity}/${key}`);
}

export function slugify(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll("'", "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}

export function addStableIdentity(card) {
  const wordKey = card.word_key ?? `en:${slugify(card.lemma)}:${slugify(card.part_of_speech)}`;
  const wordSenseKey =
    card.word_sense_key ??
    `${card.module}:${card.category}:${slugify(card.lemma)}:${slugify(card.part_of_speech)}`;
  const contextKey = card.context_key ?? `${wordSenseKey}:${card.card_key}`;

  return {
    ...card,
    id: contentUuid("card", card.card_key),
    word_id: contentUuid("word", wordKey),
    word_key: wordKey,
    word_sense_id: contentUuid("word-sense", wordSenseKey),
    word_sense_key: wordSenseKey,
    context_id: contentUuid("context", contextKey),
    context_key: contextKey
  };
}

function escapeCsvCell(value) {
  const text = value == null ? "" : String(value);
  if (!/[",\r\n]/u.test(text)) {
    return text;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

export function serializeCsv(records) {
  const lines = [CSV_FIELDS.join(",")];
  for (const record of records) {
    const row = { schema_version: CONTENT_SCHEMA_VERSION, ...record };
    lines.push(
      CSV_FIELDS.map((field) => {
        const value = field === "collocations" ? row[field].join("|") : row[field];
        return escapeCsvCell(value);
      }).join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) {
    throw new Error("CSV contains an unterminated quoted field.");
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[0];
  const records = rows
    .slice(1)
    .filter((cells) => cells.some((value) => value !== ""))
    .map((cells) => {
      if (cells.length !== headers.length) {
        throw new Error(`CSV row has ${cells.length} cells; expected ${headers.length}.`);
      }
      return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
    });
  return { headers, records };
}
