import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { AuthGateway, SessionView } from "../application/contracts";
import {
  AuthSessionContext,
  type AuthSessionContextValue,
  type RemoteSessionState
} from "./AuthSessionContext";

type AccountChangeHandler = (session: SessionView) => void | Promise<void>;

export interface AuthSessionProviderProps {
  gateway: AuthGateway;
  initialSession: SessionView;
  accountUserId: string | null;
  onAccountChange?: AccountChangeHandler;
  children: ReactNode;
}

function validationErrorMessage(): string {
  return "The server could not verify this session. Cached learning remains available while you are offline.";
}

function sessionIdentity(session: SessionView): string {
  return `${session.status}:${session.userId ?? "none"}`;
}

function runtimeIdentity(accountUserId: string | null, session: SessionView): string {
  if (accountUserId !== null) {
    return `authenticated:${accountUserId}`;
  }

  return session.status === "authenticated" ? "runtime:none" : sessionIdentity(session);
}

export function AuthSessionProvider({
  gateway,
  initialSession,
  accountUserId,
  onAccountChange,
  children
}: AuthSessionProviderProps) {
  const [session, setSession] = useState<SessionView>(initialSession);
  const [remoteSession, setRemoteSession] = useState<RemoteSessionState>(() =>
    initialSession.status === "authenticated" ? { status: "validating" } : { status: "idle" }
  );
  const sessionRef = useRef(initialSession);
  const accountChangeRef = useRef<{ identity: string; promise: Promise<void> }>({
    identity: runtimeIdentity(accountUserId, initialSession),
    promise: Promise.resolve()
  });

  const updateSession = useCallback((nextSession: SessionView) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
  }, []);

  const notifyAccountChange = useCallback(
    async (nextSession: SessionView) => {
      const nextIdentity = sessionIdentity(nextSession);
      if (accountChangeRef.current.identity === nextIdentity) {
        return accountChangeRef.current.promise;
      }

      const promise = Promise.resolve(onAccountChange?.(nextSession));
      accountChangeRef.current = { identity: nextIdentity, promise };
      return promise;
    },
    [onAccountChange]
  );

  const notifyAccountChangeInBackground = useCallback(
    (nextSession: SessionView) => {
      void notifyAccountChange(nextSession).catch(() => {
        setRemoteSession({
          status: "unavailable",
          message:
            "This account’s local library could not be prepared. Previous-account data remains hidden."
        });
      });
    },
    [notifyAccountChange]
  );

  useEffect(() => {
    let active = true;

    const unsubscribe = gateway.subscribe((nextSession) => {
      if (!active) {
        return;
      }

      updateSession(nextSession);
      notifyAccountChangeInBackground(nextSession);
      setRemoteSession(
        nextSession.status === "authenticated" ? { status: "validated" } : { status: "idle" }
      );
    });

    notifyAccountChangeInBackground(sessionRef.current);

    if (sessionRef.current.status === "authenticated") {
      const validatingUserId = sessionRef.current.userId;
      setRemoteSession({ status: "validating" });

      void gateway
        .validateRemote()
        .then((validatedSession) => {
          if (!active || sessionRef.current.userId !== validatingUserId) {
            return;
          }

          updateSession(validatedSession);
          notifyAccountChangeInBackground(validatedSession);
          setRemoteSession(
            validatedSession.status === "authenticated"
              ? { status: "validated" }
              : { status: "idle" }
          );
        })
        .catch(() => {
          if (active && sessionRef.current.userId === validatingUserId) {
            setRemoteSession({ status: "unavailable", message: validationErrorMessage() });
          }
        });
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, [gateway, notifyAccountChangeInBackground, updateSession]);

  const requestOtp = useCallback(
    (email: string) => {
      return gateway.requestOtp(email);
    },
    [gateway]
  );

  const resendOtp = useCallback(
    (email: string) => {
      return gateway.resendOtp(email);
    },
    [gateway]
  );

  const verifyOtp = useCallback(
    async (email: string, token: string) => {
      const verifiedSession = await gateway.verifyOtp(email, token);
      updateSession(verifiedSession);
      setRemoteSession(
        verifiedSession.status === "authenticated" ? { status: "validated" } : { status: "idle" }
      );
      await notifyAccountChange(verifiedSession);
      return verifiedSession;
    },
    [gateway, notifyAccountChange, updateSession]
  );

  const signOut = useCallback(async () => {
    await gateway.signOut();
    const anonymousSession: SessionView = {
      status: "anonymous",
      userId: null,
      email: null
    };
    updateSession(anonymousSession);
    setRemoteSession({ status: "idle" });
    await notifyAccountChange(anonymousSession);
  }, [gateway, notifyAccountChange, updateSession]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      session,
      accountUserId,
      remoteSession,
      requestOtp,
      verifyOtp,
      resendOtp,
      signOut
    }),
    [accountUserId, remoteSession, requestOtp, resendOtp, session, signOut, verifyOtp]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
