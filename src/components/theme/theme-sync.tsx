"use client";

import { useEffect } from "react";

import { applyTheme } from "@/lib/theme/theme";
import { useTheme } from "@/lib/theme/use-theme";

/** Re-applies the theme class when the OS preference changes while on "system". */
export function ThemeSync() {
  const { theme, resolvedTheme } = useTheme();
  useEffect(() => {
    applyTheme(theme);
  }, [theme, resolvedTheme]);
  return null;
}
