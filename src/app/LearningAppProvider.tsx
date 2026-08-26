import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type {
  HomeSnapshot,
  LearningRepository,
  RateCardResult,
  SyncGateway,
  SyncState
} from "../application/contracts";
import { markPerformanceOnce } from "../application/performance";
import {
  LearningAppContext,
  type HomeResource,
  type LearningAppContextValue
} from "./LearningAppContext";

export interface LearningAppProviderProps {
  repository: LearningRepository;
  initialHome: HomeSnapshot | null;
  initialSyncState: SyncState;
  syncGateway?: SyncGateway;
  children: ReactNode;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Saved learning data could not be opened.";
}

export function LearningAppProvider({
  repository,
  initialHome,
  initialSyncState,
  syncGateway,
  children
}: LearningAppProviderProps) {
  const [home, setHome] = useState<HomeResource>(() =>
    initialHome === null ? { status: "loading" } : { status: "ready", snapshot: initialHome }
  );
  const [syncState, setSyncState] = useState<SyncState>(() =>
    syncGateway === undefined ? initialSyncState : syncGateway.getState()
  );
  const initializationRef = useRef<{
    repository: LearningRepository;
    promise: Promise<void>;
  } | null>(null);

  const ensureInitialized = useCallback(() => {
    if (initializationRef.current?.repository === repository) {
      return initializationRef.current.promise;
    }

    const promise = repository.initialize();
    initializationRef.current = { repository, promise };
    return promise;
  }, [repository]);

  const syncNow = useCallback((): Promise<SyncState> => {
    if (syncGateway === undefined) {
      return Promise.resolve(initialSyncState);
    }
    return syncGateway.sync();
  }, [initialSyncState, syncGateway]);

  useEffect(() => {
    if (syncGateway === undefined) {
      return;
    }

    let active = true;

    async function refreshHomeAfterSync() {
      try {
        const snapshot = await repository.getCachedHome();
        if (active && snapshot !== null) {
          setHome((current) => {
            if (current.status === "ready" && current.snapshot.userId !== snapshot.userId) {
              return current;
            }

            return { status: "ready", snapshot };
          });
        }
      } catch {
        // A background refresh must not replace an already usable cached Home.
      }
    }

    const unsubscribe = syncGateway.subscribe((nextState) => {
      setSyncState(nextState);
      if (nextState.status === "synced") {
        markPerformanceOnce("remote-sync-complete");
        void refreshHomeAfterSync();
      }
    });

    const triggerSync = () => {
      void syncGateway.sync().catch(() => undefined);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerSync();
      }
    };

    window.addEventListener("online", triggerSync);
    window.addEventListener("focus", triggerSync);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    triggerSync();

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("online", triggerSync);
      window.removeEventListener("focus", triggerSync);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [repository, syncGateway]);

  useEffect(() => {
    let active = true;

    async function hydrateHome() {
      try {
        await ensureInitialized();

        if (initialHome !== null) {
          return;
        }

        const snapshot = await repository.getCachedHome();
        if (!active) {
          return;
        }

        setHome(snapshot === null ? { status: "empty" } : { status: "ready", snapshot });
      } catch (error) {
        if (active && initialHome === null) {
          setHome({ status: "error", message: errorMessage(error) });
        }
      }
    }

    void hydrateHome();

    return () => {
      active = false;
    };
  }, [ensureInitialized, initialHome, repository]);

  const applyRatingResult = useCallback(
    (result: RateCardResult) => {
      setHome((current) => {
        if (current.status !== "ready") {
          return current;
        }

        return {
          status: "ready",
          snapshot: {
            ...current.snapshot,
            modules: {
              ...current.snapshot.modules,
              [result.summary.module]: result.summary
            },
            pendingSyncCount: current.snapshot.pendingSyncCount + 1
          }
        };
      });

      setSyncState((current) =>
        syncGateway === undefined
          ? { status: "pending", pendingCount: current.pendingCount + 1 }
          : syncGateway.getState()
      );
      void syncNow().catch(() => undefined);
    },
    [syncGateway, syncNow]
  );

  const value = useMemo<LearningAppContextValue>(
    () => ({
      repository,
      home,
      syncState,
      ensureInitialized,
      syncNow,
      applyRatingResult
    }),
    [applyRatingResult, ensureInitialized, home, repository, syncNow, syncState]
  );

  return <LearningAppContext.Provider value={value}>{children}</LearningAppContext.Provider>;
}
