import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import type { ThemePreference } from "../../application/contracts";
import { useAuthSession } from "../../app/AuthSessionContext";
import { useLearningApp } from "../../app/LearningAppContext";
import { useThemePreference } from "../../app/ThemeContext";

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

export function SettingsPage() {
  const { preference, saving: themeSaving, setPreference } = useThemePreference();
  const { syncNow } = useLearningApp();
  const { session, signOut } = useAuthSession();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

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
