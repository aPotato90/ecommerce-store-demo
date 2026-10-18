"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
  applyTheme,
  isTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type Theme,
} from "./theme";

const THEME_EVENT = "kestrel-theme-change";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

// In-memory fallback for when localStorage is blocked (private mode, sandboxed iframes).
let memoryTheme: Theme = "system";

function readTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // Storage unavailable: fall through to the in-memory value.
  }
  return memoryTheme;
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(MEDIA_QUERY);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      applyTheme(readTheme());
      onChange();
    }
  };
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onChange);
  };
}

function getSnapshot(): string {
  const theme = readTheme();
  return `${theme}:${resolveTheme(theme)}`;
}

function getServerSnapshot(): string {
  return "system:light";
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [theme, resolvedTheme] = snapshot.split(":") as [Theme, ResolvedTheme];

  const setTheme = useCallback((next: Theme) => {
    memoryTheme = next;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the in-memory value still applies for this tab.
    }
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { theme, resolvedTheme, setTheme };
}
