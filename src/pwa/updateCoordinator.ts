export type PwaUpdateStatus = "idle" | "offline-ready" | "update-available" | "updating" | "error";

export interface PwaUpdateDetail {
  status: PwaUpdateStatus;
  message: string | null;
}

export const PWA_UPDATE_EVENT = "article-english:pwa-update";

let applyRegisteredUpdate: ((reloadPage?: boolean) => Promise<void>) | null = null;
let updateIsSafe = true;
let status: PwaUpdateStatus = "idle";

function emit(nextStatus: PwaUpdateStatus, message: string | null = null): void {
  status = nextStatus;
  window.dispatchEvent(
    new CustomEvent<PwaUpdateDetail>(PWA_UPDATE_EVENT, {
      detail: { status: nextStatus, message }
    })
  );
}

export function getPwaUpdateStatus(): PwaUpdateStatus {
  return status;
}

export function setPwaUpdateSafety(isSafe: boolean): void {
  updateIsSafe = isSafe;
}

export async function applyPwaUpdate(): Promise<boolean> {
  if (!updateIsSafe || status !== "update-available" || applyRegisteredUpdate === null) {
    return false;
  }

  emit("updating");
  try {
    await applyRegisteredUpdate(true);
    return true;
  } catch (error: unknown) {
    emit("error", error instanceof Error ? error.message : "The app update could not be applied.");
    return false;
  }
}

export async function registerPwaUpdateCoordinator(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const { registerSW } = await import("virtual:pwa-register");
  applyRegisteredUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      emit("update-available");
    },
    onOfflineReady() {
      emit("offline-ready");
    },
    onRegisterError(error) {
      emit("error", error instanceof Error ? error.message : "Offline support could not start.");
    }
  });
}
