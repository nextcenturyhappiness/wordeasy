import { DEMO_CARDS } from "./demo/demoCards";
import { createLocalRuntime } from "./local/localRuntimeFactory";
import type { DemoRuntimeConfig, LearningRuntime, PreviewRuntimeConfig } from "./runtime";

export async function createDemoRuntime(
  config: DemoRuntimeConfig | PreviewRuntimeConfig
): Promise<LearningRuntime> {
  const preview = config.mode === "preview";
  return createLocalRuntime(config, {
    kind: "demo",
    userId: preview ? "preview-user" : "demo-user",
    email: preview ? "preview@wordeasy.invalid" : "demo@wordeasy.invalid",
    namespace: preview ? "preview" : "demo",
    cards: DEMO_CARDS
  });
}
