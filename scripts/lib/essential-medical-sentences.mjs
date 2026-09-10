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

/** English classroom / teaching frames banned from essential-medical sentences. */
export const CLASSROOM_RE =
  /\bward rounds?\b|\bteaching example\b|\bclassroom\b|\bjuniors?\b|\bregistrar\b|\btutors?\b|\blecture\b|\bglossary\b|labelled slide|labeled slide|textbook chapter|\bchapter on\b|skills lab|revision card|\bwhiteboard\b|morning teaching|history[- ]taking|wall chart|bedside teaching|\btutorial\b|\bquizzes\b|\bquiz\b|teaching conference|teaching lab|teaching note|teaching slide|teaching round|teaching meeting|classroom notes|pair work|students had to|the intern added|labelled classroom/iu;

export const LEMMA_OVERRIDES = {
  phagocytosis: {
    id: "override_phagocytosis",
    sentence: () =>
      "Neutrophils and macrophages used phagocytosis to engulf bacteria and other harmful material.",
    paraphrase: () =>
      "White cells swallowed the bacteria and debris so they could clear them from the tissue.",
    translation: () => "中性粒细胞和巨噬细胞通过吞噬作用吞入细菌和其他有害物质。"
  },
  opsonization: {
    id: "override_opsonization",
    sentence: () =>
      "After opsonization coated the microbe, phagocytes could ingest it much more easily.",
    paraphrase: () =>
      "A protein coat on the microbe made it easier for eating-cells to take it up.",
    translation: () => "调理作用给微生物表面涂上标记后，吞噬细胞就更容易把它吞入。"
  },
  mitosis: {
    id: "override_mitosis",
    sentence: () =>
      "Skin cells completed mitosis and yielded two identical diploid daughters for repair.",
    paraphrase: () => "Ordinary cell division made two matching daughter cells to close the wound.",
    translation: () => "皮肤细胞完成有丝分裂，产生两个相同的二倍体子细胞用于修复。"
  },
  meiosis: {
    id: "override_meiosis",
    sentence: () =>
      "In the gonad, meiosis produced haploid gametes instead of identical body cells.",
    paraphrase: () => "Germ-cell division cut the chromosome number in half to make eggs or sperm.",
    translation: () => "在性腺里，减数分裂产生单倍体配子，而不是相同的体细胞。"
  },
  orally: {
    id: "override_orally",
    sentence: () => "The antibiotic was given orally because she could still swallow safely.",
    paraphrase: () => "The drug went in by mouth, since swallowing was still safe.",
    translation: () => "因为她仍能安全吞咽，抗生素改为口服。"
  },
  intravenously: {
    id: "override_intravenously",
    sentence: () => "Fluids were given intravenously when the gut could not be used.",
    paraphrase: () => "The fluid went straight into a vein because the intestine was not usable.",
    translation: () => "肠道无法使用时，液体改为静脉给予。"
  },
  subcutaneously: {
    id: "override_subcutaneously",
    sentence: () => "The insulin was injected subcutaneously into the abdominal wall.",
    paraphrase: () => "The insulin went into the fat layer under the skin of the belly.",
    translation: () => "胰岛素注射到腹壁皮下。"
  },
  intramuscularly: {
    id: "override_intramuscularly",
    sentence: () => "The vaccine was given intramuscularly in the deltoid.",
    paraphrase: () => "The vaccine went into the shoulder muscle.",
    translation: () => "疫苗经三角肌肌肉注射。"
  },
  "rule out": {
    id: "override_rule_out",
    sentence: () => "They had to rule out pulmonary embolism before sending her home.",
    paraphrase: () => "They needed enough evidence to show PE was unlikely before discharge.",
    translation: () => "在让她回家之前，必须先排除肺栓塞。"
  },
  "follow up": {
    id: "override_follow_up",
    sentence: () => "The clinic will follow up the wound in one week.",
    paraphrase: () => "Someone will check the wound again after a week.",
    translation: () => "门诊一周后复查这处伤口。"
  },
  "work up": {
    id: "override_work_up",
    sentence: () => "They had to work up the new fever before starting antibiotics.",
    paraphrase: () => "They needed history, exam, and tests for the fever first.",
    translation: () => "在用抗生素之前，必须先把新出现的发热查清楚。"
  },
  "flare up": {
    id: "override_flare_up",
    sentence: () => "Her asthma can flare up after a simple viral cold.",
    paraphrase: () => "The chronic airway disease can suddenly worsen after a cold.",
    translation: () => "一次普通病毒性感冒后，她的哮喘就会急性加重。"
  }
};

export const PROCESS_FRAMES = [
  {
    id: "process_wound_clear",
    sentence: (lemma) =>
      `In the wound, host cells used ${lemma} while clearing bacteria and debris.`,
    paraphrase: (_lemma, meaningEn) =>
      `In injured tissue, cells used this process — ${cue(meaningEn)} — to clean up.`,
    translation: (zh) => `伤口里，宿主细胞在清除细菌和碎屑时发生了${zh}。`
  },
  {
    id: "process_tissue_uptake",
    sentence: (lemma) =>
      `Damaged cells and particles were taken up through ${lemma} in the inflamed tissue.`,
    paraphrase: (_lemma, meaningEn) =>
      `The tissue used ${cue(meaningEn)} to take up what did not belong there.`,
    translation: (zh) => `炎症组织通过${zh}把损伤细胞和颗粒吞入或清除。`
  },
  {
    id: "process_host_defense",
    sentence: (lemma) => `Host defense relied on ${lemma} once microbes had entered the tissue.`,
    paraphrase: (_lemma, meaningEn) =>
      `After microbes got in, defense depended on ${cue(meaningEn)}.`,
    translation: (zh) => `微生物进入组织后，宿主防御依靠${zh}。`
  },
  {
    id: "process_membrane",
    sentence: (lemma) =>
      `Across the cell membrane, ${lemma} moved the needed solute in this tissue.`,
    paraphrase: (_lemma, meaningEn) => `At the membrane this was ${cue(meaningEn)}.`,
    translation: (zh) => `在细胞膜两侧，${zh}把所需溶质运过这片组织。`
  },
  {
    id: "process_repair",
    sentence: (lemma) =>
      `During tissue repair, ${lemma} produced the new cells the wound required.`,
    paraphrase: (_lemma, meaningEn) => `Repair used ${cue(meaningEn)} to make the new cells.`,
    translation: (zh) => `组织修复时，${zh}产生伤口所需的新细胞。`
  },
  {
    id: "process_gut_motion",
    sentence: (lemma) => `In the gut wall, ${lemma} moved contents onward between meals.`,
    paraphrase: (_lemma, meaningEn) => `The bowel used ${cue(meaningEn)} to push contents along.`,
    translation: (zh) => `肠壁里，${zh}在餐间把内容物向前推进。`
  },
  {
    id: "process_energy",
    sentence: (lemma) =>
      `In the cytoplasm, ${lemma} released or stored the energy the cell needed.`,
    paraphrase: (_lemma, meaningEn) => `Inside the cell this was ${cue(meaningEn)}.`,
    translation: (zh) => `在细胞质里，${zh}释放或储存细胞所需的能量。`
  },
  {
    id: "process_chart",
    sentence: (lemma) =>
      `The microbiology note recorded ${lemma} as the way the cells cleared the isolate.`,
    paraphrase: (_lemma, meaningEn) =>
      `The lab note named ${cue(meaningEn)} as how the cells cleared the isolate.`,
    translation: (zh) => `微生物报告把细胞清除该分离株的方式写成${zh}。`
  },
  {
    id: "process_biopsy",
    sentence: (lemma) => `The biopsy description mentioned ${lemma} among the cellular reactions.`,
    paraphrase: (_lemma, meaningEn) =>
      `The tissue report listed ${cue(meaningEn)} with the other cell reactions.`,
    translation: (zh) => `活检描述把${zh}写进了细胞反应。`
  },
  {
    id: "process_overnight",
    sentence: (lemma) =>
      `Overnight the infection receded as ${lemma} continued in the affected tissue.`,
    paraphrase: (_lemma, meaningEn) =>
      `Through the night, ${cue(meaningEn)} kept going in the tissue.`,
    translation: (zh) => `夜间，受累组织里的${zh}持续进行，感染随之减退。`
  },
  {
    id: "process_blood",
    sentence: (lemma) => `In circulating blood, ${lemma} helped remove the coated particles.`,
    paraphrase: (_lemma, meaningEn) => `In the blood this process was ${cue(meaningEn)}.`,
    translation: (zh) => `在循环血液中，${zh}帮助清除被标记的颗粒。`
  },
  {
    id: "process_lysosome",
    sentence: (lemma) =>
      `Once inside the cell, ${lemma} finished breaking the ingested material down.`,
    paraphrase: (_lemma, meaningEn) => `After uptake, ${cue(meaningEn)} finished the breakdown.`,
    translation: (zh) => `进入细胞后，${zh}把吞入的物质继续分解。`
  }
];

