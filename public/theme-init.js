(() => {
  const themeKey = "article-english:theme";
  const migrationKey = "article-english:theme-system-migrated";
  try {
    const appMode = document.documentElement.dataset.appMode;
    const personal = appMode === "desktop" || appMode === "standalone";
    let saved = localStorage.getItem(themeKey);
    const migrated = localStorage.getItem(migrationKey) === "1";
    if (personal) {
      if (saved !== "light" && saved !== "dark") {
        saved = "light";
        localStorage.setItem(themeKey, "light");
      }
    } else if (!migrated) {
      if (saved === "system") {
        saved = "light";
        localStorage.setItem(themeKey, "light");
      }
      localStorage.setItem(migrationKey, "1");
    }
    const preference =
      saved === "system" || saved === "light" || saved === "dark" ? saved : "light";
    const resolvedTheme =
      preference === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : preference;
    document.documentElement.dataset.theme = preference;
    document.documentElement.style.colorScheme =
      preference === "system" ? "light dark" : preference;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolvedTheme === "dark" ? "#0c0e12" : "#f5f6f8");
  } catch {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
})();
