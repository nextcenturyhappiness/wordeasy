/** Meaning-driven clinical/physiological sentence families. No empty slot-filling. */

function cue(meaningEn) {
  return String(meaningEn)
    .replace(/^(a|an|the)\s+/iu, "")
    .replace(/\bclassroom\s+/giu, "")
    .replace(/\.$/u, "")
    .trim();
}

function relatingFocus(meaningEn) {
  return cue(meaningEn)
    .replace(/^relating to\s+/iu, "")
    .trim();
}

function infinitiveRest(meaningEn) {
  return cue(meaningEn)
    .replace(/^to\s+/iu, "")
    .trim();
}

function thatVp(meaningEn) {
  const match = String(meaningEn).match(/\bthat\s+(.+)/iu);
  return match ? match[1].replace(/\.$/u, "").trim() : null;
}

function stripPeriod(meaningEn) {
  return String(meaningEn).replace(/\.$/u, "").trim();
}

function thirdPersonVp(vp) {
  return /^[A-Za-z]+s\b/u.test(vp) || /^(?:is|was|has|does|can|cannot)\b/iu.test(vp);
}

function looksPluralLemma(lemma) {
  return /s$/u.test(lemma) && !/(sis|us|is|as|ss)$/u.test(lemma);
}

function pack(id, sentence, paraphrase, translation) {
  return { id, sentence, paraphrase, translation };
}

