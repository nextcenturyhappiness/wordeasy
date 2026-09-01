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

export interface PreviewRuntimeConfig {
  mode: "preview";
  userId?: string;
  email?: string;
  timezone?: string;
  now?: () => Date;
  databaseName?: string;
  deviceId?: string;
}

export interface StandaloneRuntimeConfig {
  mode: "standalone";
  userId?: string;
  email?: string;
  timezone?: string;
  now?: () => Date;
  databaseName?: string;
  deviceId?: string;
}

export interface DesktopRuntimeConfig {
  mode: "desktop";
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

export type LocalRuntimeConfig =
  DemoRuntimeConfig | PreviewRuntimeConfig | StandaloneRuntimeConfig | DesktopRuntimeConfig;

export type LearningRuntimeConfig = LocalRuntimeConfig | CloudRuntimeConfig;

export interface LearningRuntime {
  mode: "demo" | "preview" | "standalone" | "desktop" | "cloud";
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

const includeTestRuntimes = import.meta.env.MODE === "test";
const demoRuntimeLoader =
  includeTestRuntimes ||
  import.meta.env.VITE_APP_MODE === "demo" ||
  import.meta.env.VITE_APP_MODE === "preview"
    ? () => import("./demoRuntime")
    : null;
const standaloneRuntimeLoader =
  includeTestRuntimes || import.meta.env.VITE_APP_MODE === "standalone"
    ? () => import("./standaloneRuntime")
    : null;

export async function createLearningRuntime(
  config: LearningRuntimeConfig
): Promise<LearningRuntime> {
  if (config.mode !== "cloud") {
    if (config.mode === "demo" && import.meta.env.PROD) {
      throw new RuntimeConfigurationError("Demo runtime is disabled in production builds.");
    }
    if (
      config.mode === "preview" &&
      (import.meta.env.MODE !== "preview" || import.meta.env.VITE_APP_MODE !== "preview")
    ) {
      throw new RuntimeConfigurationError(
        "Preview runtime requires matching preview Vite mode and app mode."
      );
    }
    if (
      config.mode === "standalone" &&
      (import.meta.env.MODE !== "standalone" || import.meta.env.VITE_APP_MODE !== "standalone")
    ) {
      throw new RuntimeConfigurationError(
        "Standalone runtime requires matching standalone Vite mode and app mode."
      );
    }
    if (
      config.mode === "desktop" &&
      (import.meta.env.MODE !== "desktop" || import.meta.env.VITE_APP_MODE !== "desktop")
    ) {
      throw new RuntimeConfigurationError(
        "Desktop runtime requires matching desktop Vite mode and app mode."
      );
    }
    if (config.mode === "demo" || config.mode === "preview") {
      if (demoRuntimeLoader === null) {
        throw new RuntimeConfigurationError("Demo/Preview runtime is unavailable in this build.");
      }
      const { createDemoRuntime } = await demoRuntimeLoader();
      return createDemoRuntime(config);
    }
    if (standaloneRuntimeLoader === null) {
      throw new RuntimeConfigurationError(
        "Standalone/Desktop runtime is unavailable in this build."
      );
    }
    const { createStandaloneRuntime } = await standaloneRuntimeLoader();
    return createStandaloneRuntime(config);
  }

  throw new RuntimeConfigurationError(
    "Cloud runtime is unavailable in M1; production must not fall back to demo mode."
  );
}

export async function createCloudRuntimeManager(): Promise<CloudRuntimeManager> {
  const { createBrowserCloudRuntimeManager } = await import("./cloudRuntime");
  return createBrowserCloudRuntimeManager();
}
