import type { NormalizedContextCard } from "../../domain/learning";

export interface SeedCard {
  id: string;
  word_id: string;
  word_sense_id: string;
  context_id: string;
  lemma: string;
  display_form: string;
  part_of_speech: string;
  ipa: string;
  module: string;
  category: string;
  meaning_en: string;
  meaning_zh: string;
  usage_note: string;
  context_sentence: string;
  target_text: string;
  plain_english_paraphrase: string;
  sentence_translation_zh: string;
  collocations: string[];
  source_type: string;
  source_title: string | null;
  source_url: string | null;
  doi: string | null;
  pmid: string | null;
  active: boolean;
}

export function normalizeSeedCard(seed: SeedCard): NormalizedContextCard {
  if (seed.module !== "research_english" && seed.module !== "medical_english") {
    throw new Error(`Unsupported module in local seed: ${seed.module}`);
  }
  if (seed.source_type !== "original_example" && seed.source_type !== "verified_source") {
    throw new Error(`Unsupported source type in local seed: ${seed.source_type}`);
  }

  return {
    word: {
      id: seed.word_id,
      lemma: seed.lemma,
      displayForm: seed.display_form,
      partOfSpeech: seed.part_of_speech,
      ipa: seed.ipa
    },
    sense: {
      id: seed.word_sense_id,
      wordId: seed.word_id,
      module: seed.module,
      category: seed.category,
      meaningEn: seed.meaning_en,
      meaningZh: seed.meaning_zh,
      usageNote: seed.usage_note
    },
    context: {
      id: seed.context_id,
      wordSenseId: seed.word_sense_id,
      contextSentence: seed.context_sentence,
      targetText: seed.target_text,
      plainEnglishParaphrase: seed.plain_english_paraphrase,
      sentenceTranslationZh: seed.sentence_translation_zh,
      collocations: [...seed.collocations],
      source: {
        type: seed.source_type,
        title: seed.source_title,
        url: seed.source_url,
        doi: seed.doi,
        pmid: seed.pmid
      }
    },
    card: {
      id: seed.id,
      wordSenseId: seed.word_sense_id,
      contextId: seed.context_id,
      active: seed.active
    }
  };
}
