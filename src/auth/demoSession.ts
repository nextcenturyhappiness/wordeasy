import type { AuthGateway, SessionView } from "../application/contracts";

export class DemoSessionAdapter implements AuthGateway {
  #session: SessionView;
  readonly #listeners = new Set<(session: SessionView) => void>();

  constructor(userId: string, email: string) {
    this.#session = { status: "authenticated", userId, email };
  }

  requestOtp(email: string): Promise<void> {
    void email;
    return Promise.reject(new Error("Email OTP is unavailable in explicit demo mode."));
  }

  verifyOtp(email: string, token: string): Promise<SessionView> {
    void email;
    void token;
    return Promise.reject(new Error("Email OTP is unavailable in explicit demo mode."));
  }

  resendOtp(email: string): Promise<void> {
    void email;
    return Promise.reject(new Error("Email OTP is unavailable in explicit demo mode."));
  }

  restoreLocal(): Promise<SessionView> {
    return Promise.resolve(this.#session);
  }

  validateRemote(): Promise<SessionView> {
    return Promise.resolve(this.#session);
  }

  subscribe(listener: (session: SessionView) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  signOut(): Promise<void> {
    this.#session = { status: "anonymous", userId: null, email: null };
    for (const listener of this.#listeners) {
      listener(this.#session);
    }
    return Promise.resolve();
  }
}
