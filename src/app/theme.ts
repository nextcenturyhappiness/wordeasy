import type { ThemePreference } from "../application/contracts";

export const themeStorageKey = "article-english:theme";

const themeColors = {
  light: "#173f35",
  dark: "#121714"
} as const;

function prefersDark(): boolean {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return prefersDark() ? "dark" : "light";
  }

  return preference;
}

export function applyThemePreference(preference: ThemePreference): void {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.theme = preference;
  document.documentElement.style.colorScheme = preference === "system" ? "light dark" : preference;
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", themeColors[resolved]);
}

export function cacheThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(themeStorageKey, preference);
  } catch {
    // IndexedDB remains authoritative when localStorage is unavailable.
  }
}
