import {
  ESSENTIAL_MEDICAL_CATEGORY,
  ESSENTIAL_MEDICAL_DAILY_NEW_QUOTA,
  MEDICAL_CLINICAL_DAILY_QUOTA,
  MEDICAL_DAILY_NEW_QUOTA,
  MEDICAL_MORPHOLOGY_CATEGORY,
  MEDICAL_MORPHOLOGY_DAILY_QUOTA,
  RESEARCH_CATEGORY_QUOTAS,
  type ContentShortageRecord,
  type ResearchCategory
} from "./learning";

export interface AssignmentCandidate {
  cardId: string;
  category: string;
}

export type ResearchSelectionResult =
  | { status: "ready"; cards: AssignmentCandidate[] }
  | { status: "shortage"; shortage: ContentShortageRecord };

export type MedicalSelectionResult = ResearchSelectionResult;

const RESEARCH_CATEGORY_LABELS: Record<ResearchCategory, string> = {
  general_research: "General Research",
  statistics_methodology: "Statistics / Methodology",
  bioinformatics: "Bioinformatics"
};

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function deterministicOrder(
  candidates: AssignmentCandidate[],
  userId: string,
  studyDate: string
): AssignmentCandidate[] {
  return [...candidates].sort((left, right) => {
    const leftHash = stableHash(`${userId}:${studyDate}:${left.cardId}`);
    const rightHash = stableHash(`${userId}:${studyDate}:${right.cardId}`);
    return leftHash - rightHash || left.cardId.localeCompare(right.cardId);
  });
}

export function selectResearchAssignment(
  candidates: AssignmentCandidate[],
  userId: string,
  studyDate: string
): ResearchSelectionResult {
  const selected: AssignmentCandidate[] = [];

  for (const [category, required] of Object.entries(RESEARCH_CATEGORY_QUOTAS) as Array<
    [ResearchCategory, number]
  >) {
    const available = deterministicOrder(
      candidates.filter((candidate) => candidate.category === category),
      userId,
      studyDate
    );

    if (available.length < required) {
      return {
        status: "shortage",
        shortage: {
          code: "content_shortage",
          category,
          required,
          available: available.length,
          message: `Not enough new ${RESEARCH_CATEGORY_LABELS[category]} cards are available.`
        }
      };
    }
    selected.push(...available.slice(0, required));
  }

  return { status: "ready", cards: selected };
}

function isMorphologyCandidate(candidate: AssignmentCandidate): boolean {
  return candidate.category === MEDICAL_MORPHOLOGY_CATEGORY;
}

export function selectMedicalAssignment(
  candidates: AssignmentCandidate[],
  userId: string,
  studyDate: string
): MedicalSelectionResult {
  const clinical = deterministicOrder(
    candidates.filter((candidate) => !isMorphologyCandidate(candidate)),
    userId,
    studyDate
  );
  const morphology = deterministicOrder(
    candidates.filter(isMorphologyCandidate),
    userId,
    studyDate
  );

  if (clinical.length < MEDICAL_CLINICAL_DAILY_QUOTA) {
    return {
      status: "shortage",
      shortage: {
        code: "content_shortage",
        category: "clinical",
        required: MEDICAL_CLINICAL_DAILY_QUOTA,
        available: clinical.length,
        message: "Not enough new Medical chart / class cards are available."
      }
    };
  }

  if (morphology.length < MEDICAL_MORPHOLOGY_DAILY_QUOTA) {
    return {
      status: "shortage",
      shortage: {
        code: "content_shortage",
        category: MEDICAL_MORPHOLOGY_CATEGORY,
        required: MEDICAL_MORPHOLOGY_DAILY_QUOTA,
        available: morphology.length,
        message: "Not enough new 词根构词 cards are available."
      }
    };
  }

  const selected = [
    ...clinical.slice(0, MEDICAL_CLINICAL_DAILY_QUOTA),
    ...morphology.slice(0, MEDICAL_MORPHOLOGY_DAILY_QUOTA)
  ];
  if (selected.length !== MEDICAL_DAILY_NEW_QUOTA) {
    throw new Error("Medical 7 morphology + 3 chart selection was not atomic.");
  }

  return { status: "ready", cards: selected };
}

export function selectEssentialMedicalAssignment(
  candidates: AssignmentCandidate[],
  userId: string,
  studyDate: string
): ResearchSelectionResult {
  const available = deterministicOrder(
    candidates.filter((candidate) => candidate.category === ESSENTIAL_MEDICAL_CATEGORY),
    userId,
    studyDate
  );

  if (available.length < ESSENTIAL_MEDICAL_DAILY_NEW_QUOTA) {
    return {
      status: "shortage",
      shortage: {
        code: "content_shortage",
        category: ESSENTIAL_MEDICAL_CATEGORY,
        required: ESSENTIAL_MEDICAL_DAILY_NEW_QUOTA,
        available: available.length,
        message: "Not enough new 必备医学英语 cards are available."
      }
    };
  }

  return {
    status: "ready",
    cards: available.slice(0, ESSENTIAL_MEDICAL_DAILY_NEW_QUOTA)
  };
}
