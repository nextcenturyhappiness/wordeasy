import { vi, type Mock } from "vitest";

import type {
  AuthGateway,
  SessionView,
  SettingsGateway,
  ThemePreference
} from "../../src/application/contracts";

export const anonymousSession: SessionView = {
  status: "anonymous",
  userId: null,
  email: null
};

export const expiredSession: SessionView = {
  status: "expired",
  userId: null,
  email: null
};

export const authenticatedSession: SessionView = {
  status: "authenticated",
  userId: "account-a",
  email: "learner@example.com"
};

export interface AuthGatewayFixture extends AuthGateway {
  requestOtp: Mock<AuthGateway["requestOtp"]>;
  verifyOtp: Mock<AuthGateway["verifyOtp"]>;
  resendOtp: Mock<AuthGateway["resendOtp"]>;
  restoreLocal: Mock<AuthGateway["restoreLocal"]>;
  validateRemote: Mock<AuthGateway["validateRemote"]>;
  subscribe: Mock<AuthGateway["subscribe"]>;
  signOut: Mock<AuthGateway["signOut"]>;
  emit(session: SessionView): void;
}

export function createAuthGateway(
  overrides: Partial<AuthGateway> = {},
  localSession: SessionView = authenticatedSession
): AuthGatewayFixture {
  const listeners = new Set<(session: SessionView) => void>();
  const requestOtp = vi.fn<AuthGateway["requestOtp"]>(
    overrides.requestOtp ?? (() => Promise.resolve())
  );
  const verifyOtp = vi.fn<AuthGateway["verifyOtp"]>(
    overrides.verifyOtp ?? (() => Promise.resolve(authenticatedSession))
  );
  const resendOtp = vi.fn<AuthGateway["resendOtp"]>(
    overrides.resendOtp ?? (() => Promise.resolve())
  );
  const restoreLocal = vi.fn<AuthGateway["restoreLocal"]>(
    overrides.restoreLocal ?? (() => Promise.resolve(localSession))
  );
  const validateRemote = vi.fn<AuthGateway["validateRemote"]>(
    overrides.validateRemote ?? (() => Promise.resolve(localSession))
  );
  const subscribe = vi.fn<AuthGateway["subscribe"]>(
    overrides.subscribe ??
      ((listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      })
  );
  const signOut = vi.fn<AuthGateway["signOut"]>(overrides.signOut ?? (() => Promise.resolve()));

  return {
    requestOtp,
    verifyOtp,
    resendOtp,
    restoreLocal,
    validateRemote,
    subscribe,
    signOut,
    emit(session) {
      for (const listener of listeners) {
        listener(session);
      }
    }
  };
}

export interface SettingsGatewayFixture extends SettingsGateway {
  getTheme: Mock<SettingsGateway["getTheme"]>;
  setTheme: Mock<SettingsGateway["setTheme"]>;
  getTimezone: Mock<SettingsGateway["getTimezone"]>;
  setTimezone: Mock<SettingsGateway["setTimezone"]>;
}

export function createSettingsGateway(
  initialTheme: ThemePreference = "system",
  initialTimezone = "Asia/Shanghai",
  overrides: Partial<SettingsGateway> = {}
): SettingsGatewayFixture {
  return {
    getTheme: vi.fn<SettingsGateway["getTheme"]>(
      overrides.getTheme ?? (() => Promise.resolve(initialTheme))
    ),
    setTheme: vi.fn<SettingsGateway["setTheme"]>(overrides.setTheme ?? (() => Promise.resolve())),
    getTimezone: vi.fn<SettingsGateway["getTimezone"]>(
      overrides.getTimezone ?? (() => Promise.resolve(initialTimezone))
    ),
    setTimezone: vi.fn<SettingsGateway["setTimezone"]>(
      overrides.setTimezone ?? (() => Promise.resolve())
    )
  };
}
