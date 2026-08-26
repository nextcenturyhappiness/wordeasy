import { act, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type {
  AuthGateway,
  SessionView,
  SyncGateway,
  SyncState
} from "../../src/application/contracts";
import { AppRoutes } from "../../src/app/AppRoutes";
import {
  authenticatedSession,
  createAuthGateway,
  createSettingsGateway,
  expiredSession
} from "../auth/fixtures";
import { buildHomeSnapshot, createRepository, renderWithAuthenticatedApp } from "./fixtures";

function deferredSessionValidation() {
  let resolve: ((session: SessionView) => void) | undefined;
  let reject: ((error: unknown) => void) | undefined;
  const promise = new Promise<SessionView>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe("authenticated application boundary", () => {
  it("shows cached Home while remote session validation is still pending", async () => {
    const validation = deferredSessionValidation();
    const authGateway = createAuthGateway({
      validateRemote: vi.fn<AuthGateway["validateRemote"]>(() => validation.promise)
    });
    const settingsGateway = createSettingsGateway();
    renderWithAuthenticatedApp(<AppRoutes settingsGateway={settingsGateway} />, {
      authGateway,
      settingsGateway,
      initialEntries: ["/"]
    });

    expect(
      screen.getByRole("heading", { name: /good (morning|afternoon|evening)/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Research English" })).toBeInTheDocument();
    expect(authGateway.validateRemote).toHaveBeenCalledTimes(1);

    validation.resolve?.(authenticatedSession);
    await waitFor(() => {
      expect(screen.queryByText(/server could not verify/i)).not.toBeInTheDocument();
    });
  });

  it("hides cached account data and explains a remotely expired session", async () => {
    const validation = deferredSessionValidation();
    const authGateway = createAuthGateway({
      validateRemote: vi.fn<AuthGateway["validateRemote"]>(() => validation.promise)
    });
    const settingsGateway = createSettingsGateway();
    renderWithAuthenticatedApp(<AppRoutes settingsGateway={settingsGateway} />, {
      authGateway,
      settingsGateway,
      initialEntries: ["/"]
    });

    expect(screen.getByRole("article", { name: "Research English" })).toBeInTheDocument();
    await act(async () => {
      validation.resolve?.(expiredSession);
      await validation.promise;
    });

    expect(await screen.findByRole("heading", { name: "Sign in with email" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Your session expired");
    expect(screen.queryByRole("article", { name: "Research English" })).not.toBeInTheDocument();
    expect(screen.queryByText("128 words learned")).not.toBeInTheDocument();
  });

  it("keeps cached Home on a transient validation error and reports the offline-safe state", async () => {
    const validation = deferredSessionValidation();
    const authGateway = createAuthGateway({
      validateRemote: vi.fn<AuthGateway["validateRemote"]>(() => validation.promise)
    });
    const settingsGateway = createSettingsGateway();
    renderWithAuthenticatedApp(<AppRoutes settingsGateway={settingsGateway} />, {
      authGateway,
      settingsGateway,
      initialEntries: ["/"]
    });

    await act(async () => {
      validation.reject?.(new TypeError("Failed to fetch"));
      await validation.promise.catch(() => undefined);
    });

    expect(screen.getByRole("article", { name: "Research English" })).toBeInTheDocument();
    expect(screen.getByText(/server could not verify this session/i)).toHaveAttribute(
      "role",
      "status"
    );
  });

  it("hard-gates account A data when the auth listener changes to account B", async () => {
    const authGateway = createAuthGateway();
    const settingsGateway = createSettingsGateway();
    const onAccountChange = vi.fn<(session: SessionView) => void>();
    renderWithAuthenticatedApp(<AppRoutes settingsGateway={settingsGateway} />, {
      authGateway,
      settingsGateway,
      onAccountChange,
      initialEntries: ["/"]
    });

    expect(screen.getByText("128 words learned")).toBeInTheDocument();
    act(() => {
      authGateway.emit({
        status: "authenticated",
        userId: "account-b",
        email: "second@example.com"
      });
    });

    expect(
      await screen.findByRole("heading", { name: "Preparing this account’s local library…" })
    ).toBeInTheDocument();
    expect(screen.queryByText("128 words learned")).not.toBeInTheDocument();
    expect(screen.queryByRole("article", { name: "Medical English" })).not.toBeInTheDocument();
    expect(
      screen.getByText(/unsynced changes remain stored under that account/i)
    ).toBeInTheDocument();
    expect(onAccountChange).toHaveBeenCalledWith({
      status: "authenticated",
      userId: "account-b",
      email: "second@example.com"
    });
  });

  it("requests a runtime rebuild when restored session B meets cached runtime A", async () => {
    const restoredSession: SessionView = {
      status: "authenticated",
      userId: "account-b",
      email: "second@example.com"
    };
    const authGateway = createAuthGateway({}, restoredSession);
    const settingsGateway = createSettingsGateway();
    const onAccountChange = vi.fn<(session: SessionView) => void>();
    renderWithAuthenticatedApp(<AppRoutes settingsGateway={settingsGateway} />, {
      authGateway,
      settingsGateway,
      initialSession: restoredSession,
      accountUserId: "account-a",
      onAccountChange,
      initialEntries: ["/"]
    });

    expect(
      await screen.findByRole("heading", { name: "Preparing this account’s local library…" })
    ).toBeInTheDocument();
    expect(screen.queryByText("128 words learned")).not.toBeInTheDocument();
    expect(onAccountChange).toHaveBeenCalledWith(restoredSession);
  });

  it("subscribes to live sync state without changing module progress", () => {
    let state: SyncState = { status: "synced", pendingCount: 0 };
    let snapshot = buildHomeSnapshot({ userId: "account-a" });
    const listeners = new Set<(nextState: SyncState) => void>();
    const getState = vi.fn<SyncGateway["getState"]>(() => state);
    const sync = vi.fn<SyncGateway["sync"]>(() => Promise.resolve(state));
    const subscribe = vi.fn<SyncGateway["subscribe"]>((listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    });
    const syncGateway: SyncGateway = {
      getState,
      sync,
      subscribe
    };
    const getCachedHome = vi.fn(() => Promise.resolve(snapshot));
    const repository = createRepository({ getCachedHome });
    const settingsGateway = createSettingsGateway();
    renderWithAuthenticatedApp(<AppRoutes settingsGateway={settingsGateway} />, {
      repository,
      settingsGateway,
      syncGateway,
      initialEntries: ["/"]
    });

    expect(screen.getByRole("status")).toHaveTextContent("Synced");
    act(() => {
      state = { status: "pending", pendingCount: 4 };
      for (const listener of listeners) {
        listener(state);
      }
    });

    expect(screen.getByRole("status")).toHaveTextContent("4 changes pending");
    expect(screen.getByText("6 / 10")).toBeInTheDocument();
    expect(screen.getByText("3 / 10")).toBeInTheDocument();

    snapshot = buildHomeSnapshot({
      userId: "account-a",
      modules: {
        ...snapshot.modules,
        research_english: {
          ...snapshot.modules.research_english,
          new: { completed: 8, total: 10 }
        }
      }
    });
    act(() => {
      state = { status: "synced", pendingCount: 0 };
      for (const listener of listeners) {
        listener(state);
      }
    });
    return waitFor(() => {
      expect(screen.getByText("8 / 10")).toBeInTheDocument();
      expect(screen.getByText("3 / 10")).toBeInTheDocument();
    });
  });
});
