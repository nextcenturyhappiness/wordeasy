import {
  CARD_FIELDS,
  CONTENT_DATASET_KEY,
  CONTENT_SCHEMA_VERSION,
  CSV_FIELDS,
  MEDICAL_CONTEXT_GENRES,
  MEDICAL_COUNTS,
  RESEARCH_CONTEXT_GENRES,
  RESEARCH_COUNTS,
  UUID_NAMESPACE,
  contentUuid,
  parseCsv
} from "./content-contract.mjs";

const ALLOWED_PARTS_OF_SPEECH = new Set([
  "adjective",
  "adverb",
  "noun",
  "phrasal verb",
  "phrase",
  "verb"
]);

const NULLABLE_SOURCE_FIELDS = ["source_title", "source_url", "doi", "pmid"];
const REQUIRED_STRING_FIELDS = CARD_FIELDS.filter(
  (field) =>
    field !== "collocations" && field !== "active" && !NULLABLE_SOURCE_FIELDS.includes(field)
);

const SPELLING_EQUIVALENTS = new Map([
  ["haemolyze", "hemolyze"],
  ["haemolyzed", "hemolyzed"],
  ["leucocytosis", "leukocytosis"],
  ["normalisation", "normalization"],
  ["orthologue", "ortholog"],
  ["oedema", "edema"],
  ["anaemia", "anemia"],
  ["tumour", "tumor"],
  ["behaviour", "behavior"],
  ["signalling", "signaling"],
  ["modelling", "modeling"],
  ["randomisation", "randomization"]
]);

