"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import type { Role } from "./types";

/**
 * UI preferences, stored in cookies (`yapp_theme`, `yapp_role`) and read in the browser so the
 * app also works as a fully static site (GitHub Pages):
 * - theme: an inline script in the root layout applies `html.dark` before first paint (no flash);
 *   this provider mirrors it.
 * - role (prototype session: business | creator | signed out): static HTML renders signed out,
 *   then the header switches after hydration. Signed-in pages pass their role to <AppShell>, so
 *   only public pages can briefly show the signed-out header.
 */

export type Theme = "light" | "dark";
export type SessionRole = Role | null;

type Prefs = {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  role: SessionRole;
  /** Sign in as a role (null = sign out). Purely a prototype session. */
  setRole: (role: SessionRole) => void;
};

const PrefsContext = createContext<Prefs | null>(null);

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string | null) {
  const maxAge = value === null ? 0 : 60 * 60 * 24 * 365;
  document.cookie = `${name}=${value ?? ""}; path=/; max-age=${maxAge}; samesite=lax`;
}

const themeSnapshot = (): Theme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

const roleSnapshot = (): SessionRole => {
  const value = readCookie("yapp_role");
  return value === "business" || value === "creator" ? value : null;
};

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, themeSnapshot, () => "light" as Theme);
  const role = useSyncExternalStore(subscribe, roleSnapshot, () => null);

  const setTheme = useCallback((next: Theme) => {
    writeCookie("yapp_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    emit();
  }, []);

  const setRole = useCallback((next: SessionRole) => {
    writeCookie("yapp_role", next);
    emit();
  }, []);

  const value = useMemo<Prefs>(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
      role,
      setRole,
    }),
    [theme, role, setTheme, setRole],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const value = useContext(PrefsContext);
  if (!value) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return value;
}
