"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  applyTheme,
  resolveThemePreference,
  saveThemePreference,
  subscribeToSystemTheme,
  subscribeToTheme,
  systemThemeSnapshot,
  themeSnapshot,
} from "@/lib/theme/theme";
import type { ResolvedTheme, ThemePreference } from "@/lib/theme/theme-types";

export function useThemePreference() {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribeToTheme,
    themeSnapshot,
    () => "system",
  );

  const systemTheme = useSyncExternalStore<ResolvedTheme>(
    subscribeToSystemTheme,
    systemThemeSnapshot,
    () => "dark",
  );

  const resolvedTheme = resolveThemePreference(preference, systemTheme === "dark");

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  return { preference, resolvedTheme, setPreference: saveThemePreference };
}
