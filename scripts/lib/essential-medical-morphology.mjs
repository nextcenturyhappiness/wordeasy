function piece(form, kind, en, zh) {
  return { form, kind, en, zh };
}

function table(rows, kind) {
  return rows.map(([form, en, zh]) => piece(form, kind, en, zh));
}

const PREFIXES = table(
  [
    ["brady", "slow", "慢"],
    ["tachy", "fast", "快"],
    ["hyper", "excess / high", "过多、增高"],
    ["hypo", "deficient / low", "不足、减低"],
    ["intra", "within", "内"],
    ["inter", "between", "之间"],
    ["peri", "around", "周围"],
    ["endo", "inner / within", "内"],
    ["ecto", "outer", "外"],
    ["exo", "outside", "外"],
    ["epi", "upon", "上、表面"],
    ["extra", "outside", "外"],
    ["supra", "above", "上"],
    ["infra", "below", "下"],
    ["sub", "under", "下"],
    ["trans", "across", "穿过"],
    ["retro", "backward", "向后"],
    ["ante", "before", "前"],
    ["anti", "against", "抗"],
    ["auto", "self", "自身"],
    ["contra", "against", "对抗"],
    ["dys", "difficult / abnormal", "困难、异常"],
    ["eu", "good / normal", "正常、良好"],
    ["neo", "new", "新"],
    ["pan", "all", "全"],
    ["poly", "many", "多"],
    ["oligo", "few", "少"],
    ["macro", "large", "大"],
    ["micro", "small", "小"],
    ["mega", "large", "大"],
    ["hemi", "half", "半"],
    ["semi", "half", "半"],
    ["multi", "many", "多"],
    ["mono", "one", "单"],
    ["uni", "one", "单"],
    ["bi", "two", "双"],
    ["tri", "three", "三"],
    ["quadri", "four", "四"],
    ["tetra", "four", "四"],
    ["pre", "before", "前"],
    ["pro", "before / forward", "前、向前"],
    ["post", "after", "后"],
    ["syn", "together", "共同"],
    ["sym", "together", "共同"],
    ["meta", "change / after", "变、后"],
    ["para", "beside", "旁"],
    ["dia", "through / apart", "穿过、分辨"],
    ["mal", "bad", "不良"],
    ["hetero", "different", "异"],
    ["homo", "same", "同"],
    ["homeo", "same", "同一"],
    ["iso", "equal", "同等"],
    ["primi", "first", "初"],
    ["an", "without", "无、缺"],
    ["a", "without", "无、缺"]
  ],
  "prefix"
);