export const INFLAMMATION_FRAMES = [
  {
    id: "inflam_fever_pain",
    sentence: (lemma) => `Fever and local pain marked ${lemma} in the affected organ.`,
    paraphrase: (_lemma, meaningEn) => `Heat and pain showed ${cue(meaningEn)}.`,
    translation: (zh) => `发热和局部疼痛提示受累器官发生了${zh}。`
  },
  {
    id: "inflam_tenderness",
    sentence: (lemma) =>
      `Tenderness over that region fitted ${lemma} rather than a distant problem.`,
    paraphrase: (_lemma, meaningEn) =>
      `Pressing there hurt in a way that fitted ${cue(meaningEn)}.`,
    translation: (zh) => `该部位压痛更符合${zh}，而不是远处病变。`
  },
  {
    id: "inflam_flare",
    sentence: (lemma) => `The flare of ${lemma} brought loose stool, pain, and a rising CRP.`,
    paraphrase: (_lemma, meaningEn) =>
      `When ${cue(meaningEn)} worsened, stool, pain, and CRP moved together.`,
    translation: (zh) => `${zh}急性加重时出现稀便、疼痛和 CRP 升高。`
  },
  {
    id: "inflam_chart",
    sentence: (lemma) =>
      `The overnight note listed ${lemma} after the new fever and focal findings.`,
    paraphrase: (_lemma, meaningEn) =>
      `The night chart named ${cue(meaningEn)} once fever and a local finding appeared.`,
    translation: (zh) => `夜间病程在新发热和局灶发现后写下了${zh}。`
  },
  {
    id: "inflam_organ",
    sentence: (lemma) => `Imaging was not needed; ${lemma} was already clear at the bedside.`,
    paraphrase: (_lemma, meaningEn) => `Bedside findings already showed ${cue(meaningEn)}.`,
    translation: (zh) => `床旁已经能判断${zh}，不必再为这一炎症另做影像。`
  },
  {
    id: "inflam_course",
    sentence: (lemma) => `After fluids and the first doses, ${lemma} began to settle.`,
    paraphrase: (_lemma, meaningEn) => `${cue(meaningEn)} started to ease after early treatment.`,
    translation: (zh) => `补液和首剂药物之后，${zh}开始回落。`
  },
  {
    id: "inflam_biopsy",
    sentence: (lemma) => `The biopsy confirmed ${lemma} and excluded a competing infection.`,
    paraphrase: (_lemma, meaningEn) =>
      `Tissue exam confirmed ${cue(meaningEn)} and ruled out another infection.`,
    translation: (zh) => `活检证实了${zh}，并排除了另一种感染。`
  },
  {
    id: "inflam_discharge",
    sentence: (lemma) => `The discharge line kept ${lemma} as the working inflammatory diagnosis.`,
    paraphrase: (_lemma, meaningEn) => `The discharge summary still named ${cue(meaningEn)}.`,
    translation: (zh) => `出院小结仍把${zh}作为炎性工作诊断。`
  },
  {
    id: "inflam_mouth",
    sentence: (lemma) => `Pain on swallowing accompanied ${lemma} of the local lining.`,
    paraphrase: (_lemma, meaningEn) => `Swallowing hurt because of ${cue(meaningEn)}.`,
    translation: (zh) => `局部黏膜的${zh}伴随着吞咽痛。`
  },
  {
    id: "inflam_lab",
    sentence: (lemma) => `Rising white cells supported ${lemma} once the local signs were present.`,
    paraphrase: (_lemma, meaningEn) =>
      `The white-cell rise backed ${cue(meaningEn)} after local signs appeared.`,
    translation: (zh) => `局部体征出现后，白细胞升高支持${zh}。`
  }
];

export const STUDY_FRAMES = [
  {
    id: "study_specimen",
    sentence: (lemma) =>
      `The resected specimen needed ${lemma} of the injured region before closure was planned.`,
    paraphrase: (_lemma, meaningEn) =>
      `The specimen had to be read with ${cue(meaningEn)} before the next step.`,
    translation: (zh) => `切除标本需要借助${zh}判断局部情况，再决定如何关闭。`
  },
  {
    id: "study_report",
    sentence: (lemma) => `The operative report used ${lemma} to map the injured structures.`,
    paraphrase: (_lemma, meaningEn) =>
      `The operation note used ${cue(meaningEn)} to map what was hurt.`,
    translation: (zh) => `手术记录用${zh}来标明损伤结构。`
  },
  {
    id: "study_consult",
    sentence: (lemma) => `The consult turned on ${lemma} of how that organ still worked.`,
    paraphrase: (_lemma, meaningEn) =>
      `The consult needed ${cue(meaningEn)} to explain remaining function.`,
    translation: (zh) => `会诊关键在于用${zh}说明该器官还如何工作。`
  },
  {
    id: "study_biopsy",
    sentence: (lemma) =>
      `The biopsy interpretation depended on ${lemma}, not the gross look alone.`,
    paraphrase: (_lemma, meaningEn) =>
      `Reading the biopsy needed ${cue(meaningEn)}, not just the naked-eye look.`,
    translation: (zh) => `活检判读靠${zh}，不能只看大体外观。`
  },
  {
    id: "study_shock",
    sentence: (lemma) =>
      `The shock picture made sense once ${lemma} of output and filling was applied.`,
    paraphrase: (_lemma, meaningEn) =>
      `Shock became clearer using ${cue(meaningEn)} of output and filling.`,
    translation: (zh) => `用${zh}去看心输出和充盈后，休克的图像才说得通。`
  },
  {
    id: "study_smear",
    sentence: (lemma) => `The smear was reported through ${lemma} rather than a bedside guess.`,
    paraphrase: (_lemma, meaningEn) =>
      `The smear result used ${cue(meaningEn)}, not a guess at the bedside.`,
    translation: (zh) => `涂片结果按${zh}报告，而不是床旁猜测。`
  },
  {
    id: "study_hormone",
    sentence: (lemma) => `Abnormal hormone levels were read with ${lemma} of the source glands.`,
    paraphrase: (_lemma, meaningEn) =>
      `The hormone numbers were read using ${cue(meaningEn)} of the glands.`,
    translation: (zh) => `激素异常结合${zh}去看来源腺体。`
  },
  {
    id: "study_behavior",
    sentence: (lemma) =>
      `The unexplained behavior change was reviewed with ${lemma} of mood and cognition.`,
    paraphrase: (_lemma, meaningEn) =>
      `The behavior change was read using ${cue(meaningEn)} of mood and thinking.`,
    translation: (zh) => `不明原因的行为改变结合${zh}去看情绪和认知。`
  }
];

export const ANATOMY_FRAMES = [
  {
    id: "anat_neighbor",
    sentence: (lemma) => `Neighboring tissue stayed intact beside the ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `Tissue next to this structure — ${cue(meaningEn)} — was unhurt.`,
    translation: (zh) => `${zh}旁边的邻近组织仍保持完整。`
  },
  {
    id: "anat_injury",
    sentence: (lemma) => `The injured region included the ${lemma} and the structures next to it.`,
    paraphrase: (_lemma, meaningEn) =>
      `The injury involved this structure (${cue(meaningEn)}) and its neighbors.`,
    translation: (zh) => `损伤范围包括${zh}及其邻近结构。`
  },
  {
    id: "anat_swelling",
    sentence: (lemma) => `Swelling around the ${lemma} limited local movement.`,
    paraphrase: (_lemma, meaningEn) =>
      `Fluid around this structure (${cue(meaningEn)}) made movement stiff.`,
    translation: (zh) => `${zh}周围肿胀，限制了局部活动。`
  },
  {
    id: "anat_scan",
    sentence: (lemma) => `Blood supply to the ${lemma} was still present on the scan.`,
    paraphrase: (_lemma, meaningEn) =>
      `The scan still showed flow to this structure (${cue(meaningEn)}).`,
    translation: (zh) => `扫描仍能看到${zh}的血供。`
  },
  {
    id: "anat_position",
    sentence: (lemma) => `The ${lemma} lay in its usual position in this patient.`,
    paraphrase: (_lemma, meaningEn) =>
      `This structure (${cue(meaningEn)}) was where it normally sits.`,
    translation: (zh) => `该患者体内的${zh}仍在通常位置。`
  },
  {
    id: "anat_pain",
    sentence: (lemma) => `Pain mapped over the ${lemma} rather than a distant site.`,
    paraphrase: (_lemma, meaningEn) =>
      `The pain sat over this structure (${cue(meaningEn)}), not far away.`,
    translation: (zh) => `疼痛定位在${zh}，而不是远处。`
  },
  {
    id: "anat_operation",
    sentence: (lemma) => `The operation stayed clear of the ${lemma} whenever possible.`,
    paraphrase: (_lemma, meaningEn) =>
      `Surgery avoided this structure (${cue(meaningEn)}) when it could.`,
    translation: (zh) => `手术尽可能避开${zh}。`
  },
  {
    id: "anat_edema",
    sentence: (lemma) => `Fluid around the ${lemma} explained the local tightness.`,
    paraphrase: (_lemma, meaningEn) =>
      `Extra fluid around this structure (${cue(meaningEn)}) made the area tight.`,
    translation: (zh) => `${zh}周围的液体解释了局部紧绷。`
  },
  {
    id: "anat_landmark",
    sentence: (lemma) => `The ${lemma} was the landmark used to describe the nearby injury.`,
    paraphrase: (_lemma, meaningEn) =>
      `This structure (${cue(meaningEn)}) was the landmark for the nearby injury.`,
    translation: (zh) => `用${zh}作为标志来描述附近的损伤。`
  },
  {
    id: "anat_recover",
    sentence: (lemma) => `Function returned as the ${lemma} recovered with rest and time.`,
    paraphrase: (_lemma, meaningEn) =>
      `As this structure (${cue(meaningEn)}) recovered, function came back.`,
    translation: (zh) => `随着${zh}在休息中恢复，功能也回来了。`
  },
  {
    id: "anat_that",
    sentence: (lemma, meaningEn) => {
      const clause = String(meaningEn).match(/\bthat\s+(.+)/u);
      if (clause) {
        return `In the body, the ${lemma} is the structure that ${clause[1].replace(/\.$/u, "")}.`;
      }
      return `In the body, the ${lemma} kept its usual place and job.`;
    },
    paraphrase: (_lemma, meaningEn) => {
      const clause = String(meaningEn).match(/\bthat\s+(.+)/u);
      if (clause) {
        return `In the body this is the structure that ${clause[1].replace(/\.$/u, "")}.`;
      }
      return `In the body this structure (${cue(meaningEn)}) kept its usual place and job.`;
    },
    translation: (zh) => `在体内，${zh}就是承担这一功能的结构。`
  },
  {
    id: "anat_chart",
    sentence: (lemma) => `The admission exam described the ${lemma} as unremarkable on that side.`,
    paraphrase: (_lemma, meaningEn) =>
      `The first exam called this structure (${cue(meaningEn)}) unremarkable on that side.`,
    translation: (zh) => `入院查体写该侧${zh}无明显异常。`
  },
  {
    id: "anat_drain",
    sentence: (lemma) => `Lymph from the inflamed area drained toward the ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `Lymph from the inflamed area moved toward this structure (${cue(meaningEn)}).`,
    translation: (zh) => `炎症区的淋巴向${zh}回流。`
  },
  {
    id: "anat_tube",
    sentence: (lemma) => `Contents passed through the ${lemma} without hold-up.`,
    paraphrase: (_lemma, meaningEn) =>
      `Material moved through this structure (${cue(meaningEn)}) without stalling.`,
    translation: (zh) => `内容物通过${zh}时没有滞留。`
  },
  {
    id: "anat_secrete",
    sentence: (lemma) => `The ${lemma} still secreted enough product for basal needs.`,
    paraphrase: (_lemma, meaningEn) =>
      `This structure (${cue(meaningEn)}) still made enough product for baseline needs.`,
    translation: (zh) => `${zh}仍能分泌足够产物满足基础需要。`
  },
  {
    id: "anat_cell_unit",
    sentence: (lemma) => `Each ${lemma} in the tissue kept its usual working parts.`,
    paraphrase: (_lemma, meaningEn) =>
      `Each unit (${cue(meaningEn)}) in the tissue kept its usual working parts.`,
    translation: (zh) => `组织里的每个${zh}仍保持通常的工作结构。`
  }
];

