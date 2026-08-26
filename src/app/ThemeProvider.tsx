import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

import type { SettingsGateway, ThemePreference } from "../application/contracts";
import { ThemeContext, type ThemeContextValue } from "./ThemeContext";
import { applyThemePreference, cacheThemePreference } from "./theme";

export interface ThemeProviderProps {
  gateway: SettingsGateway;
  initialTheme: ThemePreference;
  children: ReactNode;
}

export function ThemeProvider({ gateway, initialTheme, children }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialTheme);
  const [saving, setSaving] = useState(false);
  const preferenceRef = useRef(initialTheme);
  const saveLockRef = useRef(false);

  useLayoutEffect(() => {
    applyThemePreference(preference);
    cacheThemePreference(preference);
  }, [preference]);

  useEffect(() => {
    if (preference !== "system" || typeof window.matchMedia !== "function") {
      return;
    }

    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => {
      applyThemePreference("system");
    };
    colorScheme.addEventListener("change", applySystemTheme);
    return () => {
      colorScheme.removeEventListener("change", applySystemTheme);
    };
  }, [preference]);

  const setPreference = useCallback(
    async (nextPreference: ThemePreference) => {
      if (saveLockRef.current || nextPreference === preferenceRef.current) {
        return;
      }

      saveLockRef.current = true;
      const previousPreference = preferenceRef.current;
      preferenceRef.current = nextPreference;
      setPreferenceState(nextPreference);
      setSaving(true);

      try {
        await gateway.setTheme(nextPreference);
      } catch (error) {
        preferenceRef.current = previousPreference;
        setPreferenceState(previousPreference);
        throw error;
      } finally {
        saveLockRef.current = false;
        setSaving(false);
      }
    },
    [gateway]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, saving, setPreference }),
    [preference, saving, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
