import { BrowserRouter } from "react-router-dom";

import type { HomeSnapshot, LearningRepository, SyncState } from "../application/contracts";
import "../styles/tokens.css";
import "../styles/global.css";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { AppRoutes } from "./AppRoutes";
import { LearningAppProvider } from "./LearningAppProvider";

export interface ArticleEnglishAppProps {
  repository: LearningRepository;
  initialHome: HomeSnapshot | null;
  initialSyncState: SyncState;
}

export function ArticleEnglishApp({
  repository,
  initialHome,
  initialSyncState
}: ArticleEnglishAppProps) {
  return (
    <AppErrorBoundary>
      <LearningAppProvider
        repository={repository}
        initialHome={initialHome}
        initialSyncState={initialSyncState}
      >
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </LearningAppProvider>
    </AppErrorBoundary>
  );
}
