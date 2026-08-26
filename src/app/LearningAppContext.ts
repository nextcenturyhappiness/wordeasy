import { createContext, useContext } from "react";

import type {
  HomeSnapshot,
  LearningRepository,
  RateCardResult,
  SyncState
} from "../application/contracts";

export type HomeResource =
  | { status: "loading" }
  | { status: "ready"; snapshot: HomeSnapshot }
  | { status: "empty" }
  | { status: "error"; message: string };

export interface LearningAppContextValue {
  repository: LearningRepository;
  home: HomeResource;
  syncState: SyncState;
  ensureInitialized: () => Promise<void>;
  applyRatingResult: (result: RateCardResult) => void;
}

export const LearningAppContext = createContext<LearningAppContextValue | null>(null);

export function useLearningApp(): LearningAppContextValue {
  const context = useContext(LearningAppContext);

  if (context === null) {
    throw new Error("useLearningApp must be used within LearningAppProvider.");
  }

  return context;
}
