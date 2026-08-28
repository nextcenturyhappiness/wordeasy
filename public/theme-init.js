(() => {
  try {
    const savedTheme = localStorage.getItem("article-english:theme") || "system";
    const resolvedTheme =
      savedTheme === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : savedTheme;
    document.documentElement.dataset.theme = resolvedTheme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
