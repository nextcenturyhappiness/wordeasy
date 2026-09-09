export function essentialCardPayload(index: number): Record<string, unknown> {
  const suffix = String(index);
  const lemma = `lemma-${suffix}`;
  return {
    card_id: `essential-${suffix}`,
    word_id: `word-${suffix}`,
    word_sense_id: `sense-${suffix}`,
    context_id: `context-${suffix}`,
    module: "essential_medical",
    category: "core",
    lemma,
    display_form: lemma,
    ipa: "/test/",
    part_of_speech: "noun",
    meaning_en: "A contextual meaning.",
    meaning_zh: "语境释义",
    usage_note: "",
    context_sentence: `The ${lemma} appears in context.`,
    target_text: lemma,
    plain_english_paraphrase: "A plain paraphrase.",
    sentence_translation_zh: "完整句子翻译。",
    collocations: [],
    source_type: "original_example",
    source_title: null,
    source_url: null,
    doi: null,
    pmid: null
  };
}

export function readyEssentialDailySnapshotPayload(): Record<string, unknown> {
  return {
    new_assignment: {
      status: "ready",
      set_id: "essential-new-set",
      module: "essential_medical",
      study_date: "2026-09-09",
      timezone: "Asia/Shanghai",
      shortage: null,
      assignments: Array.from({ length: 10 }, (_, index) => ({
        card_id: `essential-${String(index)}`,
        category: "core",
        position: index + 1
      }))
    },
    review_assignment: {
      status: "ready",
      set_id: "essential_medical-review",
      module: "essential_medical",
      study_date: "2026-09-09",
      timezone: "Asia/Shanghai",
      cutoff_at: "2026-09-09T16:00:00.000Z",
      assignments: []
    },
    cards: Array.from({ length: 10 }, (_, index) => essentialCardPayload(index))
  };
}
