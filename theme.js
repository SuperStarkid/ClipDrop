(() => {
  let theme;
  try { theme = JSON.parse(localStorage.getItem("clipdrop.theme")); } catch {}
  if (theme !== "light" && theme !== "dark") {
    theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.dataset.theme = theme;
})();
