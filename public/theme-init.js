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
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolvedTheme === "dark" ? "#0c0e12" : "#f5f6f8");
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
