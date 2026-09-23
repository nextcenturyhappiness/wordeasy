import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInThisContext } from "node:vm";

import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultThemePreference } from "../../src/application/contracts";
import {
  applyThemePreference,
  resolveTheme,
  themeStorageKey,
  themeSystemMigrationStorageKey
} from "../../src/app/theme";
import { IndexedDbSettingsGateway } from "../../src/data/indexedDbSettingsGateway";
import { LearningDatabase, openLearningDatabase } from "../../src/db/learningDatabase";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const themeInitSource = readFileSync(join(root, "public/theme-init.js"), "utf8");
const tokensCss = readFileSync(join(root, "src/styles/tokens.css"), "utf8");
const indexHtml = readFileSync(join(root, "index.html"), "utf8");

function installMatchMedia(matches: boolean): ReturnType<typeof vi.fn> {
  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null
  }));
  vi.stubGlobal("matchMedia", matchMedia);
  return matchMedia;
}

function themeColorMeta(): HTMLMetaElement {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (existing !== null) {
    return existing;
  }
  const created = document.createElement("meta");
  created.name = "theme-color";
  document.head.append(created);
  return created;
}

function runThemeInit(): void {
  runInThisContext(themeInitSource);
}

describe("default theme preference", () => {
  let database: LearningDatabase | null = null;

  afterEach(async () => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    delete document.documentElement.dataset.appMode;
    vi.unstubAllGlobals();
    if (database !== null) {
      database.close();
      await database.delete();
      database = null;
    }
  });

  it("treats a missing preference as fixed light", () => {
    expect(defaultThemePreference).toBe("light");
    expect(indexHtml).toContain('<html lang="en" data-theme="light">');
    expect(tokensCss).toContain(':root[data-theme="system"]');
    expect(tokensCss).not.toContain(':root:not([data-theme="light"])');
    expect(themeInitSource).toContain(': "light"');
    expect(themeInitSource).toContain(themeSystemMigrationStorageKey);
    expect(themeInitSource).not.toContain('|| "system"');
  });

  it("paints light on first run even when the OS prefers dark", () => {
    const matchMedia = installMatchMedia(true);
    themeColorMeta().content = "#000000";

    runThemeInit();

    expect(matchMedia).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(themeColorMeta().content).toBe("#f5f6f8");
  });

  it("ignores an invalid stored value and stays light", () => {
    installMatchMedia(true);
    localStorage.setItem(themeStorageKey, "sepia");

    runThemeInit();

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("keeps an explicit dark or light preference without reading the OS scheme", () => {
    const matchMedia = installMatchMedia(false);
    localStorage.setItem(themeStorageKey, "dark");

    runThemeInit();

    expect(matchMedia).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(themeColorMeta().content).toBe("#0c0e12");

    localStorage.setItem(themeStorageKey, "light");
    installMatchMedia(true);
    runThemeInit();

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(themeColorMeta().content).toBe("#f5f6f8");
  });

  it("rewrites a stored system default to light before the first paint", () => {
    const matchMedia = installMatchMedia(true);
    localStorage.setItem(themeStorageKey, "system");

    runThemeInit();

    expect(matchMedia).not.toHaveBeenCalled();
    expect(localStorage.getItem(themeStorageKey)).toBe("light");
    expect(localStorage.getItem(themeSystemMigrationStorageKey)).toBe("1");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(themeColorMeta().content).toBe("#f5f6f8");
  });

  it("follows the OS scheme only after an explicit system choice on cloud", () => {
    installMatchMedia(true);
    localStorage.setItem(themeStorageKey, "system");
    runThemeInit();

    localStorage.setItem(themeStorageKey, "system");
    const matchMedia = installMatchMedia(true);
    runThemeInit();

    expect(matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
    expect(document.documentElement.dataset.theme).toBe("system");
    expect(document.documentElement.style.colorScheme).toBe("light dark");
    expect(themeColorMeta().content).toBe("#0c0e12");
    expect(localStorage.getItem(themeStorageKey)).toBe("system");
    expect(resolveTheme("system")).toBe("dark");
  });

  it("rewrites system to light on desktop and standalone even after the migration flag", () => {
    for (const appMode of ["desktop", "standalone"] as const) {
      document.documentElement.dataset.appMode = appMode;
      localStorage.setItem(themeSystemMigrationStorageKey, "1");
      localStorage.setItem(themeStorageKey, "system");
      const matchMedia = installMatchMedia(true);

      runThemeInit();

      expect(matchMedia).not.toHaveBeenCalled();
      expect(localStorage.getItem(themeStorageKey)).toBe("light");
      expect(document.documentElement.dataset.theme).toBe("light");
      expect(document.documentElement.style.colorScheme).toBe("light");
      expect(themeColorMeta().content).toBe("#f5f6f8");
    }

    document.documentElement.dataset.appMode = "desktop";
    localStorage.setItem(themeStorageKey, "dark");
    const darkMedia = installMatchMedia(true);
    runThemeInit();
    expect(darkMedia).not.toHaveBeenCalled();
    expect(localStorage.getItem(themeStorageKey)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("resolves and applies light, dark, and system without dropping the preference", () => {
    installMatchMedia(false);
    themeColorMeta();

    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("system")).toBe("light");

    applyThemePreference("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(themeColorMeta().content).toBe("#0c0e12");

    applyThemePreference("system");
    expect(document.documentElement.dataset.theme).toBe("system");
    expect(document.documentElement.style.colorScheme).toBe("light dark");
    expect(themeColorMeta().content).toBe("#f5f6f8");
  });

  it("falls back to light when theme storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    runThemeInit();

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("reads a missing IndexedDB theme as light and keeps stored dark or system", async () => {
    database = new LearningDatabase(`theme-default-${crypto.randomUUID()}`);
    await openLearningDatabase(database);
    const gateway = new IndexedDbSettingsGateway(database, "local-user");

    await expect(gateway.getTheme()).resolves.toBe("light");

    await gateway.setTheme("dark");
    await expect(gateway.getTheme()).resolves.toBe("dark");

    await gateway.setTheme("system");
    await expect(gateway.getTheme()).resolves.toBe("system");

    await database.local_settings.put({
      userId: "local-user",
      key: "theme",
      value: "sepia",
      updatedAt: "2026-09-23T00:00:00.000Z"
    });
    await expect(gateway.getTheme()).resolves.toBe("light");
  });
});
