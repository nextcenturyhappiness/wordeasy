import { useRef, useState, type SyntheticEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import type { SessionView } from "../../application/contracts";
import { useAuthSession } from "../../app/AuthSessionContext";

type LoginStep = "email" | "otp";
type PendingAction = "request" | "verify" | "resend" | "signout" | null;

interface LoginLocationState {
  from?: unknown;
}

function messageFrom(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : "The authentication request could not be completed. Try again.";
}

function safeReturnPath(state: unknown): string {
  if (typeof state !== "object" || state === null || !("from" in state)) {
    return "/";
  }

  const { from } = state as LoginLocationState;
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("/login")
    ? from
    : "/";
}

function isBoundAccount(session: SessionView, accountUserId: string | null): boolean {
  return session.status === "authenticated" && session.userId === accountUserId;
}

export function LoginPage() {
  const { session, accountUserId, requestOtp, verifyOtp, resendOtp, signOut } = useAuthSession();
  const location = useLocation();
  const navigate = useNavigate();
  const returnPath = safeReturnPath(location.state);
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState<PendingAction>(null);
  const pendingRef = useRef<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const handleRequest = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingRef.current !== null) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    pendingRef.current = "request";
    setPending("request");
    setError(null);
    setNotice("");
    try {
      await requestOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setStep("otp");
      setNotice(`A six-digit code was sent to ${normalizedEmail}.`);
    } catch (requestError) {
      setError(messageFrom(requestError));
    } finally {
      pendingRef.current = null;
      setPending(null);
    }
  };

  const handleVerify = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingRef.current !== null || otp.length !== 6) {
      return;
    }

    pendingRef.current = "verify";
    setPending("verify");
    setError(null);
    try {
      const verifiedSession = await verifyOtp(email, otp);
      if (isBoundAccount(verifiedSession, accountUserId)) {
        await navigate(returnPath, { replace: true });
      } else {
        setNotice("Your session is ready. Preparing the local library for this account…");
      }
    } catch (verifyError) {
      setError(messageFrom(verifyError));
    } finally {
      pendingRef.current = null;
      setPending(null);
    }
  };

  const handleResend = async () => {
    if (pendingRef.current !== null) {
      return;
    }

    pendingRef.current = "resend";
    setPending("resend");
    setError(null);
    setNotice("");
    try {
      await resendOtp(email);
      setNotice(`A new six-digit code was sent to ${email}.`);
    } catch (resendError) {
      setError(messageFrom(resendError));
    } finally {
      pendingRef.current = null;
      setPending(null);
    }
  };

  const handleSignOut = async () => {
    if (pendingRef.current !== null) {
      return;
    }

    pendingRef.current = "signout";
    setPending("signout");
    setError(null);
    try {
      await signOut();
      setStep("email");
      setOtp("");
      setNotice("Signed out. Unsynced learning changes remain stored for that account.");
    } catch (signOutError) {
      setError(messageFrom(signOutError));
    } finally {
      pendingRef.current = null;
      setPending(null);
    }
  };

  if (session.status === "authenticated") {
    const accountReady = session.userId === accountUserId;

    return (
      <section className="login-page panel panel--centered">
        <p className="eyebrow">Signed in</p>
        <h1>{accountReady ? "Your session is active." : "Preparing this account…"}</h1>
        <p>{session.email ?? "Authenticated account"}</p>
        {accountReady ? (
          <Link className="button button--primary" to={returnPath}>
            Continue to learning
          </Link>
        ) : (
          <p className="notice" role="status">
            Learning data from the previous account is hidden while the local runtime changes
            accounts.
          </p>
        )}
        <button
          className="button button--secondary"
          type="button"
          disabled={pending !== null}
          onClick={() => {
            void handleSignOut();
          }}
        >
          {pending === "signout" ? "Signing out…" : "Sign out"}
        </button>
        {error === null ? null : (
          <p className="form-message form-message--error" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="login-page auth-layout">
      <header className="auth-heading">
        <p className="eyebrow">Article English</p>
        <h1>{step === "email" ? "Sign in with email" : "Enter your six-digit code"}</h1>
        <p className="muted-copy">
          One account keeps Research English and Medical English progress isolated and available
          across your devices. Email verification signs in or creates the account; no password is
          used.
        </p>
      </header>

      {session.status === "expired" ? (
        <div className="notice notice--error" role="alert">
          <strong>Your session expired.</strong>
          <p>Request a new code to continue. Cached data and unsynced changes were not deleted.</p>
        </div>
      ) : null}

      {step === "email" ? (
        <form className="auth-form" aria-busy={pending === "request"} onSubmit={handleRequest}>
          <label className="field" htmlFor="login-email">
            <span>Email</span>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              disabled={pending !== null}
              value={email}
              aria-describedby={error === null ? undefined : "login-error"}
              onChange={(event) => {
                setEmail(event.currentTarget.value);
              }}
            />
          </label>
          <button className="button button--primary" type="submit" disabled={pending !== null}>
            {pending === "request" ? "Sending code…" : "Send six-digit code"}
          </button>
        </form>
      ) : (
        <form className="auth-form" aria-busy={pending !== null} onSubmit={handleVerify}>
          <p>
            Code sent to <strong>{email}</strong>
          </p>
          <label className="field" htmlFor="login-otp">
            <span>Six-digit code</span>
            <input
              id="login-otp"
              name="otp"
              type="text"
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              disabled={pending !== null}
              value={otp}
              aria-describedby={error === null ? "otp-help" : "otp-help login-error"}
              onChange={(event) => {
                setOtp(event.currentTarget.value.replace(/\D/g, "").slice(0, 6));
              }}
            />
          </label>
          <p className="field-help" id="otp-help">
            Enter the code from your latest email. Codes are never logged by this app.
          </p>
          <button
            className="button button--primary"
            type="submit"
            disabled={pending !== null || otp.length !== 6}
          >
            {pending === "verify" ? "Verifying…" : "Verify and continue"}
          </button>
          <div className="auth-form__secondary-actions">
            <button
              className="button button--secondary"
              type="button"
              disabled={pending !== null}
              onClick={() => {
                void handleResend();
              }}
            >
              {pending === "resend" ? "Resending…" : "Resend code"}
            </button>
            <button
              className="text-button"
              type="button"
              disabled={pending !== null}
              onClick={() => {
                setStep("email");
                setOtp("");
                setError(null);
                setNotice("");
              }}
            >
              Use another email
            </button>
          </div>
        </form>
      )}

      {error === null ? null : (
        <p className="form-message form-message--error" id="login-error" role="alert">
          {error}
        </p>
      )}
      <p className="form-message" aria-live="polite" aria-atomic="true">
        {notice}
      </p>
    </section>
  );
}

export default LoginPage;
