import {
  MEDICAL_CLINICAL_DAILY_QUOTA,
  MEDICAL_MORPHOLOGY_CATEGORY,
  MEDICAL_MORPHOLOGY_DAILY_QUOTA,
  MERGED_MEDICAL_CLINICAL_DAILY_QUOTA,
  MERGED_MEDICAL_CORE_DAILY_QUOTA,
  MERGED_MEDICAL_MORPHOLOGY_DAILY_QUOTA
} from "../domain/learning";
import { isLocalTwoModuleSurface } from "./moduleRoutes";

const CATEGORY_LABELS: Record<string, string> = {
  general_research: "General Research",
  statistics_methodology: "Statistics / Methodology",
  bioinformatics: "Bioinformatics",
  anatomy: "Anatomy",
  physiology: "Physiology",
  pathology: "Pathology",
  symptoms: "Symptoms",
  signs: "Signs",
  diseases: "Diseases",
  diagnosis: "Diagnosis",
  laboratory: "Laboratory",
  imaging: "Imaging",
  treatment: "Treatment",
  pharmacology: "Pharmacology",
  surgery_procedures: "Surgery / Procedures",
  clinical_expressions: "Clinical expressions",
  [MEDICAL_MORPHOLOGY_CATEGORY]: "词根构词",
  core: "课堂词汇"
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function medicalQuotaCopy(
  appMode: string | undefined = import.meta.env.VITE_APP_MODE
): string {
  if (isLocalTwoModuleSurface(appMode)) {
    return `${String(MERGED_MEDICAL_MORPHOLOGY_DAILY_QUOTA)} 词根构词 + ${String(MERGED_MEDICAL_CLINICAL_DAILY_QUOTA)} 病历用语 + ${String(MERGED_MEDICAL_CORE_DAILY_QUOTA)} 课堂词汇`;
  }
  return `${String(MEDICAL_MORPHOLOGY_DAILY_QUOTA)} 词根构词 + ${String(MEDICAL_CLINICAL_DAILY_QUOTA)} 病历用语`;
}

export function essentialMedicalQuotaCopy(): string {
  return "每天 10 个新词";
}
