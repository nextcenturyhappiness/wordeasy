export const MEDICAL_PDF_CHART_CARDS = [
  {
    card_key: "med-symptoms-symptom-001",
    lemma: "symptom",
    display_form: "symptom",
    part_of_speech: "noun",
    ipa: "/ˈsɪmptəm/",
    module: "medical_english",
    category: "symptoms",
    context_genre: "medical_record",
    meaning_en: "a change the patient feels or reports, not something the examiner finds",
    meaning_zh: "症状（患者主观感到的）",
    usage_note:
      "患者自己感到或讲述的才写 symptom。医生查到的是 sign。发热若只有主诉、尚未测温，先当症状记。",
    context_sentence: "Fever was the first symptom, followed by a dry cough on day two.",
    target_text: "symptom",
    plain_english_paraphrase:
      "A high temperature was the first thing she felt, and a dry cough came the next day.",
    sentence_translation_zh: "发热是首发症状，第二日出现干咳。",
    collocations: ["first symptom", "presenting symptom", "symptom onset"]
  },
  {
    card_key: "med-signs-sign-001",
    lemma: "sign",
    display_form: "sign",
    part_of_speech: "noun",
    ipa: "/saɪn/",
    module: "medical_english",
    category: "signs",
    context_genre: "medical_record",
    meaning_en: "an objective finding the examiner can see, feel, or measure",
    meaning_zh: "体征（检查者客观发现的）",
    usage_note: "查体或仪器测到的才写 sign。患者只说“胸口痛”是 symptom；听到杂音才是 sign。",
    context_sentence: "A new murmur was the only abnormal sign on examination.",
    target_text: "sign",
    plain_english_paraphrase:
      "A newly heard heart sound was the only unusual finding when doctors examined her.",
    sentence_translation_zh: "新出现的杂音是查体中唯一异常体征。",
    collocations: ["vital signs", "physical sign", "no focal signs"]
  },
  {
    card_key: "med-diagnosis-diagnose-001",
    lemma: "diagnose",
    display_form: "diagnosed",
    part_of_speech: "verb",
    ipa: "/ˈdaɪəɡnoʊz/",
    module: "medical_english",
    category: "diagnosis",
    context_genre: "medical_record",
    meaning_en: "to name the illness after enough history, exam, and tests",
    meaning_zh: "诊断出；作出诊断",
    usage_note:
      "证据够了才能写 diagnosed。还在排查时写 suspected 或 working diagnosis，不要提前写成已确诊。",
    context_sentence: "Community-acquired pneumonia was diagnosed after the chest radiograph.",
    target_text: "diagnosed",
    plain_english_paraphrase:
      "Doctors named the illness as pneumonia caught outside hospital once the chest X-ray was seen.",
    sentence_translation_zh: "胸片完成后诊断为社区获得性肺炎。",
    collocations: ["was diagnosed with", "diagnose early", "difficult to diagnose"]
  },
  {
    card_key: "med-anatomy-artery-001",
    lemma: "artery",
    display_form: "artery",
    part_of_speech: "noun",
    ipa: "/ˈɑːrtəri/",
    module: "medical_english",
    category: "anatomy",
    context_genre: "medical_textbook",
    meaning_en: "a vessel that carries blood away from the heart",
    meaning_zh: "动脉",
    usage_note: "从心脏向外送血的管子才写 artery。回心的是 vein。摸脉搏摸的是动脉，不是静脉。",
    context_sentence: "The pulse is felt where an artery lies close to the skin.",
    target_text: "artery",
    plain_english_paraphrase:
      "You can feel a pulse at places where a vessel leaving the heart runs near the surface.",
    sentence_translation_zh: "动脉靠近皮肤处可以摸到脉搏。",
    collocations: ["radial artery", "blocked artery", "artery wall"]
  },
  {
    card_key: "med-anatomy-vein-001",
    lemma: "vein",
    display_form: "vein",
    part_of_speech: "noun",
    ipa: "/veɪn/",
    module: "medical_english",
    category: "anatomy",
    context_genre: "medical_textbook",
    meaning_en: "a vessel that carries blood back toward the heart",
    meaning_zh: "静脉",
    usage_note: "把血送回心脏的管子才写 vein。抽血、输液常走静脉。不要把摸到的搏动血管写成 vein。",
    context_sentence: "Blood was drawn from a vein in the left arm.",
    target_text: "vein",
    plain_english_paraphrase:
      "A sample was taken from a vessel in the left arm that returns blood to the heart.",
    sentence_translation_zh: "从左臂静脉抽血。",
    collocations: ["peripheral vein", "vein puncture", "dilated vein"]
  },
  {
    card_key: "med-clinical-acute-001",
    lemma: "acute",
    display_form: "acute",
    part_of_speech: "adjective",
    ipa: "/əˈkjuːt/",
    module: "medical_english",
    category: "clinical_expressions",
    context_genre: "medical_record",
    meaning_en: "sudden or short-lived, as opposed to long-standing chronic illness",
    meaning_zh: "急性的",
    usage_note: "起病急或病程短才写 acute。拖了几个月的是 chronic。急性不等于一定危重。",
    context_sentence: "She was admitted for acute abdominal pain lasting six hours.",
    target_text: "acute",
    plain_english_paraphrase:
      "She came into hospital because belly pain had started suddenly and had lasted six hours.",
    sentence_translation_zh: "她因持续六小时的急性腹痛入院。",
    collocations: ["acute pain", "acute infection", "acute onset"]
  },
  {
    card_key: "med-clinical-chronic-001",
    lemma: "chronic",
    display_form: "chronic",
    part_of_speech: "adjective",
    ipa: "/ˈkrɑːnɪk/",
    module: "medical_english",
    category: "clinical_expressions",
    context_genre: "medical_record",
    meaning_en: "long-lasting or repeatedly returning, as opposed to acute",
    meaning_zh: "慢性的",
    usage_note: "病程长或反复迁延才写 chronic。刚发作几小时不要写 chronic。慢性也不等于不严重。",
    context_sentence: "His chronic cough had lasted more than eight weeks.",
    target_text: "chronic",
    plain_english_paraphrase:
      "The cough had been present for more than eight weeks instead of a short attack.",
    sentence_translation_zh: "他的慢性咳嗽已持续八周以上。",
    collocations: ["chronic cough", "chronic disease", "chronic pain"]
  }
];

