(() => {
  try {
    const savedTheme = localStorage.getItem("article-english:theme");
    const preference =
      savedTheme === "system" || savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : "light";
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