export const PATHOLOGY_FRAMES = [
  {
    id: "path_overnight",
    sentence: (lemma) => `The overnight chart recorded ${lemma} after the new vital-sign change.`,
    paraphrase: (_lemma, meaningEn) =>
      `The night chart named ${cue(meaningEn)} after the new vital-sign change.`,
    translation: (zh) => `生命体征出现新变化后，夜间病程记录了${zh}。`
  },
  {
    id: "path_tissue",
    sentence: (lemma) =>
      `Damaged tissue in this organ showed ${lemma} rather than simple swelling.`,
    paraphrase: (_lemma, meaningEn) =>
      `The damaged organ showed ${cue(meaningEn)}, not just swelling.`,
    translation: (zh) => `该器官的损伤组织表现为${zh}，而不是单纯肿胀。`
  },
  {
    id: "path_blood",
    sentence: (lemma) => `The falling counts fitted ${lemma} better than a lab error.`,
    paraphrase: (_lemma, meaningEn) =>
      `The falling counts fitted ${cue(meaningEn)} better than a bad sample.`,
    translation: (zh) => `计数下降更符合${zh}，而不像标本误差。`
  },
  {
    id: "path_scan",
    sentence: (lemma) => `The scan found ${lemma} in the expected territory of that artery.`,
    paraphrase: (_lemma, meaningEn) =>
      `Imaging found ${cue(meaningEn)} in that artery’s territory.`,
    translation: (zh) => `扫描在该动脉供血区发现了${zh}。`
  },
  {
    id: "path_fever",
    sentence: (lemma) => `New fever and a focal finding made ${lemma} the working problem.`,
    paraphrase: (_lemma, meaningEn) =>
      `Fever plus a local finding made ${cue(meaningEn)} the working problem.`,
    translation: (zh) => `新发热加上局灶发现，把${zh}列为当前问题。`
  },
  {
    id: "path_progress",
    sentence: (lemma) => `Despite fluids, ${lemma} continued into the second hospital day.`,
    paraphrase: (_lemma, meaningEn) =>
      `${cue(meaningEn)} was still present on day two despite fluids.`,
    translation: (zh) => `尽管已经补液，${zh}仍持续到住院第二天。`
  },
  {
    id: "path_biopsy",
    sentence: (lemma) => `Histology confirmed ${lemma} and named the cell type involved.`,
    paraphrase: (_lemma, meaningEn) =>
      `The tissue report confirmed ${cue(meaningEn)} and named the cell type.`,
    translation: (zh) => `组织学证实了${zh}，并写明受累细胞类型。`
  },
  {
    id: "path_discharge",
    sentence: (lemma) => `The discharge summary kept ${lemma} among the principal diagnoses.`,
    paraphrase: (_lemma, meaningEn) =>
      `The discharge summary still listed ${cue(meaningEn)} as a main diagnosis.`,
    translation: (zh) => `出院小结把${zh}留在主要诊断里。`
  },
  {
    id: "path_airway",
    sentence: (lemma) => `Copious sputum and a widened airway fitted ${lemma} in this smoker.`,
    paraphrase: (_lemma, meaningEn) =>
      `Heavy sputum and a wide airway fitted ${cue(meaningEn)} in this smoker.`,
    translation: (zh) => `大量痰液和气道增宽，符合这名吸烟者的${zh}。`
  },
  {
    id: "path_heart",
    sentence: (lemma) => `Falling output and wet lungs made ${lemma} the immediate danger.`,
    paraphrase: (_lemma, meaningEn) =>
      `Low output and wet lungs made ${cue(meaningEn)} the immediate danger.`,
    translation: (zh) => `心输出下降和肺水肿使${zh}成为眼前的危险。`
  },
  {
    id: "path_glucose",
    sentence: (lemma) => `The meter reading fitted ${lemma} and explained the new confusion.`,
    paraphrase: (_lemma, meaningEn) =>
      `The glucose reading fitted ${cue(meaningEn)} and explained the confusion.`,
    translation: (zh) => `血糖读数符合${zh}，也解释了新出现的意识混乱。`
  },
  {
    id: "path_pressure",
    sentence: (lemma) => `Repeated cuff readings established ${lemma} as a standing problem.`,
    paraphrase: (_lemma, meaningEn) =>
      `Repeated blood-pressure readings made ${cue(meaningEn)} a standing problem.`,
    translation: (zh) => `多次袖带测压把${zh}定为持续存在的问题。`
  },
  {
    id: "path_bleed",
    sentence: (lemma) => `Expanding bruising in the tissue pointed to ${lemma} after the knock.`,
    paraphrase: (_lemma, meaningEn) =>
      `Spreading bruise after the knock pointed to ${cue(meaningEn)}.`,
    translation: (zh) => `撞击后组织内瘀斑扩大，指向${zh}。`
  },
  {
    id: "path_tumor",
    sentence: (lemma) => `A distant nodule made ${lemma} more likely than a single local growth.`,
    paraphrase: (_lemma, meaningEn) =>
      `A nodule far from the first growth made ${cue(meaningEn)} more likely.`,
    translation: (zh) => `远处结节使${zh}比单纯局部肿物更像。`
  }
];

export const DRUG_FRAMES = [
  {
    id: "drug_dose",
    sentence: (lemma) => `The first dose of ${lemma} was given once the allergy history was clear.`,
    paraphrase: (_lemma, meaningEn) =>
      `The first dose of this medicine (${cue(meaningEn)}) waited on the allergy history.`,
    translation: (zh) => `过敏史问清后，给予了首剂${zh}。`
  },
  {
    id: "drug_fever",
    sentence: (lemma) => `Fever fell after ${lemma} was given with the other supportive measures.`,
    paraphrase: (_lemma, meaningEn) =>
      `The fever dropped after this medicine (${cue(meaningEn)}) plus supportive care.`,
    translation: (zh) => `给予${zh}并配合支持治疗后，发热下降。`
  },
  {
    id: "drug_pain",
    sentence: (lemma) => `Pain scores improved once ${lemma} was timed around dressing changes.`,
    paraphrase: (_lemma, meaningEn) =>
      `Pain eased when this medicine (${cue(meaningEn)}) was timed around dressings.`,
    translation: (zh) => `把${zh}安排在换药前后，疼痛评分下降。`
  },
  {
    id: "drug_infection",
    sentence: (lemma) => `The isolate’s panel showed why ${lemma} was the remaining oral option.`,
    paraphrase: (_lemma, meaningEn) =>
      `The culture panel explained why this medicine (${cue(meaningEn)}) was the oral option left.`,
    translation: (zh) => `药敏结果说明为何只剩下口服${zh}可选。`
  },
  {
    id: "drug_stop",
    sentence: (lemma) => `The overnight order stopped ${lemma} after the new rash appeared.`,
    paraphrase: (_lemma, meaningEn) =>
      `The night order stopped this medicine (${cue(meaningEn)}) when the rash appeared.`,
    translation: (zh) => `新皮疹出现后，夜间医嘱停用了${zh}。`
  },
  {
    id: "drug_route",
    sentence: (lemma) => `When swallowing failed, ${lemma} was switched to an injectable form.`,
    paraphrase: (_lemma, meaningEn) =>
      `When she could not swallow, this medicine (${cue(meaningEn)}) became an injection.`,
    translation: (zh) => `无法吞咽时，${zh}改成注射剂型。`
  },
  {
    id: "drug_effect",
    sentence: (lemma) =>
      `The intended action of ${lemma} was accompanied by an unwanted extra reaction.`,
    paraphrase: (_lemma, meaningEn) =>
      `This medicine (${cue(meaningEn)}) did its job but also caused an unwanted extra reaction.`,
    translation: (zh) => `${zh}在发挥预期作用的同时，也出现了不良反应。`
  },
  {
    id: "drug_chart",
    sentence: (lemma) => `The medication list kept ${lemma} with the indication beside it.`,
    paraphrase: (_lemma, meaningEn) =>
      `The drug list kept this medicine (${cue(meaningEn)}) and why it was given.`,
    translation: (zh) => `用药清单保留${zh}，并在旁边写明适应证。`
  }
];