const ROOTS = table(
  [
    ["bronchio", "bronchus", "支气管"],
    ["bronchiol", "bronchiole", "细支气管"],
    ["bronchi", "bronchus", "支气管"],
    ["bronch", "bronchus", "支气管"],
    ["cholecyst", "gallbladder", "胆囊"],
    ["choledoch", "bile duct", "胆管"],
    ["gastroenter", "stomach and intestine", "胃肠"],
    ["nasopharyng", "nasopharynx", "鼻咽"],
    ["oropharyng", "oropharynx", "口咽"],
    ["laryngopharyng", "laryngopharynx", "喉咽"],
    ["hypopharyng", "hypopharynx", "下咽"],
    ["adenohypophys", "anterior pituitary", "腺垂体"],
    ["neurohypophys", "posterior pituitary", "神经垂体"],
    ["hypothalam", "hypothalamus", "下丘脑"],
    ["parathyroid", "parathyroid", "甲状旁腺"],
    ["thyroid", "thyroid", "甲状腺"],
    ["cardi", "heart", "心"],
    ["card", "heart", "心"],
    ["coron", "crown / coronary", "冠状"],
    ["atri", "atrium", "心房"],
    ["ventricul", "ventricle", "心室"],
    ["valvul", "valve", "瓣膜"],
    ["vascul", "vessel", "血管"],
    ["angi", "vessel", "血管"],
    ["arteri", "artery", "动脉"],
    ["aort", "aorta", "主动脉"],
    ["phleb", "vein", "静脉"],
    ["hemat", "blood", "血"],
    ["haem", "blood", "血"],
    ["hemo", "blood", "血"],
    ["hem", "blood", "血"],
    ["leuk", "white", "白"],
    ["erythr", "red", "红"],
    ["thrombocyt", "platelet", "血小板"],
    ["thromb", "clot", "血栓"],
    ["lymphaden", "lymph node", "淋巴结"],
    ["lymph", "lymph", "淋巴"],
    ["immun", "immune", "免疫"],
    ["splen", "spleen", "脾"],
    ["thym", "thymus", "胸腺"],
    ["myel", "marrow / spinal cord", "骨髓、脊髓"],
    ["oste", "bone", "骨"],
    ["arthr", "joint", "关节"],
    ["chondr", "cartilage", "软骨"],
    ["myo", "muscle", "肌"],
    ["crani", "skull", "颅"],
    ["cephal", "head", "头"],
    ["encephal", "brain", "脑"],
    ["cerebr", "cerebrum", "大脑"],
    ["cerebell", "cerebellum", "小脑"],
    ["mening", "meninges", "脑膜"],
    ["neur", "nerve", "神经"],
    ["psych", "mind", "精神"],
    ["phren", "mind / diaphragm", "精神、膈"],
    ["ophthalm", "eye", "眼"],
    ["ocul", "eye", "眼"],
    ["blephar", "eyelid", "睑"],
    ["ot", "ear", "耳"],
    ["rhin", "nose", "鼻"],
    ["nas", "nose", "鼻"],
    ["sinus", "sinus", "窦"],
    ["laryng", "larynx", "喉"],
    ["pharyng", "pharynx", "咽"],
    ["trache", "trachea", "气管"],
    ["pneumon", "lung", "肺"],
    ["pneumo", "air / lung", "气、肺"],
    ["pneum", "air / lung", "气、肺"],
    ["pulmon", "lung", "肺"],
    ["pleur", "pleura", "胸膜"],
    ["thorac", "chest", "胸"],
    ["alveol", "alveolus", "肺泡"],
    ["stomat", "mouth", "口"],
    ["gingiv", "gum", "牙龈"],
    ["gloss", "tongue", "舌"],
    ["lingu", "tongue", "舌"],
    ["odont", "tooth", "牙"],
    ["dent", "tooth", "牙"],
    ["esophag", "esophagus", "食管"],
    ["gastr", "stomach", "胃"],
    ["enter", "intestine", "肠"],
    ["duoden", "duodenum", "十二指肠"],
    ["jejun", "jejunum", "空肠"],
    ["ile", "ileum", "回肠"],
    ["cec", "cecum", "盲肠"],
    ["appendic", "appendix", "阑尾"],
    ["append", "appendix", "阑尾"],
    ["col", "colon", "结肠"],
    ["sigmoid", "sigmoid", "乙状结肠"],
    ["rect", "rectum", "直肠"],
    ["proct", "rectum / anus", "直肠、肛"],
    ["hepat", "liver", "肝"],
    ["pancreat", "pancreas", "胰腺"],
    ["chol", "bile", "胆汁"],
    ["cyst", "bladder / sac", "囊、膀胱"],
    ["vesic", "bladder", "膀胱"],
    ["nephr", "kidney", "肾"],
    ["ren", "kidney", "肾"],
    ["pyel", "renal pelvis", "肾盂"],
    ["glomerul", "glomerulus", "肾小球"],
    ["ureter", "ureter", "输尿管"],
    ["urethr", "urethra", "尿道"],
    ["ur", "urine", "尿"],
    ["prostat", "prostate", "前列腺"],
    ["orchid", "testis", "睾丸"],
    ["oophor", "ovary", "卵巢"],
    ["ovari", "ovary", "卵巢"],
    ["hyster", "uterus", "子宫"],
    ["metr", "uterus", "子宫"],
    ["uter", "uterus", "子宫"],
    ["salping", "tube", "输卵管"],
    ["colp", "vagina", "阴道"],
    ["mamm", "breast", "乳腺"],
    ["mast", "breast", "乳腺"],
    ["lact", "milk", "乳"],
    ["gravid", "pregnancy", "妊娠"],
    ["toc", "labor / birth", "分娩"],
    ["nat", "birth", "出生"],
    ["fet", "fetus", "胎儿"],
    ["embry", "embryo", "胚胎"],
    ["amni", "amnion", "羊膜"],
    ["andr", "male", "男"],
    ["gynec", "female", "女"],
    ["cutane", "skin", "皮肤"],
    ["dermat", "skin", "皮肤"],
    ["derm", "skin", "皮肤"],
    ["adip", "fat", "脂肪"],
    ["lip", "fat", "脂肪"],
    ["hist", "tissue", "组织"],
    ["cyt", "cell", "细胞"],
    ["kary", "nucleus", "核"],
    ["path", "disease", "病"],
    ["onc", "tumor", "瘤"],
    ["carcin", "cancer", "癌"],
    ["aden", "gland", "腺"],
    ["crin", "secrete", "分泌"],
    ["gluc", "sugar", "糖"],
    ["glyc", "sugar", "糖"],
    ["calc", "calcium", "钙"],
    ["ox", "oxygen", "氧"],
    ["capn", "carbon dioxide", "二氧化碳"],
    ["therm", "heat", "热"],
    ["hydr", "water", "水"],
    ["tox", "poison", "毒"],
    ["py", "pus", "脓"],
    ["lith", "stone", "结石"],
    ["scler", "hard", "硬"],
    ["fibr", "fiber", "纤维"],
    ["necr", "death", "坏死"],
    ["isch", "hold back", "缺血"],
    ["embol", "plug", "栓子"],
    ["ather", "fatty plaque", "粥样斑块"],
    ["phag", "eat / swallow", "吞噬"],
    ["gnos", "knowledge", "认知"],
    ["spir", "breathe", "呼吸"],
    ["viscer", "internal organ", "内脏"],
    ["abdomin", "abdomen", "腹"],
    ["lapar", "abdomen", "腹"],
    ["granulo", "granule cell", "颗粒"],
    ["thalass", "sea / blood", "地中海、血"],
    ["cortico", "cortex", "皮质"],
    ["procto", "rectum", "直肠"],
    ["colono", "colon", "结肠"],
    ["sigmoido", "sigmoid", "乙状结肠"],
    ["megalo", "large", "巨大"],
    ["periton", "peritoneum", "腹膜"],
    ["umbilic", "navel", "脐"],
    ["pelv", "pelvis", "骨盆"],
    ["lumb", "loin", "腰"],
    ["cervic", "neck / cervix", "颈、宫颈"],
    ["cost", "rib", "肋"],
    ["vertebr", "vertebra", "椎骨"],
    ["spondyl", "vertebra", "椎"],
    ["tonsil", "tonsil", "扁桃体"],
    ["mediastin", "mediastinum", "纵隔"],
    ["pericardi", "pericardium", "心包"],
    ["endocardi", "endocardium", "心内膜"],
    ["myocardi", "myocardium", "心肌"],
    ["diverticul", "diverticulum", "憩室"],
    ["cyan", "blue", "青紫"],
    ["bacteri", "bacterium", "细菌"],
    ["myc", "fungus", "真菌"],
    ["tubercul", "tubercle", "结核结节"],
    ["coni", "dust", "尘"],
    ["silic", "silica", "矽"],
    ["anthrac", "coal", "煤"],
    ["morph", "shape", "形"],
    ["spher", "sphere", "球"],
    ["glia", "support cell", "胶质"],
    ["dendr", "branch", "树突"],
    ["thalam", "thalamus", "丘脑"],
    ["sympath", "sympathetic", "交感"],
    ["terat", "malformation", "畸形"],
    ["muta", "change", "突变"],
    ["physi", "function", "功能"],
    ["bio", "life", "生命"],
    ["endocrin", "inward secretion", "内分泌"],
    ["exocrin", "outward secretion", "外分泌"],
    ["respir", "breathe", "呼吸"],
    ["digest", "break down food", "消化"],
    ["metabol", "change / turnover", "代谢"],
    ["homeostas", "steady state", "稳态"],
    ["menstru", "monthly", "月经"],
    ["maxill", "upper jaw", "上颌"],
    ["mandibul", "lower jaw", "下颌"],
    ["ethmoid", "sieve-like", "筛"],
    ["epiglott", "over the glottis", "会厌"],
    ["mucos", "mucus lining", "黏膜"],
    ["epithel", "surface tissue", "上皮"],
    ["pariet", "wall", "壁"],
    ["pylor", "gatekeeper", "幽门"],
    ["ileocec", "ileum-cecum", "回盲"],
    ["acid", "acid", "酸"],
    ["alkal", "alkali", "碱"],
    ["ket", "ketone", "酮"],
    ["protein", "protein", "蛋白"],
    ["globulin", "globulin", "球蛋白"],
    ["hemoglob", "hemoglobin", "血红蛋白"],
    ["erythropoiet", "red-cell maker", "促红素"],
    ["megakary", "giant nucleus", "巨核"],
    ["granulocyt", "grain cell", "粒细胞"],
    ["agranulocyt", "no-grain cell", "无粒细胞"],
    ["neutrophil", "neutral-loving", "中性粒"],
    ["eosinophil", "dawn-loving", "嗜酸"],
    ["basophil", "base-loving", "嗜碱"],
    ["monocyt", "one cell", "单核"],
    ["lymphocyt", "lymph cell", "淋巴"],
    ["myeloblast", "marrow immature", "原粒"],
    ["lymphoblast", "lymph immature", "原淋"],
    ["hemocyt", "blood cell", "血细胞"],
    ["leukocyt", "white cell", "白细胞"],
    ["erythrocyt", "red cell", "红细胞"],
    ["fibrinogen", "fiber maker", "纤维蛋白原"],
    ["prothrombin", "before thrombin", "凝血酶原"],
    ["cortic", "cortex", "皮质"],
    ["hypophys", "pituitary", "垂体"],
    ["iod", "iodine", "碘"],
    ["astro", "star", "星形"],
    ["arachn", "arachnoid", "蛛网膜"],
    ["diencephal", "between-brain", "间脑"],
    ["anencephal", "without brain", "无脑"],
    ["immunogenet", "immune heredity", "免疫遗传"],
    ["gonadotropin", "gonad-stimulating", "促性腺"],
    ["prostagland", "prostaglandin", "前列腺素"],
    ["oxytoc", "swift birth", "催产"],
    ["thyrox", "thyroxine", "甲状腺素"],
    ["calcitonin", "calcitonin", "降钙素"],
    ["aldoster", "aldosterone", "醛固酮"],
    ["glucocortic", "sugar cortex", "糖皮质"],
    ["mineralocortic", "mineral cortex", "盐皮质"],
    ["pheochromocyt", "dusky-color cell", "嗜铬细胞"],
    ["myx", "mucus", "黏液"],
    ["chrom", "color", "色"],
    ["blast", "immature cell", "母细胞"],
    ["cyte", "cell", "细胞"]
  ],
  "root"
);

