export const MEDICAL_REPLACEMENT_CARDS = [
  {
    card_key: "med-anatomy-abdomen-001",
    lemma: "abdomen",
    display_form: "abdomen",
    part_of_speech: "noun",
    ipa: "/ˈæbdəmən/",
    module: "medical_english",
    category: "anatomy",
    context_genre: "medical_record",
    meaning_en: "the part of the trunk between the chest and the pelvis",
    meaning_zh: "腹部",
    usage_note: "写查体或主诉部位时用。胸是 chest，盆腔是 pelvis，不要把上腹痛写成胸口痛。",
    context_sentence: "The patient reported dull pain in the lower abdomen after meals.",
    target_text: "abdomen",
    plain_english_paraphrase: "After eating, the patient felt a dull ache in the lower belly.",
    sentence_translation_zh: "患者诉餐后下腹部钝痛。",
    collocations: ["lower abdomen", "abdomen was soft", "pain in the abdomen"]
  },
  {
    card_key: "med-anatomy-airway-001",
    lemma: "airway",
    display_form: "airway",
    part_of_speech: "noun",
    ipa: "/ˈerweɪ/",
    module: "medical_english",
    category: "anatomy",
    context_genre: "medical_record",
    meaning_en: "the passage that carries air from the mouth or nose into the lungs",
    meaning_zh: "气道；呼吸道",
    usage_note:
      "强调空气进出肺的通路是否通畅。喘气本身先写 dyspnea，只有通路受阻或要保护通气时才写 airway。",
    context_sentence: "The nurse kept the airway open while the patient was still drowsy.",
    target_text: "airway",
    plain_english_paraphrase:
      "The nurse made sure air could still move in and out while the patient was sleepy.",
    sentence_translation_zh: "患者仍嗜睡时，护士保持气道通畅。",
    collocations: ["keep the airway open", "airway obstruction", "secure the airway"]
  },
  {
    card_key: "med-physiology-hypoxia-001",
    lemma: "hypoxia",
    display_form: "hypoxia",
    part_of_speech: "noun",
    ipa: "/haɪˈpɑːksiə/",
    module: "medical_english",
    category: "physiology",
    context_genre: "medical_record",
    meaning_en: "a shortage of oxygen in the tissues",
    meaning_zh: "缺氧",
    usage_note:
      "组织缺氧才能写。血氧读数低常先写 hypoxemia；没有氧供或灌注证据时，不要随口升级成 hypoxia。",
    context_sentence:
      "Supplemental oxygen was started after signs of hypoxia appeared during walking.",
    target_text: "hypoxia",
    plain_english_paraphrase:
      "Extra oxygen was given when the patient started to look short of oxygen while walking.",
    sentence_translation_zh: "步行时出现缺氧征象后开始给氧。",
    collocations: ["signs of hypoxia", "tissue hypoxia", "correct hypoxia"]
  },
  {
    card_key: "med-physiology-pulse-001",
    lemma: "pulse",
    display_form: "pulse",
    part_of_speech: "noun",
    ipa: "/pʌls/",
    module: "medical_english",
    category: "physiology",
    context_genre: "medical_record",
    meaning_en: "the heartbeat felt in an artery, used as a vital-sign count",
    meaning_zh: "脉搏",
    usage_note:
      "查体摸到的动脉搏动或生命体征里的脉率。心电图上的心率可以不同，不要把摸不到的电活动直接写成 pulse。",
    context_sentence: "Her pulse was regular at 88 beats per minute.",
    target_text: "pulse",
    plain_english_paraphrase:
      "The beating felt at the wrist came at a steady 88 times each minute.",
    sentence_translation_zh: "脉搏规则，每分钟 88 次。",
    collocations: ["radial pulse", "pulse rate", "regular pulse"]
  },
  {
    card_key: "med-pathology-infection-001",
    lemma: "infection",
    display_form: "infection",
    part_of_speech: "noun",
    ipa: "/ɪnˈfekʃən/",
    module: "medical_english",
    category: "pathology",
    context_genre: "case_report",
    meaning_en: "invasion and multiplication of a pathogen that injures the host",
    meaning_zh: "感染",
    usage_note:
      "有病原体侵入并造成损害才写。单纯发热或定植还不到 infection；脓毒症是更重的全身反应。",
    context_sentence: "Wound infection was suspected when redness and pus appeared on day three.",
    target_text: "infection",
    plain_english_paraphrase:
      "Doctors thought germs had entered the wound after it turned red and started to drain pus.",
    sentence_translation_zh: "第三日伤口出现红肿和脓液，怀疑伤口感染。",
    collocations: ["wound infection", "bacterial infection", "treat the infection"]
  },
  {
    card_key: "med-symptoms-fever-001",
    lemma: "fever",
    display_form: "fever",
    part_of_speech: "noun",
    ipa: "/ˈfiːvər/",
    module: "medical_english",
    category: "symptoms",
    context_genre: "medical_record",
    meaning_en: "an abnormally high body temperature as a symptom of illness",
    meaning_zh: "发热；发烧",
    usage_note: "体温高于正常才能写。患者只说怕冷或出汗还不够；具体数字更清楚时写出温度。",
    context_sentence: "She presented with fever and a dry cough for two days.",
    target_text: "fever",
    plain_english_paraphrase: "She came in after two days of a high temperature and a dry cough.",
    sentence_translation_zh: "她因发热伴干咳两天就诊。",
    collocations: ["high fever", "fever and chills", "fever of unknown origin"]
  },
  {
    card_key: "med-diagnosis-rule-out-001",
    lemma: "rule out",
    display_form: "rule out",
    part_of_speech: "phrasal verb",
    ipa: "/ruːl aʊt/",
    module: "medical_english",
    category: "diagnosis",
    context_genre: "medical_record",
    meaning_en: "to exclude a diagnosis after enough testing or clinical reasoning",
    meaning_zh: "排除（某一诊断）",
    usage_note:
      "检查或推理已经足够否定该病才写。还在怀疑时写 consider 或 cannot exclude，不要提前 rule out。",
    context_sentence: "A chest radiograph was obtained to rule out pneumonia.",
    target_text: "rule out",
    plain_english_paraphrase:
      "A chest X-ray was taken so doctors could see whether pneumonia could be excluded.",
    sentence_translation_zh: "完善胸片以排除肺炎。",
    collocations: ["rule out pneumonia", "rule out fracture", "cannot yet rule out"]
  },
  {
    card_key: "med-laboratory-culture-001",
    lemma: "culture",
    display_form: "culture",
    part_of_speech: "noun",
    ipa: "/ˈkʌltʃər/",
    module: "medical_english",
    category: "laboratory",
    context_genre: "laboratory_report",
    meaning_en: "a laboratory test that tries to grow organisms from a specimen",
    meaning_zh: "培养（微生物学检验）",
    usage_note: "标本拿去培养病原体时用。普通血常规不是 culture；培养阴性也不等于没有感染。",
    context_sentence: "Blood culture was drawn before the first dose of antibiotics.",
    target_text: "culture",
    plain_english_paraphrase:
      "A blood sample was taken to grow any germs before antibiotics were started.",
    sentence_translation_zh: "在首剂抗生素之前抽取了血培养。",
    collocations: ["blood culture", "urine culture", "culture grew"]
  },
  {
    card_key: "med-laboratory-elevated-001",
    lemma: "elevated",
    display_form: "elevated",
    part_of_speech: "adjective",
    ipa: "/ˈeləveɪtɪd/",
    module: "medical_english",
    category: "laboratory",
    context_genre: "laboratory_report",
    meaning_en: "higher than the reference range for a laboratory value",
    meaning_zh: "升高的；高于参考范围的",
    usage_note:
      "化验值高于参考范围时用。还在正常高限内不要写；具体数字比单独一个 elevated 更清楚。",
    context_sentence: "The white-cell count was elevated at 14.2 × 10⁹ per liter.",
    target_text: "elevated",
    plain_english_paraphrase: "The white blood cell number was above the usual laboratory range.",
    sentence_translation_zh: "白细胞计数升高，为 14.2 × 10⁹/L。",
    collocations: ["elevated white-cell count", "elevated creatinine", "mildly elevated"]
  },
  {
    card_key: "med-pharmacology-dose-001",
    lemma: "dose",
    display_form: "dose",
    part_of_speech: "noun",
    ipa: "/doʊs/",
    module: "medical_english",
    category: "pharmacology",
    context_genre: "medical_record",
    meaning_en: "the measured amount of a drug given at one time or over a course",
    meaning_zh: "剂量",
    usage_note: "一次或一个疗程给多少药。给药途径是 route，服药次数是 frequency，不要互相替代。",
    context_sentence: "The evening dose of acetaminophen was held because of rising liver enzymes.",
    target_text: "dose",
    plain_english_paraphrase:
      "The night-time amount of acetaminophen was skipped after liver tests went up.",
    sentence_translation_zh: "因肝酶上升，当晚那次对乙酰氨基酚剂量暂停。",
    collocations: ["daily dose", "hold a dose", "low dose"]
  },
  {
    card_key: "med-pharmacology-allergy-001",
    lemma: "allergy",
    display_form: "allergy",
    part_of_speech: "noun",
    ipa: "/ˈælərdʒi/",
    module: "medical_english",
    category: "pharmacology",
    context_genre: "medical_record",
    meaning_en: "an immune reaction to a drug or other substance, often with rash or worse",
    meaning_zh: "过敏",
    usage_note:
      "真正的免疫反应才写 allergy。普通副作用或胃肠不适先写 intolerance，不要把所有“不能吃”都写成过敏。",
    context_sentence: "The admission note listed a penicillin allergy with rash.",
    target_text: "allergy",
    plain_english_paraphrase: "The chart said penicillin had caused a rash in the past.",
    sentence_translation_zh: "入院记录注明青霉素过敏，表现为皮疹。",
    collocations: ["drug allergy", "penicillin allergy", "no known drug allergies"]
  },
  {
    card_key: "med-pharmacology-side-effect-001",
    lemma: "side effect",
    display_form: "side effect",
    part_of_speech: "noun",
    ipa: "/ˈsaɪd ɪˌfekt/",
    module: "medical_english",
    category: "pharmacology",
    context_genre: "clinical_guideline",
    meaning_en: "an unwanted effect of a drug besides the intended treatment effect",
    meaning_zh: "副作用",
    usage_note: "药物带来的额外不良反应。过敏是免疫反应，治疗失败不是 side effect。",
    context_sentence: "Nausea is a common side effect of this oral antibiotic.",
    target_text: "side effect",
    plain_english_paraphrase:
      "Feeling sick to the stomach often happens with this antibiotic even when it is working.",
    sentence_translation_zh: "恶心是这种口服抗生素的常见副作用。",
    collocations: ["common side effect", "side effect of therapy", "report a side effect"]
  },
  {
    card_key: "med-surgery-incision-001",
    lemma: "incision",
    display_form: "incision",
    part_of_speech: "noun",
    ipa: "/ɪnˈsɪʒən/",
    module: "medical_english",
    category: "surgery_procedures",
    context_genre: "operative_note",
    meaning_en: "a surgical cut through skin or other tissue",
    meaning_zh: "切口",
    usage_note: "刀切开的口子。伤口感染或裂开要另写；单纯缝线不是 incision。",
    context_sentence: "The abdominal incision was clean, dry, and without drainage.",
    target_text: "incision",
    plain_english_paraphrase:
      "The surgical cut on the abdomen looked clean and was not leaking fluid.",
    sentence_translation_zh: "腹部切口清洁干燥，无渗液。",
    collocations: ["surgical incision", "midline incision", "incision was clean"]
  },
  {
    card_key: "med-surgery-procedure-001",
    lemma: "procedure",
    display_form: "procedure",
    part_of_speech: "noun",
    ipa: "/prəˈsiːdʒər/",
    module: "medical_english",
    category: "surgery_procedures",
    context_genre: "medical_record",
    meaning_en: "a planned diagnostic or therapeutic intervention, often invasive",
    meaning_zh: "操作；手术或有创检查",
    usage_note:
      "有计划的诊疗操作。吃药或普通查体不要写成 procedure；具体手术名更清楚时优先写手术名。",
    context_sentence: "The procedure was explained, and written consent was obtained.",
    target_text: "procedure",
    plain_english_paraphrase:
      "Staff described the planned intervention and the patient signed a consent form.",
    sentence_translation_zh: "已说明该操作并取得书面知情同意。",
    collocations: ["planned procedure", "bedside procedure", "after the procedure"]
  },
  {
    card_key: "med-surgery-suture-001",
    lemma: "suture",
    display_form: "sutures",
    part_of_speech: "noun",
    ipa: "/ˈsuːtʃər/",
    module: "medical_english",
    category: "surgery_procedures",
    context_genre: "operative_note",
    meaning_en: "stitches used to close a wound or surgical cut",
    meaning_zh: "缝线；缝合",
    usage_note: "用来对合伤口的线。皮肤钉是 staples；拆线写 remove sutures，不要写成切开。",
    context_sentence: "Skin sutures were removed on postoperative day ten.",
    target_text: "sutures",
    plain_english_paraphrase: "The stitches in the skin were taken out ten days after surgery.",
    sentence_translation_zh: "术后第 10 日拆除皮肤缝线。",
    collocations: ["skin sutures", "remove sutures", "absorbable sutures"]
  },
  {
    card_key: "med-treatment-discharge-001",
    lemma: "discharge",
    display_form: "discharged",
    part_of_speech: "verb",
    ipa: "/dɪsˈtʃɑːrdʒ/",
    module: "medical_english",
    category: "treatment",
    context_genre: "medical_record",
    meaning_en: "to formally release a patient from hospital or clinic care",
    meaning_zh: "出院；让患者离开医疗机构",
    usage_note:
      "正式结束本次住院或就诊。伤口渗液那个 discharge 是另一义；转科或请假回家还不是 discharged。",
    context_sentence: "He was discharged home with oral antibiotics and a wound check in two days.",
    target_text: "discharged",
    plain_english_paraphrase:
      "He was allowed to leave the hospital with antibiotic pills and a planned wound visit.",
    sentence_translation_zh: "他带口服抗生素出院回家，并约定两日后伤口复查。",
    collocations: ["discharged home", "discharge planning", "fit for discharge"]
  }
];