export const IMAGING_FRAMES = [
  {
    id: "img_chest",
    sentence: (lemma) => `The chest ${lemma} showed an opacity at the base after the fever began.`,
    paraphrase: (_lemma, meaningEn) =>
      `The chest study (${cue(meaningEn)}) showed a basal opacity after the fever.`,
    translation: (zh) => `发热后，胸部${zh}显示基底部有一处阴影。`
  },
  {
    id: "img_report",
    sentence: (lemma) => `The report used ${lemma} to show the collection before drainage.`,
    paraphrase: (_lemma, meaningEn) =>
      `The report used this study (${cue(meaningEn)}) to show the collection before drainage.`,
    translation: (zh) => `引流前，报告用${zh}显示了那处积液。`
  },
  {
    id: "img_contrast",
    sentence: (lemma) => `After contrast, ${lemma} made the vessel wall easier to see.`,
    paraphrase: (_lemma, meaningEn) =>
      `Contrast plus this study (${cue(meaningEn)}) made the vessel wall easier to see.`,
    translation: (zh) => `造影后，${zh}让管壁更容易看见。`
  },
  {
    id: "img_heart",
    sentence: (lemma) => `The ${lemma} tracing changed after the episode of chest pain.`,
    paraphrase: (_lemma, meaningEn) =>
      `This recording (${cue(meaningEn)}) changed after the chest-pain episode.`,
    translation: (zh) => `胸痛发作后，${zh}描记发生了变化。`
  },
  {
    id: "img_compare",
    sentence: (lemma) => `Compared with yesterday, today’s ${lemma} showed less air-space filling.`,
    paraphrase: (_lemma, meaningEn) =>
      `Today’s study (${cue(meaningEn)}) showed less air-space filling than yesterday.`,
    translation: (zh) => `与昨天相比，今天的${zh}显示气腔填充减少。`
  },
  {
    id: "img_bedside",
    sentence: (lemma) => `Bedside ${lemma} was enough to guide the next needle pass.`,
    paraphrase: (_lemma, meaningEn) =>
      `A bedside study (${cue(meaningEn)}) was enough to guide the next needle pass.`,
    translation: (zh) => `床旁${zh}已足够指导下一次进针。`
  },
  {
    id: "img_head",
    sentence: (lemma) => `Urgent ${lemma} of the head excluded a large bleed.`,
    paraphrase: (_lemma, meaningEn) =>
      `Urgent imaging (${cue(meaningEn)}) of the head showed no large bleed.`,
    translation: (zh) => `紧急头部${zh}排除了大出血。`
  },
  {
    id: "img_follow",
    sentence: (lemma) => `Follow-up ${lemma} was timed after the white-cell count peaked.`,
    paraphrase: (_lemma, meaningEn) =>
      `Repeat imaging (${cue(meaningEn)}) waited until the white-cell count peaked.`,
    translation: (zh) => `白细胞计数见顶后再安排复查${zh}。`
  }
];

export const LAB_FRAMES = [
  {
    id: "lab_specimen",
    sentence: (lemma) => `The ${lemma} from the wound grew the same isolate as the blood.`,
    paraphrase: (_lemma, meaningEn) =>
      `This sample (${cue(meaningEn)}) from the wound grew the same isolate as the blood.`,
    translation: (zh) => `伤口${zh}培养出的分离株与血培养一致。`
  },
  {
    id: "lab_rise",
    sentence: (lemma) => `A rise in ${lemma} marked hepatocyte injury after the hypotensive hour.`,
    paraphrase: (_lemma, meaningEn) =>
      `This marker (${cue(meaningEn)}) rose after the hour of low blood pressure.`,
    translation: (zh) => `低血压那一小时后，${zh}升高提示肝细胞损伤。`
  },
  {
    id: "lab_cardiac",
    sentence: (lemma) => `Serial ${lemma} confirmed myocardial injury after the ST change.`,
    paraphrase: (_lemma, meaningEn) =>
      `Repeated measures of this marker (${cue(meaningEn)}) confirmed heart-muscle injury.`,
    translation: (zh) => `ST 改变后，连续检测${zh}证实了心肌损伤。`
  },
  {
    id: "lab_smear",
    sentence: (lemma) => `The ${lemma} showed organisms before the culture turned positive.`,
    paraphrase: (_lemma, meaningEn) =>
      `This preparation (${cue(meaningEn)}) showed organisms before the culture turned positive.`,
    translation: (zh) => `培养转阳之前，${zh}已经看到微生物。`
  },
  {
    id: "lab_dye",
    sentence: (lemma) => `The ${lemma} made the cell walls visible on the slide.`,
    paraphrase: (_lemma, meaningEn) => `This dye (${cue(meaningEn)}) made the cell walls visible.`,
    translation: (zh) => `${zh}使玻片上的细胞壁变得可见。`
  },
  {
    id: "lab_order",
    sentence: (lemma) => `The night order added ${lemma} after the new fever.`,
    paraphrase: (_lemma, meaningEn) =>
      `The night order added this test (${cue(meaningEn)}) after the new fever.`,
    translation: (zh) => `新发热后，夜间医嘱加做了${zh}。`
  },
  {
    id: "lab_error",
    sentence: (lemma) => `A hemolyzed tube made the first ${lemma} unusable.`,
    paraphrase: (_lemma, meaningEn) =>
      `A broken-cell sample made the first result (${cue(meaningEn)}) unusable.`,
    translation: (zh) => `溶血标本使第一次${zh}无法采用。`
  },
  {
    id: "lab_trend",
    sentence: (lemma) => `The falling ${lemma} tracked clinical improvement.`,
    paraphrase: (_lemma, meaningEn) =>
      `This falling marker (${cue(meaningEn)}) tracked clinical improvement.`,
    translation: (zh) => `${zh}下降与临床好转同步。`
  }
];

export const TREATMENT_FRAMES = [
  {
    id: "rx_oxygen",
    sentence: (lemma) =>
      `After ${lemma} was started, the saturation climbed into the target range.`,
    paraphrase: (_lemma, meaningEn) =>
      `After this support (${cue(meaningEn)}) started, oxygen saturation entered the target range.`,
    translation: (zh) => `开始${zh}后，血氧饱和度升入目标范围。`
  },
  {
    id: "rx_airway",
    sentence: (lemma) => `Failing gas exchange made ${lemma} necessary that night.`,
    paraphrase: (_lemma, meaningEn) =>
      `Failing gas exchange made this support (${cue(meaningEn)}) necessary that night.`,
    translation: (zh) => `气体交换失败，当晚必须开始${zh}。`
  },
  {
    id: "rx_function",
    sentence: (lemma) => `Daily ${lemma} restored movement at the stiff joint.`,
    paraphrase: (_lemma, meaningEn) =>
      `Daily treatment (${cue(meaningEn)}) brought movement back at the stiff joint.`,
    translation: (zh) => `每天进行${zh}后，僵硬关节的活动恢复。`
  },
  {
    id: "rx_cancer",
    sentence: (lemma) => `The cycle of ${lemma} was delayed until counts recovered.`,
    paraphrase: (_lemma, meaningEn) =>
      `This cancer or microbe treatment (${cue(meaningEn)}) waited until counts recovered.`,
    translation: (zh) => `等血细胞计数恢复后，才开始这一周期的${zh}。`
  },
  {
    id: "rx_fluid",
    sentence: (lemma) => `Careful ${lemma} corrected the deficit without flooding the lungs.`,
    paraphrase: (_lemma, meaningEn) =>
      `Careful fluid replacement (${cue(meaningEn)}) closed the deficit without flooding the lungs.`,
    translation: (zh) => `谨慎的${zh}纠正了缺失，又没有灌满肺。`
  },
  {
    id: "rx_rehab",
    sentence: (lemma) => `Early ${lemma} after the stroke targeted walking and swallow.`,
    paraphrase: (_lemma, meaningEn) =>
      `Early recovery work (${cue(meaningEn)}) after the stroke targeted walking and swallow.`,
    translation: (zh) => `卒中后尽早开始${zh}，重点是行走和吞咽。`
  },
  {
    id: "rx_chart",
    sentence: (lemma) => `The plan kept ${lemma} as a time-limited intervention.`,
    paraphrase: (_lemma, meaningEn) =>
      `The plan kept this intervention (${cue(meaningEn)}) time-limited.`,
    translation: (zh) => `计划把${zh}作为有时限的干预。`
  },
  {
    id: "rx_wean",
    sentence: (lemma) => `As gas exchange improved, ${lemma} was weaned first.`,
    paraphrase: (_lemma, meaningEn) =>
      `As gas exchange improved, this support (${cue(meaningEn)}) was reduced first.`,
    translation: (zh) => `气体交换改善后，先撤离${zh}。`
  }
];

