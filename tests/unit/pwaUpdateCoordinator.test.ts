import { beforeAll, describe, expect, it, vi } from "vitest";

interface RegisterHooks {
  onNeedRefresh(): void;
  onOfflineReady(): void;
  onRegisterError(error: unknown): void;
}

let hooks: RegisterHooks | null = null;
const applyUpdate = vi.fn<(reloadPage?: boolean) => Promise<void>>().mockResolvedValue(undefined);

vi.mock("virtual:pwa-register", () => ({
  registerSW: vi.fn((options: RegisterHooks) => {
    hooks = options;
    return applyUpdate;
  })
}));

beforeAll(() => {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {}
  });
});

describe("PWA update coordinator", () => {
  it("requires an explicit safe moment before applying a waiting update", async () => {
    const coordinator = await import("../../src/pwa/updateCoordinator");
    await coordinator.registerPwaUpdateCoordinator();
    if (hooks === null) {
      throw new Error("Service worker registration hooks were not captured.");
    }

    hooks.onNeedRefresh();
    expect(coordinator.getPwaUpdateDetail()).toEqual({
      status: "update-available",
      message: null
    });

    coordinator.setPwaUpdateSafety(false);
    await expect(coordinator.applyPwaUpdate()).resolves.toBe(false);
    expect(applyUpdate).not.toHaveBeenCalled();

    coordinator.setPwaUpdateSafety(true);
    await expect(coordinator.applyPwaUpdate()).resolves.toBe(true);
    expect(applyUpdate).toHaveBeenCalledWith(true);
    expect(coordinator.getPwaUpdateStatus()).toBe("updating");
  });
});
