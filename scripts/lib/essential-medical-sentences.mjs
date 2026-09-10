import { composeWraps } from "./essential-medical-compose.mjs";

function pickWrap(wraps, index) {
  return wraps[index % wraps.length];
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

function countWords(sentence) {
  return sentence.trim().split(/\s+/u).filter(Boolean).length;
}

/** English classroom / teaching frames banned from essential-medical sentences. */
export const CLASSROOM_RE =
  /\bward rounds?\b|\bteaching example\b|\bclassroom\b|\bjuniors?\b|\bregistrar\b|\btutors?\b|\blecture\b|\bglossary\b|labelled slide|labeled slide|textbook chapter|\bchapter on\b|skills lab|revision card|\bwhiteboard\b|morning teaching|history[- ]taking|wall chart|bedside teaching|\btutorial\b|\bquizzes\b|\bquiz\b|teaching conference|teaching lab|teaching note|teaching slide|teaching round|teaching meeting|classroom notes|pair work|students had to|the intern added|labelled classroom/iu;

/** Mad-lib / lazy shells that do not use the lemma with its real meaning. */
export const LAZY_SENTENCE_RE =
  /progress line mentioned|episode was \S+ enough|operative report used .+ to map|host response in this tissue included|neighboring tissue stayed intact beside|pain mapped over|explained the change in function|contents passed through the|laboratory comment linked the numbers|today’s picture of|at the bedside the main finding was|in one plain sentence|no longer \S+ as it should(?![\s\S])/iu;

const LAZY_SENTENCE_RES = [
  /progress line mentioned/iu,
  /episode was \S+ enough/iu,
  /operative report used .+ to map/iu,
  /host response in this tissue included/iu,
  /neighboring tissue stayed intact beside/iu,
  /pain mapped over/iu,
  /explained the change in function/iu,
  /contents passed through the/iu,
  /laboratory comment linked the numbers/iu,
  /in one plain sentence/iu,
  /at the bedside the main finding was/iu,
  /the working problem was/iu,
  /overnight function of the/iu,
  /today’s picture of/iu,
  /today's picture of/iu
];

function isBodyStructureMeaning(meaning, lemma) {
  const blob = `${lemma} ${meaning}`.toLowerCase();
  if (
    /(cavity|bone|joint|gland|vessel|muscle|sinus|colon|pharynx|trachea|tonsil|cord|pleura|membrane|vertebra|clavicle)/iu.test(
      lemma
    )
  ) {
    return true;
  }
  if (
    /special work|drawing air|pushing air|how acidic|death of cells|strong acid secreted|organized microscopic|process that lowers|process that raises/u.test(
      blob
    )
  ) {
    return false;
  }
  return (
    /^(?:the|a|an)\s+.+\b(?:organ|gland|vessel|bone|joint|muscle|cavity|tube|duct|chamber|sinus|colon|intestine|pharynx|trachea|lung|brain|nerve|tooth|membrane|airway|pleura|sphincter|tonsil|vertebra|sac|flap|cord)\b/u.test(
      meaning
    ) || /voice box|clavicle|bony case|joint between|covering tissue/u.test(meaning)
  );
}

function isAnalyteMeaning(meaning, lemma) {
  return /\b(?:hormone|enzyme|protein|ion|cation|electrolyte|glucose|lipid|antibody|steroid|globulin|sodium|potassium|calcium|bilirubin|albumin|urea|creatinine|cholesterol|glycogen|histamine)\b/u.test(
    `${lemma} ${meaning}`
  );
}

export const LEMMA_OVERRIDES = {
  phagocytosis: {
    id: "override_phagocytosis",
    sentence:
      "Neutrophils and macrophages used phagocytosis to engulf bacteria and other harmful material.",
    paraphrase:
      "White cells swallowed the bacteria and debris so they could clear them from the tissue.",
    translation: "中性粒细胞和巨噬细胞通过吞噬作用吞入细菌和其他有害物质。"
  },
  "cube-shaped": {
    id: "override_cube_shaped",
    sentence: "On the smear the crystals were cube-shaped rather than needle-like.",
    paraphrase: "The crystals looked like little cubes, not like needles.",
    translation: "涂片上这些结晶是立方体形的，而不是针状。"
  },
  collarbone: {
    id: "override_collarbone",
    sentence: "The fall produced a fracture of the collarbone, and the shoulder sagged.",
    paraphrase: "The fall broke the clavicle, and the shoulder dropped.",
    translation: "跌倒造成锁骨骨折，肩部随之塌下。"
  },
  "collar bone": {
    id: "override_collar_bone",
    sentence: "Tenderness over the collar bone after the fall fitted a clavicle fracture.",
    paraphrase: "Pain over the clavicle after the fall fitted a broken collarbone.",
    translation: "跌倒后锁骨压痛，符合锁骨骨折。"
  },
  offspring: {
    id: "override_offspring",
    sentence: "Genetic counseling asked whether affected offspring had inherited the same variant.",
    paraphrase: "Counseling asked whether the children had received the same gene change.",
    translation: "遗传咨询询问受累子女是否遗传了同一变异。"
  },
  hyperthyroidism: {
    id: "override_hyperthyroidism",
    sentence: "Weight loss, tremor, and a suppressed TSH fitted hyperthyroidism.",
    paraphrase: "Losing weight, shaking, and a low TSH fitted excess thyroid hormone.",
    translation: "体重下降、震颤和 TSH 受抑制，符合甲状腺功能亢进。"
  },
  alkali: {
    id: "override_alkali",
    sentence: "The alkali spill raised the pH and burned the esophageal mucosa.",
    paraphrase: "The base spill made the fluid less acidic and burned the gullet lining.",
    translation: "碱液溅入使 pH 升高，并灼伤食管黏膜。"
  },
  psychology: {
    id: "override_psychology",
    sentence:
      "After the head injury, psychology input was needed for the persistent mood and behavior change.",
    paraphrase: "After the head injury, mood and behavior still needed a psychology consult.",
    translation: "颅脑损伤后，持续的情绪和行为改变需要心理学介入。"
  },
  globulin: {
    id: "override_globulin",
    sentence: "The low globulin level left too little antibody protein against infection.",
    paraphrase: "Low globulin meant there was not enough antibody protein to fight infection.",
    translation: "球蛋白偏低，对抗感染的抗体蛋白不足。"
  },
  anatomy: {
    id: "override_anatomy",
    sentence: "Repair of the torn ligament depended on anatomy of that region.",
    paraphrase: "Fixing the torn ligament needed the body-structure map of that region.",
    translation: "修复撕裂的韧带取决于该部位的解剖学。"
  },
  physiology: {
    id: "override_physiology",
    sentence: "The shock picture made sense once physiology of cardiac output was applied.",
    paraphrase: "Shock became clearer using how the body keeps output and filling working.",
    translation: "用生理学去看心输出后，休克的图像才说得通。"
  },
  pathology: {
    id: "override_pathology",
    sentence:
      "The biopsy interpretation depended on pathology of the margin, not the gross look alone.",
    paraphrase: "Reading the biopsy needed tissue-disease analysis, not just the naked-eye look.",
    translation: "活检判读靠病理学看切缘，不能只看大体外观。"
  },
  histology: {
    id: "override_histology",
    sentence: "The biopsy was reported through histology of the tissue, not a bedside guess.",
    paraphrase: "The tissue was read under the microscope, not guessed at the bedside.",
    translation: "活检按组织学报告，而不是床旁猜测。"
  },
  embryology: {
    id: "override_embryology",
    sentence: "The congenital gap was explained by embryology of the neural tube.",
    paraphrase: "The birth defect made sense from how the neural tube forms before birth.",
    translation: "这一先天缺损要用神经管的胚胎学来解释。"
  },
  hematology: {
    id: "override_hematology",
    sentence: "The falling counts were interpreted with hematology of the marrow.",
    paraphrase: "The falling blood counts were read as a marrow blood problem.",
    translation: "血细胞计数下降要结合血液学看骨髓。"
  },
  immunology: {
    id: "override_immunology",
    sentence: "Recurrent infection was interpreted with immunology of host defense.",
    paraphrase: "Repeated infection was read as a host-defense problem.",
    translation: "反复感染要结合免疫学看宿主防御。"
  },
  cytology: {
    id: "override_cytology",
    sentence: "The smear was reported through cytology rather than a bedside guess.",
    paraphrase: "The smear result used cell studies, not a guess at the bedside.",
    translation: "涂片按细胞学报告，而不是床旁猜测。"
  },
  endocrinology: {
    id: "override_endocrinology",
    sentence: "The abnormal hormone levels were read with endocrinology of the source glands.",
    paraphrase: "The hormone numbers were read as a gland-hormone problem.",
    translation: "激素异常要结合内分泌学看来源腺体。"
  },
  biology: {
    id: "override_biology",
    sentence: "The inherited trait was discussed as biology of the gene product.",
    paraphrase:
      "The inherited trait was talked about as how the gene product works in living systems.",
    translation: "这一遗传性状按基因产物的生物学来讨论。"
  },
  opsonization: {
    id: "override_opsonization",
    sentence: "After opsonization coated the microbe, phagocytes could ingest it much more easily.",
    paraphrase: "A protein coat on the microbe made it easier for eating-cells to take it up.",
    translation: "调理作用给微生物表面涂上标记后，吞噬细胞就更容易把它吞入。"
  },
  mitosis: {
    id: "override_mitosis",
    sentence:
      "Skin cells completed mitosis and yielded two identical diploid daughters for repair.",
    paraphrase: "Ordinary cell division made two matching daughter cells to close the wound.",
    translation: "皮肤细胞完成有丝分裂，产生两个相同的二倍体子细胞用于修复。"
  },
  meiosis: {
    id: "override_meiosis",
    sentence: "In the gonad, meiosis produced haploid gametes instead of identical body cells.",
    paraphrase: "Germ-cell division cut the chromosome number in half to make eggs or sperm.",
    translation: "在性腺里，减数分裂产生单倍体配子，而不是相同的体细胞。"
  },
  peristalsis: {
    id: "override_peristalsis",
    sentence: "In the gut wall, peristalsis moved contents onward between meals.",
    paraphrase: "Wave-like squeezing in the bowel pushed contents along between meals.",
    translation: "肠壁的蠕动在餐间把内容物向前推进。"
  },
  absorption: {
    id: "override_absorption",
    sentence: "After a meal, absorption of glucose increased across the small-bowel mucosa.",
    paraphrase: "After eating, more glucose was taken up across the small-bowel lining.",
    translation: "餐后，葡萄糖经小肠黏膜的吸收增加。"
  },
  "cell division": {
    id: "override_cell_division",
    sentence: "After the cut, cell division produced new cells to close the wound.",
    paraphrase: "After the cut, one cell becoming two made new cells to close the wound.",
    translation: "割伤之后，细胞分裂产生新细胞来闭合伤口。"
  },
  kidney: {
    id: "override_kidney",
    sentence: "Blood was filtered as it passed through each kidney, and urine began to form.",
    paraphrase: "Each kidney filtered the blood and started making urine.",
    translation: "血液流经每一侧肾时被滤过，并开始生成尿液。"
  },
  "sickle cell anemia": {
    id: "override_sickle_cell_anemia",
    sentence: "Painful crises occur when sickle cell anemia distorts red cells in small vessels.",
    paraphrase: "Painful attacks happen when sickle-shaped red cells jam small vessels.",
    translation: "镰状细胞贫血使红细胞在小血管里变形时，就会出现疼痛危象。"
  },
  expel: {
    id: "override_expel",
    sentence: "A strong cough helped expel the mucus that was blocking the airway.",
    paraphrase: "Coughing forced the mucus out of the airway.",
    translation: "有力的咳嗽把堵住气道的痰液排出。"
  },
  exhale: {
    id: "override_exhale",
    sentence: "After the deep breath she had to exhale slowly through pursed lips.",
    paraphrase: "She had to breathe the air out slowly through pursed lips.",
    translation: "深吸气后，她必须通过缩唇把气慢慢呼出。"
  },
  diagnose: {
    id: "override_diagnose",
    sentence: "After history, exam, and the CT result, the team could diagnose appendicitis.",
    paraphrase: "History, exam, and the scan were enough to name the illness: appendicitis.",
    translation: "结合病史、查体和 CT 结果，团队可以诊断为阑尾炎。"
  },
  paralyze: {
    id: "override_paralyze",
    sentence: "The stroke can paralyze the right arm and face.",
    paraphrase: "The stroke can take away movement in the right arm and face.",
    translation: "这次卒中可以使右侧上肢和面部瘫痪。"
  },
  detoxify: {
    id: "override_detoxify",
    sentence: "The liver can detoxify many drugs before they reach the rest of the body.",
    paraphrase: "The liver can make many drugs less harmful before they travel onward.",
    translation: "肝脏能在许多药物到达全身其他部位之前把它们解毒。"
  },
  abort: {
    id: "override_abort",
    sentence: "Bleeding in early pregnancy may abort the pregnancy before the fetus is viable.",
    paraphrase: "Early bleeding may end the pregnancy before the fetus can survive.",
    translation: "妊娠早期出血可能在胎儿可存活前终止妊娠。"
  },
  transmit: {
    id: "override_transmit",
    sentence: "Respiratory droplets can transmit the infection from one person to the next.",
    paraphrase: "Cough droplets can pass the infection from one person to another.",
    translation: "呼吸道飞沫可以把感染从一个人传给下一个人。"
  },
  incur: {
    id: "override_incur",
    sentence: "Leaving the clot untreated can incur a risk of later embolus.",
    paraphrase: "Leaving the clot untreated can bring on a later embolus risk.",
    translation: "血栓不加处理，日后可能招致栓子风险。"
  },
  prematurely: {
    id: "override_prematurely",
    sentence: "The infant was born prematurely at 32 weeks.",
    paraphrase: "The baby arrived earlier than the expected time, at 32 weeks.",
    translation: "婴儿在 32 周就提前出生了。"
  },
  function: {
    id: "override_function",
    sentence: "Systolic function of the left ventricle fell after the infarct.",
    paraphrase: "The pumping performance of that chamber declined after the infarct.",
    translation: "梗死后左心室收缩功能下降。"
  },
  architecture: {
    id: "override_architecture",
    sentence: "The biopsy kept normal lobular architecture despite mild inflammation.",
    paraphrase: "Tissue layout of the lobules was still intact.",
    translation: "活检显示小叶结构仍在，仅有轻度炎症。"
  },
  inhalation: {
    id: "override_inhalation",
    sentence: "Peak drug levels arrived faster after inhalation than after oral dosing.",
    paraphrase: "Breathing the medicine in raised blood levels sooner than swallowing it.",
    translation: "吸入给药比口服更快达到峰浓度。"
  },
  exhalation: {
    id: "override_exhalation",
    sentence: "Slow exhalation through pursed lips helped dump carbon dioxide.",
    paraphrase: "Breathing out slowly through pursed lips cleared more carbon dioxide.",
    translation: "缩唇缓慢呼气有助于排出二氧化碳。"
  },
  acidity: {
    id: "override_acidity",
    sentence: "Gastric acidity rose after the meal and then fell with antacid.",
    paraphrase: "Stomach pH dropped with food and recovered after the buffer.",
    translation: "餐后胃酸度升高，抗酸药后又下降。"
  },
  suction: {
    id: "override_suction",
    sentence: "Bedside suction cleared the airway of thick secretions.",
    paraphrase: "A vacuum catheter removed mucus from the airway.",
    translation: "床旁吸引清除气道内黏痰。"
  },
  "hydrochloric acid": {
    id: "override_hcl",
    sentence: "Gastric parietal cells secreted hydrochloric acid into the stomach lumen.",
    paraphrase: "Stomach lining cells released acid into the gastric cavity.",
    translation: "胃壁细胞向胃腔分泌盐酸。"
  },
  necrosis: {
    id: "override_necrosis",
    sentence: "The infarct showed necrosis of myocytes that had lost nuclei and staining.",
    paraphrase: "Dead heart-muscle cells in the infarct no longer took up stain.",
    translation: "梗死区心肌细胞坏死，核与染色均消失。"
  },
  macrophages: {
    id: "override_macrophages",
    sentence: "Tissue macrophages cleared debris after the neutrophils had already arrived.",
    paraphrase: "Resident scavenger cells mopped up remaining fragments.",
    translation: "中性粒细胞到场后，组织巨噬细胞清除残渣。"
  },
  macrophage: {
    id: "override_macrophage",
    sentence: "The tissue macrophage cleared debris after neutrophils had already arrived.",
    paraphrase: "The resident scavenger cell mopped up remaining fragments.",
    translation: "中性粒细胞到场后，组织巨噬细胞清除残渣。"
  },
  joint: {
    id: "override_joint",
    sentence: "The swollen joint limited flexion and was warm to touch.",
    paraphrase: "The inflamed articulation could not bend fully and felt hot.",
    translation: "肿胀关节屈曲受限，触之发热。"
  },
  oxygen: {
    id: "override_oxygen",
    sentence: "Tissues could not keep aerobic metabolism without enough oxygen.",
    paraphrase: "Cells could not use air-breathing chemistry without enough oxygen.",
    translation: "没有足够氧气，组织就无法维持有氧代谢。"
  },
  nutrient: {
    id: "override_nutrient",
    sentence: "Wound healing stalled when nutrient intake stayed too low.",
    paraphrase: "The wound would not close while food-substance intake stayed too low.",
    translation: "营养素摄入过低时，伤口愈合停滞。"
  },
  nourishment: {
    id: "override_nourishment",
    sentence: "Without adequate nourishment the child stopped gaining weight.",
    paraphrase: "Without enough food and substances for growth, weight gain stopped.",
    translation: "缺乏足够营养时，孩子停止增重。"
  }
};

export function kindOf(entry) {
  const lemma = entry.lemma.toLowerCase();
  const { pos, meaningEn } = entry;
  const meaning = String(meaningEn).toLowerCase();
  const blob = `${lemma} ${meaning}`;

  if (pos === "adverb") return "adverb";
  if (pos === "verb" || pos === "phrasal verb") return "verb";
  if (pos === "adjective") {
    if (/^relating to\b/u.test(meaning)) return "adj_relating";
    if (/shape of|cube|needle-like|shaped/u.test(blob)) return "adj_shape";
    if (
      /toward |nearer |farther |above,|below,|dividing the body|midline|front of the body|back of the body|body surface/u.test(
        meaning
      )
    ) {
      return "adj_spatial";
    }
    if (/gene|allele|inherit|parent|mutation|twin/u.test(meaning)) return "adj_genetic";
    if (/beneath the skin|into a muscle|into a vein|by mouth|injection route/u.test(meaning)) {
      return "adj_route";
    }
    return "adj_clinical";
  }

  if (
    /^(?:the\s+)?(?:microscopic\s+)?study of\b/u.test(meaning) ||
    /genetics of immune/u.test(meaning)
  ) {
    return "study";
  }
  if (/^inflammation of\b/u.test(meaning) || /itis$/u.test(lemma)) return "inflammation";
  if (
    /engulfment|coating of a microbe|cell division|process of one cell|process by which|uptake of a substance|wave-like muscle|energy-using movement|digestive organelle/u.test(
      meaning
    )
  ) {
    return "process";
  }
  if (
    /x-ray|ultrasound|magnetic fields|ionizing radiation|recording of the heart|imaging that|radiopaque contrast|cross-sectional/u.test(
      meaning
    )
  ) {
    return "imaging";
  }
  if (
    /\ba drug\b|\bthe drug\b|analgesic|antibiotic|antiviral|antifungal|anticoagulant|glucocorticoid used|pharmacologic name/u.test(
      meaning
    )
  ) {
    return "drug";
  }
  if (
    /therapy|ventilation|supplemental oxygen|machine support|restoration of function|physical methods/u.test(
      meaning
    )
  ) {
    return "treatment";
  }
  if (
    /laboratory growth|thin film of cells|dye used|cardiac marker|liver enzyme|specimen|sampling amniotic|chromosome set/u.test(
      meaning
    ) ||
    ["culture", "smear", "stain", "specimen", "troponin", "transaminase", "karyotype"].includes(
      lemma
    )
  ) {
    return "lab";
  }
  if (
    /instrument for|surgical opening|surgical join|surgical removal|needle sampling|delivery of the fetus through|inspection of a hollow|lighted tube|endoscopy/u.test(
      meaning
    ) ||
    /scope$|ostomy$|ectomy$|centesis$|puncture$|^endoscopy$/u.test(lemma)
  ) {
    return "procedure";
  }
  if (
    /children or descendants|offspring|progeny|pregnant|fetus|embryo|giving birth|labor|gravida|pregnancy|amniotic|chorionic|umbilical|birth canal|miscarriage|abortion|trimester|parturition|quadruplet|triplet|puberty|reproduction|cesarean|fertilization|union of sperm/u.test(
      blob
    )
  ) {
    return "reproduction";
  }
  if (
    /patient feels|urge to vomit|tiredness|paleness|pause in breathing|yellowing|coughing up|whistling sound|loss of consciousness|itchy|frequent passage of loose|unpleasant urge|awareness of an irregular|chest pain from myocardial|sensation that makes|forceful expulsion of gastric|sudden explosive expulsion/u.test(
      meaning
    ) ||
    /nausea|fatigue|pallor|apnea|jaundice|hemoptysis|wheeze|syncope|diarrhea|cyanosis|bruit|petechiae|purpura|urticaria|phlegm|vomitus|stool$|itching|sneezing|vomiting|irritation/u.test(
      lemma
    )
  ) {
    return "symptom";
  }
  if (
    /white cell|blood cell|granulocyte|lymphocyte|platelet|gamete|neuron|glial|precursor of|star-shaped glial|resident immune cells of the cns|T or B white|tissue phagocytes|macrophages/u.test(
      meaning
    ) ||
    /cyte$|blast$|^sperm$|^ovum$|neuron|microglia|astrocyte|neuroglia|hemocyte|leukocyte|macrophages/u.test(
      lemma
    )
  ) {
    return "cell";
  }
  if (/\bthat\b/u.test(meaning)) return "that_clause";
  if (
    /\b(?:hormone|cation|enzyme|protein|antibody|proton|steroid|neurotransmitter|catecholamine|polysaccharide|immunoglobulin)\b/u.test(
      meaning
    ) ||
    /iron-containing|bile pigment|fat-soluble|gas produced|exhaled|strong acid|proton acceptor|proton donor/u.test(
      meaning
    ) ||
    /globulin|alkali|^acid$|sodium|potassium|heme|lipid|insulin|cortisol|epinephrine|bilirubin|acetylcholine|carbon dioxide|hydrochloric acid/u.test(
      lemma
    )
  ) {
    return "chemical";
  }
  if (
    /disease|anemia|syndrome|failure|defect|malignan|tumor|abnormally |excess |infection|wasting|widening of|pneumonia|leukemia|goiter|cirrhosis|stroke|measles|hemophilia|schizophrenia|pneumoconiosis|fibrosis|enlargement of|gallstones|ulcer of|disorder of high blood|preeclampsia|congenital absence|genetic lack|severe psychiatric|airless lung|patchy pneumonia|air in the pleural|death of cells|hole through the wall/u.test(
      blob
    )
  ) {
    return "pathology";
  }
  if (
    /special work done by|organized microscopic arrangement|drawing air into|pushing air out|removal of fluid or tissue by vacuum|how acidic/u.test(
      meaning
    ) ||
    /^(function|architecture|inhalation|exhalation|suction|acidity)$/u.test(lemma)
  ) {
    return "generic";
  }
  if (
    /^(?:the|a|an)\s+.+\b(?:organ|gland|vessel|bone|joint|muscle|cavity|tube|duct|chamber|sinus|colon|intestine|pharynx|trachea|lung|brain|nerve|tooth|palate|membrane|airway|pleura|sphincter|tonsil|fissure|vertebra|meninx|brainstem)\b/u.test(
      meaning
    ) ||
    /voice box|clavicle|bony case|roof of the mouth|canal from|neck of the uterus|air sacs|stacked vertebrae|digestive tube|air space/u.test(
      meaning
    )
  ) {
    return "anatomy";
  }
  if (pos === "phrase" || lemma.includes(" ") || lemma.includes("/") || lemma.includes("\\")) {
    return "phrase";
  }
  return "generic";
}

function wrapsFor(entry) {
  return composeWraps(entry);
}

function materializeOverride(override) {
  return {
    id: override.id,
    sentence: override.sentence,
    paraphrase: override.paraphrase,
    translation: override.translation
  };
}

export function isUsableCopy(sentence, paraphrase, translation, lemma) {
  return (
    countLiteralOccurrences(sentence, lemma) === 1 &&
    countWords(sentence) >= 6 &&
    countWords(sentence) <= 40 &&
    !CLASSROOM_RE.test(sentence) &&
    !CLASSROOM_RE.test(paraphrase) &&
    !CLASSROOM_RE.test(translation)
  );
}

export function sentenceFailsQuality(sentence, entry) {
  const lemma = entry.lemma ?? "";
  const pos = entry.pos ?? entry.part_of_speech ?? "";
  const meaning = String(entry.meaningEn ?? entry.meaning_en ?? "").toLowerCase();
  if (LAZY_SENTENCE_RES.some((pattern) => pattern.test(sentence))) return true;
  if (pos === "adjective" && /episode was \S+ enough/iu.test(sentence)) return true;
  if (/operative report used .+ to map/iu.test(sentence)) return true;
  if (/scan showed swelling around/iu.test(sentence) && !isBodyStructureMeaning(meaning, lemma)) {
    return true;
  }
  if (
    /abnormal \S+ level changed overnight/iu.test(sentence) &&
    !isAnalyteMeaning(meaning, lemma)
  ) {
    return true;
  }
  if (
    /moved the blood pH/iu.test(sentence) &&
    !/pH|acid|alkali|bicarbonate|proton/u.test(`${lemma} ${meaning}`)
  ) {
    return true;
  }
  if (
    /falling \S+ count explained/iu.test(sentence) &&
    !/(cell|cyte|phagocyte|platelet|blast)/u.test(`${lemma} ${meaning}`)
  ) {
    return true;
  }
  if (
    /A high \S+ level explained the new arrhythmia/iu.test(sentence) &&
    !/(potassium|calcium|electrolyte)/u.test(`${lemma} ${meaning}`)
  ) {
    return true;
  }
  if (
    /established (?:digitalis|mendelian fashion|glycogen|hormone) as the working diagnosis/iu.test(
      sentence
    )
  ) {
    return true;
  }
  return false;
}

export function assertEssentialSentenceQuality(card) {
  const surface = `${card.context_sentence}\n${card.plain_english_paraphrase}\n${card.sentence_translation_zh}`;
  if (CLASSROOM_RE.test(surface)) {
    throw new Error(`Classroom frame in ${card.lemma}: ${card.context_sentence}`);
  }
  if (sentenceFailsQuality(card.context_sentence, card)) {
    throw new Error(`Lazy or incoherent sentence for ${card.lemma}: ${card.context_sentence}`);
  }
}

export function buildEssentialContext(entry, index) {
  const { lemma, meaningEn } = entry;
  const override = LEMMA_OVERRIDES[lemma];
  const family = wrapsFor(entry);
  const ordered = [
    ...(override ? [materializeOverride(override)] : []),
    pickWrap(family, index),
    ...family.filter((_, frameIndex) => frameIndex !== index % family.length)
  ];
  const chosen = ordered.find((frame) => {
    return (
      isUsableCopy(frame.sentence, frame.paraphrase, frame.translation, lemma) &&
      !sentenceFailsQuality(frame.sentence, entry)
    );
  });
  if (chosen === undefined) {
    throw new Error(`Could not build a coherent context sentence for ${lemma} (${meaningEn}).`);
  }
  return {
    sentence: chosen.sentence,
    paraphrase: chosen.paraphrase,
    translation: chosen.translation,
    patternId: chosen.id
  };
}

export function lemmaOverride(entry) {
  return LEMMA_OVERRIDES[entry.lemma] ?? null;
}

export function framesFor(entry) {
  return wrapsFor(entry);
}

export function patternKey(sentence, lemma) {
  return sentence.split(lemma).join("LEMMA");
}
