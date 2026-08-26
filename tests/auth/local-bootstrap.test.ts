import { describe, expect, it, vi } from "vitest";

import type {
  AuthGateway,
  HomeSnapshot,
  SettingsGateway,
  ThemePreference
} from "../../src/application/contracts";
import { loadLocalAppState } from "../../src/app/loadLocalAppState";
import { buildHomeSnapshot, createRepository } from "../ui/fixtures";
import { authenticatedSession, createAuthGateway, createSettingsGateway } from "./fixtures";

describe("loadLocalAppState", () => {
  it("starts Home, local session, and theme reads together without remote validation", async () => {
    let resolveHome: ((snapshot: HomeSnapshot) => void) | undefined;
    let resolveSession: ((session: typeof authenticatedSession) => void) | undefined;
    let resolveTheme: ((theme: ThemePreference) => void) | undefined;

    const getCachedHome = vi.fn(
      () =>
        new Promise<HomeSnapshot>((resolve) => {
          resolveHome = resolve;
        })
    );
    const restoreLocal = vi.fn<AuthGateway["restoreLocal"]>(
      () =>
        new Promise((resolve) => {
          resolveSession = resolve;
        })
    );
    const getTheme = vi.fn<SettingsGateway["getTheme"]>(
      () =>
        new Promise((resolve) => {
          resolveTheme = resolve;
        })
    );
    const repository = createRepository({ getCachedHome });
    const authGateway = createAuthGateway({ restoreLocal });
    const settingsGateway = createSettingsGateway("system", "Asia/Shanghai", {
      getTheme
    });

    const statePromise = loadLocalAppState({ repository, authGateway, settingsGateway });

    expect(getCachedHome).toHaveBeenCalledTimes(1);
    expect(restoreLocal).toHaveBeenCalledTimes(1);
    expect(getTheme).toHaveBeenCalledTimes(1);
    expect(authGateway.validateRemote).not.toHaveBeenCalled();

    const snapshot = buildHomeSnapshot({ userId: "account-a" });
    resolveHome?.(snapshot);
    resolveSession?.(authenticatedSession);
    resolveTheme?.("dark");

    await expect(statePromise).resolves.toEqual({
      initialHome: snapshot,
      initialSession: authenticatedSession,
      initialTheme: "dark"
    });
    expect(authGateway.validateRemote).not.toHaveBeenCalled();
  });
});