export const GENERIC_NOUN_FRAMES = [
  {
    id: "gen_overnight",
    sentence: (lemma) => `The overnight note recorded ${lemma} among the active findings.`,
    paraphrase: (_lemma, meaningEn) =>
      `The night note listed ${cue(meaningEn)} among the active findings.`,
    translation: (zh) => `夜间病程把${zh}记入当前发现。`
  },
  {
    id: "gen_change",
    sentence: (lemma) => `In this patient, ${lemma} explained the change in function.`,
    paraphrase: (_lemma, meaningEn) => `Here, ${cue(meaningEn)} explained why function changed.`,
    translation: (zh) => `在该患者身上，${zh}解释了功能为何改变。`
  },
  {
    id: "gen_tissue",
    sentence: (lemma) =>
      `The affected tissue showed ${lemma} together with the expected local reaction.`,
    paraphrase: (_lemma, meaningEn) =>
      `The tissue showed ${cue(meaningEn)} plus the expected local reaction.`,
    translation: (zh) => `受累组织出现${zh}，并伴有预期的局部反应。`
  },
  {
    id: "gen_scan",
    sentence: (lemma) => `The scan description named ${lemma} in the region of interest.`,
    paraphrase: (_lemma, meaningEn) =>
      `The scan named ${cue(meaningEn)} in the region of interest.`,
    translation: (zh) => `扫描描述在兴趣区写到了${zh}。`
  },
  {
    id: "gen_lab",
    sentence: (lemma) => `The laboratory comment linked the numbers to ${lemma}.`,
    paraphrase: (_lemma, meaningEn) => `The lab comment linked the numbers to ${cue(meaningEn)}.`,
    translation: (zh) => `化验备注把这些数字和${zh}联系起来。`
  },
  {
    id: "gen_bedside",
    sentence: (lemma) =>
      `At the bedside the main finding was ${lemma}, not a looser everyday word.`,
    paraphrase: (_lemma, meaningEn) => `At the bedside the precise finding was ${cue(meaningEn)}.`,
    translation: (zh) => `床旁的主要发现是${zh}，而不是更含糊的日常说法。`
  },
  {
    id: "gen_course",
    sentence: (lemma) => `Over the first night, ${lemma} remained the finding that directed care.`,
    paraphrase: (_lemma, meaningEn) =>
      `Through the first night, ${cue(meaningEn)} still directed care.`,
    translation: (zh) => `第一夜里，仍是${zh}在指导处理。`
  },
  {
    id: "gen_admit",
    sentence: (lemma) => `The admission summary placed ${lemma} with the early working problems.`,
    paraphrase: (_lemma, meaningEn) =>
      `The first summary listed ${cue(meaningEn)} among the early problems.`,
    translation: (zh) => `入院小结把${zh}放进初步问题。`
  },
  {
    id: "gen_handover",
    sentence: (lemma) => `Night handover named ${lemma} before the checks that followed.`,
    paraphrase: (_lemma, meaningEn) =>
      `The night team named ${cue(meaningEn)} before the later checks.`,
    translation: (zh) => `夜班交接先提到${zh}，再讲后续核对。`
  },
  {
    id: "gen_response",
    sentence: (lemma) => `The host response in this tissue included ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `The body’s response in this tissue included ${cue(meaningEn)}.`,
    translation: (zh) => `这片组织的宿主反应包括${zh}。`
  },
  {
    id: "gen_function",
    sentence: (lemma) => `Normal function in this region still depended on ${lemma}.`,
    paraphrase: (_lemma, meaningEn) => `Normal function here still depended on ${cue(meaningEn)}.`,
    translation: (zh) => `该区域的正常功能仍依赖${zh}。`
  },
  {
    id: "gen_discharge",
    sentence: (lemma) => `The discharge plan still had to account for ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `The discharge plan still had to account for ${cue(meaningEn)}.`,
    translation: (zh) => `出院计划仍需考虑${zh}。`
  },
  {
    id: "gen_compare",
    sentence: (lemma) => `Today’s picture of ${lemma} was milder than yesterday’s.`,
    paraphrase: (_lemma, meaningEn) =>
      `Today’s picture of ${cue(meaningEn)} was milder than yesterday’s.`,
    translation: (zh) => `今天的${zh}比昨天轻。`
  },
  {
    id: "gen_procedure",
    sentence: (lemma) => `After the procedure, ${lemma} was the finding watched most closely.`,
    paraphrase: (_lemma, meaningEn) =>
      `After the procedure, ${cue(meaningEn)} was watched most closely.`,
    translation: (zh) => `操作之后，最密切观察的是${zh}。`
  },
  {
    id: "gen_plain",
    sentence: (lemma) => `The progress line mentioned ${lemma} in one plain sentence.`,
    paraphrase: (_lemma, meaningEn) =>
      `The progress line used one plain sentence for ${cue(meaningEn)}.`,
    translation: (zh) => `病程用一句平实的话写到了${zh}。`
  },
  {
    id: "gen_body",
    sentence: (lemma) =>
      `In the body this presented as ${lemma} rather than an unrelated distant change.`,
    paraphrase: (_lemma, meaningEn) =>
      `In the body this presented as ${cue(meaningEn)}, not an unrelated distant change.`,
    translation: (zh) => `在体内，表现是${zh}，而不是无关的远处改变。`
  }
];

export const PHRASE_FRAMES = [
  {
    id: "phrase_note",
    sentence: (lemma) => `The case note named the ${lemma} before describing what happened next.`,
    paraphrase: (_lemma, meaningEn) =>
      `The note first named ${cue(meaningEn)}, then said what followed.`,
    translation: (zh) => `病历先写出${zh}，再写接下来发生了什么。`
  },
  {
    id: "phrase_body",
    sentence: (lemma) => `In the body, the ${lemma} kept its usual role during the acute illness.`,
    paraphrase: (_lemma, meaningEn) =>
      `In the body, ${cue(meaningEn)} kept its usual role during the acute illness.`,
    translation: (zh) => `急性病期间，体内的${zh}仍发挥通常作用。`
  },
  {
    id: "phrase_chart",
    sentence: (lemma) => `The overnight chart kept the ${lemma} on its own line.`,
    paraphrase: (_lemma, meaningEn) => `The night chart kept ${cue(meaningEn)} on its own line.`,
    translation: (zh) => `夜间病程给${zh}单独留了一行。`
  },
  {
    id: "phrase_scan",
    sentence: (lemma) => `The scan localized the ${lemma} before any later complication.`,
    paraphrase: (_lemma, meaningEn) =>
      `The scan localized ${cue(meaningEn)} before later complications.`,
    translation: (zh) => `扫描在后续并发症出现前定位了${zh}。`
  },
  {
    id: "phrase_function",
    sentence: (lemma) => `Bedside measurements showed what the ${lemma} was doing in real time.`,
    paraphrase: (_lemma, meaningEn) =>
      `Bedside numbers showed what ${cue(meaningEn)} was doing in real time.`,
    translation: (zh) => `床旁测量显示了${zh}当时的实际作用。`
  },
  {
    id: "phrase_admit",
    sentence: (lemma) => `The admission exam listed the ${lemma} with the other system findings.`,
    paraphrase: (_lemma, meaningEn) =>
      `The first exam listed ${cue(meaningEn)} with the other system findings.`,
    translation: (zh) => `入院查体把${zh}和其他系统发现写在一起。`
  },
  {
    id: "phrase_cell",
    sentence: (lemma) => `In this tissue the ${lemma} was the working unit that still mattered.`,
    paraphrase: (_lemma, meaningEn) =>
      `In this tissue ${cue(meaningEn)} was the working unit that still mattered.`,
    translation: (zh) => `在这片组织里，${zh}仍是起作用的单位。`
  },
  {
    id: "phrase_flow",
    sentence: (lemma) => `Forward flow depended on the ${lemma} staying adequate.`,
    paraphrase: (_lemma, meaningEn) =>
      `Forward flow depended on ${cue(meaningEn)} staying adequate.`,
    translation: (zh) => `前向血流取决于${zh}是否足够。`
  },
  {
    id: "phrase_symptom",
    sentence: (lemma) => `She reported the ${lemma} as the complaint that brought her in.`,
    paraphrase: (_lemma, meaningEn) =>
      `She reported ${cue(meaningEn)} as the complaint that brought her in.`,
    translation: (zh) => `她把${zh}说成促使就诊的主诉。`
  },
  {
    id: "phrase_support",
    sentence: (lemma) => `Once gas exchange failed, the ${lemma} had to be started.`,
    paraphrase: (_lemma, meaningEn) =>
      `Once gas exchange failed, ${cue(meaningEn)} had to be started.`,
    translation: (zh) => `气体交换失败后，必须开始${zh}。`
  },
  {
    id: "phrase_lab",
    sentence: (lemma) => `The laboratory value for the ${lemma} moved with the clinical change.`,
    paraphrase: (_lemma, meaningEn) =>
      `The laboratory value for ${cue(meaningEn)} moved with the clinical change.`,
    translation: (zh) => `${zh}的化验数值随临床变化而动。`
  },
  {
    id: "phrase_discharge",
    sentence: (lemma) => `The discharge advice still mentioned the ${lemma} in plain language.`,
    paraphrase: (_lemma, meaningEn) =>
      `The discharge advice still mentioned ${cue(meaningEn)} in plain language.`,
    translation: (zh) => `出院医嘱仍用明白的话提到${zh}。`
  }
];

