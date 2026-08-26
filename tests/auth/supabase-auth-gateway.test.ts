import type { AuthChangeEvent, Session, SupabaseClient, User } from "@supabase/supabase-js";
import { describe, expect, it, vi, type Mock } from "vitest";

import type { SessionView } from "../../src/application/contracts";
import { SupabaseAuthGateway, type SessionCache } from "../../src/auth/SupabaseAuthGateway";

function user(id = "account-a", email = "learner@example.com"): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-08-26T08:00:00.000Z",
    email
  };
}

function session(account = user()): Session {
  return {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: account
  };
}

interface FakeAuthClient {
  signInWithOtp: ReturnType<typeof vi.fn>;
  verifyOtp: ReturnType<typeof vi.fn>;
  getSession: ReturnType<typeof vi.fn>;
  getUser: ReturnType<typeof vi.fn>;
  onAuthStateChange: ReturnType<typeof vi.fn>;
  signOut: Mock<() => Promise<{ error: null }>>;
}

function clientFrom(auth: FakeAuthClient): SupabaseClient {
  return { auth } as unknown as SupabaseClient;
}

function createAuthClient() {
  let authListener: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  const unsubscribe = vi.fn();
  const auth: FakeAuthClient = {
    signInWithOtp: vi.fn(() =>
      Promise.resolve({ data: { user: null, session: null }, error: null })
    ),
    verifyOtp: vi.fn(() =>
      Promise.resolve({ data: { user: user(), session: session() }, error: null })
    ),
    getSession: vi.fn(() => Promise.resolve({ data: { session: session() }, error: null })),
    getUser: vi.fn(() => Promise.resolve({ data: { user: user() }, error: null })),
    onAuthStateChange: vi.fn(
      (listener: (event: AuthChangeEvent, currentSession: Session | null) => void) => {
        authListener = listener;
        return { data: { subscription: { id: "test", callback: listener, unsubscribe } } };
      }
    ),
    signOut: vi.fn<() => Promise<{ error: null }>>(() => Promise.resolve({ error: null }))
  };

  return {
    auth,
    unsubscribe,
    emit(event: AuthChangeEvent, currentSession: Session | null) {
      authListener?.(event, currentSession);
    }
  };
}

function createSessionCache(initialSession: SessionView) {
  let storedSession = initialSession;
  const cache: SessionCache = {
    read: vi.fn<SessionCache["read"]>(() => storedSession),
    write: vi.fn<SessionCache["write"]>((nextSession) => {
      storedSession = nextSession;
    })
  };

  return cache;
}

describe("SupabaseAuthGateway", () => {
  it("requests, resends, and verifies a six-digit Email OTP", async () => {
    const fake = createAuthClient();
    const gateway = new SupabaseAuthGateway(clientFrom(fake.auth));

    await gateway.requestOtp(" Learner@Example.com ");
    await gateway.resendOtp("Learner@Example.com");
    await expect(gateway.verifyOtp("Learner@Example.com", "123456")).resolves.toEqual({
      status: "authenticated",
      userId: "account-a",
      email: "learner@example.com"
    });

    expect(fake.auth.signInWithOtp).toHaveBeenNthCalledWith(1, {
      email: "learner@example.com",
      options: { shouldCreateUser: true }
    });
    expect(fake.auth.signInWithOtp).toHaveBeenNthCalledWith(2, {
      email: "learner@example.com",
      options: { shouldCreateUser: true }
    });
    expect(fake.auth.verifyOtp).toHaveBeenCalledWith({
      email: "learner@example.com",
      token: "123456",
      type: "email"
    });
    expect(localStorage.getItem("article-english:auth-session:v1")).toBe(
      JSON.stringify({
        status: "authenticated",
        userId: "account-a",
        email: "learner@example.com"
      })
    );
    expect(localStorage.getItem("article-english:auth-session:v1")).not.toContain(
      "test-access-token"
    );
  });

  it("separates local restore from remote user validation", async () => {
    const fake = createAuthClient();
    const cache = createSessionCache({
      status: "authenticated",
      userId: "account-a",
      email: "learner@example.com"
    });
    const gateway = new SupabaseAuthGateway(clientFrom(fake.auth), cache);

    await expect(gateway.restoreLocal()).resolves.toEqual({
      status: "authenticated",
      userId: "account-a",
      email: "learner@example.com"
    });
    expect(fake.auth.getSession).not.toHaveBeenCalled();
    expect(fake.auth.getUser).not.toHaveBeenCalled();

    await expect(gateway.validateRemote()).resolves.toMatchObject({
      status: "authenticated",
      userId: "account-a"
    });
    expect(fake.auth.getUser).toHaveBeenCalledTimes(1);
  });

  it("maps rejected credentials to expired but preserves transient network errors", async () => {
    const rejected = createAuthClient();
    rejected.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { status: 401, message: "JWT expired" }
    });
    const rejectedCache = createSessionCache({
      status: "authenticated",
      userId: "account-a",
      email: "learner@example.com"
    });
    const rejectedGateway = new SupabaseAuthGateway(clientFrom(rejected.auth), rejectedCache);
    await expect(rejectedGateway.validateRemote()).resolves.toEqual({
      status: "expired",
      userId: null,
      email: null
    });

    await expect(rejectedGateway.restoreLocal()).resolves.toEqual({
      status: "expired",
      userId: null,
      email: null
    });

    const offline = createAuthClient();
    const networkError = new TypeError("Failed to fetch");
    offline.auth.getUser.mockResolvedValue({ data: { user: null }, error: networkError });
    const offlineCache = createSessionCache({
      status: "authenticated",
      userId: "account-a",
      email: "learner@example.com"
    });
    const offlineGateway = new SupabaseAuthGateway(clientFrom(offline.auth), offlineCache);
    await expect(offlineGateway.validateRemote()).rejects.toBe(networkError);
    await expect(offlineGateway.restoreLocal()).resolves.toMatchObject({
      status: "authenticated",
      userId: "account-a"
    });
  });

  it("emits listener changes and distinguishes expiry from an explicit sign out", async () => {
    const fake = createAuthClient();
    fake.auth.signOut.mockImplementation(() => {
      fake.emit("SIGNED_OUT", null);
      return Promise.resolve({ error: null });
    });
    const gateway = new SupabaseAuthGateway(clientFrom(fake.auth));
    const sessions: SessionView[] = [];
    const unsubscribe = gateway.subscribe((nextSession) => {
      sessions.push(nextSession);
    });

    fake.emit("SIGNED_IN", session());
    fake.emit("SIGNED_OUT", null);
    expect(sessions.at(-1)).toEqual({ status: "expired", userId: null, email: null });

    fake.emit("SIGNED_IN", session());
    await gateway.signOut();
    expect(sessions.at(-1)).toEqual({ status: "anonymous", userId: null, email: null });

    unsubscribe();
    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
