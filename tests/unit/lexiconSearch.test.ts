import { describe, expect, it } from "vitest";

import {
  LEXICON_SEARCH_LIMIT,
  searchLocalLexicon,
  type LexiconSearchCard
} from "../../src/domain/lexiconSearch";

const research: LexiconSearchCard = {
  cardId: "card-research-1",
  wordSenseId: "sense-attenuate",
  module: "research_english",
  lemma: "attenuate",
  displayForm: "attenuated",
  meaningEn: "to make an effect, association, or signal weaker",
  meaningZh: "减弱；降低",
  contextSentence: "The association was substantially attenuated after adjustment for age and BMI.",
  sentenceTranslationZh: "调整年龄和 BMI 后，该关联明显减弱。",
  collocations: ["attenuate the association", "attenuate an effect"],
  targetText: "attenuated"
};

const medical: LexiconSearchCard = {
  cardId: "card-medical-1",
  wordSenseId: "sense-palpable",
  module: "medical_english",
  lemma: "palpable",
  displayForm: "palpable",
  meaningEn: "able to be felt during physical examination",
  meaningZh: "可触及的",
  contextSentence: "A firm, non-tender mass was palpable in the right upper quadrant.",
  sentenceTranslationZh: "右上腹可触及一个质硬、无压痛的肿块。",
  collocations: ["palpable mass"],
  targetText: "palpable"
};

const essential: LexiconSearchCard = {
  cardId: "card-essential-1",
  wordSenseId: "sense-phagocytosis",
  module: "essential_medical",
  lemma: "phagocytosis",
  displayForm: "phagocytosis",
  meaningEn: "engulfment of particles by a cell",
  meaningZh: "吞噬作用",
  contextSentence:
    "Neutrophils and macrophages used phagocytosis to engulf bacteria and other harmful material.",
  sentenceTranslationZh: "中性粒细胞和巨噬细胞通过吞噬作用吞入细菌和其他有害物质。",
  collocations: [],
  targetText: "phagocytosis"
};

const catalog = [research, medical, essential];
const fuzzy = { fuzzy: true } as const;

describe("searchLocalLexicon", () => {
  it("returns nothing for an empty query", () => {
    expect(searchLocalLexicon(catalog, new Set(), "   ")).toEqual([]);
    expect(searchLocalLexicon(catalog, new Set(), "   ", fuzzy)).toEqual([]);
  });

  it("matches Chinese gloss, English lemma, sentence, and collocations", () => {
    expect(searchLocalLexicon(catalog, new Set(), "减弱").map((hit) => hit.lemma)).toEqual([
      "attenuate"
    ]);
    expect(searchLocalLexicon(catalog, new Set(), "palpable").map((hit) => hit.lemma)).toEqual([
      "palpable"
    ]);
    expect(
      searchLocalLexicon(catalog, new Set(), "right upper quadrant").map((hit) => hit.lemma)
    ).toEqual(["palpable"]);
    expect(
      searchLocalLexicon(catalog, new Set(), "attenuate the association").map((hit) => hit.lemma)
    ).toEqual(["attenuate"]);
  });

  it("ranks learned cards first without inventing missing definitions", () => {
    const hits = searchLocalLexicon(catalog, new Set([medical.wordSenseId]), "a");
    expect(hits[0]).toMatchObject({ lemma: "palpable", learned: true, module: "medical_english" });
    expect(hits.some((hit) => hit.lemma === "attenuate")).toBe(true);
    expect(searchLocalLexicon(catalog, new Set(), "not-in-the-local-store")).toEqual([]);
  });

  it("rejects pure lemma typos on the default cloud/PWA substring path", () => {
    expect(searchLocalLexicon(catalog, new Set(), "phagocytoss")).toEqual([]);
    expect(searchLocalLexicon(catalog, new Set(), "phagocytoss", {})).toEqual([]);
    expect(searchLocalLexicon(catalog, new Set(), "phagocytoss", { fuzzy: false })).toEqual([]);
    expect(searchLocalLexicon(catalog, new Set(), "palpaple")).toEqual([]);
    expect(searchLocalLexicon(catalog, new Set(), "吞噬作佣")).toEqual([]);
  });

  it("accepts bounded lemma typos when fuzzy matching is enabled", () => {
    expect(
      searchLocalLexicon(catalog, new Set(), "phagocytoss", fuzzy).map((hit) => hit.lemma)
    ).toEqual(["phagocytosis"]);
    expect(
      searchLocalLexicon(catalog, new Set(), "Phagocytosi", fuzzy).map((hit) => hit.lemma)
    ).toEqual(["phagocytosis"]);
    expect(
      searchLocalLexicon(catalog, new Set(), "palpaple", fuzzy).map((hit) => hit.lemma)
    ).toEqual(["palpable"]);
    expect(
      searchLocalLexicon(catalog, new Set(), "attenuatted", fuzzy).map((hit) => hit.lemma)
    ).toEqual(["attenuate"]);
  });

  it("can recover a cheap Chinese meaning typo only on the fuzzy path", () => {
    expect(
      searchLocalLexicon(catalog, new Set(), "吞噬作佣", fuzzy).map((hit) => hit.lemma)
    ).toEqual(["phagocytosis"]);
  });

  it("does not fuzzy-match sentence or collocation typos", () => {
    expect(searchLocalLexicon(catalog, new Set(), "right upper quadrent", fuzzy)).toEqual([]);
    expect(searchLocalLexicon(catalog, new Set(), "attenuate the associaton", fuzzy)).toEqual([]);
  });

  it("keeps learned-first ranking and the result cap when fuzzy matches are included", () => {
    const hits = searchLocalLexicon(catalog, new Set([research.wordSenseId]), "phagocytoss", fuzzy);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      lemma: "phagocytosis",
      learned: false,
      module: "essential_medical"
    });

    const learnedTypo = searchLocalLexicon(
      catalog,
      new Set([essential.wordSenseId]),
      "phagocytoss",
      fuzzy
    );
    expect(learnedTypo[0]).toMatchObject({ lemma: "phagocytosis", learned: true });

    const padded = Array.from({ length: LEXICON_SEARCH_LIMIT + 4 }, (_, index) => ({
      ...essential,
      cardId: `card-pad-${String(index)}`,
      wordSenseId: `sense-pad-${String(index)}`,
      lemma: `phagocytos${String.fromCharCode(97 + index)}`,
      displayForm: `phagocytos${String.fromCharCode(97 + index)}`
    }));
    const limited = searchLocalLexicon(padded, new Set(), "phagocytoss", fuzzy);
    expect(limited).toHaveLength(LEXICON_SEARCH_LIMIT);
  });
});
