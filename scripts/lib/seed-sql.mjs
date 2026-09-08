export function sqlText(value) {
  if (value === null) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

export function sqlBoolean(value) {
  return value ? "true" : "false";
}

export function sqlArray(values) {
  return `array[${values.map(sqlText).join(", ")}]::text[]`;
}

export function tuple(values) {
  return `  (${values.join(", ")})`;
}

export function valuesStatement({ table, columns, rows, updates }) {
  return [
    `insert into public.${table} (${columns.join(", ")})`,
    "values",
    rows.join(",\n"),
    "on conflict (id) do update set",
    `  ${updates.map((column) => `${column} = excluded.${column}`).join(",\n  ")};`
  ].join("\n");
}

export function uniqueBy(cards, idField) {
  return [...new Map(cards.map((card) => [card[idField], card])).values()];
}

export function contentEntityStatements(cards, contentUuid) {
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
