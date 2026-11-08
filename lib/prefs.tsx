"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import { ACCOUNT_COOKIE, actions } from "./store";

/**
 * UI preferences, stored in cookies (`yapp_theme`, `yapp_account`) and read in the browser so the
 * app also works as a fully static site (GitHub Pages):
 * - theme: an inline script in the root layout applies `html.dark` before first paint (no flash);
 *   this provider mirrors it.
 * - account (prototype session: a demo account id, or signed out): static HTML renders signed
 *   out, then the header switches after hydration. Which account this tab acts as lives in the
 *   store (`activeAccountId`, tab-local); the cookie says "signed in" and gives new tabs a default.
 *
 * There is one account type: anyone can order and make. Which side of a deal you're on is derived
 * per order or commission (`sideOf` in lib/selectors.ts), never stored here.
 */

export type Theme = "light" | "dark";

type Prefs = {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** Signed-in account id, or null when signed out. */
  account: string | null;
  /** Sign in (or switch) to a demo account. Purely a prototype session. */
  signIn: (accountId: string) => void;
  signOut: () => void;
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

const accountSnapshot = (): string | null => readCookie(ACCOUNT_COOKIE) || null;

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, themeSnapshot, () => "light" as Theme);
  const account = useSyncExternalStore(subscribe, accountSnapshot, () => null);

  const setTheme = useCallback((next: Theme) => {
    writeCookie("yapp_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    emit();
  }, []);

  const signIn = useCallback((accountId: string) => {
    writeCookie(ACCOUNT_COOKIE, accountId);
    actions.switchAccount(accountId);
    emit();
  }, []);

  const signOut = useCallback(() => {
    writeCookie(ACCOUNT_COOKIE, null);
    try {
      window.sessionStorage.removeItem("yapp-account");
    } catch {
      /* ignore */
    }
    emit();
  }, []);

  const value = useMemo<Prefs>(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
      account,
      signIn,
      signOut,
    }),
    [theme, account, setTheme, signIn, signOut],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const value = useContext(PrefsContext);
  if (!value) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return value;
}