const EXTRA_WRAPS = {
  glycogen: pack(
    "extra_glycogen",
    "Liver glycogen stores were depleted after the long fast.",
    "The liver's stored starch was used up after the long fast.",
    "长时间禁食后，肝糖原储备耗尽。"
  ),
  exudates: pack(
    "extra_exudates",
    "The pleural fluid was rich in protein, so the lab called it exudates.",
    "The chest fluid had enough protein to count as inflammatory leak.",
    "胸水蛋白较高，化验将其称为渗出液。"
  ),
  hypoparathyroidism: pack(
    "extra_hypopth",
    "Low calcium with a low PTH fitted hypoparathyroidism after neck surgery.",
    "Low calcium plus low parathyroid hormone fitted underactive parathyroid glands.",
    "颈部手术后，低钙且 PTH 低，符合甲状旁腺功能减退。"
  ),
  dysgammaglobulinemia: pack(
    "extra_dysgamma",
    "Recurrent sinus infection with odd immunoglobulin numbers fitted dysgammaglobulinemia.",
    "Repeated sinus infection plus abnormal antibody proteins fitted this immune-protein disorder.",
    "反复鼻窦感染且免疫球蛋白谱异常，符合丙种球蛋白异常血症。"
  ),
  "mendelian fashion": pack(
    "extra_mendel",
    "The pedigree showed the trait segregating in mendelian fashion.",
    "The family tree showed single-gene inheritance.",
    "家系图显示该性状按孟德尔方式分离。"
  ),
  nutrien: pack(
    "extra_nutrien",
    "The chart still used the misspelling nutrien for a food substance the body uses.",
    "The note used this misspelling of nutrient.",
    "病历仍把营养素误写成 nutrien。"
  ),
  "mental retardation": pack(
    "extra_mr",
    "The old chart still said mental retardation; the current note uses intellectual disability.",
    "The outdated term was replaced by intellectual disability.",
    "旧病历仍写 mental retardation；现用 intellectual disability。"
  ),
  "negative feedback control": pack(
    "extra_nfb",
    "Cortisol secretion fell once negative feedback control at the pituitary took effect.",
    "Hormone output dropped when the product damped its own production.",
    "垂体的负反馈控制生效后，皮质醇分泌下降。"
  ),
  euphenics: pack(
    "extra_euphenics",
    "Dietary treatment was framed as euphenics, improving the phenotype without changing the gene.",
    "The plan improved the expressed picture without editing the genotype.",
    "饮食治疗被说成表型改良，改善表型而不改基因。"
  ),
  globin: pack(
    "extra_globin",
    "The thalassemia workup asked which globin chain was under-produced.",
    "The anemia workup asked which hemoglobin protein chain was short.",
    "地中海贫血评估要问哪一条珠蛋白链合成不足。"
  ),
  heme: pack(
    "extra_heme",
    "Jaundice rose as heme from broken red cells was converted to bilirubin.",
    "Yellowing increased as the iron-containing part of hemoglobin broke down.",
    "红细胞破坏后，血红素转化为胆红素，黄疸加重。"
  ),
  enzyme: pack(
    "extra_enzyme",
    "A rise in the liver enzyme marked hepatocyte injury after the hypotensive hour.",
    "The liver catalyst protein rose after the hour of low blood pressure.",
    "低血压那一小时后，肝酶升高提示肝细胞损伤。"
  ),
  bilirubin: pack(
    "extra_bili",
    "Rising bilirubin turned the sclera yellow before the next lab draw.",
    "The bile pigment from heme breakdown yellowed the eyes.",
    "胆红素升高使巩膜在下次抽血前发黄。"
  ),
  glucose: pack(
    "extra_glucose",
    "Polyuria began once glucose spilled into the urine.",
    "Large urine volume began once blood sugar spilled into the urine.",
    "一旦葡萄糖溢入尿中，就开始多尿。"
  ),
  estrogen: pack(
    "extra_estrogen",
    "Withdrawal bleeding followed a fall in estrogen after the cycle.",
    "Bleeding followed a drop in this female sex steroid family.",
    "周期结束后雌激素下降，出现撤退性出血。"
  ),
  estradiol: pack(
    "extra_estradiol",
    "The follicular-phase estradiol rise preceded the LH surge.",
    "The main ovarian estrogen rose before the LH peak.",
    "卵泡期雌二醇上升出现在 LH 峰之前。"
  ),
  complement: pack(
    "extra_complement",
    "Low complement levels left the patient open to encapsulated bacteria.",
    "Too little of these antibody-helping plasma proteins invited infection.",
    "补体偏低使患者易受荚膜菌感染。"
  ),
  "proteinlike compound": pack(
    "extra_peptide",
    "The receptor bound a proteinlike compound and started the intracellular signal.",
    "A peptide messenger bound the receptor and started the signal.",
    "受体结合一种蛋白样化合物并启动细胞内信号。"
  ),
  lipid: pack(
    "extra_lipid",
    "The fasting lipid panel showed high triglyceride after the poorly controlled diabetes.",
    "The fasting fat-soluble panel showed high triglyceride.",
    "空腹血脂显示，糖尿病控制不佳后甘油三酯升高。"
  ),
  cortisol: pack(
    "extra_cortisol",
    "An early-morning cortisol was low and the patient remained hypotensive.",
    "The main adrenal glucocorticoid was low, and blood pressure stayed down.",
    "清晨皮质醇偏低，患者持续低血压。"
  ),
  digitalis: pack(
    "extra_digitalis",
    "The first dose of digitalis waited until the potassium was known.",
    "This heart glycoside waited on the potassium result.",
    "在血钾结果出来前，未给予洋地黄。"
  ),
  eosinophil: pack(
    "extra_eos",
    "The smear showed the eosinophil among the reacting cells in the allergic flare.",
    "The smear showed this allergy-related granulocyte among the reacting cells.",
    "过敏发作时，涂片在反应细胞中见到嗜酸性粒细胞。"
  ),
  pons: pack(
    "extra_pons",
    "The exam localized the injury to the pons after the pinpoint pupils appeared.",
    "The exam found the injury at the brainstem bulge after the pupils pinpointed.",
    "针尖样瞳孔出现后，查体把损伤定位在脑桥。"
  ),
  synapse: pack(
    "extra_synapse",
    "The toxin blocked the synapse so the muscle never received the impulse.",
    "The toxin blocked the junction where one neuron signals another.",
    "毒素阻断突触，肌肉收不到冲动。"
  ),
  neurotransmitter: pack(
    "extra_nt",
    "Too little neurotransmitter at the synapse explained the new weakness.",
    "Too little chemical signal at the junction explained the new weakness.",
    "突触处神经递质过少解释了新出现的无力。"
  ),
  "circadian rhythms": pack(
    "extra_circadian",
    "Cortisol still followed circadian rhythms even during the illness.",
    "Cortisol still followed the about-24-hour biologic cycle.",
    "即使在患病期间，皮质醇仍遵循昼夜节律。"
  ),
  "islets of langerhans": pack(
    "extra_islets",
    "Insulin output fell after injury to the islets of langerhans.",
    "Insulin output fell after injury to the pancreatic endocrine clusters.",
    "胰岛损伤后胰岛素分泌下降。"
  ),
  zygote: pack(
    "extra_zygote",
    "Fertilization produced a zygote before the first cleavage divisions began.",
    "Sperm-egg fusion produced the first cell before splitting began.",
    "受精形成受精卵后，才开始第一次卵裂。"
  ),
  stool: pack(
    "extra_stool",
    "Overnight stool turned black, and the occult-blood test was positive.",
    "Overnight feces turned black and tested positive for hidden blood.",
    "夜间大便发黑，隐血试验阳性。"
  ),
  "occult blood": pack(
    "extra_occult",
    "The stool test detected occult blood that the eye could not see.",
    "The stool test found blood not visible to the eye.",
    "大便检查检出肉眼看不见的隐血。"
  ),
  "systolic pressure": pack(
    "extra_sbp",
    "The systolic pressure stayed above 180 mmHg on repeated cuff readings.",
    "The arterial pressure during contraction stayed above 180.",
    "反复袖带测量，收缩压持续高于 180 mmHg。"
  ),
  clot: pack(
    "extra_clot",
    "A clot in the femoral vein explained the swollen, painful calf.",
    "A mass of coagulated blood in the thigh vein explained the swollen calf.",
    "股静脉内血凝块解释了小腿肿胀疼痛。"
  ),
  vegetation: pack(
    "extra_veg",
    "Echo showed a vegetation on the mitral valve after the new fever.",
    "Echo showed a clot-like mass on the valve after the new fever.",
    "新发热后，超声心动图显示二尖瓣上有赘生物。"
  ),
  "paralytic ileus": pack(
    "extra_ileus",
    "Bowel sounds were absent, fitting paralytic ileus rather than a mechanical block.",
    "No bowel sounds fitted obstruction from lost peristalsis.",
    "肠鸣音消失，符合麻痹性肠梗阻而非机械性梗阻。"
  ),
  "rheumatic heart disease": pack(
    "extra_rhd",
    "The mitral stenosis was attributed to rheumatic heart disease years after the fever.",
    "The tight mitral valve was blamed on valve damage after rheumatic fever.",
    "二尖瓣狭窄归因于多年前风湿热后的风湿性心脏病。"
  ),
  pimples: pack(
    "extra_pimples",
    "Facial pimples flared along the oily hair-follicle openings.",
    "Small raised inflammatory spots flared on the oily face.",
    "面部皮脂腺开口处丘疹加重。"
  ),
  rash: pack(
    "extra_rash",
    "A blanching rash spread over the trunk after the second drug dose.",
    "A visible skin eruption spread after the second dose.",
    "第二次给药后，躯干出现可消退的皮疹。"
  ),
  purpura: pack(
    "extra_purpura",
    "Non-blanching purpura on the legs raised concern for low platelets.",
    "Purple spots that did not fade raised concern for low platelets.",
    "下肢压之不褪色的紫癜，提示血小板偏低。"
  ),
  hemarthrosis: pack(
    "extra_hemarth",
    "The swollen knee after minor trauma fitted hemarthrosis in hemophilia.",
    "The swollen knee fitted bleeding into a joint.",
    "轻微外伤后膝关节肿胀，符合血友病的关节积血。"
  ),
  malnutrition: pack(
    "extra_malnut",
    "Poor wound healing and low albumin pointed to malnutrition.",
    "The wound would not close and albumin was low from poor nutrition.",
    "伤口难愈且白蛋白低，提示营养不良。"
  ),
  "valvular murmur": pack(
    "extra_murmur",
    "A new valvular murmur appeared after the febrile illness.",
    "A new heart murmur from abnormal valve flow appeared after the fever.",
    "发热性疾病后出现新的瓣膜性杂音。"
  ),
  "bile acid": pack(
    "extra_bile_acid",
    "Fat droplets persisted in stool when bile acid delivery into the duodenum failed.",
    "Fat stayed in the stool when liver-made acids did not reach the bowel.",
    "胆汁酸无法进入十二指肠时，大便中持续出现脂肪滴。"
  ),
  "bile pigment": pack(
    "extra_bile_pigment",
    "Dark urine reflected excess bile pigment spilling from the liver.",
    "Dark urine reflected colored bile compounds such as bilirubin.",
    "深色尿反映肝脏溢出过多胆汁色素。"
  ),
  "fibrous connective tissue": pack(
    "extra_fct",
    "The scar was dense fibrous connective tissue rather than normal dermis.",
    "The scar was collagen-rich supporting tissue, not normal skin.",
    "瘢痕是致密纤维结缔组织，而不是正常真皮。"
  ),
  debris: pack(
    "extra_debris",
    "Macrophages cleared debris from the wound bed overnight.",
    "Scavenger cells cleared broken-down fragments from the wound.",
    "巨噬细胞在夜间清除了伤口床上的残渣。"
  ),
  irritation: pack(
    "extra_irritation",
    "Local irritation of the airway triggered cough and wheeze.",
    "Local unpleasant stimulation of the airway triggered cough.",
    "气道局部刺激引发咳嗽和哮鸣。"
  ),
  pigment: pack(
    "extra_pigment",
    "Excess pigment darkened the surgical scar over months.",
    "A colored substance in the tissue darkened the scar.",
    "数月后过多色素使手术瘢痕变深。"
  ),
  spherocytosis: pack(
    "extra_sphero",
    "Hemolysis with sphere-shaped red cells fitted spherocytosis.",
    "Red-cell breakdown with fragile spheres fitted this membrane disorder.",
    "溶血且红细胞呈球形，符合球形红细胞增多症。"
  ),
  malformation: pack(
    "extra_malform",
    "The prenatal scan showed a cardiac malformation before delivery.",
    "The prenatal scan showed an abnormal anatomic shape from development.",
    "产前扫描在分娩前发现心脏畸形。"
  ),
  mutant: pack(
    "extra_mutant",
    "Only the mutant allele failed to make a working enzyme.",
    "Only the gene copy carrying the mutation failed to make enzyme.",
    "只有突变等位基因无法产生有功能的酶。"
  ),
  ptosis: pack(
    "extra_ptosis",
    "Unilateral ptosis of the eyelid appeared with the third-nerve palsy.",
    "One eyelid drooped with the third-nerve palsy.",
    "动眼神经麻痹时出现单侧眼睑下垂。"
  ),
  fissure: pack(
    "extra_fissure",
    "The MRI showed blood tracking along the interhemispheric fissure.",
    "The scan showed blood along the deep cleft between hemispheres.",
    "MRI 显示血液沿大脑半球间裂走行。"
  ),
  "anterior lobe": pack(
    "extra_ant_lobe",
    "Cortisol fell after injury to the anterior lobe of the pituitary.",
    "Cortisol fell after injury to the front pituitary lobe.",
    "垂体前叶损伤后皮质醇下降。"
  ),
  "posterior lobe": pack(
    "extra_post_lobe",
    "Diabetes insipidus followed injury to the posterior lobe.",
    "Large volumes of dilute urine followed injury to the back pituitary lobe.",
    "垂体后叶损伤后出现尿崩症。"
  ),
  "nodular goiter": pack(
    "extra_nod_goiter",
    "The neck exam found a nodular goiter and a suppressed TSH.",
    "The neck exam found an enlarged thyroid containing nodules.",
    "颈部查体发现结节性甲状腺肿，且 TSH 受抑制。"
  )
};

