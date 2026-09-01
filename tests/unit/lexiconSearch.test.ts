import { describe, expect, it } from "vitest";

import { searchLocalLexicon, type LexiconSearchCard } from "../../src/domain/lexiconSearch";

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

describe("searchLocalLexicon", () => {
  it("returns nothing for an empty query", () => {
    expect(searchLocalLexicon([research, medical], new Set(), "   ")).toEqual([]);
  });

  it("matches Chinese gloss, English lemma, sentence, and collocations", () => {
    expect(
      searchLocalLexicon([research, medical], new Set(), "减弱").map((hit) => hit.lemma)
    ).toEqual(["attenuate"]);
    expect(
      searchLocalLexicon([research, medical], new Set(), "palpable").map((hit) => hit.lemma)
    ).toEqual(["palpable"]);
    expect(
      searchLocalLexicon([research, medical], new Set(), "right upper quadrant").map(
        (hit) => hit.lemma
      )
    ).toEqual(["palpable"]);
    expect(
      searchLocalLexicon([research, medical], new Set(), "attenuate the association").map(
        (hit) => hit.lemma
      )
    ).toEqual(["attenuate"]);
  });

  it("ranks learned cards first without inventing missing definitions", () => {
    const hits = searchLocalLexicon([research, medical], new Set([medical.wordSenseId]), "a");
    expect(hits[0]).toMatchObject({ lemma: "palpable", learned: true, module: "medical_english" });
    expect(hits.some((hit) => hit.lemma === "attenuate")).toBe(true);
    expect(searchLocalLexicon([research, medical], new Set(), "not-in-the-local-store")).toEqual(
      []
    );
  });
});
