import type {
  AuthGateway,
  HomeSnapshot,
  LearningRepository,
  SessionView,
  SettingsGateway,
  ThemePreference
} from "../application/contracts";

export interface LocalAppState {
  initialHome: HomeSnapshot | null;
  initialSession: SessionView;
  initialTheme: ThemePreference;
}

export async function loadLocalAppState({
  repository,
  authGateway,
  settingsGateway,
  initialSession: providedSession
}: {
  repository: LearningRepository;
  authGateway: AuthGateway;
  settingsGateway: SettingsGateway;
  initialSession?: SessionView;
}): Promise<LocalAppState> {
  const homePromise = repository.getCachedHome();
  const sessionPromise =
    providedSession === undefined ? authGateway.restoreLocal() : Promise.resolve(providedSession);
  const themePromise = settingsGateway.getTheme();

  const [initialHome, initialSession, initialTheme] = await Promise.all([
    homePromise,
    sessionPromise,
    themePromise
  ]);

  return { initialHome, initialSession, initialTheme };
}