export const ADJ_RELATING_FRAMES = [
  {
    id: "adjrel_findings",
    sentence: (lemma) => `The ${lemma} findings explained the main complaint in this admission.`,
    paraphrase: (_lemma, meaningEn) =>
      `Findings about ${relatingFocus(meaningEn)} explained the main complaint.`,
    translation: (zh) => `这些${zh}发现解释了此次入院的主诉。`
  },
  {
    id: "adjrel_exam",
    sentence: (lemma) => `The ${lemma} examination focused on the organs of that system.`,
    paraphrase: (_lemma, meaningEn) =>
      `The exam of ${relatingFocus(meaningEn)} focused on those organs.`,
    translation: (zh) => `${zh}检查聚焦在该系统的器官上。`
  },
  {
    id: "adjrel_overnight",
    sentence: (lemma) => `Overnight the ${lemma} picture directed the fluids and the monitoring.`,
    paraphrase: (_lemma, meaningEn) =>
      `Overnight the picture of ${relatingFocus(meaningEn)} directed fluids and monitoring.`,
    translation: (zh) => `夜间正是${zh}的情况在指导补液和监测。`
  },
  {
    id: "adjrel_scan",
    sentence: (lemma) => `The ${lemma} imaging correlated with the bedside signs.`,
    paraphrase: (_lemma, meaningEn) =>
      `Imaging of ${relatingFocus(meaningEn)} matched the bedside signs.`,
    translation: (zh) => `${zh}影像与床旁体征相符。`
  },
  {
    id: "adjrel_lab",
    sentence: (lemma) => `The ${lemma} laboratory panel moved with the clinical course.`,
    paraphrase: (_lemma, meaningEn) =>
      `The laboratory panel for ${relatingFocus(meaningEn)} moved with the course.`,
    translation: (zh) => `${zh}化验组合随病程变化。`
  },
  {
    id: "adjrel_plan",
    sentence: (lemma) => `The plan stayed ${lemma} until that system stabilized.`,
    paraphrase: (_lemma, meaningEn) =>
      `The plan stayed focused on ${relatingFocus(meaningEn)} until that system stabilized.`,
    translation: (zh) => `在该系统稳定前，计划一直针对${zh}问题。`
  },
  {
    id: "adjrel_discharge",
    sentence: (lemma) => `The discharge advice remained ${lemma} rather than generic.`,
    paraphrase: (_lemma, meaningEn) =>
      `The discharge advice stayed about ${relatingFocus(meaningEn)}, not generic.`,
    translation: (zh) => `出院医嘱仍针对${zh}，而不是泛泛而谈。`
  },
  {
    id: "adjrel_risk",
    sentence: (lemma) => `The ${lemma} risk was the one written at the top of the note.`,
    paraphrase: (_lemma, meaningEn) =>
      `The risk involving ${relatingFocus(meaningEn)} sat at the top of the note.`,
    translation: (zh) => `病程最上边写的是${zh}风险。`
  },
  {
    id: "adjrel_support",
    sentence: (lemma) => `Supportive care targeted the ${lemma} failure first.`,
    paraphrase: (_lemma, meaningEn) =>
      `Supportive care targeted failure of ${relatingFocus(meaningEn)} first.`,
    translation: (zh) => `支持治疗先针对${zh}功能衰竭。`
  },
  {
    id: "adjrel_plain",
    sentence: (lemma) => `The note used ${lemma} because the system involved was that one.`,
    paraphrase: (_lemma, meaningEn) =>
      `The note used this adjective because the system was ${relatingFocus(meaningEn)}.`,
    translation: (zh) => `病历用${zh}，因为受累的就是这一系统。`
  }
];

export const ADJ_ANATOMY_FRAMES = [
  {
    id: "adjspat_landmark",
    sentence: (lemma) => `The cut was ${lemma} to the landmark used in the note.`,
    paraphrase: (_lemma, meaningEn) =>
      `The cut sat ${cue(meaningEn)} relative to the landmark in the note.`,
    translation: (zh) => `切口位于病历所用标志的${zh}方向。`
  },
  {
    id: "adjspat_pain",
    sentence: (lemma) => `The pain was ${lemma} to the scar from last year’s operation.`,
    paraphrase: (_lemma, meaningEn) =>
      `The pain sat ${cue(meaningEn)} relative to last year’s scar.`,
    translation: (zh) => `疼痛在去年手术瘢痕的${zh}侧。`
  },
  {
    id: "adjspat_pulse",
    sentence: (lemma) => `The pulse was easier to feel on the ${lemma} side.`,
    paraphrase: (_lemma, meaningEn) =>
      `The pulse was easier to feel on the side that is ${cue(meaningEn)}.`,
    translation: (zh) => `${zh}那一侧的脉搏更好摸到。`
  },
  {
    id: "adjspat_wound",
    sentence: (lemma) => `The wound edge was ${lemma} and needed a second look.`,
    paraphrase: (_lemma, meaningEn) =>
      `The wound edge was ${cue(meaningEn)} and needed a second look.`,
    translation: (zh) => `伤口边缘偏${zh}，需要再看一次。`
  },
  {
    id: "adjspat_plane",
    sentence: (lemma) => `The ${lemma} plane divided the region as the scan described.`,
    paraphrase: (_lemma, meaningEn) =>
      `This plane (${cue(meaningEn)}) divided the region as the scan described.`,
    translation: (zh) => `扫描所示的${zh}平面把该区域分开。`
  },
  {
    id: "adjspat_slice",
    sentence: (lemma) => `A ${lemma} slice through the abdomen showed the collection.`,
    paraphrase: (_lemma, meaningEn) =>
      `A slice ${cue(meaningEn)} through the abdomen showed the collection.`,
    translation: (zh) => `经腹部的${zh}层面显示了那处积液。`
  },
  {
    id: "adjspat_mass",
    sentence: (lemma) => `The mass was ${lemma} to the midline vessels.`,
    paraphrase: (_lemma, meaningEn) =>
      `The mass sat ${cue(meaningEn)} relative to the midline vessels.`,
    translation: (zh) => `肿物位于中线血管的${zh}侧。`
  },
  {
    id: "adjspat_note",
    sentence: (lemma) =>
      `The chart kept the wording ${lemma} so the next examiner could find the spot.`,
    paraphrase: (_lemma, meaningEn) =>
      `The chart kept the sense ${cue(meaningEn)} so the next examiner could find the spot.`,
    translation: (zh) => `病历坚持写成${zh}，方便下一位检查者找到位置。`
  },
  {
    id: "adjspat_both",
    sentence: (lemma) => `Findings were ${lemma}, not confined to one limb.`,
    paraphrase: (_lemma, meaningEn) => `Findings were ${cue(meaningEn)}, not confined to one limb.`,
    translation: (zh) => `发现是${zh}的，并不限于一侧肢体。`
  },
  {
    id: "adjspat_surface",
    sentence: (lemma) => `The collection was ${lemma} rather than buried in muscle.`,
    paraphrase: (_lemma, meaningEn) =>
      `The collection was ${cue(meaningEn)} rather than buried in muscle.`,
    translation: (zh) => `积液偏${zh}，而不是深埋在肌肉里。`
  },
  {
    id: "adjspat_head",
    sentence: (lemma) => `The lesion sat ${lemma} to the reference point on the skull.`,
    paraphrase: (_lemma, meaningEn) =>
      `The lesion sat ${cue(meaningEn)} relative to the skull landmark.`,
    translation: (zh) => `病灶位于颅骨参照点的${zh}方向。`
  },
  {
    id: "adjspat_limb",
    sentence: (lemma) => `Strength was weaker ${lemma} to the injury.`,
    paraphrase: (_lemma, meaningEn) =>
      `Strength was weaker in the direction that is ${cue(meaningEn)} to the injury.`,
    translation: (zh) => `损伤${zh}方向的肌力更弱。`
  }
];

