import demoSeedCards from "virtual:article-english-demo-seed";

import {
  RESEARCH_CATEGORY_QUOTAS,
  type DomainModuleSlug,
  type NormalizedContextCard,
  type ResearchCategory
} from "../../domain/learning";

interface SeedCard {
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

const seedCards = demoSeedCards as SeedCard[];

function normalizeSeedCard(seed: SeedCard): NormalizedContextCard {
  if (seed.module !== "research_english" && seed.module !== "medical_english") {
    throw new Error(`Unsupported module in demo seed: ${seed.module}`);
  }
  if (seed.source_type !== "original_example" && seed.source_type !== "verified_source") {
    throw new Error(`Unsupported source type in demo seed: ${seed.source_type}`);
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

function requireCards(
  module: DomainModuleSlug,
  predicate: (card: SeedCard) => boolean,
  count: number
): NormalizedContextCard[] {
  const selected = seedCards
    .filter((card) => card.module === module && card.active && predicate(card))
    .slice(0, count)
    .map(normalizeSeedCard);

  if (selected.length !== count) {
    throw new Error(
      `Canonical seed has only ${String(selected.length)} eligible ${module} demo cards.`
    );
  }
  return selected;
}

export const DEMO_RESEARCH_CARDS: NormalizedContextCard[] = (
  Object.entries(RESEARCH_CATEGORY_QUOTAS) as Array<[ResearchCategory, number]>
).flatMap(([category, quota]) =>
  requireCards("research_english", (card) => card.category === category, quota)
);

const medicalCategories = [
  "anatomy",
  "physiology",
  "pathology",
  "symptoms",
  "signs",
  "diseases",
  "diagnosis",
  "laboratory",
  "imaging",
  "treatment"
] as const;

export const DEMO_MEDICAL_CARDS: NormalizedContextCard[] = medicalCategories.flatMap((category) =>
  requireCards("medical_english", (card) => card.category === category, 1)
);

export const DEMO_CARDS: NormalizedContextCard[] = [...DEMO_RESEARCH_CARDS, ...DEMO_MEDICAL_CARDS];