export const MEDICAL_PDF_MORPHOLOGY_CARDS = [
  {
    card_key: "med-morphology-anatomy-001",
    lemma: "anatomy",
    display_form: "anatomy",
    part_of_speech: "noun",
    ipa: "/əˈnætəmi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "the study of body structure (ana- up/apart + -tomy cutting)",
    meaning_zh: "解剖学",
    usage_note:
      "ana- 是拆开，-tomy 是切：靠切开看结构。词根能提醒“看构造”，但局部解剖课不等于会做手术，不能只靠构词。",
    context_sentence:
      "First-year students learn the anatomy of the heart before they hear murmurs.",
    target_text: "anatomy",
    plain_english_paraphrase:
      "Beginners study how the heart is built before they learn to hear extra heart sounds.",
    sentence_translation_zh: "一年级学生先学心脏解剖，再听杂音。",
    collocations: ["gross anatomy", "anatomy of the heart", "anatomy course"]
  },
  {
    card_key: "med-morphology-embryology-001",
    lemma: "embryology",
    display_form: "embryology",
    part_of_speech: "noun",
    ipa: "/ˌembriˈɑːlədʒi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "the study of the developing embryo (embryo- unborn + -logy study)",
    meaning_zh: "胚胎学",
    usage_note:
      "embryo- 是胚胎，-logy 是学科。词根是“研究未出生阶段”，不能只靠构词把发育异常写成具体畸形病名。",
    context_sentence:
      "A short embryology lecture explains why some heart defects form in the first weeks.",
    target_text: "embryology",
    plain_english_paraphrase:
      "The study of early development helps show why some heart problems start in the first weeks.",
    sentence_translation_zh: "胚胎学解释部分心脏缺陷为何在最初几周形成。",
    collocations: ["human embryology", "embryology lecture", "clinical embryology"]
  },
  {
    card_key: "med-morphology-histology-001",
    lemma: "histology",
    display_form: "histology",
    part_of_speech: "noun",
    ipa: "/hɪˈstɑːlədʒi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "the study of tissues under the microscope (hist- tissue + -logy study)",
    meaning_zh: "组织学",
    usage_note:
      "hist- 是组织，-logy 是学科。词根是看组织切片，不等于病理诊断；炎症还是肿瘤要另看，不能只靠构词。",
    context_sentence:
      "In histology labs, students learn to recognize epithelium and connective tissue.",
    target_text: "histology",
    plain_english_paraphrase:
      "Microscope classes help students tell lining tissue from the supporting tissue around it.",
    sentence_translation_zh: "组织学实验课教学生辨认上皮和结缔组织。",
    collocations: ["histology lab", "normal histology", "histology slide"]
  },
  {
    card_key: "med-morphology-hematology-001",
    lemma: "hematology",
    display_form: "hematology",
    part_of_speech: "noun",
    ipa: "/ˌhiːməˈtɑːlədʒi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "the study of blood and blood-forming tissues (hemat- blood + -logy study)",
    meaning_zh: "血液学",
    usage_note:
      "hemat- 是血，-logy 是学科。词根能猜“和血有关”，但贫血、白血病还是凝血病不能只靠构词定病。",
    context_sentence:
      "The hematology course covers red cells, white cells, platelets, and clotting.",
    target_text: "hematology",
    plain_english_paraphrase:
      "This subject looks at the cells in blood and at how blood forms clots.",
    sentence_translation_zh: "血液学涵盖红细胞、白细胞、血小板和凝血。",
    collocations: ["clinical hematology", "hematology report", "hematology clinic"]
  },
  {
    card_key: "med-morphology-immunology-001",
    lemma: "immunology",
    display_form: "immunology",
    part_of_speech: "noun",
    ipa: "/ˌɪmjəˈnɑːlədʒi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "the study of the immune system (immun- exempt/protected + -logy study)",
    meaning_zh: "免疫学",
    usage_note:
      "immun- 是免除、不受侵害，-logy 是学科。词根是防御系统，过敏、感染还是自身免疫不能只靠构词分开。",
    context_sentence: "Basic immunology explains how antibodies recognize a foreign antigen.",
    target_text: "immunology",
    plain_english_paraphrase:
      "This field explains how defense proteins notice a marker that does not belong to the body.",
    sentence_translation_zh: "免疫学解释抗体如何识别外来抗原。",
    collocations: ["basic immunology", "transplant immunology", "immunology test"]
  },
  {
    card_key: "med-morphology-cytology-001",
    lemma: "cytology",
    display_form: "cytology",
    part_of_speech: "noun",
    ipa: "/saɪˈtɑːlədʒi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "laboratory_report",
    meaning_en: "the study of cells, often from a smear or fluid (cyt- cell + -logy study)",
    meaning_zh: "细胞学",
    usage_note:
      "cyt- 是细胞，-logy 是学科。涂片看细胞不等于组织学切片，更不等于癌症确诊，不能只靠构词。",
    context_sentence: "Sputum cytology was ordered to look for abnormal lung cells.",
    target_text: "cytology",
    plain_english_paraphrase:
      "A lab test of coughed-up mucus was requested to inspect the lung cells themselves.",
    sentence_translation_zh: "送检痰细胞学以寻找异常肺细胞。",
    collocations: ["sputum cytology", "cytology smear", "negative cytology"]
  },
  {
    card_key: "med-morphology-physiology-001",
    lemma: "physiology",
    display_form: "physiology",
    part_of_speech: "noun",
    ipa: "/ˌfɪziˈɑːlədʒi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "the study of how the body functions (physio- nature/function + -logy study)",
    meaning_zh: "生理学",
    usage_note:
      "physio- 是功能、自然运转，-logy 是学科。词根是“身体怎么工作”，不是解剖结构，更不能只靠构词当病名。",
    context_sentence: "A physiology class covers how the kidney filters blood and makes urine.",
    target_text: "physiology",
    plain_english_paraphrase:
      "The function course explains how the kidney cleans blood and produces urine.",
    sentence_translation_zh: "生理课讲解肾脏如何滤过血液并生成尿液。",
    collocations: ["human physiology", "pathologic physiology", "physiology exam"]
  },
  {
    card_key: "med-morphology-endocrinology-001",
    lemma: "endocrinology",
    display_form: "endocrinology",
    part_of_speech: "noun",
    ipa: "/ˌendoʊkrəˈnɑːlədʒi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en:
      "the study of glands that secrete hormones into blood (endo- inside + crin- secrete + -logy study)",
    meaning_zh: "内分泌学",
    usage_note:
      "endo- 是向内，crin- 是分泌，-logy 是学科：激素入血。词根能猜学科范围，甲亢还是糖尿病不能只靠构词。",
    context_sentence: "Most endocrinology clinics manage thyroid, adrenal, and insulin disorders.",
    target_text: "endocrinology",
    plain_english_paraphrase:
      "Hormone clinics commonly treat problems of the thyroid, adrenal glands, and insulin.",
    sentence_translation_zh: "内分泌门诊常处理甲状腺、肾上腺和胰岛素相关疾病。",
    collocations: ["pediatric endocrinology", "endocrinology consult", "endocrinology ward"]
  },
  {
    card_key: "med-morphology-psychology-001",
    lemma: "psychology",
    display_form: "psychology",
    part_of_speech: "noun",
    ipa: "/saɪˈkɑːlədʒi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "the study of mind and behavior (psych- mind + -logy study)",
    meaning_zh: "心理学",
    usage_note:
      "psych- 是心智，-logy 是学科。词根是研究心理过程，不等于精神科诊断，更不能只靠构词给人贴病名。",
    context_sentence: "Medical psychology helps students talk with frightened patients.",
    target_text: "psychology",
    plain_english_paraphrase:
      "Training about the mind helps students speak with patients who are scared.",
    sentence_translation_zh: "医学心理学帮助学生与恐惧的患者交谈。",
    collocations: ["medical psychology", "health psychology", "psychology of pain"]
  },
  {
    card_key: "med-morphology-pathology-001",
    lemma: "pathology",
    display_form: "pathology",
    part_of_speech: "noun",
    ipa: "/pəˈθɑːlədʒi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "the study of disease processes (path- disease + -logy study)",
    meaning_zh: "病理学",
    usage_note:
      "path- 是疾病，-logy 是学科。词根是“研究生病过程”。口头说 pathology 有时只指化验科，不能只靠构词。",
    context_sentence:
      "General pathology describes how inflammation damages tissue after infection.",
    target_text: "pathology",
    plain_english_paraphrase:
      "The disease-process course explains how swelling after infection can harm tissue.",
    sentence_translation_zh: "病理学描述感染后炎症如何损伤组织。",
    collocations: ["general pathology", "surgical pathology", "pathology report"]
  },
  {
    card_key: "med-morphology-biology-001",
    lemma: "biology",
    display_form: "biology",
    part_of_speech: "noun",
    ipa: "/baɪˈɑːlədʒi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "the study of living things (bio- life + -logy study)",
    meaning_zh: "生物学",
    usage_note:
      "bio- 是生命，-logy 是学科。词根很宽，细胞、遗传、生态都算；课堂说 medical biology 仍不能只靠构词当专科。",
    context_sentence: "Cell biology is the starting point for later histology and physiology.",
    target_text: "biology",
    plain_english_paraphrase:
      "The study of living cells comes before later courses on tissues and body function.",
    sentence_translation_zh: "细胞生物学是后续组织学和生理学的起点。",
    collocations: ["cell biology", "human biology", "biology textbook"]
  },
  {
    card_key: "med-morphology-cardiovascular-001",
    lemma: "cardiovascular",
    display_form: "cardiovascular",
    part_of_speech: "adjective",
    ipa: "/ˌkɑːrdioʊˈvæskjələr/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en:
      "relating to the heart and blood vessels (cardi- heart + vascul- vessel + -ar relating to)",
    meaning_zh: "心血管的",
    usage_note:
      "cardi- 是心，vascul- 是血管。词根能圈出系统，心衰、冠心病还是血管炎不能只靠构词当成同一个病。",
    context_sentence:
      "The cardiovascular system includes the heart, arteries, veins, and capillaries.",
    target_text: "cardiovascular",
    plain_english_paraphrase:
      "The heart-and-vessel system covers the pump plus the tubes that carry blood.",
    sentence_translation_zh: "心血管系统包括心脏、动脉、静脉和毛细血管。",
    collocations: ["cardiovascular system", "cardiovascular disease", "cardiovascular exam"]
  },
  {
    card_key: "med-morphology-lymphatic-001",
    lemma: "lymphatic",
    display_form: "lymphatic",
    part_of_speech: "adjective",
    ipa: "/lɪmˈfætɪk/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en:
      "relating to lymph and its vessels or nodes (lymph- clear fluid + -atic relating to)",
    meaning_zh: "淋巴的",
    usage_note:
      "lymph- 是淋巴液，-atic 表示相关。词根能指系统，淋巴结肿大原因很多，不能只靠构词写成淋巴瘤。",
    context_sentence: "The lymphatic system returns fluid to the blood and helps immune defense.",
    target_text: "lymphatic",
    plain_english_paraphrase:
      "The lymph network sends leftover fluid back into blood and supports immune defense.",
    sentence_translation_zh: "淋巴系统把组织液送回血液，并参与免疫防御。",
    collocations: ["lymphatic system", "lymphatic vessel", "lymphatic drainage"]
  },
  {
    card_key: "med-morphology-circulatory-001",
    lemma: "circulatory",
    display_form: "circulatory",
    part_of_speech: "adjective",
    ipa: "/ˈsɜːrkjələtɔːri/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "relating to blood circulation (circul- go around + -atory relating to a process)",
    meaning_zh: "循环的",
    usage_note:
      "circul- 是环行，-atory 表过程。词根是血液绕行全身。课堂常与心血管系统重叠，不能只靠构词区分两个术语。",
    context_sentence: "The circulatory system moves oxygen and nutrients to the tissues.",
    target_text: "circulatory",
    plain_english_paraphrase:
      "The circulating-blood system carries oxygen and food substances out to the tissues.",
    sentence_translation_zh: "循环系统把氧和营养送到组织。",
    collocations: ["circulatory system", "circulatory failure", "circulatory shock"]
  },
  {
    card_key: "med-morphology-respiratory-001",
    lemma: "respiratory",
    display_form: "respiratory",
    part_of_speech: "adjective",
    ipa: "/ˈrespərətɔːri/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "relating to breathing (re- again + spir- breathe + -atory process)",
    meaning_zh: "呼吸的",
    usage_note:
      "re- 是再，spir- 是呼吸。词根是气体交换过程。气促、哮喘还是肺炎不能只靠构词写成同一种病。",
    context_sentence: "The respiratory system brings oxygen in and expels carbon dioxide.",
    target_text: "respiratory",
    plain_english_paraphrase: "The breathing system takes oxygen in and sends carbon dioxide out.",
    sentence_translation_zh: "呼吸系统吸入氧气并排出二氧化碳。",
    collocations: ["respiratory system", "respiratory rate", "respiratory infection"]
  },
  {
    card_key: "med-morphology-urinary-001",
    lemma: "urinary",
    display_form: "urinary",
    part_of_speech: "adjective",
    ipa: "/ˈjʊrəneri/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "relating to urine and its pathway (urin- urine + -ary relating to)",
    meaning_zh: "泌尿的",
    usage_note:
      "urin- 是尿，-ary 表相关。词根圈出肾到尿道的通路。尿频原因很多，不能只靠构词当成尿路感染。",
    context_sentence: "The urinary system includes the kidneys, ureters, bladder, and urethra.",
    target_text: "urinary",
    plain_english_paraphrase:
      "The urine pathway includes the kidneys, the tubes down to the bladder, and the exit tube.",
    sentence_translation_zh: "泌尿系统包括肾、输尿管、膀胱和尿道。",
    collocations: ["urinary system", "urinary tract", "urinary output"]
  },
  {
    card_key: "med-morphology-endocrine-001",
    lemma: "endocrine",
    display_form: "endocrine",
    part_of_speech: "adjective",
    ipa: "/ˈendoʊkrɪn/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "secreting hormones into the blood (endo- inside + crine secrete)",
    meaning_zh: "内分泌的",
    usage_note:
      "endo- 是向内，crine 是分泌：激素入血，不是经导管排到体表。汗腺是外分泌，不能只靠构词混用。",
    context_sentence: "The endocrine system uses hormones to regulate growth and metabolism.",
    target_text: "endocrine",
    plain_english_paraphrase:
      "The inward-secreting gland system uses blood-borne messengers to control growth and energy use.",
    sentence_translation_zh: "内分泌系统用激素调节生长和代谢。",
    collocations: ["endocrine system", "endocrine gland", "endocrine disorder"]
  },
  {
    card_key: "med-morphology-reproductive-001",
    lemma: "reproductive",
    display_form: "reproductive",
    part_of_speech: "adjective",
    ipa: "/ˌriːprəˈdʌktɪv/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en:
      "relating to producing offspring (re- again + product- bring forth + -ive relating to)",
    meaning_zh: "生殖的",
    usage_note:
      "re- 是再，product- 是产生。词根是生殖功能。课堂讲卵巢或睾丸时，不能只靠构词把所有盆腔痛写成生殖系统病。",
    context_sentence: "The reproductive system includes the ovaries, uterus, and testes.",
    target_text: "reproductive",
    plain_english_paraphrase:
      "The system for having children includes the ovaries, uterus, and testes.",
    sentence_translation_zh: "生殖系统包括卵巢、子宫和睾丸。",
    collocations: ["reproductive system", "reproductive age", "reproductive health"]
  },
  {
    card_key: "med-morphology-gastrointestinal-001",
    lemma: "gastrointestinal",
    display_form: "gastrointestinal",
    part_of_speech: "adjective",
    ipa: "/ˌɡæstroʊɪnˈtestɪnl/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en:
      "relating to the stomach and intestines (gastro- stomach + intestin- bowel + -al relating to)",
    meaning_zh: "胃肠的",
    usage_note:
      "gastro- 是胃，intestin- 是肠。词根圈出消化管中段。呕吐、腹泻原因很多，不能只靠构词写成胃炎或肠炎。",
    context_sentence: "The gastrointestinal tract runs from the mouth to the rectum.",
    target_text: "gastrointestinal",
    plain_english_paraphrase:
      "The stomach-and-bowel tube starts at the mouth and ends at the rectum.",
    sentence_translation_zh: "胃肠道从口腔延伸到直肠。",
    collocations: [
      "gastrointestinal tract",
      "gastrointestinal bleeding",
      "gastrointestinal symptoms"
    ]
  },
  {
    card_key: "med-morphology-stomatitis-001",
    lemma: "stomatitis",
    display_form: "stomatitis",
    part_of_speech: "noun",
    ipa: "/ˌstoʊməˈtaɪtɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "inflammation of the mouth (stomat- mouth + -itis inflammation)",
    meaning_zh: "口炎",
    usage_note:
      "stomat- 是口，-itis 是炎症。词根能猜口腔黏膜发炎，病毒、义齿还是营养缺乏不能只靠构词定因。",
    context_sentence: "Painful stomatitis made it hard for the patient to eat solid food.",
    target_text: "stomatitis",
    plain_english_paraphrase: "A sore, inflamed mouth made chewing solid food difficult.",
    sentence_translation_zh: "疼痛性口炎使患者难以进固体食物。",
    collocations: ["oral stomatitis", "aphthous stomatitis", "severe stomatitis"]
  },
  {
    card_key: "med-morphology-colitis-001",
    lemma: "colitis",
    display_form: "colitis",
    part_of_speech: "noun",
    ipa: "/kəˈlaɪtɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "case_report",
    meaning_en: "inflammation of the colon (col- large intestine + -itis inflammation)",
    meaning_zh: "结肠炎",
    usage_note:
      "col- 是结肠，-itis 是炎症。词根能猜大肠炎症，感染、缺血还是炎症性肠病不能只靠构词。",
    context_sentence: "Bloody diarrhea raised concern for infectious colitis.",
    target_text: "colitis",
    plain_english_paraphrase:
      "Loose stools with blood made doctors worry the large bowel was inflamed by infection.",
    sentence_translation_zh: "血性腹泻使人担心感染性结肠炎。",
    collocations: ["ulcerative colitis", "infectious colitis", "ischemic colitis"]
  },
  {
    card_key: "med-morphology-pathogen-001",
    lemma: "pathogen",
    display_form: "pathogen",
    part_of_speech: "noun",
    ipa: "/ˈpæθədʒən/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "an organism that can cause disease (patho- disease + -gen that produces)",
    meaning_zh: "病原体",
    usage_note:
      "patho- 是疾病，-gen 是产生者。词根是“能致病的东西”。定植菌不一定致病，不能只靠构词把培养阳性写成感染。",
    context_sentence: "Hand washing reduces the spread of a common respiratory pathogen.",
    target_text: "pathogen",
    plain_english_paraphrase:
      "Washing hands lowers the chance of passing along a germ that can cause a breathing illness.",
    sentence_translation_zh: "洗手可减少常见呼吸道病原体的传播。",
    collocations: ["bacterial pathogen", "identify the pathogen", "opportunistic pathogen"]
  },
  {
    card_key: "med-morphology-asymptomatic-001",
    lemma: "asymptomatic",
    display_form: "asymptomatic",
    part_of_speech: "adjective",
    ipa: "/ˌeɪsɪmptəˈmætɪk/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "having no symptoms (a- without + symptom + -atic relating to)",
    meaning_zh: "无症状的",
    usage_note:
      "a- 是没有，后面是 symptom。词根是患者没感到不适。无症状不等于没病，筛查阳性仍要另解释，不能只靠构词。",
    context_sentence: "The infection was asymptomatic and found only on routine testing.",
    target_text: "asymptomatic",
    plain_english_paraphrase:
      "The person had no complaints; the infection showed up only on a routine test.",
    sentence_translation_zh: "感染并无症状，只在常规检测中发现。",
    collocations: ["asymptomatic infection", "remain asymptomatic", "asymptomatic carrier"]
  },
  {
    card_key: "med-morphology-symptomatic-001",
    lemma: "symptomatic",
    display_form: "symptomatic",
    part_of_speech: "adjective",
    ipa: "/ˌsɪmptəˈmætɪk/",
    module: "medical_english",
    category: "morphology",
    context_genre: "clinical_guideline",
    meaning_en: "showing symptoms, or aimed at relieving them (symptom + -atic relating to)",
    meaning_zh: "有症状的；对症的",
    usage_note:
      "词根是“和症状有关”。symptomatic treatment 是对症，不是治因。有症状也不等于已确诊，不能只靠构词。",
    context_sentence:
      "Only symptomatic patients were advised to stay home and watch for worsening breath.",
    target_text: "symptomatic",
    plain_english_paraphrase:
      "People who already had complaints were told to remain home and notice if breathing got worse.",
    sentence_translation_zh: "有症状者被建议居家，并观察呼吸是否加重。",
    collocations: ["symptomatic patient", "symptomatic treatment", "become symptomatic"]
  },
  {
    card_key: "med-morphology-apnea-001",
    lemma: "apnea",
    display_form: "apnea",
    part_of_speech: "noun",
    ipa: "/ˈæpniə/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "a pause in breathing (a- without + -pnea breathing)",
    meaning_zh: "呼吸暂停",
    usage_note:
      "a- 是没有，-pnea 是呼吸。词根是暂时不喘气。睡眠呼吸暂停和心跳骤停时的无呼吸不是同一回事，不能只靠构词。",
    context_sentence: "Witnesses reported a short spell of apnea before the infant cried again.",
    target_text: "apnea",
    plain_english_paraphrase:
      "People who were there said the baby stopped breathing briefly and then cried again.",
    sentence_translation_zh: "目击者称婴儿在再次哭出声前有短暂呼吸暂停。",
    collocations: ["sleep apnea", "episode of apnea", "apnea monitor"]
  },
  {
    card_key: "med-morphology-atonia-001",
    lemma: "atonia",
    display_form: "atonia",
    part_of_speech: "noun",
    ipa: "/eɪˈtoʊniə/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "lack of muscle tone (a- without + ton- tone + -ia condition)",
    meaning_zh: "张力缺失；弛缓",
    usage_note:
      "a- 是没有，ton- 是张力。词根是肌肉松软。睡眠期正常肌弛缓和病理软瘫不是一回事，不能只靠构词当诊断。",
    context_sentence: "REM sleep normally brings muscle atonia except in the breathing muscles.",
    target_text: "atonia",
    plain_english_paraphrase:
      "During dream sleep the body muscles usually go slack, except the ones used to breathe.",
    sentence_translation_zh: "快速眼动睡眠期除呼吸肌外通常出现肌张力缺失。",
    collocations: ["muscle atonia", "uterine atonia", "loss of atonia"]
  },
  {
    card_key: "med-morphology-subacute-001",
    lemma: "subacute",
    display_form: "subacute",
    part_of_speech: "adjective",
    ipa: "/ˌsʌbəˈkjuːt/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "between acute and chronic in time course (sub- under/less than + acute sudden)",
    meaning_zh: "亚急性的",
    usage_note:
      "sub- 是低于、介于，acute 是急。词根是比急性慢、比慢性快。天数界限因病而异，不能只靠构词套用。",
    context_sentence: "A subacute cough lasting three weeks was reviewed in clinic.",
    target_text: "subacute",
    plain_english_paraphrase:
      "A cough that had lasted three weeks, neither sudden nor months-long, was checked in clinic.",
    sentence_translation_zh: "持续三周的亚急性咳嗽在门诊复查。",
    collocations: ["subacute cough", "subacute course", "subacute thyroiditis"]
  },
  {
    card_key: "med-morphology-epidemic-001",
    lemma: "epidemic",
    display_form: "epidemic",
    part_of_speech: "noun",
    ipa: "/ˌepɪˈdemɪk/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "a sudden rise of cases in a community (epi- upon + dem- people + -ic relating to)",
    meaning_zh: "流行；流行病",
    usage_note:
      "epi- 是在上，dem- 是人群。词根是疾病压在一群人身上。地方性流行是 endemic，全球大流行是 pandemic，不能只靠构词混用。",
    context_sentence: "An influenza epidemic filled the pediatric ward in January.",
    target_text: "epidemic",
    plain_english_paraphrase:
      "A sharp community wave of flu filled the children's ward in January.",
    sentence_translation_zh: "一月的流感流行挤满了儿科病房。",
    collocations: ["influenza epidemic", "epidemic outbreak", "control the epidemic"]
  },
  {
    card_key: "med-morphology-endemic-001",
    lemma: "endemic",
    display_form: "endemic",
    part_of_speech: "adjective",
    ipa: "/enˈdemɪk/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en:
      "always present in a particular place or people (en- in + dem- people + -ic relating to)",
    meaning_zh: "地方性的；某地持续存在的",
    usage_note:
      "en- 是在内，dem- 是人群。词根是疾病常驻当地。突然暴发应写 epidemic，不能只靠构词把输入病例写成地方病。",
    context_sentence: "Malaria remains endemic in several tropical regions.",
    target_text: "endemic",
    plain_english_paraphrase:
      "Malaria is still always present among people in several hot, wet regions.",
    sentence_translation_zh: "疟疾在若干热带地区仍呈地方性流行。",
    collocations: ["endemic disease", "endemic area", "remain endemic"]
  },
  {
    card_key: "med-morphology-antigen-001",
    lemma: "antigen",
    display_form: "antigen",
    part_of_speech: "noun",
    ipa: "/ˈæntɪdʒən/",
    module: "medical_english",
    category: "morphology",
    context_genre: "laboratory_report",
    meaning_en:
      "a molecule that can trigger an immune response (anti- against + -gen that produces)",
    meaning_zh: "抗原",
    usage_note:
      "anti- 是对抗，-gen 是产生者：能引出抗体的东西。抗原阳性不等于正在生病，疫苗成分也是抗原，不能只靠构词。",
    context_sentence: "The rapid test detects influenza antigen in a nasal swab.",
    target_text: "antigen",
    plain_english_paraphrase: "The quick test looks for a flu marker in a sample from the nose.",
    sentence_translation_zh: "快速检测从鼻拭子中检测流感抗原。",
    collocations: ["surface antigen", "antigen test", "foreign antigen"]
  },
  {
    card_key: "med-morphology-antibody-001",
    lemma: "antibody",
    display_form: "antibody",
    part_of_speech: "noun",
    ipa: "/ˈæntibɑːdi/",
    module: "medical_english",
    category: "morphology",
    context_genre: "laboratory_report",
    meaning_en: "an immune protein that binds a specific antigen (anti- against + body substance)",
    meaning_zh: "抗体",
    usage_note:
      "anti- 是对抗，body 是这种蛋白。词根是“对抗异物的蛋白”。IgM 和 IgG 时间不同，不能只靠构词判断新发还是既往。",
    context_sentence: "A positive antibody test showed past exposure rather than acute infection.",
    target_text: "antibody",
    plain_english_paraphrase:
      "Finding the defense protein meant earlier contact, not necessarily a new infection right now.",
    sentence_translation_zh: "抗体阳性提示既往暴露，而不是急性感染。",
    collocations: ["antibody titer", "neutralizing antibody", "antibody test"]
  },
  {
    card_key: "med-morphology-immunoglobulin-001",
    lemma: "immunoglobulin",
    display_form: "immunoglobulin",
    part_of_speech: "noun",
    ipa: "/ˌɪmjənoʊˈɡlɑːbjəlɪn/",
    module: "medical_english",
    category: "morphology",
    context_genre: "laboratory_report",
    meaning_en: "an antibody protein (immuno- immune + globulin globe-shaped protein)",
    meaning_zh: "免疫球蛋白",
    usage_note:
      "immuno- 是免疫，globulin 是球形蛋白。IgG、IgA、IgM 功能不同，不能只靠构词把一项升高写成免疫缺陷或过敏。",
    context_sentence: "Serum immunoglobulin G was measured after repeated sinus infections.",
    target_text: "immunoglobulin",
    plain_english_paraphrase:
      "The main antibody protein in blood was checked after many sinus infections.",
    sentence_translation_zh: "反复鼻窦感染后检测血清免疫球蛋白 G。",
    collocations: ["immunoglobulin G", "intravenous immunoglobulin", "immunoglobulin level"]
  },
  {
    card_key: "med-morphology-phagocyte-001",
    lemma: "phagocyte",
    display_form: "phagocyte",
    part_of_speech: "noun",
    ipa: "/ˈfæɡəsaɪt/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "a cell that engulfs particles or microbes (phago- eat + -cyte cell)",
    meaning_zh: "吞噬细胞",
    usage_note:
      "phago- 是吃，-cyte 是细胞。词根是会吞颗粒的细胞。中性粒细胞和巨噬细胞都算，不能只靠构词指定哪一种。",
    context_sentence: "A phagocyte can engulf bacteria and then digest them.",
    target_text: "phagocyte",
    plain_english_paraphrase: "An eating cell can take bacteria inside and then break them down.",
    sentence_translation_zh: "吞噬细胞可以吞入细菌并加以消化。",
    collocations: ["professional phagocyte", "phagocyte function", "circulating phagocyte"]
  },
  {
    card_key: "med-morphology-degeneration-001",
    lemma: "degeneration",
    display_form: "degeneration",
    part_of_speech: "noun",
    ipa: "/dɪˌdʒenəˈreɪʃn/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en:
      "progressive loss of normal cell or tissue quality (de- away + gener- kind/origin + -ation process)",
    meaning_zh: "变性；退行性变",
    usage_note:
      "de- 是离开，gener- 是正常类型。词根是组织变差。关节退变和神经变性不是同一病，不能只靠构词当诊断。",
    context_sentence: "Age-related degeneration of cartilage can narrow a joint space.",
    target_text: "degeneration",
    plain_english_paraphrase:
      "Wear-and-tear loss of cartilage quality can make the gap in a joint look narrower.",
    sentence_translation_zh: "年龄相关的软骨变性可使关节间隙变窄。",
    collocations: ["fatty degeneration", "disc degeneration", "degeneration of cartilage"]
  },
  {
    card_key: "med-morphology-malfunction-001",
    lemma: "malfunction",
    display_form: "malfunction",
    part_of_speech: "noun",
    ipa: "/ˌmælˈfʌŋkʃn/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en: "failure to work normally (mal- bad + function working)",
    meaning_zh: "功能障碍；工作失常",
    usage_note:
      "mal- 是不好，function 是工作。词根是“工作出差错”。器官衰竭比 malfunction 更重，不能只靠构词升级病情。",
    context_sentence: "Valve malfunction can let blood leak backward into the atrium.",
    target_text: "malfunction",
    plain_english_paraphrase:
      "If a heart valve does not work properly, blood may leak back into the upper chamber.",
    sentence_translation_zh: "瓣膜功能障碍可使血液反流入心房。",
    collocations: ["organ malfunction", "valve malfunction", "device malfunction"]
  },
  {
    card_key: "med-morphology-malnutrition-001",
    lemma: "malnutrition",
    display_form: "malnutrition",
    part_of_speech: "noun",
    ipa: "/ˌmælnuːˈtrɪʃn/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en:
      "poor nutrition from too little, too much, or unbalanced intake (mal- bad + nutrition nourishment)",
    meaning_zh: "营养不良",
    usage_note:
      "mal- 是不好，nutrition 是营养。词根是营养状态差，包括热量不足或比例失衡。体瘦不等于此诊断，不能只靠构词。",
    context_sentence: "Wound healing slowed because of protein-energy malnutrition.",
    target_text: "malnutrition",
    plain_english_paraphrase:
      "The wound closed more slowly because the body was not getting enough protein and energy.",
    sentence_translation_zh: "蛋白质-能量营养不良使伤口愈合变慢。",
    collocations: ["protein-energy malnutrition", "severe malnutrition", "risk of malnutrition"]
  },
  {
    card_key: "med-morphology-sublingual-001",
    lemma: "sublingual",
    display_form: "sublingual",
    part_of_speech: "adjective",
    ipa: "/ˌsʌbˈlɪŋɡwəl/",
    module: "medical_english",
    category: "morphology",
    context_genre: "clinical_guideline",
    meaning_en: "under the tongue (sub- under + lingu- tongue + -al relating to)",
    meaning_zh: "舌下的",
    usage_note:
      "sub- 是在下，lingu- 是舌。词根是舌下给药或舌下腺。吞下去的口服药不是 sublingual，不能只靠构词。",
    context_sentence: "Nitroglycerin was given by the sublingual route for chest pain.",
    target_text: "sublingual",
    plain_english_paraphrase:
      "The chest-pain tablet was placed under the tongue so it could be absorbed there.",
    sentence_translation_zh: "胸痛时经舌下途径给予硝酸甘油。",
    collocations: ["sublingual tablet", "sublingual gland", "sublingual route"]
  },
  {
    card_key: "med-morphology-epiglottis-001",
    lemma: "epiglottis",
    display_form: "epiglottis",
    part_of_speech: "noun",
    ipa: "/ˌepɪˈɡlɑːtɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en:
      "the flap above the glottis that helps keep food out of the airway (epi- upon + glottis voice opening)",
    meaning_zh: "会厌",
    usage_note:
      "epi- 是在上，glottis 是声门。词根是盖在声门上的结构。会厌炎是另一诊断，不能只靠构词把吞咽不适写成会厌炎。",
    context_sentence: "The epiglottis folds down during swallowing to protect the larynx.",
    target_text: "epiglottis",
    plain_english_paraphrase:
      "The small flap above the voice box bends down while you swallow so food stays out of the airway.",
    sentence_translation_zh: "吞咽时会厌下折，保护喉入口。",
    collocations: ["leaf-shaped epiglottis", "swollen epiglottis", "tip of the epiglottis"]
  },
  {
    card_key: "med-morphology-peristalsis-001",
    lemma: "peristalsis",
    display_form: "peristalsis",
    part_of_speech: "noun",
    ipa: "/ˌperɪˈstælsɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_textbook",
    meaning_en:
      "wave-like squeezing that moves contents along a tube (peri- around + stalsis constriction)",
    meaning_zh: "蠕动",
    usage_note:
      "peri- 是环绕，stalsis 是缩窄。词根是管壁环形推进。肠鸣活跃不等于正常蠕动，梗阻时不能只靠构词判断。",
    context_sentence: "Normal peristalsis pushes chyme from the stomach into the duodenum.",
    target_text: "peristalsis",
    plain_english_paraphrase:
      "Wave-like squeezing moves the partly digested food from the stomach into the first part of the small bowel.",
    sentence_translation_zh: "蠕动把食糜从胃推进十二指肠。",
    collocations: ["intestinal peristalsis", "reduced peristalsis", "peristalsis wave"]
  },
  {
    card_key: "med-morphology-ingestion-001",
    lemma: "ingestion",
    display_form: "ingestion",
    part_of_speech: "noun",
    ipa: "/ɪnˈdʒestʃən/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en:
      "the act of taking food or a substance into the mouth (in- in + gest- carry + -ion act)",
    meaning_zh: "摄入；经口进入",
    usage_note:
      "in- 是进入，gest- 是运送。词根是把东西送进口。吸入是 inhalation，静脉给药不是 ingestion，不能只靠构词。",
    context_sentence: "Accidental ingestion of the cleaning liquid occurred at home.",
    target_text: "ingestion",
    plain_english_paraphrase: "The cleaning liquid was swallowed by mistake at home.",
    sentence_translation_zh: "清洁液在家中被误服摄入。",
    collocations: ["oral ingestion", "accidental ingestion", "ingestion of tablets"]
  },
  {
    card_key: "med-morphology-cardiac-001",
    lemma: "cardiac",
    display_form: "cardiac",
    part_of_speech: "adjective",
    ipa: "/ˈkɑːrdiæk/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en: "relating to the heart (cardi- heart + -ac relating to)",
    meaning_zh: "心脏的",
    usage_note:
      "cardi- 是心，-ac 表相关。词根能指定器官。胸痛不必是 cardiac，胃或肺来源也常见，不能只靠构词。",
    context_sentence: "Serial cardiac enzymes were drawn after the episode of chest pressure.",
    target_text: "cardiac",
    plain_english_paraphrase:
      "Heart-injury blood tests were taken after the spell of tightness in the chest.",
    sentence_translation_zh: "胸闷发作后抽了心肌酶。",
    collocations: ["cardiac arrest", "cardiac output", "cardiac enzyme"]
  },
  {
    card_key: "med-morphology-paralysis-001",
    lemma: "paralysis",
    display_form: "paralysis",
    part_of_speech: "noun",
    ipa: "/pəˈræləsɪs/",
    module: "medical_english",
    category: "morphology",
    context_genre: "medical_record",
    meaning_en:
      "loss of the ability to move a part of the body (para- beside/abnormal + -lysis loosening)",
    meaning_zh: "瘫痪",
    usage_note:
      "para- 是异常，-lysis 是松解。词根提示运动能力松开。无力和完全不能动程度不同，不能只靠构词写成脊髓病。",
    context_sentence: "Sudden paralysis of the right arm required urgent imaging.",
    target_text: "paralysis",
    plain_english_paraphrase:
      "The right arm suddenly could not move, so emergency pictures of the brain and spine were needed.",
    sentence_translation_zh: "右臂突然瘫痪，需紧急影像检查。",
    collocations: ["flaccid paralysis", "facial paralysis", "paralysis of the arm"]
  }
];

export const MEDICAL_PDF_EXPANSION_CARDS = [
  ...MEDICAL_PDF_CHART_CARDS,
  ...MEDICAL_PDF_MORPHOLOGY_CARDS
];

export const MEDICAL_PDF_EXPANSION_CARD_KEYS = MEDICAL_PDF_EXPANSION_CARDS.map(
  (card) => card.card_key
);
