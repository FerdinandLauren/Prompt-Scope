import type { ResolvedTheme, ThemePreference } from "@/lib/theme/theme-types";

export const THEME_STORAGE_KEY = "promptscope.theme.v1";
export const THEME_EVENT = "promptscope:theme";

const VALID: ThemePreference[] = ["system", "light", "dark"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (VALID as string[]).includes(value);
}

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function getStoredThemePreference(): ThemePreference {
  const raw = store()?.getItem(THEME_STORAGE_KEY) ?? null;
  return isThemePreference(raw) ? raw : "system";
}

export function themeSnapshot(): ThemePreference {
  return getStoredThemePreference();
}

export function subscribeToTheme(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(THEME_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(THEME_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    store()?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be blocked; the session still switches because we re-apply below.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(THEME_EVENT));
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function subscribeToSystemTheme(listener: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener?.("change", listener);
  return () => query.removeEventListener?.("change", listener);
}

export function systemThemeSnapshot(): ResolvedTheme {
  return getSystemTheme();
}

export function applyTheme(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

/**
 * Runs before hydration so the first paint already has the right theme.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem("${THEME_STORAGE_KEY}");var pref=(raw==="light"||raw==="dark")?raw:"system";var dark=window.matchMedia("(prefers-color-scheme: dark)").matches;var theme=pref==="system"?(dark?"dark":"light"):pref;document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;}catch(error){document.documentElement.dataset.theme="dark";}})();`;
