import { createRoot } from "react-dom/client";

import { ArticleEnglishApp } from "./app/ArticleEnglishApp";
import { loadLocalAppState } from "./app/loadLocalAppState";
import { BootstrapShell, ConfigurationFailure } from "./app/StartupScreens";
import type { SessionView } from "./application/contracts";
import {
  createCloudRuntimeManager,
  createLearningRuntime,
  RuntimeConfigurationError,
  type CloudRuntimeManager,
  type LearningRuntime
} from "./data";
import { registerPwaUpdateCoordinator } from "./pwa/updateCoordinator";
import "./styles/tokens.css";
import "./styles/global.css";

const container = document.querySelector<HTMLDivElement>("#root");

if (container === null) {
  throw new Error("The Article English root element is missing.");
}

const root = createRoot(container);
root.render(<BootstrapShell />);

let activeRuntime: LearningRuntime | null = null;
let cloudManager: CloudRuntimeManager | null = null;
let mountedSessionIdentity = "unmounted";
let runtimeGeneration = 0;

function sessionIdentity(session: SessionView): string {
  return `${session.status}:${session.userId ?? "none"}`;
}

function startupFailure(error: unknown): void {
  const message =
    error instanceof RuntimeConfigurationError
      ? "Connect the public Supabase URL and publishable key for cloud mode. Demo mode is available only through the explicit development command."
      : error instanceof Error
        ? error.message
        : "An unknown startup error occurred.";
  root.render(<ConfigurationFailure message={message} />);
}

async function renderRuntime(
  runtime: LearningRuntime,
  initialSession: SessionView,
  generation: number
): Promise<void> {
  const localState = await loadLocalAppState({
    repository: runtime.learning,
    authGateway: runtime.auth,
    settingsGateway: runtime.settings,
    initialSession
  });
  if (generation !== runtimeGeneration) {
    await runtime.dispose();
    return;
  }

  const previousRuntime = activeRuntime;
  activeRuntime = runtime;
  mountedSessionIdentity = sessionIdentity(localState.initialSession);
  const account =
    runtime.mode === "cloud"
      ? {
          authGateway: runtime.auth,
          settingsGateway: runtime.settings,
          initialSession: localState.initialSession,
          initialTheme: localState.initialTheme,
          onAccountChange: switchCloudAccount
        }
      : undefined;

  root.render(
    <ArticleEnglishApp
      key={`${runtime.mode}:${mountedSessionIdentity}`}
      repository={runtime.learning}
      initialHome={localState.initialHome}
      initialSyncState={runtime.sync.getState()}
      {...(runtime.mode === "cloud" ? { syncGateway: runtime.sync } : {})}
      {...(account === undefined ? {} : { account })}
    />
  );

  if (previousRuntime !== null && previousRuntime !== runtime) {
    void previousRuntime.dispose();
  }
}

async function switchCloudAccount(session: SessionView): Promise<void> {
  if (sessionIdentity(session) === mountedSessionIdentity) {
    return;
  }
  if (cloudManager === null) {
    throw new Error("The cloud runtime manager is unavailable.");
  }

  const generation = ++runtimeGeneration;
  const nextRuntime = await cloudManager.createRuntime(session);
  if (session.status === "authenticated" && window.location.pathname === "/login") {
    window.history.replaceState({}, "", "/");
  }
  await renderRuntime(nextRuntime, session, generation);
}

async function bootstrap(): Promise<void> {
  try {
    if (import.meta.env.VITE_APP_MODE === "demo") {
      const generation = ++runtimeGeneration;
      const runtime = await createLearningRuntime({ mode: "demo" });
      const session = await runtime.auth.restoreLocal();
      await renderRuntime(runtime, session, generation);
      return;
    }

    cloudManager = await createCloudRuntimeManager();
    const initialSession = await cloudManager.auth.restoreLocal();
    const generation = ++runtimeGeneration;
    const runtime = await cloudManager.createRuntime(initialSession);
    await renderRuntime(runtime, initialSession, generation);
  } catch (error) {
    startupFailure(error);
  }
}

window.addEventListener(
  "pagehide",
  () => {
    void activeRuntime?.dispose();
  },
  { once: true }
);

void bootstrap();
void registerPwaUpdateCoordinator();
