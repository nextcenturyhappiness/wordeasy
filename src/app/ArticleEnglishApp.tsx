import { BrowserRouter } from "react-router-dom";

import type {
  AuthGateway,
  HomeSnapshot,
  LearningRepository,
  SessionView,
  SettingsGateway,
  SyncGateway,
  SyncState,
  ThemePreference
} from "../application/contracts";
import "../styles/tokens.css";
import "../styles/global.css";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { AppRoutes } from "./AppRoutes";
import { AuthSessionProvider } from "./AuthSessionProvider";
import { LearningAppProvider } from "./LearningAppProvider";
import { ThemeProvider } from "./ThemeProvider";

export interface AuthenticatedAccountServices {
  authGateway: AuthGateway;
  settingsGateway: SettingsGateway;
  initialSession: SessionView;
  initialTheme: ThemePreference;
  onAccountChange?: (session: SessionView) => void | Promise<void>;
}

export interface ArticleEnglishAppProps {
  repository: LearningRepository;
  initialHome: HomeSnapshot | null;
  initialSyncState: SyncState;
  syncGateway?: SyncGateway;
  account?: AuthenticatedAccountServices;
  environmentNotice?: string;
}

export function ArticleEnglishApp({
  repository,
  initialHome,
  initialSyncState,
  syncGateway,
  account,
  environmentNotice
}: ArticleEnglishAppProps) {
  const learningProviderProps = {
    repository,
    initialHome,
    initialSyncState,
    ...(syncGateway === undefined ? {} : { syncGateway })
  };

  if (account === undefined) {
    return (
      <AppErrorBoundary>
        <LearningAppProvider {...learningProviderProps}>
          <BrowserRouter>
            <AppRoutes
              settingsGateway={null}
              {...(environmentNotice === undefined ? {} : { environmentNotice })}
            />
          </BrowserRouter>
        </LearningAppProvider>
      </AppErrorBoundary>
    );
  }

  const accountUserId =
    initialHome?.userId ??
    (account.initialSession.status === "authenticated" ? account.initialSession.userId : null);

  return (
    <AppErrorBoundary>
      <AuthSessionProvider
        gateway={account.authGateway}
        initialSession={account.initialSession}
        accountUserId={accountUserId}
        {...(account.onAccountChange === undefined
          ? {}
          : { onAccountChange: account.onAccountChange })}
      >
        <ThemeProvider gateway={account.settingsGateway} initialTheme={account.initialTheme}>
          <LearningAppProvider {...learningProviderProps}>
            <BrowserRouter>
              <AppRoutes
                settingsGateway={account.settingsGateway}
                {...(environmentNotice === undefined ? {} : { environmentNotice })}
              />
            </BrowserRouter>
          </LearningAppProvider>
        </ThemeProvider>
      </AuthSessionProvider>
    </AppErrorBoundary>
  );
}
