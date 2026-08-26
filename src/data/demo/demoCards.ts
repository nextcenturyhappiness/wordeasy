import type { NormalizedContextCard, ResearchCategory } from "../../domain/learning";

interface DemoCardInput {
  key: string;
  category: ResearchCategory;
  lemma: string;
  displayForm: string;
  partOfSpeech: string;
  ipa: string;
  meaningEn: string;
  meaningZh: string;
  usageNote: string;
  contextSentence: string;
  targetText: string;
  plainEnglishParaphrase: string;
  sentenceTranslationZh: string;
  collocations: string[];
}

function createDemoCard(input: DemoCardInput): NormalizedContextCard {
  const wordId = `demo-word-${input.key}`;
  const wordSenseId = `demo-sense-${input.key}`;
  const contextId = `demo-context-${input.key}`;
  return {
    word: {
      id: wordId,
      lemma: input.lemma,
      displayForm: input.displayForm,
      partOfSpeech: input.partOfSpeech,
      ipa: input.ipa
    },
    sense: {
      id: wordSenseId,
      wordId,
      module: "research_english",
      category: input.category,
      meaningEn: input.meaningEn,
      meaningZh: input.meaningZh,
      usageNote: input.usageNote
    },
    context: {
      id: contextId,
      wordSenseId,
      contextSentence: input.contextSentence,
      targetText: input.targetText,
      plainEnglishParaphrase: input.plainEnglishParaphrase,
      sentenceTranslationZh: input.sentenceTranslationZh,
      collocations: input.collocations,
      source: {
        type: "original_example",
        title: null,
        url: null,
        doi: null,
        pmid: null
      }
    },
    card: {
      id: `demo-card-${input.key}`,
      wordSenseId,
      contextId,
      active: true
    }
  };
}