const SUFFIXES = table(
  [
    ["ectomy", "surgical removal", "切除术"],
    ["ostomy", "surgical opening", "造口术"],
    ["otomy", "cutting into", "切开术"],
    ["tomy", "cutting", "切开"],
    ["plasty", "surgical reshaping", "成形术"],
    ["pexy", "surgical fixation", "固定术"],
    ["rrhaphy", "suturing", "缝合术"],
    ["scopy", "looking in", "镜检"],
    ["scope", "instrument for looking", "镜"],
    ["graphy", "recording", "造影、描记"],
    ["gram", "a record", "图像、记录"],
    ["metry", "measuring", "测量"],
    ["centesis", "puncture to draw fluid", "穿刺"],
    ["lysis", "breakdown", "溶解、分解"],
    ["ectasis", "dilation", "扩张"],
    ["ectasia", "dilation", "扩张"],
    ["stenosis", "narrowing", "狭窄"],
    ["sclerosis", "hardening", "硬化"],
    ["malacia", "softening", "软化"],
    ["megaly", "enlargement", "增大"],
    ["plasia", "formation", "形成、增生"],
    ["trophy", "nourishment / size", "营养、大小"],
    ["genesis", "production", "生成"],
    ["poiesis", "making", "生成"],
    ["poietin", "maker hormone", "生成素"],
    ["penia", "deficiency", "减少"],
    ["philia", "attraction / tendency", "倾向"],
    ["phobia", "fear", "恐惧"],
    ["ptosis", "drooping", "下垂"],
    ["ptysis", "spitting", "咯出"],
    ["rrhea", "flow", "流出"],
    ["rrhagia", "bursting forth", "爆发性出血"],
    ["rrhage", "bursting forth", "出血"],
    ["algia", "pain", "痛"],
    ["dynia", "pain", "痛"],
    ["itis", "inflammation", "炎症"],
    ["osis", "condition / process", "状态、过程"],
    ["iasis", "condition", "病、结石状态"],
    ["ism", "condition / process", "状态"],
    ["oma", "tumor / swelling", "瘤、肿物"],
    ["emia", "blood condition", "血症"],
    ["uria", "urine condition", "尿异常"],
    ["pnea", "breathing", "呼吸"],
    ["thorax", "chest", "胸"],
    ["cele", "hernia / swelling", "膨出、疝"],
    ["edema", "swelling", "水肿"],
    ["spasm", "sudden tightening", "痉挛"],
    ["stasis", "stopping / standing", "停滞"],
    ["pathy", "disease", "病变"],
    ["opsy", "viewing tissue", "查看"],
    ["gnosis", "knowledge", "认知"],
    ["ology", "study of", "学科"],
    ["logy", "study of", "学科"],
    ["ologist", "specialist", "专科医师"],
    ["logist", "specialist", "专科医师"],
    ["genic", "producing", "源性"],
    ["genous", "arising from", "源性"],
    ["cyte", "cell", "细胞"],
    ["blast", "immature cell", "母细胞"],
    ["oid", "resembling", "样"],
    ["ia", "condition", "状态"],
    ["us", "thing / structure", "结构"],
    ["um", "structure", "结构"],
    ["ium", "structure", "结构"],
    ["al", "pertaining to", "的"],
    ["ic", "pertaining to", "的"],
    ["ous", "pertaining to", "的"],
    ["ary", "pertaining to", "的"],
    ["ar", "pertaining to", "的"],
    ["tic", "pertaining to", "的"],
    ["ive", "tending to", "的"],
    ["ine", "pertaining to", "的"],
    ["eal", "pertaining to", "的"]
  ],
  "suffix"
);

