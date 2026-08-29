import { createLocalRuntime } from "./local/localRuntimeFactory";
import type { DesktopRuntimeConfig, LearningRuntime, StandaloneRuntimeConfig } from "./runtime";

export async function createStandaloneRuntime(
  config: StandaloneRuntimeConfig | DesktopRuntimeConfig
): Promise<LearningRuntime> {
  const desktop = config.mode === "desktop";
  return createLocalRuntime(config, {
    kind: "personal",
    userId: "local-user",
    email: "local@wordeasy.invalid",
    namespace: desktop ? "desktop:v1" : "standalone:v1",
    loadCards: async () => {
      const { STANDALONE_CARDS } = await import("./standalone/standaloneCards");
      return STANDALONE_CARDS;
    }
  });
}
