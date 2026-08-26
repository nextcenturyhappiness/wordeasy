import {
  MEDICAL_DAILY_NEW_QUOTA,
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

export function selectMedicalAssignment(
  candidates: AssignmentCandidate[],
  userId: string,
  studyDate: string
): MedicalSelectionResult {
  const available = deterministicOrder(candidates, userId, studyDate);
  if (available.length < MEDICAL_DAILY_NEW_QUOTA) {
    return {
      status: "shortage",
      shortage: {
        code: "content_shortage",
        category: null,
        required: MEDICAL_DAILY_NEW_QUOTA,
        available: available.length,
        message: "Not enough new Medical English cards are available."
      }
    };
  }

  return { status: "ready", cards: available.slice(0, MEDICAL_DAILY_NEW_QUOTA) };
}
