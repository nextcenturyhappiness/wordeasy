import { createContext, useContext } from "react";

import type { SessionView } from "../application/contracts";

export type RemoteSessionState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "validated" }
  | { status: "unavailable"; message: string };

export interface AuthSessionContextValue {
  session: SessionView;
  accountUserId: string | null;
  remoteSession: RemoteSessionState;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<SessionView>;
  resendOtp: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);

  if (context === null) {
    throw new Error("useAuthSession must be used within AuthSessionProvider.");
  }

  return context;
}

export function useOptionalAuthSession(): AuthSessionContextValue | null {
  return useContext(AuthSessionContext);
}
