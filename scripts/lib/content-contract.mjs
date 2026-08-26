import { createHash } from "node:crypto";

export const CONTENT_SCHEMA_VERSION = 1;
export const CONTENT_DATASET_KEY = "wordeasy-seed-v1";
export const UUID_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
export const UUID_NAME_PREFIX = "https://github.com/nextcenturyhappiness/wordeasy/content/v1/";

export const RESEARCH_COUNTS = Object.freeze({
  general_research: 15,
  statistics_methodology: 6,
  bioinformatics: 9
});

export const MEDICAL_COUNTS = Object.freeze({
  anatomy: 2,
  physiology: 2,
  pathology: 2,
  symptoms: 3,
  signs: 2,
  diseases: 2,
  diagnosis: 3,
  laboratory: 2,
  imaging: 2,
  treatment: 3,
  pharmacology: 2,
  surgery_procedures: 2,
  clinical_expressions: 3
});

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