export const ADJ_CLINICAL_FRAMES = [
  {
    id: "adj_exam",
    sentence: (lemma) => `The finding was ${lemma} on examination.`,
    paraphrase: (_lemma, meaningEn) => `On exam the finding was ${cue(meaningEn)}.`,
    translation: (zh) => `查体时该发现是${zh}的。`
  },
  {
    id: "adj_course",
    sentence: (lemma) => `Her course stayed ${lemma} from admission through the first night.`,
    paraphrase: (_lemma, meaningEn) =>
      `From admission through the first night, the picture remained ${cue(meaningEn)}.`,
    translation: (zh) => `从入院到第一夜，病程一直是${zh}的。`
  },
  {
    id: "adj_note",
    sentence: (lemma) => `The note used ${lemma} to mark the quality of the finding.`,
    paraphrase: (_lemma, meaningEn) =>
      `The chart used this adjective to say the finding was ${cue(meaningEn)}.`,
    translation: (zh) => `病历用这个词标明该发现是${zh}的。`
  },
  {
    id: "adj_plan",
    sentence: (lemma) => `The plan stayed ${lemma} until culture results returned.`,
    paraphrase: (_lemma, meaningEn) =>
      `The plan stayed ${cue(meaningEn)} until culture results returned.`,
    translation: (zh) => `培养结果出来前，计划一直保持${zh}。`
  },
  {
    id: "adj_vessel",
    sentence: (lemma) => `The vessel was ${lemma} on the second look.`,
    paraphrase: (_lemma, meaningEn) => `The vessel was ${cue(meaningEn)} when they looked again.`,
    translation: (zh) => `再看时，血管是${zh}的。`
  },
  {
    id: "adj_treatment",
    sentence: (lemma) => `The first regimen was ${lemma} rather than aimed at cure.`,
    paraphrase: (_lemma, meaningEn) =>
      `The first regimen was ${cue(meaningEn)} rather than aimed at cure.`,
    translation: (zh) => `第一方案是${zh}的，而不是以根治为目标。`
  },
  {
    id: "adj_response",
    sentence: (lemma) => `The infection proved ${lemma} to the first drug.`,
    paraphrase: (_lemma, meaningEn) =>
      `The infection was ${cue(meaningEn)} relative to the first drug.`,
    translation: (zh) => `感染对第一种药表现为${zh}。`
  },
  {
    id: "adj_spread",
    sentence: (lemma) => `The change was ${lemma} rather than confined to one spot.`,
    paraphrase: (_lemma, meaningEn) =>
      `The change was ${cue(meaningEn)} rather than confined to one spot.`,
    translation: (zh) => `这一改变是${zh}的，并不限于一点。`
  },
  {
    id: "adj_time",
    sentence: (lemma) => `The pain was ${lemma} through the afternoon, then eased.`,
    paraphrase: (_lemma, meaningEn) =>
      `The pain was ${cue(meaningEn)} through the afternoon, then eased.`,
    translation: (zh) => `疼痛在整个下午都是${zh}的，随后减轻。`
  },
  {
    id: "adj_degree",
    sentence: (lemma) => `The episode was ${lemma} enough to need the monitor overnight.`,
    paraphrase: (_lemma, meaningEn) =>
      `The episode was ${cue(meaningEn)} enough to need overnight monitoring.`,
    translation: (zh) => `这次发作${zh}到需要夜间监护。`
  },
  {
    id: "adj_origin",
    sentence: (lemma) =>
      `The process was ${lemma} in this patient, not copied from another disease.`,
    paraphrase: (_lemma, meaningEn) =>
      `Here the process was ${cue(meaningEn)}, not copied from another disease.`,
    translation: (zh) => `该患者身上这一过程是${zh}的，不是从另一种病转来的。`
  },
  {
    id: "adj_fever",
    sentence: (lemma) => `She remained ${lemma} after the first doses of antipyretic.`,
    paraphrase: (_lemma, meaningEn) =>
      `After the first fever medicine she remained ${cue(meaningEn)}.`,
    translation: (zh) => `首剂退热药之后，她仍是${zh}的。`
  },
  {
    id: "adj_timing",
    sentence: (lemma) => `The operation was ${lemma}, not moved up as an emergency.`,
    paraphrase: (_lemma, meaningEn) =>
      `The operation was ${cue(meaningEn)}, not moved up as an emergency.`,
    translation: (zh) => `手术是${zh}的，并没有提前成急诊。`
  },
  {
    id: "adj_handover",
    sentence: (lemma) =>
      `Handover kept the wording ${lemma} so the night team would not soften it.`,
    paraphrase: (_lemma, meaningEn) =>
      `The outgoing team kept the precise word that means ${cue(meaningEn)}.`,
    translation: (zh) => `交接时坚持用${zh}这个写法，避免夜班说得太软。`
  },
  {
    id: "adj_truly",
    sentence: (lemma) => `The note asked whether the process was truly ${lemma} in this patient.`,
    paraphrase: (_lemma, meaningEn) =>
      `The note checked that the process really was ${cue(meaningEn)} here.`,
    translation: (zh) => `病程在问：这个过程在该患者身上是否真的是${zh}的。`
  },
  {
    id: "adj_lab_result",
    sentence: (lemma) =>
      `The laboratory slip called the result ${lemma} and left the numbers beside it.`,
    paraphrase: (_lemma, meaningEn) =>
      `The report labeled the result as ${cue(meaningEn)} and kept the numbers next to it.`,
    translation: (zh) => `化验单把结果写成${zh}，数字写在旁边。`
  }
];

export const VERB_FRAMES = [
  {
    id: "verb_history_exam",
    sentence: (lemma) => `The team had to ${lemma} the problem using only the history and exam.`,
    paraphrase: (_lemma, meaningEn) =>
      `With history and exam alone, the team had to ${infinitiveRest(meaningEn)}.`,
    translation: (zh) => `团队只能靠病史和查体来${zh}。`
  },
  {
    id: "verb_protocol",
    sentence: (lemma) =>
      `The protocol tells the nurse when to ${lemma} and when to wait for review.`,
    paraphrase: (_lemma, meaningEn) =>
      `The written steps say when staff should ${infinitiveRest(meaningEn)} and when to wait.`,
    translation: (zh) => `规程写明护士何时该${zh}，何时等复查。`
  },
  {
    id: "verb_night",
    sentence: (lemma) => `If the finding returned, the night team was to ${lemma} without delay.`,
    paraphrase: (_lemma, meaningEn) =>
      `If it came back, the night team was to ${infinitiveRest(meaningEn)} without delay.`,
    translation: (zh) => `如果该发现再出现，夜班要立即${zh}。`
  },
  {
    id: "verb_evidence",
    sentence: (lemma) => `They waited to ${lemma} only after two concordant findings.`,
    paraphrase: (_lemma, meaningEn) =>
      `They waited to ${infinitiveRest(meaningEn)} until two findings matched.`,
    translation: (zh) => `两个发现对得上之后才${zh}。`
  },
  {
    id: "verb_airway",
    sentence: (lemma) => `Before transfer they had to ${lemma} the airway and document the result.`,
    paraphrase: (_lemma, meaningEn) =>
      `Before transfer they had to ${infinitiveRest(meaningEn)} the airway and write the result.`,
    translation: (zh) => `转出前必须先对气道${zh}并记录结果。`
  },
  {
    id: "verb_drug",
    sentence: (lemma) => `The order was to ${lemma} the drug once the rash appeared.`,
    paraphrase: (_lemma, meaningEn) =>
      `The order was to ${infinitiveRest(meaningEn)} the drug once the rash appeared.`,
    translation: (zh) => `皮疹一出现，医嘱就要对药物${zh}。`
  },
  {
    id: "verb_numbers",
    sentence: (lemma) => `They did not ${lemma} from a single abnormal number alone.`,
    paraphrase: (_lemma, meaningEn) =>
      `They did not ${infinitiveRest(meaningEn)} from one odd number.`,
    translation: (zh) => `他们没有只凭一个异常数字就${zh}。`
  },
  {
    id: "verb_home",
    sentence: (lemma) => `Once eating and walking were safe, they could ${lemma} in the morning.`,
    paraphrase: (_lemma, meaningEn) =>
      `Once eating and walking were safe, they could ${infinitiveRest(meaningEn)} in the morning.`,
    translation: (zh) => `进食和行走都安全后，早上就可以${zh}。`
  },
  {
    id: "verb_watch",
    sentence: (lemma) => `The night order was to ${lemma} the saturation every hour.`,
    paraphrase: (_lemma, meaningEn) =>
      `The night order was to ${infinitiveRest(meaningEn)} the saturation every hour.`,
    translation: (zh) => `夜间医嘱要求每小时${zh}血氧饱和度。`
  },
  {
    id: "verb_worse",
    sentence: (lemma) =>
      `If the blood pressure continued to ${lemma}, they would call for a higher level of care.`,
    paraphrase: (_lemma, meaningEn) =>
      `If the blood pressure continued to ${infinitiveRest(meaningEn)}, they would escalate care.`,
    translation: (zh) => `如果血压继续${zh}，就要升级监护。`
  },
  {
    id: "verb_pain",
    sentence: (lemma) => `The first goal was to ${lemma} the pain enough for a deep breath.`,
    paraphrase: (_lemma, meaningEn) =>
      `The first goal was to ${infinitiveRest(meaningEn)} the pain enough for a deep breath.`,
    translation: (zh) => `首要目标是把疼痛${zh}到能深呼吸。`
  },
  {
    id: "verb_prevent",
    sentence: (lemma) => `Early mobilization was meant to ${lemma} clot formation in the calves.`,
    paraphrase: (_lemma, meaningEn) =>
      `Early walking was meant to ${infinitiveRest(meaningEn)} clot formation in the calves.`,
    translation: (zh) => `早期活动是为了${zh}小腿血栓形成。`
  }
];

export const PHRASAL_FRAMES = [
  {
    id: "phrasal_before_home",
    sentence: (lemma) => `They still needed to ${lemma} the chest pain before she went home.`,
    paraphrase: (_lemma, meaningEn) =>
      `They still needed to ${infinitiveRest(meaningEn)} the chest pain before she went home.`,
    translation: (zh) => `让她回家前，还要对胸痛进行${zh}。`
  },
  {
    id: "phrasal_clinic",
    sentence: (lemma) =>
      `The clinic visit was scheduled to ${lemma} the wound and the new medicines.`,
    paraphrase: (_lemma, meaningEn) =>
      `The clinic visit was to ${infinitiveRest(meaningEn)} the wound and the new medicines.`,
    translation: (zh) => `安排门诊是为了对伤口和新药进行${zh}。`
  },
  {
    id: "phrasal_fever",
    sentence: (lemma) => `A new fever meant they had to ${lemma} before choosing a drug.`,
    paraphrase: (_lemma, meaningEn) =>
      `A new fever meant they had to ${infinitiveRest(meaningEn)} before choosing a drug.`,
    translation: (zh) => `出现新发热后，选药前必须先${zh}。`
  },
  {
    id: "phrasal_disease",
    sentence: (lemma) => `The chronic disease can ${lemma} after a missed inhaler dose.`,
    paraphrase: (_lemma, meaningEn) =>
      `The chronic disease can ${infinitiveRest(meaningEn)} after a missed inhaler dose.`,
    translation: (zh) => `漏用一次吸入剂后，慢性病就会${zh}。`
  },
  {
    id: "phrasal_film",
    sentence: (lemma) =>
      `After the film cleared, they could ${lemma} pneumonia with more confidence.`,
    paraphrase: (_lemma, meaningEn) =>
      `After the film cleared, they could ${infinitiveRest(meaningEn)} pneumonia with more confidence.`,
    translation: (zh) => `胸片干净后，就能更有把握地${zh}肺炎。`
  },
  {
    id: "phrasal_week",
    sentence: (lemma) => `They planned to ${lemma} in a week if the swelling had not fallen.`,
    paraphrase: (_lemma, meaningEn) =>
      `They planned to ${infinitiveRest(meaningEn)} in a week if the swelling had not fallen.`,
    translation: (zh) => `若一周后肿胀仍未消退，计划再${zh}。`
  },
  {
    id: "phrasal_night",
    sentence: (lemma) => `The night team was told to ${lemma} if vomiting returned.`,
    paraphrase: (_lemma, meaningEn) =>
      `The night team was told to ${infinitiveRest(meaningEn)} if vomiting returned.`,
    translation: (zh) => `若呕吐再出现，夜班要${zh}。`
  },
  {
    id: "phrasal_chart",
    sentence: (lemma) => `The chart reminder was to ${lemma} at the next visit.`,
    paraphrase: (_lemma, meaningEn) =>
      `The chart reminder was to ${infinitiveRest(meaningEn)} at the next visit.`,
    translation: (zh) => `病历提醒下次就诊时要${zh}。`
  }
];

