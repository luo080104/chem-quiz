const KEY = "chemquiz.theme";
export type ThemeName = "dark" | "light";

export function getTheme(): ThemeName {
  return localStorage.getItem(KEY) === "light" ? "light" : "dark";
}

export function applyTheme(t: ThemeName): void {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(KEY, t);
}

export function toggleTheme(): ThemeName {
  const next: ThemeName = getTheme() === "light" ? "dark" : "light";
  applyTheme(next);
  return next;
}

export function initTheme(): void {
  applyTheme(getTheme());
}

export function themeLabel(): string {
  return getTheme() === "light" ? "暗色" : "亮色";
}
