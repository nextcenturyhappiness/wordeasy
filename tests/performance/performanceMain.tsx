import { createRoot } from "react-dom/client";

import { ArticleEnglishApp } from "../../src/app/ArticleEnglishApp";
import { loadLocalAppState } from "../../src/app/loadLocalAppState";
import { BootstrapShell } from "../../src/app/StartupScreens";
import type { LearningRuntime } from "../../src/data/runtime";
import { registerPwaUpdateCoordinator } from "../../src/pwa/updateCoordinator";
import "../../src/styles/tokens.css";
import "../../src/styles/global.css";

const container = document.querySelector<HTMLDivElement>("#root");

if (container === null) {
  throw new Error("The wordeasy root element is missing.");
}

const root = createRoot(container);
root.render(<BootstrapShell />);

let runtime: LearningRuntime | null = null;

async function bootstrapPerformanceFixture(): Promise<void> {
  const { createDemoRuntime } = await import("../../src/data/demoRuntime");
  runtime = await createDemoRuntime({ mode: "demo" });
  const session = await runtime.auth.restoreLocal();
  const localState = await loadLocalAppState({
    repository: runtime.learning,
    authGateway: runtime.auth,
    settingsGateway: runtime.settings,
    initialSession: session
  });

  root.render(
    <ArticleEnglishApp
      repository={runtime.learning}
      initialHome={localState.initialHome}
      initialSyncState={runtime.sync.getState()}
    />
  );
}

window.addEventListener(
  "pagehide",
  () => {
    void runtime?.dispose();
  },
  { once: true }
);

void bootstrapPerformanceFixture();
void registerPwaUpdateCoordinator();