export function composeWraps(entry) {
  const { lemma, pos, meaningEn, zh } = entry;
  const extra = EXTRA_WRAPS[lemma];
  if (extra) {
    return [extra];
  }
  const meaning = stripPeriod(meaningEn);
  const m = cue(meaningEn);
  const low = meaning.toLowerCase();
  const vp = thatVp(meaningEn);
  const inf = infinitiveRest(meaningEn);
  const focus = relatingFocus(meaningEn);

  if (pos === "adverb") {
    if (/earlier than/u.test(low)) {
      return [
        pack(
          "adv_premature",
          `The infant was born ${lemma} at 32 weeks.`,
          `The baby arrived ${m}.`,
          `婴儿${zh}出生。`
        )
      ];
    }
    return [
      pack(
        "adv_given",
        `The drug was given ${lemma} rather than by another route.`,
        `The medicine went in ${m}.`,
        `药物${zh}给予，而不是经其他途径。`
      )
    ];
  }

  if (pos === "verb" || pos === "phrasal verb") {
    return [
      pack(
        "verb_team",
        `The team had to ${lemma} so they could ${inf}.`,
        `They needed to ${inf}.`,
        `团队必须${zh}，才能完成这一步。`
      ),
      pack(
        "verb_night",
        `If the finding returned, the night team was to ${lemma} without delay.`,
        `If it came back they still had to ${inf}.`,
        `如果该发现再出现，夜班要立即${zh}。`
      )
    ];
  }

  if (pos === "adjective") {
    return composeAdjective(entry, { meaning, m, low, focus, zh, lemma });
  }

  const study = meaning.match(/^(?:the\s+)?(?:microscopic\s+)?study of\s+(.+)/iu);
  if (study) {
    return [
      pack(
        "study_applied",
        `The unexpected finding made sense only after ${lemma} of ${study[1]} was applied.`,
        `Only this field (${m}) made the finding understandable.`,
        `这一意外发现要靠${zh}才能解释。`
      ),
      pack(
        "study_needed",
        `The case needed ${lemma} of ${study[1]}, not a bedside guess.`,
        `The case needed this field (${m}), not a guess.`,
        `这个病例需要${zh}，不能只靠床旁猜测。`
      )
    ];
  }

  const inflam = meaning.match(/^inflammation of\s+(.+)/iu);
  if (inflam || /itis$/u.test(lemma)) {
    const organ = inflam ? inflam[1] : m;
    return [
      pack(
        "inflam_fever",
        `Fever and local pain over ${organ} fitted ${lemma}.`,
        `Heat and pain there fitted ${m}.`,
        `局部发热和疼痛符合${zh}。`
      ),
      pack(
        "inflam_crp",
        `The flare of ${lemma} brought pain and a rising CRP.`,
        `When ${m} worsened, pain and CRP rose together.`,
        `${zh}加重时出现疼痛和 CRP 升高。`
      ),
      pack(
        "inflam_biopsy",
        `The biopsy confirmed ${lemma} and excluded a competing infection.`,
        `Tissue exam confirmed ${m} and ruled out another infection.`,
        `活检证实了${zh}，并排除了另一种感染。`
      )
    ];
  }

  if (
    /^(?:engulfment|coating of a microbe|cell division|the process of one cell|process by which|uptake of a substance|wave-like muscle)/iu.test(
      low
    )
  ) {
    return [
      pack(
        "process_host",
        `In injured tissue, host cells used ${lemma} while clearing bacteria and debris.`,
        `In injured tissue, cells used ${m} to clean up.`,
        `损伤组织里，宿主细胞在清除细菌和碎屑时发生了${zh}。`
      ),
      pack(
        "process_repair",
        `During tissue repair, ${lemma} produced the new cells the wound required.`,
        `Repair used ${m} to make the new cells.`,
        `组织修复时，${zh}产生伤口所需的新细胞。`
      )
    ];
  }

  if (
    /x-ray|ultrasound|magnetic fields|ionizing radiation|recording of the heart|imaging that|radiopaque contrast|cross-sectional/iu.test(
      low
    )
  ) {
    return [
      pack(
        "img_showed",
        `The ${lemma} showed the collection before drainage.`,
        `This study (${m}) showed the collection before drainage.`,
        `引流前，${zh}显示了那处积液。`
      ),
      pack(
        "img_head",
        `Urgent ${lemma} of the head excluded a large bleed.`,
        `Urgent imaging (${m}) of the head showed no large bleed.`,
        `紧急头部${zh}排除了大出血。`
      )
    ];
  }

  if (
    /^an? (?:drug|anticoagulant|glucocorticoid|narcotic|corticosteroid|cardiac glycoside)\b/iu.test(
      low
    ) ||
    /glycoside used/iu.test(low)
  ) {
    return [
      pack(
        "drug_dose",
        `The first dose of ${lemma} was given once the allergy history was clear.`,
        `The first dose of this medicine (${m}) waited on the allergy history.`,
        `过敏史问清后，给予了首剂${zh}。`
      ),
      pack(
        "drug_stop",
        `The overnight order stopped ${lemma} after the new rash appeared.`,
        `The night order stopped this medicine (${m}) when the rash appeared.`,
        `新皮疹出现后，夜间医嘱停用了${zh}。`
      )
    ];
  }

  if (
    /instrument for|surgical opening|surgical join|surgical removal|needle sampling|delivery of the fetus through|inspection of a hollow|lighted tube|placement of a tube/iu.test(
      low
    ) ||
    /scope$|ostomy$|ectomy$|centesis$|puncture$|^endoscopy$|debridement|anastomosis|ligation|intubation|catheterization/iu.test(
      lemma
    )
  ) {
    return [
      pack(
        "proc_done",
        `The ${lemma} was performed after consent and a review of the anatomy.`,
        `This procedure (${m}) was done after consent and an anatomy review.`,
        `在知情同意并复习局部解剖后，实施了${zh}。`
      ),
      pack(
        "proc_recover",
        `After the ${lemma}, pain scores fell and diet was restarted.`,
        `After this procedure (${m}), pain fell and diet restarted.`,
        `${zh}之后，疼痛评分下降并重新开始进食。`
      )
    ];
  }

  if (
    /^(?:a pause|tiredness|paleness|yellowing|coughing up|whistling|loss of consciousness|itchy|frequent passage|unpleasant urge|awareness of|chest pain|sensation that|forceful expulsion|sudden explosive|a change the patient|an objective finding)/iu.test(
      low
    ) ||
    /nausea|fatigue|pallor|apnea|jaundice|hemoptysis|wheeze|syncope|diarrhea|cyanosis|pruritus|dyspnea|orthopnea|tachypnea|headache|dizziness|vertigo|tremor|chill|malaise|hoarseness|paresthesia|arthralgias/iu.test(
      lemma
    )
  ) {
    return [
      pack(
        "sx_reported",
        `She reported ${lemma} as the complaint that brought her in.`,
        `She came in because of ${m}.`,
        `她把${zh}说成促使就诊的主诉。`
      ),
      pack(
        "sx_overnight",
        `Overnight ${lemma} worsened and directed the next exam.`,
        `Overnight ${m} got worse and directed the next exam.`,
        `夜间${zh}加重，并指导下一步检查。`
      )
    ];
  }

  if (
    /cyte$|blast$|^sperm$|^ovum$|neuron$|microglia|astrocyte|neuroglia|hemocyte|leukocyte|^macrophage$|^macrophages$|^phagocyte$|^neutrophil$|^lymphocyte$|^platelet$|^platelets$|^erythrocyte$/u.test(
      lemma
    ) ||
    /^(?:a cell|the red blood cell|a white blood cell|the T or B|the main phagocyte|the tissue phagocyte|the electrically signaling cell|the female gamete|the male gamete|the blood fragment|cell fragments that)/iu.test(
      low
    )
  ) {
    return [
      pack(
        "cell_smear",
        `The smear showed the ${lemma} among the reacting cells.`,
        `The smear showed this cell type (${m}) among the reacting cells.`,
        `涂片在反应细胞中见到${zh}。`
      ),
      pack(
        "cell_count",
        `The falling ${lemma} count explained the new infection risk.`,
        `Fewer of these cells (${m}) explained the new infection risk.`,
        `${zh}计数下降解释了新的感染风险。`
      )
    ];
  }

  if (
    /^(?:gonadotropin|oxytocin)$/u.test(lemma) ||
    /hormone that (?:stimulates the gonads|contracts the uterus)/iu.test(low)
  ) {
    return [
      pack(
        "repro_hormone",
        `The ${lemma} level rose and the uterus began to contract.`,
        `This hormone (${m}) rose and the uterus began to contract.`,
        `${zh}水平升高后子宫开始收缩。`
      ),
      pack(
        "repro_hormone_lab",
        `A high ${lemma} level fitted the current reproductive physiology.`,
        `The high amount of this hormone (${m}) fitted the current reproductive physiology.`,
        `${zh}偏高符合当前生殖生理。`
      )
    ];
  }
  if (
    /^(?:puberty|reproduction|parturition|trimester|miscarriage|preeclampsia|amniorrhea|dystocia)$/u.test(
      lemma
    )
  ) {
    return [
      pack(
        "repro_course",
        `The obstetric note recorded ${lemma} among the active problems.`,
        `The obstetric note recorded ${m} among the active problems.`,
        `产科记录把${zh}列入当前问题。`
      ),
      pack(
        "repro_care",
        `Overnight obstetric care still had to account for ${lemma}.`,
        `Overnight obstetric care still had to account for ${m}.`,
        `夜间产科处理仍需考虑${zh}。`
      )
    ];
  }
  if (
    /\b(?:offspring|progeny|fetus|embryo|gravida|pregnancy|amniotic|chorionic|umbilical|quadruplet|triplet|cesarean|fertilization|union of sperm|ovulation|placenta)\b/iu.test(
      `${lemma} ${low}`
    )
  ) {
    if (/sac|placenta|embryo|fetus|chorion|cord|tube/iu.test(`${lemma} ${low}`)) {
      return [
        pack(
          "repro_scan",
          `The obstetric scan assessed the ${lemma} before delivery planning.`,
          `The pregnancy scan assessed ${m} before delivery planning.`,
          `产科扫描在制定分娩计划前评估了${zh}。`
        ),
        pack(
          "repro_visit",
          `The pregnancy visit documented ${lemma} among the current findings.`,
          `The pregnancy visit documented ${m} among the current findings.`,
          `产检把${zh}写入当前发现。`
        )
      ];
    }
    return [
      pack(
        "repro_visit2",
        `The pregnancy visit documented ${lemma} among the current findings.`,
        `The pregnancy visit documented ${m} among the current findings.`,
        `产检把${zh}写入当前发现。`
      )
    ];
  }

  if (vp && (thirdPersonVp(vp) || looksPluralLemma(lemma))) {
    return [
      pack(
        "that_does",
        `The ${lemma} ${vp}.`,
        `This structure ${vp}.`,
        `该${zh}在体内承担这一功能。`
      ),
      pack(
        "that_injury",
        `After injury the ${lemma} no longer ${vp}.`,
        `After injury this structure no longer ${vp}.`,
        `损伤之后，${zh}不再能完成应有的工作。`
      ),
      pack(
        "that_still",
        `Despite nearby swelling the ${lemma} still ${vp}.`,
        `Despite nearby swelling this structure still ${vp}.`,
        `尽管附近肿胀，${zh}仍在工作。`
      )
    ];
  }

  if (
    /\b(?:hormone|cation|enzyme|protein|antibody|proton|steroid|neurotransmitter|catecholamine|polysaccharide|immunoglobulin|electrolyte)\b/iu.test(
      low
    ) ||
    /iron-containing|bile pigment|fat-soluble|gas produced|exhaled|strong acid|proton acceptor|proton donor|main blood sugar|main plasma protein|bile pigment from heme/iu.test(
      low
    ) ||
    /globulin|alkali|^acid$|sodium|potassium|calcium|heme|lipid|insulin|cortisol|epinephrine|bilirubin|acetylcholine|carbon dioxide|hydrochloric acid|glucose|albumin|urea|creatinine|glycogen|histamine|^hormone$|estradiol|complement|prothrombin/iu.test(
      lemma
    )
  ) {
    if (/pH|proton|acid|alkali|bicarbonate|acidosis|alkalosis/iu.test(`${lemma} ${low}`)) {
      return [
        pack(
          "chem_ph",
          `The ${lemma} disturbance moved the blood pH away from normal.`,
          `This acid-base actor (${m}) moved blood pH away from normal.`,
          `${zh}的紊乱使血 pH 偏离正常。`
        ),
        pack(
          "chem_contact",
          `Contact with ${lemma} injured the mucosa and changed local pH.`,
          `Contact with this substance (${m}) injured the lining and changed local pH.`,
          `接触${zh}损伤了黏膜并改变局部 pH。`
        )
      ];
    }
    return [
      pack(
        "chem_serum",
        `The serum ${lemma} was outside the reference range and changed overnight care.`,
        `The blood amount of ${m} was outside the usual range.`,
        `血清${zh}偏离参考范围，改变了夜间处理。`
      ),
      pack(
        "chem_trend",
        `Serial ${lemma} measurements tracked the overnight metabolic change.`,
        `Repeated measurements of ${m} tracked the overnight metabolic change.`,
        `连续${zh}测定追踪了夜间代谢变化。`
      ),
      pack(
        "chem_replace",
        `Replacement of ${lemma} was started after the confirmatory lab returned.`,
        `Replacement of this substance (${m}) started after the confirmatory lab.`,
        `确认化验回报后开始补充${zh}。`
      )
    ];
  }

  if (
    /disease|anemia|syndrome|failure|defect|malignan|tumor|abnormally |excess |infection|wasting|widening of|pneumonia|leukemia|goiter|cirrhosis|stroke|measles|hemophilia|schizophrenia|fibrosis|enlargement of|gallstones|ulcer of|disorder of high blood|preeclampsia|congenital absence|genetic lack|airless lung|patchy pneumonia|air in the pleural|death of cells|hole through the wall|malignancy|plaque buildup|insufficient blood|formation of a clot|blockage of a vessel|reversible airway|destruction of alveolar|high ketones|severe hypothyroidism|endometrial-like|presence of diverticula|protrusion of a viscus|escape of blood/iu.test(
      low
    )
  ) {
    return [
      pack(
        "path_dx",
        `The history, exam, and labs established ${lemma} as the working diagnosis.`,
        `History, exam, and labs made ${m} the working diagnosis.`,
        `病史、查体和化验把${zh}定为工作诊断。`
      ),
      pack(
        "path_course",
        `Despite fluids, ${lemma} continued into the second hospital day.`,
        `${m} was still present on day two despite fluids.`,
        `尽管已经补液，${zh}仍持续到住院第二天。`
      )
    ];
  }

  if (
    /system$/iu.test(lemma) ||
    /working as one system|network of lymph|airways and lungs/iu.test(low)
  ) {
    return [
      pack(
        "system_fail",
        `Overnight the ${lemma} could no longer meet the body's demand.`,
        `Overnight this system (${m}) could not keep up.`,
        `夜间${zh}已无法满足身体需要。`
      ),
      pack(
        "system_scan",
        `The scan showed the ${lemma} was the source of the shock picture.`,
        `Imaging pointed to this system (${m}) as the source of shock.`,
        `扫描显示休克来自${zh}。`
      )
    ];
  }

  if (
    /^(?:the|a|an)\s+.+\b(?:organ|gland|vessel|bone|joint|muscle|cavity|tube|duct|chamber|sinus|colon|intestine|pharynx|trachea|lung|brain|nerve|tooth|palate|membrane|airway|pleura|sphincter|tonsil|fissure|vertebra|meninx|brainstem|sac|flap|cord|basin)\b/iu.test(
      low
    ) ||
    /voice box|clavicle|bony case|roof of the mouth|canal from|neck of the uterus|air sacs|stacked vertebrae|digestive tube|air space|joint between|thigh bone|breastbone|curved bone|outer covering|clear front window|light-sensing|spiral inner-ear/iu.test(
      low
    )
  ) {
    if (
      /bone|clavicle|joint|skull|rib|jaw|elbow|knee|hip|femur|sternum|vertebra|skeleton/iu.test(
        `${lemma} ${low}`
      )
    ) {
      return [
        pack(
          "bone_fx",
          `The fall produced a fracture involving the ${lemma}.`,
          `The fall broke this structure (${m}).`,
          `跌倒造成${zh}骨折。`
        ),
        pack(
          "bone_tender",
          `The exam found tenderness over the ${lemma} after the fall.`,
          `Pressing this structure (${m}) hurt after the fall.`,
          `跌倒后，查体发现${zh}压痛。`
        )
      ];
    }
    if (
      /tube|duct|esophagus|intestine|colon|ureter|trachea|windpipe|urethra|bronch/iu.test(
        `${lemma} ${low}`
      )
    ) {
      return [
        pack(
          "tube_hold",
          `The scan showed hold-up in the ${lemma}.`,
          `Imaging showed material stalling in this passage (${m}).`,
          `扫描显示${zh}有滞留。`
        ),
        pack(
          "tube_scope",
          `Endoscopy reached the injured lining of the ${lemma}.`,
          `The scope reached the injured lining of this passage (${m}).`,
          `内镜到达了${zh}的损伤黏膜。`
        )
      ];
    }
    if (/vessel|vein|artery|aorta/iu.test(`${lemma} ${low}`)) {
      return [
        pack(
          "vessel_flow",
          `Flow through the ${lemma} was reduced on the scan.`,
          `Imaging showed less flow through this vessel (${m}).`,
          `扫描显示经${zh}的血流减少。`
        ),
        pack(
          "vessel_clot",
          `A clot in the ${lemma} explained the cold, pulseless limb.`,
          `A clot in this vessel (${m}) explained the cold, pulseless limb.`,
          `${zh}内的血栓解释了肢体发冷、无脉。`
        )
      ];
    }
    return [
      pack(
        "anat_exam",
        `The exam localized the injury to the ${lemma}.`,
        `The exam found the injury at this structure (${m}).`,
        `查体把损伤定位在${zh}。`
      ),
      pack(
        "anat_scan",
        `The scan showed swelling around the ${lemma}.`,
        `Imaging showed swelling around this structure (${m}).`,
        `扫描显示${zh}周围肿胀。`
      ),
      pack(
        "anat_op",
        `The operation stayed clear of the ${lemma} whenever possible.`,
        `Surgery avoided this structure (${m}) when it could.`,
        `手术尽可能避开${zh}。`
      )
    ];
  }

  if (
    /fluid|secretion|gas required|liquid part|sticky secretion|semi-fluid|infected fluid|fluid waste|watery secretion|main blood sugar|ion in body fluid/iu.test(
      low
    )
  ) {
    return [
      pack(
        "fluid_sample",
        `Overnight sampling of ${lemma} changed the next decision.`,
        `Overnight sampling of ${m} changed the next decision.`,
        `夜间对${zh}的取样改变了下一步决定。`
      ),
      pack(
        "fluid_low",
        `Too little ${lemma} overnight explained the new dryness and pain.`,
        `Too little of this fluid (${m}) explained the new dryness.`,
        `${zh}过少解释了新出现的干燥和疼痛。`
      )
    ];
  }

  if (
    /^(?:drawing|pushing|taking|the act of|the process of|the special work|the organized microscopic|how acidic|removal of fluid|the sum of|the maintenance|breaking fat|tissue digested|lung tissue becoming|breathing |the stopping|a structural change|the coloring|replacement of tissue|programmed cell death)/iu.test(
      low
    ) ||
    /^(function|architecture|inhalation|exhalation|suction|acidity|ingestion|chewing|swallowing|detoxification|emulsification|autodigestion|hyperventilation|hypoventilation|solidification|hemostasis|metabolism|homeostasis|ulceration|rearrangement|pigmentation)$/u.test(
      lemma
    )
  ) {
    return composeProcessAbstract(lemma, m, zh, low);
  }

  if (
    /therapy|ventilation|supplemental oxygen|machine support|restoration of function|physical methods/iu.test(
      low
    )
  ) {
    return [
      pack(
        "rx_start",
        `After ${lemma} was started, the saturation climbed into the target range.`,
        `After this support (${m}) started, oxygen saturation entered the target range.`,
        `开始${zh}后，血氧饱和度升入目标范围。`
      ),
      pack(
        "rx_wean",
        `As gas exchange improved, ${lemma} was weaned first.`,
        `As gas exchange improved, this support (${m}) was reduced first.`,
        `气体交换改善后，先撤离${zh}。`
      )
    ];
  }

  if (
    /laboratory growth|thin film of cells|dye used|cardiac marker|liver enzyme|specimen|sampling amniotic|chromosome set/iu.test(
      low
    ) ||
    ["culture", "smear", "stain", "specimen", "troponin", "transaminase", "karyotype"].includes(
      lemma
    )
  ) {
    return [
      pack(
        "lab_order",
        `The night order added ${lemma} after the new fever.`,
        `The night order added this test (${m}) after the new fever.`,
        `新发热后，夜间医嘱加做了${zh}。`
      ),
      pack(
        "lab_rise",
        `A rise in ${lemma} marked cell injury after the hypotensive hour.`,
        `This marker (${m}) rose after the hour of low blood pressure.`,
        `低血压那一小时后，${zh}升高提示细胞损伤。`
      )
    ];
  }

  if (
    /opening of|umbilicus|cavity, such as|tonsil|colon |sphincter|joints between|involuntary muscle|skeletal muscle|duct carrying|bone at the base|anterior pituitary|posterior pituitary|narrow connection|brain region including|meninges covering|meningeal layer|network of nerves|sheath around a peripheral|CNS tissue|relay for sensory|axilla|projections, as on the tongue|pharynx beside|pleural layer|arms and legs|ovary or testis|ball-and-socket|primary set of teeth|adult set of teeth|cluster of taste|lymphoid tissue in the nasopharynx|tonsils in the oropharynx/iu.test(
      low
    )
  ) {
    return [
      pack(
        "struct_exam",
        `The exam localized the injury to the ${lemma}.`,
        `The exam found the injury at this structure (${m}).`,
        `查体把损伤定位在${zh}。`
      ),
      pack(
        "struct_scan",
        `The scan showed swelling around the ${lemma}.`,
        `Imaging showed swelling around this structure (${m}).`,
        `扫描显示${zh}周围肿胀。`
      ),
      pack(
        "struct_op",
        `The operation stayed clear of the ${lemma} whenever possible.`,
        `Surgery avoided this structure (${m}) when it could.`,
        `手术尽可能避开${zh}。`
      )
    ];
  }

  if (
    /infectious particle|loss of the ability to move|loss of normal muscle tone|plasma proteins that help antibodies|removal of waste or a drug|abnormal mucosal growths|thick mucus from the airways|sudden narrowing of bronchi|pneumoconiosis|high blood pressure without|uncoordinated muscle twitching|sudden brain injury|material ejected from the stomach|permanently dilated vein|another name for platelets|plasma proteins of the coagulation|pinpoint hemorrhages|clotting-factor deficiency|blood in the urine|blood cancer|enlarged or abnormal lymph|difficult labor|inheritance following|genetics of immune|abnormality present at birth|viral rash illness|psychiatric disorder|congenital gap|main ovarian estrogen|tiny pinpoint/iu.test(
      low
    )
  ) {
    return [
      pack(
        "left_dx",
        `The history, exam, and labs established ${lemma} as the working diagnosis.`,
        `History, exam, and labs made ${m} the working diagnosis.`,
        `病史、查体和化验把${zh}定为工作诊断。`
      ),
      pack(
        "left_course",
        `Despite fluids, ${lemma} continued into the second hospital day.`,
        `${m} was still present on day two despite fluids.`,
        `尽管已经补液，${zh}仍持续到住院第二天。`
      )
    ];
  }

  return fallbackMeaningWraps(lemma, m, zh);
}

