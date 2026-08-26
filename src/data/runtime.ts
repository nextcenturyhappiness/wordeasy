import type {
  AuthGateway,
  LearningRepository,
  SessionView,
  SettingsGateway,
  SyncGateway
} from "../application/contracts";

export interface DemoRuntimeConfig {
  mode: "demo";
  userId?: string;
  email?: string;
  timezone?: string;
  now?: () => Date;
  databaseName?: string;
  deviceId?: string;
}

export interface CloudRuntimeConfig {
  mode: "cloud";
}

export type LearningRuntimeConfig = DemoRuntimeConfig | CloudRuntimeConfig;

export interface LearningRuntime {
  mode: "demo" | "cloud";
  accountUserId: string | null;
  auth: AuthGateway;
  learning: LearningRepository;
  settings: SettingsGateway;
  sync: SyncGateway;
  dispose(): Promise<void>;
}

export interface CloudRuntimeManager {
  readonly auth: AuthGateway;
  createRuntime(session: SessionView): Promise<LearningRuntime>;
}

export class RuntimeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeConfigurationError";
  }
}

export async function createLearningRuntime(
  config: LearningRuntimeConfig
): Promise<LearningRuntime> {
  if (config.mode === "demo") {
    if (import.meta.env.PROD) {
      throw new RuntimeConfigurationError("Demo runtime is disabled in production builds.");
    }
    const { createDemoRuntime } = await import("./demoRuntime");
    return createDemoRuntime(config);
  }

  throw new RuntimeConfigurationError(
    "Cloud runtime is unavailable in M1; production must not fall back to demo mode."
  );
}

export async function createCloudRuntimeManager(): Promise<CloudRuntimeManager> {
  const { createBrowserCloudRuntimeManager } = await import("./cloudRuntime");
  return createBrowserCloudRuntimeManager();
}