export const DEMO_RESEARCH_CARDS: NormalizedContextCard[] = [
  createDemoCard({
    key: "attenuate",
    category: "general_research",
    lemma: "attenuate",
    displayForm: "attenuated",
    partOfSpeech: "verb",
    ipa: "/əˈtenjueɪt/",
    meaningEn: "to make an effect, association, or signal weaker",
    meaningZh: "减弱；降低",
    usageNote: "Common in Results and Discussion after adjustment changes an estimate.",
    contextSentence:
      "The association was substantially attenuated after adjustment for age and BMI.",
    targetText: "attenuated",
    plainEnglishParaphrase: "Adjusting for age and BMI made the association weaker.",
    sentenceTranslationZh: "调整年龄和 BMI 后，该关联明显减弱。",
    collocations: ["attenuate an association", "attenuate an effect", "attenuate a signal"]
  }),
  createDemoCard({
    key: "robust",
    category: "general_research",
    lemma: "robust",
    displayForm: "robust",
    partOfSpeech: "adjective",
    ipa: "/rəʊˈbʌst/",
    meaningEn: "remaining reliable when assumptions or analyses change",
    meaningZh: "稳健的；可靠的",
    usageNote: "Often describes findings that persist across sensitivity analyses.",
    contextSentence:
      "The survival benefit remained robust across all prespecified sensitivity analyses.",
    targetText: "robust",
    plainEnglishParaphrase:
      "The survival finding stayed reliable under several alternative analyses.",
    sentenceTranslationZh: "在所有预先设定的敏感性分析中，生存获益仍然稳健。",
    collocations: ["robust finding", "robust estimate", "robust evidence"]
  }),
  createDemoCard({
    key: "elucidate",
    category: "general_research",
    lemma: "elucidate",
    displayForm: "elucidate",
    partOfSpeech: "verb",
    ipa: "/iˈluːsɪdeɪt/",
    meaningEn: "to make a mechanism or relationship clearer",
    meaningZh: "阐明；解释清楚",
    usageNote: "Used when a study aims to clarify an incompletely understood mechanism.",
    contextSentence:
      "Single-cell profiling may elucidate how stromal cells promote treatment resistance.",
    targetText: "elucidate",
    plainEnglishParaphrase: "Single-cell data may clarify how stromal cells cause resistance.",
    sentenceTranslationZh: "单细胞分析可能阐明基质细胞如何促进治疗耐药。",
    collocations: ["elucidate a mechanism", "elucidate the role", "elucidate a pathway"]
  }),
  createDemoCard({
    key: "corroborate",
    category: "general_research",
    lemma: "corroborate",
    displayForm: "corroborated",
    partOfSpeech: "verb",
    ipa: "/kəˈrɒbəreɪt/",
    meaningEn: "to provide additional evidence that supports a result",
    meaningZh: "证实；佐证",
    usageNote: "Signals agreement between independent analyses or data sources.",
    contextSentence: "The imaging findings were corroborated by histopathological examination.",
    targetText: "corroborated",
    plainEnglishParaphrase:
      "The tissue examination provided supporting evidence for the imaging result.",
    sentenceTranslationZh: "组织病理学检查佐证了影像学发现。",
    collocations: ["corroborate a finding", "corroborating evidence", "independently corroborated"]
  }),
  createDemoCard({
    key: "salient",
    category: "general_research",
    lemma: "salient",
    displayForm: "salient",
    partOfSpeech: "adjective",
    ipa: "/ˈseɪliənt/",
    meaningEn: "especially important or noticeable in the present context",
    meaningZh: "显著的；突出的；重要的",
    usageNote: "Highlights a feature that deserves particular attention.",
    contextSentence: "A salient feature of the cohort was the high prevalence of multimorbidity.",
    targetText: "salient",
    plainEnglishParaphrase: "One especially notable cohort feature was frequent multimorbidity.",
    sentenceTranslationZh: "该队列的一个突出特点是多病共存患病率较高。",
    collocations: ["salient feature", "salient finding", "clinically salient"]
  }),
  createDemoCard({
    key: "confounding",
    category: "statistics_methodology",
    lemma: "confounding",
    displayForm: "confounding",
    partOfSpeech: "noun",
    ipa: "/kənˈfaʊndɪŋ/",
    meaningEn:
      "distortion of an association by a third variable related to both exposure and outcome",
    meaningZh: "混杂；混杂作用",
    usageNote: "A central threat to causal interpretation in observational studies.",
    contextSentence:
      "Residual confounding cannot be excluded because diet was measured only at baseline.",
    targetText: "confounding",
    plainEnglishParaphrase:
      "Unmeasured dietary differences may still partly explain the association.",
    sentenceTranslationZh: "由于仅在基线测量饮食，仍不能排除残余混杂。",
    collocations: ["residual confounding", "control for confounding", "potential confounding"]
  }),
  createDemoCard({
    key: "heterogeneity",
    category: "statistics_methodology",
    lemma: "heterogeneity",
    displayForm: "heterogeneity",
    partOfSpeech: "noun",
    ipa: "/ˌhetərəʊdʒəˈniːəti/",
    meaningEn: "variation in effects or characteristics across studies or subgroups",
    meaningZh: "异质性",
    usageNote: "In meta-analysis, it describes between-study variation beyond sampling error.",
    contextSentence: "Substantial heterogeneity was observed across trials in the pooled analysis.",
    targetText: "heterogeneity",
    plainEnglishParaphrase: "The treatment effects differed considerably among the trials.",
    sentenceTranslationZh: "汇总分析显示各试验之间存在显著异质性。",
    collocations: [
      "substantial heterogeneity",
      "between-study heterogeneity",
      "assess heterogeneity"
    ]
  }),
  createDemoCard({
    key: "alignment",
    category: "bioinformatics",
    lemma: "alignment",
    displayForm: "alignment",
    partOfSpeech: "noun",
    ipa: "/əˈlaɪnmənt/",
    meaningEn: "the placement of sequence reads against a reference sequence",
    meaningZh: "序列比对",
    usageNote: "Read alignment is an upstream step that affects downstream quantification.",
    contextSentence: "Low-quality reads were removed before alignment to the reference genome.",
    targetText: "alignment",
    plainEnglishParaphrase:
      "Poor reads were discarded before matching reads to the reference genome.",
    sentenceTranslationZh: "在与参考基因组进行序列比对前，先去除了低质量读段。",
    collocations: ["sequence alignment", "alignment rate", "reference alignment"]
  }),
  createDemoCard({
    key: "enrichment",
    category: "bioinformatics",
    lemma: "enrichment",
    displayForm: "enrichment",
    partOfSpeech: "noun",
    ipa: "/ɪnˈrɪtʃmənt/",
    meaningEn: "overrepresentation of a biological feature in a selected gene set",
    meaningZh: "富集；过度代表",
    usageNote: "Usually interpreted relative to a defined background gene universe.",
    contextSentence:
      "Pathway enrichment revealed increased interferon signaling in malignant cells.",
    targetText: "enrichment",
    plainEnglishParaphrase:
      "Interferon-related genes appeared more often than expected in malignant cells.",
    sentenceTranslationZh: "通路富集分析显示恶性细胞中的干扰素信号增强。",
    collocations: ["pathway enrichment", "gene set enrichment", "enrichment analysis"]
  }),
  createDemoCard({
    key: "ortholog",
    category: "bioinformatics",
    lemma: "ortholog",
    displayForm: "orthologs",
    partOfSpeech: "noun",
    ipa: "/ˈɔːθəlɒɡ/",
    meaningEn: "genes in different species derived from one ancestral gene through speciation",
    meaningZh: "直系同源基因",
    usageNote: "Orthologs often, but not always, retain related biological functions.",
    contextSentence: "Human genes were mapped to mouse orthologs before cross-species comparison.",
    targetText: "orthologs",
    plainEnglishParaphrase:
      "Human genes were paired with corresponding mouse genes before comparison.",
    sentenceTranslationZh: "在跨物种比较前，将人类基因映射到小鼠直系同源基因。",
    collocations: ["mouse ortholog", "identify orthologs", "one-to-one ortholog"]
  })
];