function composeAdjective(entry, { m, low, focus, zh, lemma }) {
  if (/^relating to\b/iu.test(low)) {
    if (focus.toLowerCase().includes(lemma.toLowerCase())) {
      return [
        pack(
          "rel_exam_self",
          `The ${lemma} examination correlated with the bedside signs.`,
          `Exam of this region (${m}) matched the bedside signs.`,
          `${zh}检查与床旁体征相符。`
        ),
        pack(
          "rel_findings_self",
          `The ${lemma} findings explained the main complaint rather than a distant system.`,
          `The findings about this region (${m}) explained the main complaint.`,
          `这些${zh}发现解释了主诉，而不是远处系统。`
        )
      ];
    }
    return [
      pack(
        "rel_exam",
        `The ${lemma} examination focused on ${focus}.`,
        `The exam looked at ${focus}.`,
        `${zh}检查聚焦在相关结构上。`
      ),
      pack(
        "rel_findings",
        `The ${lemma} findings involved ${focus} rather than a distant system.`,
        `The findings about ${focus} explained the main complaint.`,
        `这些${zh}发现涉及相关结构，而不是远处系统。`
      )
    ];
  }
  if (/shape of|cube|needle-like|shaped/iu.test(low)) {
    return [
      pack(
        "shape_smear",
        `On the smear the crystals were ${lemma} rather than needle-like.`,
        `The crystals looked ${m}, not like needles.`,
        `涂片上这些结晶是${zh}的，而不是针状。`
      ),
      pack(
        "shape_film",
        `On the film the short bones were ${lemma} rather than elongated.`,
        `The short bones looked ${m} on the film, not long.`,
        `片子上这些短骨是${zh}的，而不是细长的。`
      )
    ];
  }
  if (
    /toward |nearer |farther |above,|below,|dividing the body|midline|front of the body|back of the body|body surface|on the same side|on the opposite side/iu.test(
      low
    )
  ) {
    if (/dividing the body/iu.test(low)) {
      return [
        pack(
          "spat_plane",
          `The ${lemma} plane on the scan divided the body as described.`,
          `That imaging plane (${m}) split the body as described.`,
          `扫描上的${zh}平面按描述分开身体。`
        )
      ];
    }
    return [
      pack(
        "spat_mass",
        `The mass was ${lemma} to the midline vessels.`,
        `The mass sat ${m} relative to the midline vessels.`,
        `肿物位于中线血管的${zh}侧。`
      ),
      pack(
        "spat_cut",
        `The cut was ${lemma} to the scar used as a landmark.`,
        `The cut sat ${m} relative to the scar landmark.`,
        `切口位于作为标志的瘢痕的${zh}方向。`
      )
    ];
  }
  if (/gene|allele|inherit|parent|mutation|twin/iu.test(low)) {
    return [
      pack(
        "gen_family",
        `In this family the trait was ${lemma}.`,
        `In this family the trait was ${m}.`,
        `在这个家系里，该性状是${zh}的。`
      ),
      pack(
        "gen_counsel",
        `Genetic counseling treated the risk as ${lemma}.`,
        `Counseling treated the risk as ${m}.`,
        `遗传咨询把这一风险视为${zh}。`
      )
    ];
  }
  if (
    /beneath the skin|into a muscle|into a vein|by mouth|injection route|under the tongue/iu.test(
      low
    )
  ) {
    return [
      pack(
        "route_given",
        `The drug was given by a ${lemma} route because the gut could not be used.`,
        `The drug went in ${m} because the gut could not be used.`,
        `肠道无法使用时，药物经${zh}途径给予。`
      )
    ];
  }
  if (/having no symptoms/iu.test(low)) {
    return [
      pack(
        "adj_asym",
        `Despite the infiltrate on the film she remained ${lemma}.`,
        `Despite the film change she still had ${m}.`,
        `尽管片子上有浸润，她仍然${zh}。`
      )
    ];
  }
  if (/showing symptoms/iu.test(low)) {
    return [
      pack(
        "adj_sym",
        `He became ${lemma} once the fever and cough started.`,
        `He started ${m} once fever and cough began.`,
        `一旦出现发热和咳嗽，他就变得${zh}。`
      )
    ];
  }
  if (/able to cause death|fatal/iu.test(low)) {
    return [
      pack(
        "adj_fatal",
        `The untreated arrhythmia proved ${lemma} within minutes.`,
        `The untreated rhythm was ${m}.`,
        `未经处理的心律失常在数分钟内证明是${zh}的。`
      )
    ];
  }
  if (/chief or most important/iu.test(low)) {
    return [
      pack(
        "adj_principal",
        `The ${lemma} finding on exam was hypotension, not the incidental murmur.`,
        `The most important finding was low blood pressure, not the extra sound.`,
        `查体的${zh}发现是低血压，而不是偶然的杂音。`
      )
    ];
  }
  if (/on the inside/iu.test(low)) {
    return [
      pack(
        "adj_interior",
        `Bleeding was limited to the ${lemma} surface of the bladder.`,
        `Bleeding stayed on the inner surface of the bladder.`,
        `出血仅限于膀胱的${zh}面。`
      )
    ];
  }
  if (/on the outside/iu.test(low)) {
    return [
      pack(
        "adj_external",
        `The wound involved only the ${lemma} surface of the organ.`,
        `The wound stayed on the outer surface.`,
        `伤口只累及器官的${zh}面。`
      )
    ];
  }
  if (/assisting a main organ/iu.test(low)) {
    return [
      pack(
        "adj_accessory",
        `The ${lemma} muscle assisted the primary mover during inspiration.`,
        `This helping muscle (${m}) joined the main mover.`,
        `${zh}肌在吸气时协助原动肌。`
      )
    ];
  }
  if (/sudden in onset|usually short in course/iu.test(low)) {
    return [
      pack(
        "adj_acute",
        `The pain was ${lemma} in onset and lasted only hours.`,
        `The pain was ${m}.`,
        `疼痛是${zh}起病，只持续数小时。`
      )
    ];
  }
  if (/long-lasting|slowly developing/iu.test(low)) {
    return [
      pack(
        "adj_chronic",
        `The pain was ${lemma} rather than a brief flare.`,
        `The pain was ${m}.`,
        `疼痛是${zh}的，而不是短暂发作。`
      )
    ];
  }
  if (/higher than the reference|elevated/iu.test(low)) {
    return [
      pack(
        "adj_elevated",
        `The overnight potassium was ${lemma} and the ECG changed.`,
        `The overnight potassium was ${m} and the tracing changed.`,
        `夜间血钾${zh}，心电图随之改变。`
      )
    ];
  }
  return [
    pack(
      "adj_exam",
      `The finding was ${lemma} on examination.`,
      `On exam the finding was ${m}.`,
      `查体时该发现是${zh}的。`
    ),
    pack(
      "adj_note",
      `The overnight note described the finding as ${lemma}.`,
      `The night note described the finding as ${m}.`,
      `夜间病程把该发现写成${zh}。`
    )
  ];
}

