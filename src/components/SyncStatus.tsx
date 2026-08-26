import type { SyncState } from "../application/contracts";

interface SyncStatusProps {
  state: SyncState;
}

function statusText(state: SyncState): string {
  switch (state.status) {
    case "synced":
      return "Synced";
    case "syncing":
      return state.pendingCount > 0
        ? `Syncing ${String(state.pendingCount)} pending changes…`
        : "Syncing…";
    case "offline":
      return state.pendingCount > 0
        ? `Offline · ${String(state.pendingCount)} changes pending`
        : "Offline";
    case "pending":
      return `${String(state.pendingCount)} ${state.pendingCount === 1 ? "change" : "changes"} pending`;
    case "failed":
      return state.pendingCount > 0
        ? `Sync failed · ${String(state.pendingCount)} changes pending`
        : "Sync failed";
  }
}

export function SyncStatus({ state }: SyncStatusProps) {
  return (
    <p className={`sync-status sync-status--${state.status}`} role="status" aria-live="polite">
      <span className="sync-status__dot" aria-hidden="true" />
      {statusText(state)}
    </p>
  );
}