export const MEDICAL_MORPHOLOGY_CARDS = [
  {
    card_key: "med-morphology-endocarditis-001",
    lemma: "endocarditis",
    display_form: "endocarditis",
    part_of_speech: "noun",
    ipa: "/ˌendoʊkɑːrˈdaɪtɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "case_report",
    meaning_en:
      "inflammation of the inner lining of the heart (endo- inner + cardi- heart + -itis inflammation)",
    meaning_zh: "心内膜炎",
    usage_note:
      "endo- 是里面，cardi- 是心，-itis 是炎症，合起来是心内膜炎症。词根能猜出部位和炎症，但不能只靠构词当瓣膜感染诊断。",
    context_sentence: "Fever and a new murmur raised concern for bacterial endocarditis.",
    target_text: "endocarditis",
    plain_english_paraphrase:
      "A fever plus a newly heard heart sound made doctors worry the inner heart lining was infected.",
    sentence_translation_zh: "发热和新出现的杂音使医生担心细菌性心内膜炎。",
    collocations: ["infective endocarditis", "bacterial endocarditis", "valve endocarditis"]
  },
  {
    card_key: "med-morphology-dermatitis-001",
    lemma: "dermatitis",
    display_form: "dermatitis",
    part_of_speech: "noun",
    ipa: "/ˌdɜːrməˈtaɪtɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "inflammation of the skin (derm- skin + -itis inflammation)",
    meaning_zh: "皮炎",
    usage_note:
      "derm- 是皮肤，-itis 是炎症。看到红痒皮疹可以先猜皮炎，但接触性、特应性还是感染要另找证据，不能只靠词根定类型。",
    context_sentence: "Contact dermatitis developed under the adhesive dressing.",
    target_text: "dermatitis",
    plain_english_paraphrase: "The skin under the sticky dressing became inflamed.",
    sentence_translation_zh: "敷料粘贴处出现接触性皮炎。",
    collocations: ["contact dermatitis", "atopic dermatitis", "severe dermatitis"]
  },
  {
    card_key: "med-morphology-hepatitis-001",
    lemma: "hepatitis",
    display_form: "hepatitis",
    part_of_speech: "noun",
    ipa: "/ˌhepəˈtaɪtɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "inflammation of the liver (hepat- liver + -itis inflammation)",
    meaning_zh: "肝炎",
    usage_note:
      "hepat- 是肝，-itis 是炎症。转氨酶升高只能提示肝损伤，病毒、酒精还是药物要另查，不能把词根猜成确定病因。",
    context_sentence: "Acute hepatitis can present with jaundice, dark urine, and fatigue.",
    target_text: "hepatitis",
    plain_english_paraphrase:
      "Sudden liver inflammation may show yellow skin, dark urine, and tiredness.",
    sentence_translation_zh: "急性肝炎可表现为黄疸、深色尿和乏力。",
    collocations: ["viral hepatitis", "acute hepatitis", "hepatitis B"]
  },
  {
    card_key: "med-morphology-gastritis-001",
    lemma: "gastritis",
    display_form: "gastritis",
    part_of_speech: "noun",
    ipa: "/ɡæˈstraɪtɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "inflammation of the stomach lining (gastr- stomach + -itis inflammation)",
    meaning_zh: "胃炎",
    usage_note:
      "gastr- 是胃，-itis 是炎症。上腹痛可先猜胃黏膜炎症，但溃疡、反流或心源性疼痛不能只靠构词排除。",
    context_sentence: "Epigastric pain after heavy drinking suggested acute gastritis.",
    target_text: "gastritis",
    plain_english_paraphrase:
      "Pain high in the belly after drinking a lot made stomach-lining inflammation likely.",
    sentence_translation_zh: "大量饮酒后的上腹痛提示急性胃炎。",
    collocations: ["acute gastritis", "chronic gastritis", "erosive gastritis"]
  },
  {
    card_key: "med-morphology-arthritis-001",
    lemma: "arthritis",
    display_form: "arthritis",
    part_of_speech: "noun",
    ipa: "/ɑːrˈθraɪtɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "inflammation of a joint (arthr- joint + -itis inflammation)",
    meaning_zh: "关节炎",
    usage_note:
      "arthr- 是关节，-itis 是炎症。关节肿痛可先按构词理解，但骨关节炎、痛风或感染要靠检查，不能只靠 -itis 当同一病。",
    context_sentence: "Morning stiffness in both knees was consistent with inflammatory arthritis.",
    target_text: "arthritis",
    plain_english_paraphrase:
      "Both knees felt stiff in the morning in a way that fit joint inflammation.",
    sentence_translation_zh: "双膝晨僵符合炎性关节炎。",
    collocations: ["inflammatory arthritis", "septic arthritis", "rheumatoid arthritis"]
  },
  {
    card_key: "med-morphology-leukemia-001",
    lemma: "leukemia",
    display_form: "leukemia",
    part_of_speech: "noun",
    ipa: "/luːˈkiːmiə/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "a cancer of white blood cells (leuko- white + -emia blood condition)",
    meaning_zh: "白血病",
    usage_note:
      "leuko- 是白，-emia 是血里的状态，字面是白细胞相关的血液病。词根能提醒查血，但不能把任何白细胞升高猜成 leukemia。",
    context_sentence: "Unexplained bruising and fatigue prompted testing for leukemia.",
    target_text: "leukemia",
    plain_english_paraphrase:
      "Odd bruising and tiredness led doctors to look for a white-cell cancer.",
    sentence_translation_zh: "不明原因瘀斑和乏力促使排查白血病。",
    collocations: ["acute leukemia", "chronic leukemia", "diagnose leukemia"]
  },
  {
    card_key: "med-morphology-anemia-001",
    lemma: "anemia",
    display_form: "anemia",
    part_of_speech: "noun",
    ipa: "/əˈniːmiə/",
    module: "medical_english",
    category: "morphology",
    context_genre: "laboratory_report",
    meaning_en: "a low red-cell or hemoglobin level in the blood (an- without + -emia blood)",
    meaning_zh: "贫血",
    usage_note:
      "an- 是缺乏，-emia 是血液状态，合起来是血里缺少红细胞或血红蛋白。脸色差只能提示，确诊要看化验，不能只靠词根。",
    context_sentence: "Repeat laboratory tests confirmed iron-deficiency anemia.",
    target_text: "anemia",
    plain_english_paraphrase:
      "Blood tests showed too little hemoglobin because the body lacked iron.",
    sentence_translation_zh: "化验证实为缺铁性贫血。",
    collocations: ["iron-deficiency anemia", "severe anemia", "anemia of chronic disease"]
  },
  {
    card_key: "med-morphology-hyperglycemia-001",
    lemma: "hyperglycemia",
    display_form: "hyperglycemia",
    part_of_speech: "noun",
    ipa: "/ˌhaɪpərɡlaɪˈsiːmiə/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "an abnormally high blood glucose (hyper- high + glyc- sugar + -emia blood)",
    meaning_zh: "高血糖",
    usage_note:
      "hyper- 是过高，glyc- 是糖，-emia 在血里。词根能读出“血里糖高”，但一次餐后升高不能只靠构词当成糖尿病诊断。",
    context_sentence: "Morning hyperglycemia persisted despite the overnight insulin adjustment.",
    target_text: "hyperglycemia",
    plain_english_paraphrase:
      "Blood sugar was still too high in the morning after the night insulin change.",
    sentence_translation_zh: "尽管夜间胰岛素已调整，晨起高血糖仍持续。",
    collocations: ["fasting hyperglycemia", "severe hyperglycemia", "correct hyperglycemia"]
  },
  {
    card_key: "med-morphology-hypoglycemia-001",
    lemma: "hypoglycemia",
    display_form: "hypoglycemia",
    part_of_speech: "noun",
    ipa: "/ˌhaɪpoʊɡlaɪˈsiːmiə/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "an abnormally low blood glucose (hypo- low + glyc- sugar + -emia blood)",
    meaning_zh: "低血糖",
    usage_note:
      "hypo- 是过低，glyc- 是糖，-emia 在血里。出汗心慌可先猜血糖低，但必须测血糖，不能只靠构词当发作。",
    context_sentence: "Sweating and confusion resolved after the nurse treated hypoglycemia.",
    target_text: "hypoglycemia",
    plain_english_paraphrase:
      "The patient stopped sweating and thinking unclearly after low blood sugar was treated.",
    sentence_translation_zh: "护士处理低血糖后，出汗和意识混乱缓解。",
    collocations: ["symptomatic hypoglycemia", "treat hypoglycemia", "recurrent hypoglycemia"]
  },
  {
    card_key: "med-morphology-hypertension-001",
    lemma: "hypertension",
    display_form: "hypertension",
    part_of_speech: "noun",
    ipa: "/ˌhaɪpərˈtenʃən/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "persistently high blood pressure (hyper- high + tens- pressure + -ion state)",
    meaning_zh: "高血压",
    usage_note:
      "hyper- 是过高，tens- 是压力。一次诊室血压高还不够，要看是否持续升高，不能把词根猜成已经确诊。",
    context_sentence: "Long-standing hypertension was managed with a daily oral agent.",
    target_text: "hypertension",
    plain_english_paraphrase:
      "High blood pressure that had lasted for years was treated with a daily pill.",
    sentence_translation_zh: "长期高血压以每日口服药控制。",
    collocations: ["essential hypertension", "uncontrolled hypertension", "history of hypertension"]
  },
  {
    card_key: "med-morphology-hypotension-001",
    lemma: "hypotension",
    display_form: "hypotension",
    part_of_speech: "noun",
    ipa: "/ˌhaɪpoʊˈtenʃən/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "abnormally low blood pressure (hypo- low + tens- pressure + -ion state)",
    meaning_zh: "低血压",
    usage_note:
      "hypo- 是过低，tens- 是压力。头晕不等于低血压；要有血压数字，也不能只靠构词判断休克。",
    context_sentence: "Standing too quickly caused dizziness from postural hypotension.",
    target_text: "hypotension",
    plain_english_paraphrase:
      "Getting up fast made the patient dizzy because blood pressure dropped on standing.",
    sentence_translation_zh: "突然站起引起体位性低血压相关头晕。",
    collocations: ["postural hypotension", "persistent hypotension", "correct hypotension"]
  },
  {
    card_key: "med-morphology-tachycardia-001",
    lemma: "tachycardia",
    display_form: "tachycardia",
    part_of_speech: "noun",
    ipa: "/ˌtækiˈkɑːrdiə/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "an abnormally fast heart rate (tachy- fast + cardi- heart + -ia condition)",
    meaning_zh: "心动过速",
    usage_note:
      "tachy- 是快，cardi- 是心。词根能读出心率快，但窦性、房颤还是室速要看心电图，不能只靠构词。",
    context_sentence: "Sinus tachycardia accompanied the fever and volume loss.",
    target_text: "tachycardia",
    plain_english_paraphrase:
      "The heart beat too fast in a normal rhythm while the patient had fever and lost fluid.",
    sentence_translation_zh: "发热和容量丢失时出现窦性心动过速。",
    collocations: ["sinus tachycardia", "ventricular tachycardia", "resting tachycardia"]
  },
  {
    card_key: "med-morphology-bradycardia-001",
    lemma: "bradycardia",
    display_form: "bradycardia",
    part_of_speech: "noun",
    ipa: "/ˌbreɪdiˈkɑːrdiə/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "an abnormally slow heart rate (brady- slow + cardi- heart + -ia condition)",
    meaning_zh: "心动过缓",
    usage_note:
      "brady- 是慢，cardi- 是心。词根能读出心率慢，但运动员静息心率慢不一定是病，不能只靠构词当传导阻滞。",
    context_sentence: "Overnight telemetry showed intermittent bradycardia to 42 beats per minute.",
    target_text: "bradycardia",
    plain_english_paraphrase:
      "Night heart monitoring found periods when the pulse slowed to 42 beats a minute.",
    sentence_translation_zh: "夜间遥测显示间歇性心动过缓，低至每分钟 42 次。",
    collocations: ["sinus bradycardia", "symptomatic bradycardia", "nocturnal bradycardia"]
  },
  {
    card_key: "med-morphology-neuropathy-001",
    lemma: "neuropathy",
    display_form: "neuropathy",
    part_of_speech: "noun",
    ipa: "/nʊˈrɑːpəθi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "disease or dysfunction of peripheral nerves (neuro- nerve + -pathy disease)",
    meaning_zh: "神经病；周围神经病变",
    usage_note:
      "neuro- 是神经，-pathy 是病变。手脚麻木可先猜神经出问题，但是脑卒中还是神经根病要另辨，不能只靠词根。",
    context_sentence: "Burning pain in both feet suggested diabetic neuropathy.",
    target_text: "neuropathy",
    plain_english_paraphrase: "A burning feeling in both feet fit nerve damage from diabetes.",
    sentence_translation_zh: "双足烧灼痛提示糖尿病周围神经病变。",
    collocations: ["diabetic neuropathy", "peripheral neuropathy", "sensory neuropathy"]
  },
  {
    card_key: "med-morphology-myopathy-001",
    lemma: "myopathy",
    display_form: "myopathy",
    part_of_speech: "noun",
    ipa: "/maɪˈɑːpəθi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "case_report",
    meaning_en: "disease of muscle tissue (myo- muscle + -pathy disease)",
    meaning_zh: "肌病",
    usage_note:
      "myo- 是肌肉，-pathy 是病变。词根能提示肌肉本身有病，但无力也可能来自神经，不能只靠构词。",
    context_sentence:
      "Proximal weakness and a high creatine kinase raised concern for drug-induced myopathy.",
    target_text: "myopathy",
    plain_english_paraphrase:
      "Weakness close to the trunk plus a high muscle enzyme made a drug-related muscle disease likely.",
    sentence_translation_zh: "近端无力和肌酸激酶升高使医生担心药物性肌病。",
    collocations: ["drug-induced myopathy", "inflammatory myopathy", "proximal myopathy"]
  },
  {
    card_key: "med-morphology-osteoporosis-001",
    lemma: "osteoporosis",
    display_form: "osteoporosis",
    part_of_speech: "noun",
    ipa: "/ˌɑːstioʊpəˈroʊsɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "imaging_report",
    meaning_en:
      "porous, low-density bone that fractures easily (osteo- bone + -porosis porous condition)",
    meaning_zh: "骨质疏松",
    usage_note:
      "osteo- 是骨，-porosis 是变得疏松。词根能读出骨头变空，但确诊看骨密度，一次背痛不能只靠构词下诊断。",
    context_sentence: "A vertebral compression fracture was attributed to osteoporosis.",
    target_text: "osteoporosis",
    plain_english_paraphrase:
      "A crushed spine bone was blamed on bones that had become thin and fragile.",
    sentence_translation_zh: "椎体压缩骨折被归因于骨质疏松。",
    collocations: [
      "postmenopausal osteoporosis",
      "severe osteoporosis",
      "osteoporosis-related fracture"
    ]
  },
  {
    card_key: "med-morphology-hematoma-001",
    lemma: "hematoma",
    display_form: "hematoma",
    part_of_speech: "noun",
    ipa: "/ˌhiːməˈtoʊmə/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "a localized collection of blood outside vessels (hemat- blood + -oma mass)",
    meaning_zh: "血肿",
    usage_note:
      "hemat- 是血，-oma 是一团。词根是“血凝成块”，不是肿瘤。皮肤青紫可以只是瘀斑，不能只靠构词写成血肿。",
    context_sentence: "A tender hematoma formed at the injection site.",
    target_text: "hematoma",
    plain_english_paraphrase: "A sore lump of trapped blood appeared where the shot was given.",
    sentence_translation_zh: "注射部位形成压痛性血肿。",
    collocations: ["subcutaneous hematoma", "expanding hematoma", "evacuate a hematoma"]
  },
  {
    card_key: "med-morphology-hemorrhage-001",
    lemma: "hemorrhage",
    display_form: "hemorrhage",
    part_of_speech: "noun",
    ipa: "/ˈhemərɪdʒ/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en:
      "active bleeding, especially a clinically important loss of blood (hemat-/hem- blood + -rrhage bursting forth)",
    meaning_zh: "出血",
    usage_note:
      "hem- 是血，-rrhage 是涌出。词根强调血涌出来。少量渗血先写 bleeding，不能只靠构词升级成大出血。",
    context_sentence:
      "Gastrointestinal hemorrhage presented as black stools and a falling hemoglobin.",
    target_text: "hemorrhage",
    plain_english_paraphrase:
      "Bleeding in the gut showed up as black stool and a dropping blood count.",
    sentence_translation_zh: "消化道出血表现为黑便和血红蛋白下降。",
    collocations: ["gastrointestinal hemorrhage", "intracranial hemorrhage", "stop the hemorrhage"]
  },
  {
    card_key: "med-morphology-intravenous-001",
    lemma: "intravenous",
    display_form: "intravenous",
    part_of_speech: "adjective",
    ipa: "/ˌɪntrəˈviːnəs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "given or located inside a vein (intra- within + ven- vein + -ous relating to)",
    meaning_zh: "静脉内的",
    usage_note:
      "intra- 是里面，ven- 是静脉。词根能读出给药途径，但写错成皮下或肌肉时，不能只靠构词补救，必须看实际路径。",
    context_sentence: "The team started intravenous fluids for dehydration.",
    target_text: "intravenous",
    plain_english_paraphrase: "Fluid was given through a vein because the patient was dried out.",
    sentence_translation_zh: "因脱水开始静脉补液。",
    collocations: ["intravenous fluids", "intravenous antibiotics", "intravenous access"]
  },
  {
    card_key: "med-morphology-subcutaneous-001",
    lemma: "subcutaneous",
    display_form: "subcutaneous",
    part_of_speech: "adjective",
    ipa: "/ˌsʌbkjuˈteɪniəs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "beneath the skin (sub- under + cutane- skin + -ous relating to)",
    meaning_zh: "皮下的",
    usage_note:
      "sub- 是下面，cutane- 是皮肤。词根只说明层次在皮下。胰岛素常见此路径，但不能只靠构词和皮内或肌肉注射混用。",
    context_sentence: "Insulin was given by subcutaneous injection before breakfast.",
    target_text: "subcutaneous",
    plain_english_paraphrase:
      "The insulin shot went into the fat just under the skin before breakfast.",
    sentence_translation_zh: "早餐前予皮下注射胰岛素。",
    collocations: ["subcutaneous injection", "subcutaneous tissue", "subcutaneous insulin"]
  },
  {
    card_key: "med-morphology-neoplasm-001",
    lemma: "neoplasm",
    display_form: "neoplasm",
    part_of_speech: "noun",
    ipa: "/ˈniːəplæzəm/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "a new abnormal growth of tissue; a tumor (neo- new + -plasm formed substance)",
    meaning_zh: "肿瘤；赘生物",
    usage_note:
      "neo- 是新的，-plasm 是形成的组织。词根是“新长出来的东西”，良性恶性都可能，不能只靠构词写成癌。",
    context_sentence: "Imaging showed a solitary lung neoplasm awaiting biopsy.",
    target_text: "neoplasm",
    plain_english_paraphrase:
      "The scan found one new growth in the lung that still needed a tissue sample.",
    sentence_translation_zh: "影像显示孤立性肺部肿瘤，等待活检。",
    collocations: ["benign neoplasm", "malignant neoplasm", "solitary neoplasm"]
  },
  {
    card_key: "med-morphology-carcinoma-001",
    lemma: "carcinoma",
    display_form: "carcinoma",
    part_of_speech: "noun",
    ipa: "/ˌkɑːrsɪˈnoʊmə/",
    module: "medical_english",
    category: "morphology",
    context_genre: "case_report",
    meaning_en: "a malignant tumor of epithelial cells (carcino- cancer + -oma mass)",
    meaning_zh: "癌；上皮来源的恶性肿瘤",
    usage_note:
      "carcino- 指向癌，-oma 是肿块。词根比 neoplasm 更像恶性肿瘤，但肉瘤或淋巴瘤不是 carcinoma，不能只靠 -oma 猜癌。",
    context_sentence: "Biopsy confirmed squamous cell carcinoma of the lung.",
    target_text: "carcinoma",
    plain_english_paraphrase:
      "The tissue sample showed a cancer that started from the lung lining cells.",
    sentence_translation_zh: "活检证实为肺鳞状细胞癌。",
    collocations: ["squamous cell carcinoma", "basal cell carcinoma", "in situ carcinoma"]
  },
  {
    card_key: "med-morphology-metastasis-001",
    lemma: "metastasis",
    display_form: "metastasis",
    part_of_speech: "noun",
    ipa: "/məˈtæstəsɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "imaging_report",
    meaning_en: "spread of cancer to a distant site (meta- beyond + -stasis standing/placement)",
    meaning_zh: "转移",
    usage_note:
      "meta- 是超越原位，-stasis 是停留在别处。词根能读出“跑到远处”。局部侵犯还不是转移，不能只靠构词。",
    context_sentence: "A liver lesion was consistent with a metastasis from the colon primary.",
    target_text: "metastasis",
    plain_english_paraphrase: "A spot in the liver looked like colon cancer that had moved there.",
    sentence_translation_zh: "肝内病灶符合结肠原发灶的转移。",
    collocations: ["distant metastasis", "liver metastasis", "site of metastasis"]
  },
  {
    card_key: "med-morphology-biopsy-001",
    lemma: "biopsy",
    display_form: "biopsy",
    part_of_speech: "noun",
    ipa: "/ˈbaɪɑːpsi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "operative_note",
    meaning_en: "removal of tissue for diagnosis (bio- life/tissue + -opsy examination)",
    meaning_zh: "活检；活组织检查",
    usage_note:
      "bio- 是活组织，-opsy 是查看。词根是取一块组织来看。切除整个病灶是 excision，不能只靠构词和细胞学混用。",
    context_sentence: "A skin biopsy was sent to confirm the rash diagnosis.",
    target_text: "biopsy",
    plain_english_paraphrase:
      "A small piece of skin was taken so the lab could confirm what the rash was.",
    sentence_translation_zh: "取皮肤活检以明确皮疹诊断。",
    collocations: ["skin biopsy", "needle biopsy", "biopsy confirmed"]
  },
  {
    card_key: "med-morphology-prognosis-001",
    lemma: "prognosis",
    display_form: "prognosis",
    part_of_speech: "noun",
    ipa: "/prɑːɡˈnoʊsɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "the likely course and outcome of a disease (pro- before + -gnosis knowledge)",
    meaning_zh: "预后",
    usage_note:
      "pro- 是事先，-gnosis 是认知，词根是提前判断病情走向。诊断是现在是什么病，不能只靠构词把预后写成诊断。",
    context_sentence: "Early treatment improved the prognosis of community-acquired pneumonia.",
    target_text: "prognosis",
    plain_english_paraphrase:
      "Starting treatment early made a better recovery from pneumonia more likely.",
    sentence_translation_zh: "早期治疗改善了社区获得性肺炎的预后。",
    collocations: ["poor prognosis", "improve the prognosis", "long-term prognosis"]
  },
  {
    card_key: "med-morphology-diagnosis-001",
    lemma: "diagnosis",
    display_form: "diagnosis",
    part_of_speech: "noun",
    ipa: "/ˌdaɪəɡˈnoʊsɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "the identification of a disease (dia- through/apart + -gnosis knowledge)",
    meaning_zh: "诊断",
    usage_note:
      "dia- 是穿过、分辨，-gnosis 是认知：把表现分辨成病名。词根能提醒“认出是什么”，但工作诊断和确诊强度不同，不能只靠构词。",
    context_sentence: "The working diagnosis was acute pyelonephritis pending urine culture.",
    target_text: "diagnosis",
    plain_english_paraphrase:
      "Doctors currently named the illness as a kidney infection while waiting for the urine test.",
    sentence_translation_zh: "在尿培养回报前，工作诊断为急性肾盂肾炎。",
    collocations: ["working diagnosis", "final diagnosis", "confirm the diagnosis"]
  },
  {
    card_key: "med-morphology-antibiotic-001",
    lemma: "antibiotic",
    display_form: "antibiotic",
    part_of_speech: "noun",
    ipa: "/ˌæntibaɪˈɑːtɪk/",
    module: "medical_english",
    category: "morphology",
    context_genre: "clinical_guideline",
    meaning_en:
      "a drug used against living microbes (anti- against + bio- life + -tic relating to)",
    meaning_zh: "抗生素",
    usage_note:
      "anti- 是对抗，bio- 是生命（此处指微生物）。词根是“对抗活的病原”。抗病毒药不是 antibiotic，不能只靠构词。",
    context_sentence: "Empiric antibiotic therapy was started after blood cultures were drawn.",
    target_text: "antibiotic",
    plain_english_paraphrase:
      "An antimicrobial drug was begun once blood had been taken to grow any germs.",
    sentence_translation_zh: "抽取血培养后开始经验性抗生素治疗。",
    collocations: ["oral antibiotic", "broad-spectrum antibiotic", "antibiotic therapy"]
  },
  {
    card_key: "med-morphology-antipyretic-001",
    lemma: "antipyretic",
    display_form: "antipyretic",
    part_of_speech: "noun",
    ipa: "/ˌæntipaɪˈretɪk/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en:
      "a medicine that lowers fever (anti- against + pyr- fire/fever + -etic relating to)",
    meaning_zh: "退热药",
    usage_note:
      "anti- 是对抗，pyr- 是热。词根是退热，不是杀菌。发热原因仍要查，不能只靠构词把退热药当成抗生素。",
    context_sentence: "An antipyretic was given when the temperature reached 39.2 °C.",
    target_text: "antipyretic",
    plain_english_paraphrase:
      "A fever-lowering medicine was given after the temperature rose to 39.2 °C.",
    sentence_translation_zh: "体温达到 39.2 °C 时给予退热药。",
    collocations: ["give an antipyretic", "oral antipyretic", "antipyretic effect"]
  }
];

export const MEDICAL_RESHAPE_CARD_KEYS = [
  ...MEDICAL_REPLACEMENT_CARDS.map((card) => card.card_key),
  ...MEDICAL_MORPHOLOGY_CARDS.map((card) => card.card_key)
];
