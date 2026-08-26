import { useEffect, useState, type SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { SettingsGateway, ThemePreference } from "../../application/contracts";
import { useAuthSession } from "../../app/AuthSessionContext";
import { useLearningApp } from "../../app/LearningAppContext";
import { useThemePreference } from "../../app/ThemeContext";

type TimezoneResource =
  { status: "loading" } | { status: "ready"; value: string } | { status: "error"; message: string };

const themeLabels: Record<ThemePreference, string> = {
  system: "System",
  light: "Light",
  dark: "Dark"
};

function messageFrom(error: unknown): string {
  return error instanceof Error && error.message.length > 0
    ? error.message
    : "The setting could not be saved.";
}

function isIanaTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function SettingsPage({ gateway }: { gateway: SettingsGateway }) {
  const { preference, saving: themeSaving, setPreference } = useThemePreference();
  const { syncNow } = useLearningApp();
  const { session, signOut } = useAuthSession();
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState<TimezoneResource>({ status: "loading" });
  const [timezoneInput, setTimezoneInput] = useState("");
  const [timezoneSaving, setTimezoneSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void gateway
      .getTimezone()
      .then((value) => {
        if (active) {
          setTimezone({ status: "ready", value });
          setTimezoneInput(value);
        }
      })
      .catch((timezoneError: unknown) => {
        if (active) {
          setTimezone({ status: "error", message: messageFrom(timezoneError) });
        }
      });

    return () => {
      active = false;
    };
  }, [gateway]);

  const chooseTheme = async (nextTheme: ThemePreference) => {
    setError(null);
    setNotice("");
    try {
      await setPreference(nextTheme);
      setNotice(`Theme preference saved as ${nextTheme}.`);
      void syncNow().catch(() => undefined);
    } catch (themeError) {
      setError(messageFrom(themeError));
    }
  };

  const saveTimezone = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTimezone = timezoneInput.trim();
    setError(null);
    setNotice("");

    if (!isIanaTimezone(nextTimezone)) {
      setError("Enter a valid IANA timezone, such as Asia/Shanghai.");
      return;
    }

    setTimezoneSaving(true);
    try {
      await gateway.setTimezone(nextTimezone);
      setTimezone({ status: "ready", value: nextTimezone });
      setTimezoneInput(nextTimezone);
      setNotice("Study timezone saved. Existing daily assignments stay unchanged.");
      void syncNow().catch(() => undefined);
    } catch (timezoneError) {
      setError(messageFrom(timezoneError));
    } finally {
      setTimezoneSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    setError(null);
    setNotice("");
    try {
      await signOut();
      await navigate("/login", { replace: true });
    } catch (signOutError) {
      setError(messageFrom(signOutError));
      setSigningOut(false);
    }
  };

  return (
    <section className="settings-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Settings</span>
      </nav>

      <header className="settings-heading">
        <p className="eyebrow">Preferences</p>
        <h1>Settings</h1>
      </header>

      <section className="settings-section" aria-labelledby="theme-title">
        <div>
          <h2 id="theme-title">Appearance</h2>
          <p className="muted-copy">Use your device theme or choose a fixed appearance.</p>
        </div>
        <fieldset className="choice-fieldset" disabled={themeSaving}>
          <legend className="sr-only">Theme</legend>
          {(["system", "light", "dark"] as const).map((theme) => (
            <label className="choice-option" key={theme}>
              <input
                type="radio"
                name="theme"
                value={theme}
                checked={preference === theme}
                onChange={() => {
                  void chooseTheme(theme);
                }}
              />
              <span>{themeLabels[theme]}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className="settings-section" aria-labelledby="timezone-title">
        <div>
          <h2 id="timezone-title">Study timezone</h2>
          <p className="muted-copy">
            This determines the date of future daily assignments. Existing assignments do not move.
          </p>
        </div>
        {timezone.status === "loading" ? (
          <p aria-busy="true" aria-live="polite">
            Loading saved timezone…
          </p>
        ) : timezone.status === "error" ? (
          <p className="form-message form-message--error" role="alert">
            {timezone.message}
          </p>
        ) : (
          <form className="settings-form" onSubmit={saveTimezone}>
            <label className="field" htmlFor="study-timezone">
              <span>IANA timezone</span>
              <input
                id="study-timezone"
                name="timezone"
                type="text"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
                disabled={timezoneSaving}
                value={timezoneInput}
                aria-describedby="timezone-help"
                onChange={(event) => {
                  setTimezoneInput(event.currentTarget.value);
                }}
              />
            </label>
            <p className="field-help" id="timezone-help">
              Example: Asia/Shanghai
            </p>
            <button
              className="button button--secondary"
              type="submit"
              disabled={timezoneSaving || timezoneInput.trim() === timezone.value}
            >
              {timezoneSaving ? "Saving timezone…" : "Save timezone"}
            </button>
          </form>
        )}
      </section>

      <section className="settings-section" aria-labelledby="account-title">
        <div>
          <h2 id="account-title">Account</h2>
          <p className="muted-copy">{session.email ?? "Authenticated account"}</p>
          <p className="muted-copy">
            Signing out does not delete this account&rsquo;s cached data or unsynced outbox.
          </p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          disabled={signingOut}
          onClick={() => {
            void handleSignOut();
          }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </section>

      {error === null ? null : (
        <p className="form-message form-message--error" role="alert">
          {error}
        </p>
      )}
      <p className="form-message" aria-live="polite" aria-atomic="true">
        {notice}
      </p>
    </section>
  );
}

export default SettingsPage;