export const ADVERB_FRAMES = [
  {
    id: "adv_route",
    sentence: (lemma) => `The drug was given ${lemma} according to the route the gut allowed.`,
    paraphrase: (_lemma, meaningEn) =>
      `The drug was given ${cue(meaningEn)}, according to what the gut allowed.`,
    translation: (zh) => `根据肠道情况，药物${zh}给予。`
  },
  {
    id: "adv_swallow",
    sentence: (lemma) => `Because swallowing was still possible, the dose went in ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `Because swallowing was still possible, the dose went in ${cue(meaningEn)}.`,
    translation: (zh) => `仍能吞咽时，剂量${zh}进入。`
  },
  {
    id: "adv_gut_fail",
    sentence: (lemma) => `When the gut failed, the same drug had to be given ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `When the gut failed, the same drug had to be given ${cue(meaningEn)}.`,
    translation: (zh) => `肠道失败时，同一药物必须${zh}给予。`
  },
  {
    id: "adv_chart",
    sentence: (lemma) => `The medication record marked the dose as given ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `The medication record marked the dose as given ${cue(meaningEn)}.`,
    translation: (zh) => `用药记录把该剂量标成${zh}给予。`
  }
];

export const FALLBACK_FRAMES = [
  {
    id: "fallback_note",
    sentence: (lemma) => `The progress note recorded ${lemma} among the overnight findings.`,
    paraphrase: (_lemma, meaningEn) =>
      `The progress note recorded ${cue(meaningEn)} among the overnight findings.`,
    translation: (zh) => `病程把${zh}记入夜间发现。`
  },
  {
    id: "fallback_body",
    sentence: (lemma) => `In the body this presented as ${lemma} during the acute illness.`,
    paraphrase: (_lemma, meaningEn) =>
      `In the body this presented as ${cue(meaningEn)} during the acute illness.`,
    translation: (zh) => `急性病期间，体内表现为${zh}。`
  },
  {
    id: "fallback_tissue",
    sentence: (lemma) => `The affected tissue still showed ${lemma} on the second look.`,
    paraphrase: (_lemma, meaningEn) =>
      `The affected tissue still showed ${cue(meaningEn)} on the second look.`,
    translation: (zh) => `再看时，受累组织仍有${zh}。`
  },
  {
    id: "fallback_chart",
    sentence: (lemma) => `The chart used ${lemma} because that was the precise finding.`,
    paraphrase: (_lemma, meaningEn) =>
      `The chart used this wording because the precise finding was ${cue(meaningEn)}.`,
    translation: (zh) => `病历写成${zh}，因为那就是确切发现。`
  },
  {
    id: "fallback_care",
    sentence: (lemma) => `Care that night still had to account for ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `Care that night still had to account for ${cue(meaningEn)}.`,
    translation: (zh) => `当晚处理仍需考虑${zh}。`
  },
  {
    id: "fallback_region",
    sentence: (lemma) => `In this region the key change was ${lemma}.`,
    paraphrase: (_lemma, meaningEn) => `In this region the key change was ${cue(meaningEn)}.`,
    translation: (zh) => `在这一区域，关键变化是${zh}。`
  },
  {
    id: "fallback_admit",
    sentence: (lemma) => `The admission line placed ${lemma} with the early problems.`,
    paraphrase: (_lemma, meaningEn) =>
      `The admission line placed ${cue(meaningEn)} with the early problems.`,
    translation: (zh) => `入院记录把${zh}写进初步问题。`
  },
  {
    id: "fallback_host",
    sentence: (lemma) => `Host defense in this patient still involved ${lemma}.`,
    paraphrase: (_lemma, meaningEn) =>
      `Host defense in this patient still involved ${cue(meaningEn)}.`,
    translation: (zh) => `该患者的宿主防御仍涉及${zh}。`
  }
];

const FAMILY_FRAMES = {
  process: PROCESS_FRAMES,
  inflammation: INFLAMMATION_FRAMES,
  study: STUDY_FRAMES,
  anatomy: ANATOMY_FRAMES,
  pathology: PATHOLOGY_FRAMES,
  drug: DRUG_FRAMES,
  imaging: IMAGING_FRAMES,
  lab: LAB_FRAMES,
  treatment: TREATMENT_FRAMES,
  generic: GENERIC_NOUN_FRAMES,
  phrase: PHRASE_FRAMES,
  adj_relating: ADJ_RELATING_FRAMES,
  adj_anatomy: ADJ_ANATOMY_FRAMES,
  adj_clinical: ADJ_CLINICAL_FRAMES,
  verb: VERB_FRAMES,
  phrasal: PHRASAL_FRAMES,
  adverb: ADVERB_FRAMES
};

export function classifyEntry(entry) {
  const { lemma, pos, meaningEn } = entry;
  const meaning = String(meaningEn).toLowerCase();

  if (pos === "adverb") return "adverb";
  if (pos === "phrasal verb") return "phrasal";
  if (pos === "verb") return "verb";
  if (pos === "adjective") {
    if (/^relating to\b/u.test(meaning)) return "adj_relating";
    if (
      /toward |nearer |farther |above,|below,|dividing the body|front of the body|back of the body|midline|same side|opposite side|body surface|the belly;/.test(
        meaning
      )
    ) {
      return "adj_anatomy";
    }
    return "adj_clinical";
  }

  if (/^(?:the\s+)?(?:microscopic\s+)?study of\b/u.test(meaning)) return "study";
  if (/^inflammation of\b/u.test(meaning) || /itis$/u.test(lemma)) return "inflammation";
  if (
    /engulfment|coating of a microbe|cell division|process by which|breakdown of molecules|building of complex|uptake of a substance|wave-like muscle|energy-using movement|digestive organelle|unspecialized cell that can renew/.test(
      meaning
    )
  ) {
    return "process";
  }
  if (
    /x-ray|ultrasound|magnetic fields|ionizing radiation|recording of the heart|imaging that|cross-sectional x-ray/.test(
      meaning
    )
  ) {
    return "imaging";
  }
  if (
    /a drug|the drug|analgesic|antibiotic|antiviral|antifungal|opioid|corticosteroid|given to lower fever|given to relieve pain|unwanted effect of a drug|glucocorticoid used/.test(
      meaning
    )
  ) {
    return "drug";
  }
  if (
    /therapy|ventilation|supplemental oxygen|machine support of breathing|physical methods used to restore|restoration of function|provision of water/.test(
      meaning
    )
  ) {
    return "treatment";
  }
  if (
    /laboratory growth|thin film of cells|dye used to make|cardiac marker|liver enzyme that rises|tissue or fluid taken for laboratory|hemolyzed/.test(
      meaning
    ) ||
    lemma === "culture" ||
    lemma === "smear" ||
    lemma === "stain" ||
    lemma === "specimen" ||
    lemma === "troponin" ||
    lemma === "transaminase"
  ) {
    return "lab";
  }
  if (
    /malignan|tumor|disease in which|a disease |abnormally |excess body|inadequate |failure of|infection|wasting of muscle|pocket of pus|escape of blood|collection of clotted|new growth|spread of tumor|life-threatening|widening of bronchi|destruction of alveolar|persistently high|too little hemoglobin|too few red|invas(?:ion|ion and multiplication)|pause in breathing|loss of normal muscle|deterioration of tissue|poor nutrition|downward displacement/.test(
      meaning
    )
  ) {
    return "pathology";
  }
  if (
    /\bthat\b/u.test(meaning) ||
    /organ|gland|vessel|tissue|muscle|bone|joint|membrane|hormone|the inner|the outer|the covering|the lining|the fibrous|the stacked|the nerve cord|the voice box|the paired|the abdominal|the muscular tube|the windpipe|the thinnest vessel/.test(
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

export function lemmaOverride(entry) {
  return LEMMA_OVERRIDES[entry.lemma] ?? null;
}

export function framesFor(entry) {
  const family = classifyEntry(entry);
  return FAMILY_FRAMES[family] ?? GENERIC_NOUN_FRAMES;
}

export function patternKey(sentence, lemma) {
  return sentence.split(lemma).join("LEMMA");
}
