import type {
  AuthGateway,
  LearningRepository,
  ModuleSlug,
  QueueKind,
  RateCardInput,
  SettingsGateway,
  StudyQueueSnapshot,
  ThemePreference
} from "../application/contracts";
import { themeStorageKey } from "../app/theme";
import { BrowserSessionCache, type SessionCache } from "../auth/SupabaseAuthGateway";
import { assertIanaTimezone } from "../domain/time";
import { LearningDatabase } from "../db/learningDatabase";
import { FsrsSchedulerAdapter } from "../scheduler/fsrsScheduler";
import { AccountSyncGateway } from "../sync/accountSyncGateway";
import { CloudSyncCoordinator } from "../sync/syncCoordinator";
import { DexieAccountSyncStore } from "../sync/dexieSyncStore";
import { LocalSyncStateStore } from "../sync/localSyncState";
import { AccountCloudSettingsGateway } from "./cloud/accountPreferences";
import { AccountCloudDayCache } from "./cloud/cloudDayCache";
import type { CloudRpcClient } from "./cloud/rpcClient";
import { SupabaseCloudRepository } from "./cloud/supabaseCloudRepository";
import { IndexedDbLearningRepository } from "./indexedDbLearningRepository";
import {
  RuntimeConfigurationError,
  type CloudRuntimeManager,
  type LearningRuntime
} from "./runtime";
import type { SupabaseRemoteServices } from "./supabaseRemote";

const DEVICE_ID_STORAGE_KEY = "article-english:device-id:v1";

function browserTimezone(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  assertIanaTimezone(timezone);
  return timezone;
}

function cachedTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(themeStorageKey);
    return value === "system" || value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

function installationDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing !== null && existing.trim().length > 0) {
      return existing;
    }
    const created = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

class AnonymousLearningRepository implements LearningRepository {
  initialize(): Promise<void> {
    return Promise.resolve();
  }

  getCachedHome(): Promise<null> {
    return Promise.resolve(null);
  }

  getToday(module: ModuleSlug): Promise<never> {
    void module;
    return Promise.reject(new Error("Sign in before opening a learning module."));
  }

  getStudyQueue(module: ModuleSlug, queue: QueueKind): Promise<StudyQueueSnapshot> {
    void module;
    void queue;
    return Promise.reject(new Error("Sign in before opening a learning queue."));
  }

  rateCard(input: RateCardInput): Promise<never> {
    void input;
    return Promise.reject(new Error("Sign in before rating a learning card."));
  }
}

class BrowserFallbackSettingsGateway implements SettingsGateway {
  #theme = cachedTheme();
  #timezone = browserTimezone();

  getTheme(): Promise<ThemePreference> {
    return Promise.resolve(this.#theme);
  }

  setTheme(theme: ThemePreference): Promise<void> {
    this.#theme = theme;
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // The signed-out screen remains usable when localStorage is unavailable.
    }
    return Promise.resolve();
  }

  getTimezone(): Promise<string> {
    return Promise.resolve(this.#timezone);
  }

  setTimezone(timezone: string): Promise<void> {
    assertIanaTimezone(timezone);
    this.#timezone = timezone;
    return Promise.resolve();
  }
}

function requiredPublicEnvironment(): { url: string; publishableKey: string } {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (
    url === undefined ||
    url.length === 0 ||
    publishableKey === undefined ||
    publishableKey.length === 0
  ) {
    throw new RuntimeConfigurationError(
      "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required in cloud mode."
    );
  }
  return { url, publishableKey };
}

type RemoteServicesLoader = () => Promise<SupabaseRemoteServices>;

function remoteServicesLoader(
  environment: { url: string; publishableKey: string },
  sessionCache: SessionCache
): RemoteServicesLoader {
  let services: Promise<SupabaseRemoteServices> | null = null;
  return () => {
    services ??= import("./supabaseRemote").then(({ createSupabaseRemoteServices }) =>
      createSupabaseRemoteServices(environment.url, environment.publishableKey, sessionCache)
    );
    return services;
  };
}

class LazySupabaseAuthGateway implements AuthGateway {
  constructor(
    private readonly sessionCache: SessionCache,
    private readonly loadRemote: RemoteServicesLoader
  ) {}

  requestOtp(email: string): Promise<void> {
    return this.loadRemote().then(({ auth }) => auth.requestOtp(email));
  }

  verifyOtp(email: string, token: string) {
    return this.loadRemote().then(({ auth }) => auth.verifyOtp(email, token));
  }

  resendOtp(email: string): Promise<void> {
    return this.loadRemote().then(({ auth }) => auth.resendOtp(email));
  }

  restoreLocal() {
    return Promise.resolve(this.sessionCache.read());
  }

  validateRemote() {
    return this.loadRemote().then(({ auth }) => auth.validateRemote());
  }

  subscribe(listener: Parameters<AuthGateway["subscribe"]>[0]): () => void {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    void this.loadRemote()
      .then(({ auth }) => {
        if (active) {
          unsubscribe = auth.subscribe(listener);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
      unsubscribe();
    };
  }

  signOut(): Promise<void> {
    return this.loadRemote().then(({ auth }) => auth.signOut());
  }
}

class LazyCloudRpcClient implements CloudRpcClient {
  constructor(private readonly loadRemote: RemoteServicesLoader) {}

  call(functionName: string, parameters: Record<string, unknown>): Promise<unknown> {
    return this.loadRemote().then(({ rpc }) => rpc.call(functionName, parameters));
  }
}

function anonymousRuntime(auth: AuthGateway): LearningRuntime {
  return {
    mode: "cloud",
    accountUserId: null,
    auth,
    learning: new AnonymousLearningRepository(),
    settings: new BrowserFallbackSettingsGateway(),
    sync: new LocalSyncStateStore(),
    dispose: () => Promise.resolve()
  };
}

export function createBrowserCloudRuntimeManager(): CloudRuntimeManager {
  const environment = requiredPublicEnvironment();
  const sessionCache = new BrowserSessionCache();
  const loadRemote = remoteServicesLoader(environment, sessionCache);
  const auth = new LazySupabaseAuthGateway(sessionCache, loadRemote);
  const rpc = new LazyCloudRpcClient(loadRemote);

  return {
    auth,
    async createRuntime(session): Promise<LearningRuntime> {
      if (session.status !== "authenticated" || session.userId === null) {
        return anonymousRuntime(auth);
      }

      const userId = session.userId;
      const database = new LearningDatabase(`article-english:cloud:${userId}`);
      const scheduler = new FsrsSchedulerAdapter();
      const cloud = new SupabaseCloudRepository(userId, rpc);
      const localSync = new DexieAccountSyncStore(database, userId);
      const dayCache = new AccountCloudDayCache(userId, database, cloud);
      const settings = new AccountCloudSettingsGateway(database, userId, rpc);
      const coordinator = new CloudSyncCoordinator(userId, localSync, cloud, scheduler);
      const sync = new AccountSyncGateway(userId, localSync, coordinator, dayCache, settings);
      const learning = new IndexedDbLearningRepository({
        database,
        userId,
        email: session.email ?? "",
        timezone: browserTimezone(),
        deviceId: installationDeviceId(),
        scheduler,
        syncState: sync
      });
      await learning.initialize();

      return {
        mode: "cloud",
        accountUserId: userId,
        auth,
        learning,
        settings,
        sync,
        async dispose() {
          await sync.dispose();
          database.close();
        }
      };
    }
  };
}
