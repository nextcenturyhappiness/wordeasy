import { createContext, useContext } from "react";

import type { ThemePreference } from "../application/contracts";

export interface ThemeContextValue {
  preference: ThemePreference;
  saving: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemePreference(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error("useThemePreference must be used within ThemeProvider.");
  }

  return context;
}