const WEAK_ENDINGS = new Set([
  "ia",
  "us",
  "um",
  "ium",
  "al",
  "ic",
  "ous",
  "ary",
  "ar",
  "tic",
  "ive",
  "ine",
  "eal",
  "oid"
]);

const DENY_WORDS = new Set([
  "anatomy",
  "function",
  "nourishment",
  "nutrient",
  "nutrien",
  "principal",
  "interior",
  "external",
  "molecule",
  "saliva",
  "hinge",
  "socket",
  "skull",
  "elbow",
  "breast",
  "cushioning",
  "bladder",
  "urine",
  "kidney",
  "enzyme",
  "hormone",
  "insulin",
  "oxygen",
  "joint",
  "cartilage",
  "exhale",
  "inhale",
  "expel",
  "windpipe",
  "bile",
  "sodium",
  "potassium",
  "ovum",
  "testis",
  "ovary",
  "sperm",
  "fungus",
  "virus",
  "bacterium",
  "etiology",
  "architecture",
  "vegetation",
  "mitosis",
  "meiosis",
  "osmosis",
  "biology",
  "psychology",
  "fatigue",
  "nucleus",
  "pigment",
  "receptor",
  "steroid",
  "lipid",
  "protein",
  "gonad",
  "cortex",
  "calcium",
  "glucose",
  "neuron",
  "ganglion",
  "cerebrum",
  "thalamus",
  "lumen",
  "apex",
  "hilum",
  "allergen",
  "digitalis",
  "atrium",
  "clot",
  "plasma",
  "embryo",
  "fetus",
  "placenta",
  "amnion",
  "offspring",
  "progeny",
  "fragment",
  "dwarf",
  "gland",
  "counselor"
]);

