import { createRoot } from "react-dom/client";

import { ArticleEnglishApp } from "./app/ArticleEnglishApp";
import { BootstrapShell, ConfigurationFailure } from "./app/StartupScreens";
import { createLearningRuntime, RuntimeConfigurationError } from "./data";
import "./styles/tokens.css";
import "./styles/global.css";

function markOnce(name: string): void {
  if (performance.getEntriesByName(name, "mark").length === 0) {
    performance.mark(name);
  }
}

const container = document.querySelector<HTMLDivElement>("#root");

if (container === null) {
  throw new Error("The Article English root element is missing.");
}

const root = createRoot(container);
root.render(<BootstrapShell />);
markOnce("app-shell-visible");

async function bootstrap(): Promise<void> {
  try {
    const mode = import.meta.env.VITE_APP_MODE === "demo" ? "demo" : "cloud";
    const runtime = await createLearningRuntime({ mode });
    const initialHome = await runtime.learning.getCachedHome();

    if (initialHome !== null) {
      markOnce("cached-home-ready");
      performance.measure("app-shell-to-cached-home", "app-shell-visible", "cached-home-ready");
    }

    root.render(
      <ArticleEnglishApp
        repository={runtime.learning}
        initialHome={initialHome}
        initialSyncState={runtime.sync.getState()}
      />
    );

    window.addEventListener(
      "pagehide",
      () => {
        void runtime.dispose();
      },
      { once: true }
    );
  } catch (error) {
    const message =
      error instanceof RuntimeConfigurationError
        ? "Connect the public Supabase URL and publishable key for cloud mode. Demo mode is available only through the explicit development command."
        : error instanceof Error
          ? error.message
          : "An unknown startup error occurred.";
    root.render(<ConfigurationFailure message={message} />);
  }
}

void bootstrap();
