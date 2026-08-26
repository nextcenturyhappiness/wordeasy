import type { Session, SupabaseClient } from "@supabase/supabase-js";

import type { AuthGateway, SessionView } from "../application/contracts";

const sessionStorageKey = "article-english:auth-session:v1";

export interface SessionCache {
  read(): SessionView;
  write(session: SessionView): void;
}

function anonymousSession(): SessionView {
  return { status: "anonymous", userId: null, email: null };
}

function authenticatedSession(session: Session): SessionView {
  return {
    status: "authenticated",
    userId: session.user.id,
    email: session.user.email ?? null
  };
}

function isSessionView(value: unknown): value is SessionView {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return false;
  }

  if (value.status === "anonymous" || value.status === "expired") {
    return "userId" in value && value.userId === null && "email" in value && value.email === null;
  }

  return (
    value.status === "authenticated" &&
    "userId" in value &&
    typeof value.userId === "string" &&
    "email" in value &&
    (typeof value.email === "string" || value.email === null)
  );
}

export class BrowserSessionCache implements SessionCache {
  read(): SessionView {
    try {
      const raw = localStorage.getItem(sessionStorageKey);
      if (raw === null) {
        return anonymousSession();
      }

      const parsed: unknown = JSON.parse(raw);
      return isSessionView(parsed) ? parsed : anonymousSession();
    } catch {
      return anonymousSession();
    }
  }

  write(session: SessionView): void {
    try {
      localStorage.setItem(sessionStorageKey, JSON.stringify(session));
    } catch {
      // Remote auth remains authoritative when localStorage is unavailable.
    }
  }
}

function errorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }

  return typeof error.status === "number" ? error.status : null;
}

function errorIdentity(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "";
  }

  const name = "name" in error && typeof error.name === "string" ? error.name : "";
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  return `${name}:${code}`;
}

function isRejectedSession(error: unknown): boolean {
  const status = errorStatus(error);
  const identity = errorIdentity(error);
  return (
    status === 401 ||
    status === 403 ||
    identity.includes("AuthSessionMissingError") ||
    identity.includes("AuthInvalidTokenResponseError") ||
    identity.includes("refresh_token_not_found") ||
    identity.includes("session_not_found")
  );
}

export class SupabaseAuthGateway implements AuthGateway {
  readonly #client: SupabaseClient;
  readonly #sessionCache: SessionCache;
  #signingOut = false;
  #hadSession = false;

  constructor(client: SupabaseClient, sessionCache: SessionCache = new BrowserSessionCache()) {
    this.#client = client;
    this.#sessionCache = sessionCache;
  }

  async requestOtp(email: string): Promise<void> {
    const { error } = await this.#client.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true }
    });
    if (error !== null) {
      throw error;
    }
  }

  async verifyOtp(email: string, token: string): Promise<SessionView> {
    const { data, error } = await this.#client.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: "email"
    });
    if (error !== null) {
      throw error;
    }
    if (data.session === null) {
      throw new Error("The verification response did not contain a session.");
    }

    this.#hadSession = true;
    const verifiedSession = authenticatedSession(data.session);
    this.#sessionCache.write(verifiedSession);
    return verifiedSession;
  }

  resendOtp(email: string): Promise<void> {
    return this.requestOtp(email);
  }

  restoreLocal(): Promise<SessionView> {
    const localSession = this.#sessionCache.read();
    this.#hadSession = localSession.status === "authenticated";
    return Promise.resolve(localSession);
  }

  async validateRemote(): Promise<SessionView> {
    const { data, error } = await this.#client.auth.getUser();
    if (error !== null) {
      if (isRejectedSession(error)) {
        const expiredSession: SessionView = { status: "expired", userId: null, email: null };
        this.#sessionCache.write(expiredSession);
        return expiredSession;
      }
      throw error;
    }
    this.#hadSession = true;
    const validatedSession: SessionView = {
      status: "authenticated",
      userId: data.user.id,
      email: data.user.email ?? null
    };
    this.#sessionCache.write(validatedSession);
    return validatedSession;
  }

  subscribe(listener: (session: SessionView) => void): () => void {
    const { data } = this.#client.auth.onAuthStateChange((event, session) => {
      if (session !== null) {
        this.#hadSession = true;
        const nextSession = authenticatedSession(session);
        this.#sessionCache.write(nextSession);
        listener(nextSession);
        return;
      }

      const expired = event === "SIGNED_OUT" && this.#hadSession && !this.#signingOut;
      const nextSession: SessionView = expired
        ? { status: "expired", userId: null, email: null }
        : anonymousSession();
      this.#sessionCache.write(nextSession);
      listener(nextSession);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }

  async signOut(): Promise<void> {
    this.#signingOut = true;
    try {
      const { error } = await this.#client.auth.signOut();
      if (error !== null) {
        throw error;
      }
      this.#hadSession = false;
      this.#sessionCache.write(anonymousSession());
    } finally {
      this.#signingOut = false;
    }
  }
}