function composeProcessAbstract(lemma, m, zh, low) {
  if (lemma === "function" || /special work done/iu.test(low)) {
    return [
      pack(
        "fn_lv",
        `Systolic function of the left ventricle fell after the infarct.`,
        `The pumping performance of that chamber declined.`,
        `梗死后左心室收缩功能下降。`
      )
    ];
  }
  if (lemma === "architecture" || /organized microscopic/iu.test(low)) {
    return [
      pack(
        "arch_biopsy",
        `The biopsy kept normal lobular architecture despite mild inflammation.`,
        `Tissue layout of the lobules was still intact.`,
        `活检显示小叶结构仍在，仅有轻度炎症。`
      )
    ];
  }
  if (lemma === "inhalation" || /^drawing air into/iu.test(low)) {
    return [
      pack(
        "inhale_drug",
        `Peak drug levels arrived faster after inhalation than after oral dosing.`,
        `Breathing the medicine in raised blood levels sooner than swallowing it.`,
        `吸入给药比口服更快达到峰浓度。`
      )
    ];
  }
  if (lemma === "exhalation" || /^pushing air out/iu.test(low)) {
    return [
      pack(
        "exhale_co2",
        `Slow exhalation through pursed lips helped dump carbon dioxide.`,
        `Breathing out slowly through pursed lips cleared more carbon dioxide.`,
        `缩唇缓慢呼气有助于排出二氧化碳。`
      )
    ];
  }
  if (lemma === "acidity" || /^how acidic/iu.test(low)) {
    return [
      pack(
        "acid_meal",
        `Gastric acidity rose after the meal and then fell with antacid.`,
        `Stomach pH dropped with food and recovered after the buffer.`,
        `餐后胃酸度升高，抗酸药后又下降。`
      )
    ];
  }
  if (lemma === "suction" || /removal of fluid or tissue by vacuum/iu.test(low)) {
    return [
      pack(
        "suction_airway",
        `Bedside suction cleared the airway of thick secretions.`,
        `A vacuum catheter removed mucus from the airway.`,
        `床旁吸引清除气道内黏痰。`
      )
    ];
  }
  if (
    /taking food, fluid, or a substance by mouth|^the act of grinding|^the act of moving a bolus/iu.test(
      low
    )
  ) {
    return [
      pack(
        "act_meal",
        `Overnight ${lemma} of the tablet still required an intact swallow.`,
        `This act (${m}) still needed a working swallow.`,
        `${zh}仍需要完整的吞咽功能。`
      )
    ];
  }
  return [
    pack(
      "process_occurred",
      `After the insult, ${lemma} occurred in the affected tissue.`,
      `After the insult this process (${m}) took place in the tissue.`,
      `损伤之后，受累组织发生了${zh}。`
    ),
    pack(
      "process_explained",
      `Overnight physiology still depended on ${lemma} remaining intact.`,
      `Overnight physiology still needed this process (${m}) to keep working.`,
      `夜间生理仍取决于${zh}保持完整。`
    )
  ];
}

function fallbackMeaningWraps(lemma, m, zh) {
  return [
    pack(
      "fallback_finding",
      `Exam and labs treated the ${lemma} finding as the active issue.`,
      `Exam and labs treated this problem (${m}) as the active issue.`,
      `查体和化验把${zh}作为当前问题。`
    ),
    pack(
      "fallback_chart",
      `The overnight chart recorded ${lemma} among the active findings.`,
      `The night chart recorded ${m} among the active findings.`,
      `夜间病程把${zh}记入当前发现。`
    ),
    pack(
      "fallback_care",
      `Care still had to account for ${lemma} after the overnight change.`,
      `Care still had to account for ${m} after the overnight change.`,
      `夜间变化后，处理仍需考虑${zh}。`
    )
  ];
}