const MANUAL = new Map([
  [
    "bronchiectasis",
    [
      piece("bronchio", "root", "bronchus", "支气管"),
      piece("ectasis", "suffix", "dilation", "扩张")
    ]
  ],
  [
    "hemoptysis",
    [piece("hemo", "root", "blood", "血"), piece("ptysis", "suffix", "spitting", "咯出")]
  ],
  [
    "pneumothorax",
    [piece("pneumo", "root", "air / lung", "气、肺"), piece("thorax", "root", "chest", "胸")]
  ],
  [
    "atherosclerosis",
    [
      piece("athero", "root", "fatty plaque", "粥样斑块"),
      piece("scler", "root", "hard", "硬化"),
      piece("osis", "suffix", "condition", "状态")
    ]
  ],
  [
    "diagnosis",
    [
      piece("dia", "prefix", "through / apart", "分辨"),
      piece("gnosis", "root", "knowledge", "认知")
    ]
  ],
  [
    "prognosis",
    [piece("pro", "prefix", "before", "事先"), piece("gnosis", "root", "knowledge", "认知")]
  ],
  [
    "anemia",
    [piece("an", "prefix", "without", "缺乏"), piece("emia", "suffix", "blood condition", "血症")]
  ],
  [
    "leukemia",
    [piece("leuk", "root", "white", "白"), piece("emia", "suffix", "blood condition", "血症")]
  ],
  ["apnea", [piece("a", "prefix", "without", "无"), piece("pnea", "suffix", "breathing", "呼吸")]],
  [
    "dyspnea",
    [piece("dys", "prefix", "difficult", "困难"), piece("pnea", "suffix", "breathing", "呼吸")]
  ],
  [
    "hypercapnia",
    [
      piece("hyper", "prefix", "excess", "过多"),
      piece("capn", "root", "carbon dioxide", "二氧化碳"),
      piece("ia", "suffix", "condition", "状态")
    ]
  ],
  [
    "hemostasis",
    [piece("hemo", "root", "blood", "血"), piece("stasis", "suffix", "stopping", "止住")]
  ],
  [
    "hematuria",
    [piece("hemat", "root", "blood", "血"), piece("uria", "suffix", "urine condition", "尿")]
  ],
  [
    "hemarthrosis",
    [
      piece("hem", "root", "blood", "血"),
      piece("arthr", "root", "joint", "关节"),
      piece("osis", "suffix", "condition", "状态")
    ]
  ],
  [
    "phagocytosis",
    [
      piece("phago", "root", "eat", "吞噬"),
      piece("cyt", "root", "cell", "细胞"),
      piece("osis", "suffix", "process", "过程")
    ]
  ],
  [
    "endocarditis",
    [
      piece("endo", "prefix", "inner", "内"),
      piece("cardi", "root", "heart", "心"),
      piece("itis", "suffix", "inflammation", "炎症")
    ]
  ],
  [
    "pericarditis",
    [
      piece("peri", "prefix", "around", "周围"),
      piece("cardi", "root", "heart", "心"),
      piece("itis", "suffix", "inflammation", "炎症")
    ]
  ],
  [
    "myocarditis",
    [
      piece("myo", "root", "muscle", "肌"),
      piece("cardi", "root", "heart", "心"),
      piece("itis", "suffix", "inflammation", "炎症")
    ]
  ],
  [
    "gastroenteritis",
    [
      piece("gastro", "root", "stomach", "胃"),
      piece("enter", "root", "intestine", "肠"),
      piece("itis", "suffix", "inflammation", "炎症")
    ]
  ],
  [
    "cholecystectomy",
    [
      piece("cholecyst", "root", "gallbladder", "胆囊"),
      piece("ectomy", "suffix", "surgical removal", "切除术")
    ]
  ],
  [
    "appendectomy",
    [
      piece("append", "root", "appendix", "阑尾"),
      piece("ectomy", "suffix", "surgical removal", "切除术")
    ]
  ],
  [
    "colostomy",
    [piece("colo", "root", "colon", "结肠"), piece("stomy", "suffix", "surgical opening", "造口")]
  ],
  [
    "ileostomy",
    [piece("ileo", "root", "ileum", "回肠"), piece("stomy", "suffix", "surgical opening", "造口")]
  ],
  [
    "gastroduodenostomy",
    [
      piece("gastro", "root", "stomach", "胃"),
      piece("duodeno", "root", "duodenum", "十二指肠"),
      piece("stomy", "suffix", "joining opening", "吻合口")
    ]
  ],
  [
    "coloproctostomy",
    [
      piece("colo", "root", "colon", "结肠"),
      piece("procto", "root", "rectum", "直肠"),
      piece("stomy", "suffix", "joining opening", "吻合口")
    ]
  ],
  [
    "cholelithiasis",
    [
      piece("chole", "root", "bile", "胆"),
      piece("lith", "root", "stone", "结石"),
      piece("iasis", "suffix", "condition", "状态")
    ]
  ],
  [
    "hepatomegaly",
    [piece("hepato", "root", "liver", "肝"), piece("megaly", "suffix", "enlargement", "增大")]
  ],
  [
    "pneumoconiosis",
    [
      piece("pneumo", "root", "lung", "肺"),
      piece("coni", "root", "dust", "尘"),
      piece("osis", "suffix", "condition", "状态")
    ]
  ],
  [
    "anthracosilicosis",
    [
      piece("anthraco", "root", "coal", "煤"),
      piece("silic", "root", "silica", "矽"),
      piece("osis", "suffix", "condition", "状态")
    ]
  ],
  [
    "silicosis",
    [piece("silic", "root", "silica", "矽"), piece("osis", "suffix", "condition", "状态")]
  ],
  [
    "bronchopneumonia",
    [
      piece("broncho", "root", "bronchus", "支气管"),
      piece("pneumon", "root", "lung", "肺"),
      piece("ia", "suffix", "condition", "状态")
    ]
  ],
  [
    "pyelonephritis",
    [
      piece("pyelo", "root", "renal pelvis", "肾盂"),
      piece("nephr", "root", "kidney", "肾"),
      piece("itis", "suffix", "inflammation", "炎症")
    ]
  ],
  [
    "glomerulonephritis",
    [
      piece("glomerulo", "root", "glomerulus", "肾小球"),
      piece("nephr", "root", "kidney", "肾"),
      piece("itis", "suffix", "inflammation", "炎症")
    ]
  ],
  [
    "lymphadenopathy",
    [
      piece("lymphadeno", "root", "lymph node", "淋巴结"),
      piece("pathy", "suffix", "disease", "病变")
    ]
  ],
  [
    "lymphadenitis",
    [
      piece("lymphaden", "root", "lymph node", "淋巴结"),
      piece("itis", "suffix", "inflammation", "炎症")
    ]
  ],
  [
    "thrombocytopenia",
    [
      piece("thrombocyto", "root", "platelet", "血小板"),
      piece("penia", "suffix", "deficiency", "减少")
    ]
  ],
  [
    "pancytopenia",
    [
      piece("pan", "prefix", "all", "全"),
      piece("cyto", "root", "cell", "细胞"),
      piece("penia", "suffix", "deficiency", "减少")
    ]
  ],
  [
    "dysgammaglobulinemia",
    [
      piece("dys", "prefix", "abnormal", "异常"),
      piece("gammaglobulin", "root", "gamma globulin", "丙种球蛋白"),
      piece("emia", "suffix", "blood condition", "血症")
    ]
  ],
  [
    "hypercalcemia",
    [
      piece("hyper", "prefix", "high", "高"),
      piece("calc", "root", "calcium", "钙"),
      piece("emia", "suffix", "blood condition", "血症")
    ]
  ],
  [
    "hyperglycemia",
    [
      piece("hyper", "prefix", "high", "高"),
      piece("glyc", "root", "sugar", "糖"),
      piece("emia", "suffix", "blood condition", "血症")
    ]
  ],
  [
    "ketoacidosis",
    [
      piece("keto", "root", "ketone", "酮"),
      piece("acid", "root", "acid", "酸"),
      piece("osis", "suffix", "process", "过程")
    ]
  ],
  ["acidosis", [piece("acid", "root", "acid", "酸"), piece("osis", "suffix", "process", "过程")]],
  [
    "alkalosis",
    [piece("alkal", "root", "alkali", "碱"), piece("osis", "suffix", "process", "过程")]
  ],
  [
    "primigravida",
    [piece("primi", "prefix", "first", "初"), piece("gravida", "root", "pregnant woman", "孕妇")]
  ],
  [
    "dystocia",
    [piece("dys", "prefix", "difficult", "困难"), piece("tocia", "root", "labor", "分娩")]
  ],
  [
    "amniorrhea",
    [piece("amnio", "root", "amnion", "羊膜"), piece("rrhea", "suffix", "flow", "流出")]
  ],
  [
    "proteinuria",
    [piece("protein", "root", "protein", "蛋白"), piece("uria", "suffix", "urine", "尿")]
  ],
  [
    "amniocentesis",
    [piece("amnio", "root", "amnion", "羊膜"), piece("centesis", "suffix", "puncture", "穿刺")]
  ],
  [
    "endometriosis",
    [
      piece("endo", "prefix", "inner", "内"),
      piece("metri", "root", "uterus", "子宫"),
      piece("osis", "suffix", "condition", "状态")
    ]
  ],
  [
    "salpingitis",
    [piece("salping", "root", "tube", "输卵管"), piece("itis", "suffix", "inflammation", "炎症")]
  ],
  [
    "anencephalus",
    [piece("an", "prefix", "without", "无"), piece("encephalus", "root", "brain", "脑")]
  ],
  ["prenatal", [piece("pre", "prefix", "before", "产前"), piece("natal", "root", "birth", "出生")]],
  [
    "teratogen",
    [piece("terato", "root", "malformation", "畸形"), piece("gen", "suffix", "producer", "原")]
  ],
  ["mutagen", [piece("muta", "root", "change", "突变"), piece("gen", "suffix", "producer", "原")]],
  [
    "carcinogen",
    [piece("carcino", "root", "cancer", "癌"), piece("gen", "suffix", "producer", "原")]
  ],
  [
    "adenohypophysis",
    [piece("adeno", "root", "gland", "腺"), piece("hypophysis", "root", "pituitary", "垂体")]
  ],
  [
    "neurohypophysis",
    [piece("neuro", "root", "nerve", "神经"), piece("hypophysis", "root", "pituitary", "垂体")]
  ],
  [
    "acromegaly",
    [piece("acro", "root", "extremity", "肢端"), piece("megaly", "suffix", "enlargement", "增大")]
  ],
  [
    "antidiuretic",
    [piece("anti", "prefix", "against", "抗"), piece("diuretic", "root", "urine-making", "利尿")]
  ],
  [
    "hyperthyroidism",
    [
      piece("hyper", "prefix", "excess", "亢进"),
      piece("thyroid", "root", "thyroid", "甲状腺"),
      piece("ism", "suffix", "condition", "状态")
    ]
  ],
  [
    "hyperparathyroidism",
    [
      piece("hyper", "prefix", "excess", "亢进"),
      piece("parathyroid", "root", "parathyroid", "甲状旁腺"),
      piece("ism", "suffix", "condition", "状态")
    ]
  ],
  [
    "hypoparathyroidism",
    [
      piece("hypo", "prefix", "deficient", "减退"),
      piece("parathyroid", "root", "parathyroid", "甲状旁腺"),
      piece("ism", "suffix", "condition", "状态")
    ]
  ],
  [
    "triiodothyronine",
    [
      piece("tri", "prefix", "three", "三"),
      piece("iodo", "root", "iodine", "碘"),
      piece("thyronine", "root", "thyroid hormone backbone", "甲腺原氨酸")
    ]
  ],
  [
    "homeostasis",
    [piece("homeo", "prefix", "same", "同一"), piece("stasis", "suffix", "standing", "稳定")]
  ],
  [
    "glucocorticoid",
    [
      piece("gluco", "root", "sugar", "糖"),
      piece("cortic", "root", "cortex", "皮质"),
      piece("oid", "suffix", "like", "样")
    ]
  ],
  [
    "mineralocorticoid",
    [
      piece("mineralo", "root", "mineral / salt", "盐"),
      piece("cortic", "root", "cortex", "皮质"),
      piece("oid", "suffix", "like", "样")
    ]
  ],
  [
    "pheochromocytoma",
    [
      piece("pheo", "prefix", "dusky", "暗色"),
      piece("chromo", "root", "color", "色"),
      piece("cyt", "root", "cell", "细胞"),
      piece("oma", "suffix", "tumor", "瘤")
    ]
  ],
  [
    "myxedema",
    [piece("myx", "root", "mucus", "黏液"), piece("edema", "suffix", "swelling", "水肿")]
  ],
  [
    "neurology",
    [piece("neuro", "root", "nerve", "神经"), piece("logy", "suffix", "study of", "学科")]
  ],
  [
    "oligodendroglia",
    [
      piece("oligo", "prefix", "few", "少"),
      piece("dendro", "root", "branch", "突"),
      piece("glia", "root", "support cell", "胶质")
    ]
  ],
  ["astrocyte", [piece("astro", "root", "star", "星形"), piece("cyte", "suffix", "cell", "细胞")]],
  [
    "microglia",
    [piece("micro", "prefix", "small", "小"), piece("glia", "root", "support cell", "胶质")]
  ],
  [
    "neuroglia",
    [piece("neuro", "root", "nerve", "神经"), piece("glia", "root", "support cell", "胶质")]
  ],
  ["glioma", [piece("gli", "root", "support cell", "胶质"), piece("oma", "suffix", "tumor", "瘤")]],
  [
    "subarachnoid",
    [piece("sub", "prefix", "under", "下"), piece("arachnoid", "root", "arachnoid", "蛛网膜")]
  ],
  [
    "subcutaneous",
    [piece("sub", "prefix", "under", "下"), piece("cutaneous", "root", "skin", "皮肤")]
  ],
  [
    "intramuscular",
    [piece("intra", "prefix", "within", "内"), piece("muscular", "root", "muscle", "肌肉")]
  ],
  [
    "autoimmune",
    [piece("auto", "prefix", "self", "自身"), piece("immune", "root", "immune", "免疫")]
  ],
  [
    "immunoglobulin",
    [piece("immuno", "root", "immune", "免疫"), piece("globulin", "root", "protein", "球蛋白")]
  ],
  [
    "erythropoietin",
    [piece("erythro", "root", "red cell", "红"), piece("poietin", "suffix", "maker", "生成素")]
  ],
  [
    "megakaryocyte",
    [
      piece("mega", "prefix", "large", "巨"),
      piece("karyo", "root", "nucleus", "核"),
      piece("cyte", "suffix", "cell", "细胞")
    ]
  ],
  [
    "polymorphonuclear",
    [
      piece("poly", "prefix", "many", "多"),
      piece("morpho", "root", "shape", "形"),
      piece("nuclear", "root", "nucleus", "核")
    ]
  ],
  [
    "cardiovascular",
    [piece("cardio", "root", "heart", "心"), piece("vascul", "root", "vessel", "血管")]
  ],
  [
    "gastrointestinal",
    [piece("gastro", "root", "stomach", "胃"), piece("intestinal", "root", "intestine", "肠")]
  ],
  [
    "endocrinology",
    [
      piece("endo", "prefix", "inward", "内"),
      piece("crin", "root", "secrete", "分泌"),
      piece("ology", "suffix", "study of", "学科")
    ]
  ],
  [
    "histology",
    [piece("histo", "root", "tissue", "组织"), piece("logy", "suffix", "study of", "学科")]
  ],
  [
    "hematology",
    [piece("hemato", "root", "blood", "血"), piece("logy", "suffix", "study of", "学科")]
  ],
  [
    "cytology",
    [piece("cyto", "root", "cell", "细胞"), piece("logy", "suffix", "study of", "学科")]
  ],
  [
    "embryology",
    [piece("embryo", "root", "embryo", "胚胎"), piece("logy", "suffix", "study of", "学科")]
  ],
  [
    "immunology",
    [piece("immuno", "root", "immune", "免疫"), piece("logy", "suffix", "study of", "学科")]
  ],
  [
    "physiology",
    [piece("physio", "root", "function", "功能"), piece("logy", "suffix", "study of", "学科")]
  ],
  [
    "pathology",
    [piece("patho", "root", "disease", "病"), piece("logy", "suffix", "study of", "学科")]
  ]
]);

