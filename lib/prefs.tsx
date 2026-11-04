"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import type { Role } from "./types";

/**
 * UI preferences that the server must know to render without a flash:
 * - theme (light/dark) → <html class="dark">
 * - signed-in role (business/creator/none) → which header/nav to show on shared pages
 * Both live in cookies; the root layout reads them and passes them in.
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

function writeCookie(name: string, value: string | null) {
  const maxAge = value === null ? 0 : 60 * 60 * 24 * 365;
  document.cookie = `${name}=${value ?? ""}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function PrefsProvider({
  initialTheme,
  initialRole,
  children,
}: {
  initialTheme: Theme;
  initialRole: SessionRole;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [role, setRoleState] = useState<SessionRole>(initialRole);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeCookie("yapp_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
  }, []);

  const setRole = useCallback((next: SessionRole) => {
    setRoleState(next);
    writeCookie("yapp_role", next);
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
