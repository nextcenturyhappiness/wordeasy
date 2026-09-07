import { MEDICAL_MORPHOLOGY_CATEGORY } from "../domain/learning";

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
  [MEDICAL_MORPHOLOGY_CATEGORY]: "词根构词"
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function medicalQuotaCopy(): string {
  return "7 病历用语 + 3 词根构词";
}