const ALL_MORPHEMES = [...PREFIXES, ...ROOTS, ...SUFFIXES].sort(
  (left, right) => right.form.length - left.form.length
);

function normalizeToken(value) {
  return value.toLowerCase().replace(/[^a-z]/gu, "");
}

function lemmaTokens(lemma) {
  return lemma
    .split(/[\s\\/]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function knownForm(value) {
  return ALL_MORPHEMES.some((item) => item.form === value);
}

function peelConnector(value, edge) {
  if (value.length < 4 || knownForm(value)) return value;
  if (edge === "start" && /^[oi]/u.test(value) && knownForm(value.slice(1))) return value.slice(1);
  if (edge === "end" && /[oi]$/u.test(value) && knownForm(value.slice(0, -1)))
    return value.slice(0, -1);
  return value;
}

function lookupRemaining(value) {
  const candidates = [value, peelConnector(value, "start"), peelConnector(value, "end")];
  for (const candidate of candidates) {
    const hit = ALL_MORPHEMES.find((item) => item.form === candidate);
    if (hit) return hit;
  }
  return null;
}

function cover(remaining, memo = new Map()) {
  if (remaining.length === 0) return [];
  if (memo.has(remaining)) return memo.get(remaining);

  const suffixHits = SUFFIXES.filter(
    (item) => remaining.endsWith(item.form) && remaining.length > item.form.length + 1
  ).sort((left, right) => right.form.length - left.form.length);
  for (const suffix of suffixHits) {
    const head = peelConnector(remaining.slice(0, -suffix.form.length), "end");
    const headPieces = cover(head, memo);
    if (headPieces && headPieces.length > 0) {
      const pieces = [...headPieces, suffix];
      memo.set(remaining, pieces);
      return pieces;
    }
  }

  const prefixHits = [...PREFIXES, ...ROOTS]
    .filter((item) => remaining.startsWith(item.form) && remaining.length > item.form.length + 1)
    .sort((left, right) => right.form.length - left.form.length);
  for (const prefix of prefixHits) {
    const tail = peelConnector(remaining.slice(prefix.form.length), "start");
    const tailPieces = cover(tail, memo);
    if (tailPieces && tailPieces.length > 0) {
      const pieces = [prefix, ...tailPieces];
      memo.set(remaining, pieces);
      return pieces;
    }
  }

  const exact = lookupRemaining(remaining);
  if (exact) {
    memo.set(remaining, [exact]);
    return [exact];
  }

  memo.set(remaining, null);
  return null;
}

function parseWord(word) {
  const key = normalizeToken(word);
  if (key.length < 5 || DENY_WORDS.has(key)) return null;
  const manual = MANUAL.get(key);
  if (manual) return manual;

  const pieces = cover(key);
  if (!pieces || pieces.length < 2) return null;
  const strong = pieces.filter((item) => !WEAK_ENDINGS.has(item.form));
  if (strong.length < 2) return null;
  return pieces;
}

function displayForm(item) {
  if (item.kind === "suffix") return item.form.startsWith("-") ? item.form : `-${item.form}`;
  return item.form.endsWith("-") ? item.form : `${item.form}-`;
}

function tipFor(pieces) {
  const forms = new Set(pieces.map((item) => item.form));
  if (forms.has("itis")) return "课堂里先记某处发炎，原因还要另查。";
  if (forms.has("ectomy") || forms.has("ostomy") || forms.has("otomy") || forms.has("tomy")) {
    return "先记做了哪一类手术，具体范围看病历。";
  }
  if (forms.has("emia") || forms.has("uria") || forms.has("pnea")) {
    return "先抓住血、尿或呼吸出了什么变化，数字还要对照病情。";
  }
  if (forms.has("ology") || forms.has("logy")) return "先把它当学科名来记，不要写成某一次检查。";
  if (
    forms.has("ectasis") ||
    forms.has("stenosis") ||
    forms.has("sclerosis") ||
    forms.has("megaly")
  ) {
    return "先用构词抓住形态变化，具体部位看课堂图或影像描述。";
  }
  if (forms.has("oma")) return "先记这是肿物或增生，良性还是恶性不能只靠词尾。";
  return "先用构词抓住大意，细节仍看课堂释义和病历写法。";
}

export function analyzeEssentialLemma(lemma) {
  const manual = MANUAL.get(normalizeToken(lemma));
  if (manual) return { token: lemma, pieces: manual };

  const tokens = lemmaTokens(lemma);
  const candidates = [];
  if (tokens.length === 1) {
    candidates.push(tokens[0]);
  } else {
    candidates.push(tokens[tokens.length - 1], ...tokens.slice(0, -1).reverse());
  }

  for (const token of candidates) {
    const pieces = parseWord(token);
    if (pieces) return { token, pieces };
  }
  return null;
}

export function buildUsageNote(lemma) {
  const analysis = analyzeEssentialLemma(lemma);
  if (analysis == null) return "";

  const breakdown = analysis.pieces.map((item) => `${displayForm(item)}（${item.zh}）`).join(" + ");
  const phraseNote =
    analysis.token !== lemma && lemma.includes(" ")
      ? `在「${lemma}」里，先看 ${analysis.token}。`
      : "";
  const sentences = [`课堂构词：${breakdown}。`, phraseNote, tipFor(analysis.pieces)].filter(
    (part) => part.length > 0
  );
  return sentences.join("");
}

export function usageNoteHasRootStory(note) {
  return /(构词|词根|前缀|后缀)/u.test(note);
}