function normalizeText(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/gu, "")
    .replace(/[‐‑‒–—]/gu, "-")
    .replace(/[^\p{Letter}\p{Number}%-]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function canonicalLexeme(value) {
  const normalized = normalizeText(value);
  return SPELLING_EQUIVALENTS.get(normalized) ?? normalized;
}

function tokenSet(value) {
  return new Set(normalizeText(value).split(" ").filter(Boolean));
}

function jaccardSimilarity(left, right) {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 1 : intersection / union;
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

function signature(value) {
  return JSON.stringify(value);
}

function hasCjk(value) {
  return /\p{Script=Han}/u.test(value);
}

function makeIssue(card, index, code, message) {
  return {
    cardId: card?.id ?? card?.card_key ?? `index:${index}`,
    cardKey: card?.card_key ?? null,
    code,
    message
  };
}

function compareExpectedCounts(actualCounts, expectedCounts, module, errors) {
  for (const [category, expected] of Object.entries(expectedCounts)) {
    const actual = actualCounts[category] ?? 0;
    if (actual !== expected) {
      errors.push({
        cardId: "dataset",
        cardKey: null,
        code: "category_count",
        message: `${module}/${category} has ${actual} cards; expected ${expected}.`
      });
    }
  }

  const unexpected = Object.keys(actualCounts).filter((category) => !(category in expectedCounts));
  for (const category of unexpected) {
    errors.push({
      cardId: "dataset",
      cardKey: null,
      code: "illegal_category",
      message: `${module} contains illegal category ${category}.`
    });
  }
}

function ensureEntityConsistency(cards, errors) {
  const entities = [
    {
      name: "word",
      idField: "word_id",
      keyField: "word_key",
      fields: ["word_key", "lemma", "part_of_speech", "ipa"]
    },
    {
      name: "word sense",
      idField: "word_sense_id",
      keyField: "word_sense_key",
      fields: [
        "word_sense_key",
        "word_id",
        "module",
        "category",
        "meaning_en",
        "meaning_zh",
        "usage_note"
      ]
    },
    {
      name: "context",
      idField: "context_id",
      keyField: "context_key",
      fields: [
        "context_key",
        "word_sense_id",
        "context_genre",
        "context_sentence",
        "target_text",
        "plain_english_paraphrase",
        "sentence_translation_zh",
        "collocations",
        "source_type",
        "source_title",
        "source_url",
        "doi",
        "pmid"
      ]
    }
  ];

  for (const entity of entities) {
    const byId = new Map();
    const byKey = new Map();
    cards.forEach((card, index) => {
      const id = card[entity.idField];
      const key = card[entity.keyField];
      if (typeof id !== "string" || typeof key !== "string") return;
      const entitySignature = signature(
        Object.fromEntries(entity.fields.map((field) => [field, card[field]]))
      );

      const existingById = byId.get(id);
      if (existingById && existingById.signature !== entitySignature) {
        errors.push(
          makeIssue(
            card,
            index,
            "entity_identity_conflict",
            `${entity.name} id ${id} refers to inconsistent content in ${existingById.cardKey} and ${card.card_key}.`
          )
        );
      } else {
        byId.set(id, { signature: entitySignature, cardKey: card.card_key });
      }

      const existingByKey = byKey.get(key);
      if (existingByKey && existingByKey.id !== id) {
        errors.push(
          makeIssue(
            card,
            index,
            "entity_key_conflict",
            `${entity.name} key ${key} maps to both ${existingByKey.id} and ${id}.`
          )
        );
      } else {
        byKey.set(key, { id });
      }
    });
  }
}

function ensureNoDuplicateLexemes(cards, errors) {
  const seen = new Map();
  cards.forEach((card, index) => {
    if (typeof card.lemma !== "string" || typeof card.part_of_speech !== "string") return;
    const key = `${canonicalLexeme(card.lemma)}|${normalizeText(card.part_of_speech)}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, card);
      return;
    }
    if (existing.word_id !== card.word_id) {
      errors.push(
        makeIssue(
          card,
          index,
          "duplicate_lexeme_identity",
          `Equivalent lemma/POS appears under different word identities: ${existing.card_key} and ${card.card_key}.`
        )
      );
    }
  });

  cards.forEach((left, leftIndex) => {
    cards.slice(leftIndex + 1).forEach((right, relativeIndex) => {
      const rightIndex = leftIndex + relativeIndex + 1;
      if (
        typeof left.lemma !== "string" ||
        typeof right.lemma !== "string" ||
        typeof left.display_form !== "string" ||
        typeof right.display_form !== "string"
      ) {
        return;
      }
      const leftLemma = canonicalLexeme(left.lemma);
      const rightLemma = canonicalLexeme(right.lemma);
      const leftDisplay = canonicalLexeme(left.display_form);
      const rightDisplay = canonicalLexeme(right.display_form);
      const likelyInflectionDuplicate =
        leftLemma === rightDisplay ||
        rightLemma === leftDisplay ||
        (leftLemma.endsWith("s") && leftLemma.slice(0, -1) === rightLemma) ||
        (rightLemma.endsWith("s") && rightLemma.slice(0, -1) === leftLemma);

      if (
        likelyInflectionDuplicate &&
        left.word_id !== right.word_id &&
        left.module === right.module &&
        left.category === right.category &&
        normalizeText(left.meaning_en) === normalizeText(right.meaning_en)
      ) {
        errors.push(
          makeIssue(
            right,
            rightIndex,
            "inflection_duplicate",
            `Possible lemma/display-form duplicate with ${left.card_key}.`
          )
        );
      }
    });
  });
}

export function validateDataset(dataset, { enforceCounts = true } = {}) {
  const errors = [];
  const warnings = [];

  if (dataset == null || typeof dataset !== "object" || Array.isArray(dataset)) {
    return {
      errors: [
        {
          cardId: "dataset",
          cardKey: null,
          code: "dataset_type",
          message: "Top-level seed data must be an object."
        }
      ],
      warnings,
      counts: {}
    };
  }

  if (dataset.schema_version !== CONTENT_SCHEMA_VERSION) {
    errors.push({
      cardId: "dataset",
      cardKey: null,
      code: "schema_version",
      message: `schema_version must be ${CONTENT_SCHEMA_VERSION}.`
    });
  }
  if (dataset.dataset_key !== CONTENT_DATASET_KEY) {
    errors.push({
      cardId: "dataset",
      cardKey: null,
      code: "dataset_key",
      message: `dataset_key must be ${CONTENT_DATASET_KEY}.`
    });
  }
  if (dataset.uuid_namespace !== UUID_NAMESPACE) {
    errors.push({
      cardId: "dataset",
      cardKey: null,
      code: "uuid_namespace",
      message: `uuid_namespace must be ${UUID_NAMESPACE}.`
    });
  }
  if (!Array.isArray(dataset.cards)) {
    errors.push({
      cardId: "dataset",
      cardKey: null,
      code: "cards_type",
      message: "cards must be an array."
    });
    return { errors, warnings, counts: {} };
  }

  const researchCounts = {};
  const medicalCounts = {};
  const researchGenres = new Set();
  const medicalGenres = new Set();
  const uniqueFields = ["id", "card_key", "context_id", "context_key"];
  const uniqueValues = Object.fromEntries(uniqueFields.map((field) => [field, new Map()]));
  const contexts = new Map();

  dataset.cards.forEach((card, index) => {
    if (card == null || typeof card !== "object" || Array.isArray(card)) {
      errors.push(makeIssue(card, index, "card_type", "Each card must be an object."));
      return;
    }

    const unknownFields = Object.keys(card).filter((field) => !CARD_FIELDS.includes(field));
    if (unknownFields.length > 0) {
      errors.push(
        makeIssue(card, index, "unknown_fields", `Unknown fields: ${unknownFields.join(", ")}.`)
      );
    }
    for (const field of CARD_FIELDS) {
      if (!Object.hasOwn(card, field)) {
        errors.push(makeIssue(card, index, "missing_field", `Missing required field ${field}.`));
      }
    }
    for (const field of REQUIRED_STRING_FIELDS) {
      if (typeof card[field] !== "string" || card[field].trim().length === 0) {
        errors.push(
          makeIssue(card, index, "invalid_string", `${field} must be a non-empty string.`)
        );
      } else if (card[field] !== card[field].trim()) {
        errors.push(makeIssue(card, index, "untrimmed_string", `${field} must be trimmed.`));
      }
    }
    for (const field of NULLABLE_SOURCE_FIELDS) {
      if (card[field] !== null && (typeof card[field] !== "string" || card[field].trim() === "")) {
        errors.push(
          makeIssue(
            card,
            index,
            "invalid_source_field",
            `${field} must be null or a non-empty string.`
          )
        );
      }
    }

    if (
      !Array.isArray(card.collocations) ||
      card.collocations.length < 2 ||
      card.collocations.length > 4
    ) {
      errors.push(
        makeIssue(card, index, "collocations_count", "collocations must contain 2 to 4 items.")
      );
    } else {
      const normalizedCollocations = new Set();
      card.collocations.forEach((collocation) => {
        if (typeof collocation !== "string" || collocation.trim().length === 0) {
          errors.push(
            makeIssue(card, index, "invalid_collocation", "Every collocation must be non-empty.")
          );
        } else {
          normalizedCollocations.add(normalizeText(collocation));
        }
      });
      if (normalizedCollocations.size !== card.collocations.length) {
        errors.push(
          makeIssue(card, index, "duplicate_collocation", "Collocations must be distinct.")
        );
      }
    }

    if (!ALLOWED_PARTS_OF_SPEECH.has(card.part_of_speech)) {
      errors.push(
        makeIssue(
          card,
          index,
          "part_of_speech",
          `Illegal part_of_speech ${String(card.part_of_speech)}.`
        )
      );
    }
    if (typeof card.ipa !== "string" || !/^\/.+\/$/u.test(card.ipa)) {
      errors.push(makeIssue(card, index, "ipa", "ipa must be a non-empty slash-delimited string."));
    }
    if (card.card_type !== "context_recall") {
      errors.push(makeIssue(card, index, "card_type_value", "card_type must be context_recall."));
    }
    if (card.active !== true) {
      errors.push(makeIssue(card, index, "active", "Every initial seed card must be active."));
    }

    if (card.module === "research_english") {
      researchCounts[card.category] = (researchCounts[card.category] ?? 0) + 1;
      researchGenres.add(card.context_genre);
      if (!(card.category in RESEARCH_COUNTS)) {
        errors.push(
          makeIssue(card, index, "category_module", `${card.category} is not a Research category.`)
        );
      }
      if (!RESEARCH_CONTEXT_GENRES.includes(card.context_genre)) {
        errors.push(
          makeIssue(
            card,
            index,
            "context_genre",
            `${card.context_genre} is not a Research context genre.`
          )
        );
      }
    } else if (card.module === "medical_english") {
      medicalCounts[card.category] = (medicalCounts[card.category] ?? 0) + 1;
      medicalGenres.add(card.context_genre);
      if (!(card.category in MEDICAL_COUNTS)) {
        errors.push(
          makeIssue(card, index, "category_module", `${card.category} is not a Medical category.`)
        );
      }
      if (!MEDICAL_CONTEXT_GENRES.includes(card.context_genre)) {
        errors.push(
          makeIssue(
            card,
            index,
            "context_genre",
            `${card.context_genre} is not a Medical context genre.`
          )
        );
      }
    } else {
      errors.push(makeIssue(card, index, "module", `Illegal module ${String(card.module)}.`));
    }

    if (typeof card.context_sentence === "string" && typeof card.target_text === "string") {
      const occurrences = countLiteralOccurrences(card.context_sentence, card.target_text);
      if (occurrences !== 1) {
        errors.push(
          makeIssue(
            card,
            index,
            "target_occurrence",
            `target_text must occur exactly once in context_sentence; found ${occurrences}.`
          )
        );
      }
      if (card.display_form !== card.target_text) {
        errors.push(
          makeIssue(
            card,
            index,
            "display_target_mismatch",
            "display_form must exactly match target_text for reliable highlighting."
          )
        );
      }
      const words = normalizeText(card.context_sentence).split(" ").filter(Boolean).length;
      if (words < 6 || words > 40) {
        errors.push(
          makeIssue(
            card,
            index,
            "context_length",
            `context_sentence has ${words} words; expected 6 to 40.`
          )
        );
      }
      if (normalizeText(card.context_sentence) === normalizeText(card.plain_english_paraphrase)) {
        errors.push(
          makeIssue(
            card,
            index,
            "paraphrase_copy",
            "plain_english_paraphrase must materially differ from context_sentence."
          )
        );
      }

      const normalizedContext = normalizeText(card.context_sentence);
      const existingContext = contexts.get(normalizedContext);
      if (existingContext) {
        errors.push(
          makeIssue(
            card,
            index,
            "duplicate_context",
            `Context duplicates ${existingContext.cardKey} after case/punctuation normalization.`
          )
        );
      } else {
        contexts.set(normalizedContext, { cardKey: card.card_key });
      }
    }

    if (typeof card.meaning_zh === "string" && !hasCjk(card.meaning_zh)) {
      errors.push(makeIssue(card, index, "meaning_zh", "meaning_zh must contain Chinese text."));
    }
    if (typeof card.usage_note === "string" && !hasCjk(card.usage_note)) {
      errors.push(
        makeIssue(card, index, "usage_note", "usage_note must be Chinese strength-of-use guidance.")
      );
    }
    if (typeof card.sentence_translation_zh === "string" && !hasCjk(card.sentence_translation_zh)) {
      errors.push(
        makeIssue(
          card,
          index,
          "sentence_translation_zh",
          "sentence_translation_zh must contain Chinese text."
        )
      );
    }

    if (card.source_type === "original_example") {
      for (const field of NULLABLE_SOURCE_FIELDS) {
        if (card[field] !== null) {
          errors.push(
            makeIssue(
              card,
              index,
              "original_source_metadata",
              `Original example must have ${field}=null.`
            )
          );
        }
      }
    } else if (card.source_type === "verified_source") {
      if (typeof card.source_title !== "string") {
        errors.push(
          makeIssue(card, index, "verified_source_title", "Verified source requires source_title.")
        );
      }
      if (card.source_url === null && card.doi === null && card.pmid === null) {
        errors.push(
          makeIssue(
            card,
            index,
            "verified_source_locator",
            "Verified source requires source_url, doi, or pmid."
          )
        );
      }
      if (card.source_url !== null && !/^https:\/\//u.test(card.source_url)) {
        errors.push(makeIssue(card, index, "source_url", "Verified source_url must use HTTPS."));
      }
      if (card.doi !== null && !/^10\.\d{4,9}\/.+/u.test(card.doi)) {
        errors.push(makeIssue(card, index, "doi", "DOI has an invalid format."));
      }
      if (card.pmid !== null && !/^\d+$/u.test(card.pmid)) {
        errors.push(makeIssue(card, index, "pmid", "PMID must contain digits only."));
      }
    } else {
      errors.push(
        makeIssue(card, index, "source_type", `Illegal source_type ${String(card.source_type)}.`)
      );
    }

    const identityExpectations = [
      ["id", "card", card.card_key],
      ["word_id", "word", card.word_key],
      ["word_sense_id", "word-sense", card.word_sense_key],
      ["context_id", "context", card.context_key]
    ];
    identityExpectations.forEach(([field, entity, key]) => {
      if (typeof key === "string" && card[field] !== contentUuid(entity, key)) {
        errors.push(
          makeIssue(
            card,
            index,
            "stable_uuid",
            `${field} does not match UUIDv5 for ${entity} key ${key}.`
          )
        );
      }
    });

    for (const field of uniqueFields) {
      const value = card[field];
      if (typeof value !== "string") continue;
      const existing = uniqueValues[field].get(value);
      if (existing) {
        errors.push(
          makeIssue(card, index, "duplicate_identity", `${field} duplicates ${existing.cardKey}.`)
        );
      } else {
        uniqueValues[field].set(value, { cardKey: card.card_key });
      }
    }
  });

  ensureEntityConsistency(dataset.cards, errors);
  ensureNoDuplicateLexemes(dataset.cards, errors);

  for (let leftIndex = 0; leftIndex < dataset.cards.length; leftIndex += 1) {
    const left = dataset.cards[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < dataset.cards.length; rightIndex += 1) {
      const right = dataset.cards[rightIndex];
      if (
        left.word_sense_id === right.word_sense_id &&
        left.context_id !== right.context_id &&
        jaccardSimilarity(left.context_sentence, right.context_sentence) >= 0.85
      ) {
        errors.push(
          makeIssue(
            right,
            rightIndex,
            "near_duplicate_context",
            `Context is too similar to ${left.card_key} for the same word sense.`
          )
        );
      }
      if (
        normalizeText(left.target_text) === normalizeText(right.target_text) &&
        normalizeText(left.meaning_en) === normalizeText(right.meaning_en) &&
        left.category !== right.category
      ) {
        errors.push(
          makeIssue(
            right,
            rightIndex,
            "target_category_conflict",
            `Target and meaning match ${left.card_key}, but category differs.`
          )
        );
      }
    }
  }

  if (enforceCounts) {
    if (dataset.cards.length !== 60) {
      errors.push({
        cardId: "dataset",
        cardKey: null,
        code: "total_count",
        message: `Dataset has ${dataset.cards.length} cards; expected 60.`
      });
    }
    compareExpectedCounts(researchCounts, RESEARCH_COUNTS, "research_english", errors);
    compareExpectedCounts(medicalCounts, MEDICAL_COUNTS, "medical_english", errors);
    for (const genre of RESEARCH_CONTEXT_GENRES) {
      if (!researchGenres.has(genre)) {
        errors.push({
          cardId: "dataset",
          cardKey: null,
          code: "research_genre_coverage",
          message: `Research content does not cover ${genre}.`
        });
      }
    }
    for (const genre of MEDICAL_CONTEXT_GENRES) {
      if (!medicalGenres.has(genre)) {
        errors.push({
          cardId: "dataset",
          cardKey: null,
          code: "medical_genre_coverage",
          message: `Medical content does not cover ${genre}.`
        });
      }
    }
  }

  return {
    errors,
    warnings,
    counts: {
      total: dataset.cards.length,
      research: Object.values(researchCounts).reduce((sum, value) => sum + value, 0),
      medical: Object.values(medicalCounts).reduce((sum, value) => sum + value, 0),
      researchCategories: researchCounts,
      medicalCategories: medicalCounts,
      researchGenres: [...researchGenres].sort(),
      medicalGenres: [...medicalGenres].sort()
    }
  };
}

function csvRecordToCard(record) {
  return Object.fromEntries(
    CARD_FIELDS.map((field) => {
      if (field === "collocations") return [field, record[field].split("|")];
      if (field === "active") return [field, record[field] === "true"];
      if (NULLABLE_SOURCE_FIELDS.includes(field)) return [field, record[field] || null];
      return [field, record[field]];
    })
  );
}

export function validateImportTemplate(csvText, referenceCard) {
  const errors = [];
  let parsed;
  try {
    parsed = parseCsv(csvText);
  } catch (error) {
    return [
      {
        cardId: "import-template",
        cardKey: null,
        code: "csv_parse",
        message: error instanceof Error ? error.message : String(error)
      }
    ];
  }

  if (signature(parsed.headers) !== signature(CSV_FIELDS)) {
    errors.push({
      cardId: "import-template",
      cardKey: null,
      code: "csv_headers",
      message: "CSV headers do not exactly match the versioned flat import contract."
    });
  }
  if (parsed.records.length !== 1) {
    errors.push({
      cardId: "import-template",
      cardKey: null,
      code: "csv_template_rows",
      message: `Import template must contain exactly one example row; found ${parsed.records.length}.`
    });
    return errors;
  }

  const record = parsed.records[0];
  if (record.schema_version !== String(CONTENT_SCHEMA_VERSION)) {
    errors.push({
      cardId: "import-template",
      cardKey: record.card_key ?? null,
      code: "csv_schema_version",
      message: `CSV schema_version must be ${CONTENT_SCHEMA_VERSION}.`
    });
  }

  const card = csvRecordToCard(record);
  const validation = validateDataset(
    {
      schema_version: CONTENT_SCHEMA_VERSION,
      dataset_key: CONTENT_DATASET_KEY,
      uuid_namespace: UUID_NAMESPACE,
      cards: [card]
    },
    { enforceCounts: false }
  );
  errors.push(...validation.errors);

  const normalizedReference = referenceCard
    ? Object.fromEntries(CARD_FIELDS.map((field) => [field, referenceCard[field]]))
    : null;
  if (normalizedReference && signature(card) !== signature(normalizedReference)) {
    errors.push({
      cardId: "import-template",
      cardKey: card.card_key ?? null,
      code: "csv_example_drift",
      message: "CSV example row does not exactly match the first JSON seed card."
    });
  }
  return errors;
}

export function formatIssues(issues) {
  return issues
    .map((issue) => `[${issue.code}] ${issue.cardKey ?? issue.cardId}: ${issue.message}`)
    .join("\n");
}
