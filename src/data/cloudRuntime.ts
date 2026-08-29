import type {
  AuthGateway,
  LearningRepository,
  ModuleSlug,
  QueueKind,
  RateCardInput,
  SettingsGateway,
  StudyQueueSnapshot,
  SyncGateway,
  SyncState,
  ThemePreference
} from "../application/contracts";
import { themeStorageKey } from "../app/theme";
import { BrowserSessionCache, type SessionCache } from "../auth/SupabaseAuthGateway";
import { assertIanaTimezone } from "../domain/time";
import { LearningDatabase } from "../db/learningDatabase";
import { LocalSyncStateStore } from "../sync/localSyncState";
import { AccountCloudSettingsGateway } from "./cloud/accountPreferences";
import type { CloudRpcClient } from "./cloud/rpcClient";
import {
  IndexedDbLearningRepository,
  type PendingSyncCountPort
} from "./indexedDbLearningRepository";
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

  prefetchToday(module: ModuleSlug): Promise<never> {
    void module;
    return Promise.reject(new Error("Sign in before prefetching a learning module."));
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

interface AccountSyncDelegate extends SyncGateway, PendingSyncCountPort {
  dispose(): Promise<void>;
}

export class DeferredAccountSyncGateway implements SyncGateway, PendingSyncCountPort {
  readonly #listeners = new Set<(state: SyncState) => void>();
  #state: SyncState = { status: "synced", pendingCount: 0 };
  #delegate: AccountSyncDelegate | null = null;
  #delegatePromise: Promise<AccountSyncDelegate> | null = null;
  #unsubscribeDelegate: (() => void) | null = null;
  #disposed = false;

  constructor(private readonly loadDelegate: () => Promise<AccountSyncDelegate>) {}

  getState(): SyncState {
    return this.#delegate?.getState() ?? this.#state;
  }

  setPendingCount(pendingCount: number): void {
    if (this.#disposed) {
      return;
    }
    if (this.#delegate !== null) {
      this.#delegate.setPendingCount(pendingCount);
      return;
    }
    this.#setState(
      pendingCount === 0
        ? { status: "synced", pendingCount: 0 }
        : { status: "pending", pendingCount }
    );
  }

  async sync(): Promise<SyncState> {
    if (this.#disposed) {
      throw new Error("Deferred account sync gateway was disposed.");
    }
    try {
      const delegate = await this.#load();
      return await delegate.sync();
    } catch (error: unknown) {
      return this.#setState({
        status: "failed",
        pendingCount: this.#state.pendingCount,
        message: error instanceof Error ? error.message : "Cloud sync could not be loaded."
      });
    }
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    if (this.#disposed) {
      throw new Error("Deferred account sync gateway was disposed.");
    }
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  async dispose(): Promise<void> {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.#unsubscribeDelegate?.();
    this.#listeners.clear();
    const delegate = await this.#delegatePromise?.catch(() => null);
    await delegate?.dispose();
  }

  #load(): Promise<AccountSyncDelegate> {
    this.#delegatePromise ??= this.loadDelegate().then((delegate) => {
      if (this.#disposed) {
        void delegate.dispose();
        throw new Error("Deferred account sync gateway was disposed while loading.");
      }
      this.#delegate = delegate;
      delegate.setPendingCount(this.#state.pendingCount);
      this.#unsubscribeDelegate = delegate.subscribe((state) => this.#setState(state));
      return delegate;
    });
    return this.#delegatePromise;
  }

  #setState(state: SyncState): SyncState {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
    return state;
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
      const settings = new AccountCloudSettingsGateway(database, userId, rpc);
      const sync = new DeferredAccountSyncGateway(async () => {
        const { createAccountCloudSyncGateway } = await import("./cloudSyncRuntime");
        return createAccountCloudSyncGateway({ database, userId, rpc, settings });
      });
      const learning = new IndexedDbLearningRepository({
        database,
        userId,
        email: session.email ?? "",
        timezone: browserTimezone(),
        deviceId: installationDeviceId(),
        scheduler: async () => {
          const { FsrsSchedulerAdapter } = await import("../scheduler/fsrsScheduler");
          return new FsrsSchedulerAdapter();
        },
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
