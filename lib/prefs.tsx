"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import { savedAccounts } from "./saved-accounts";
import { ACCOUNT_COOKIE, actions } from "./store";

/**
 * UI preferences, stored in cookies (`yapp_account`, `yapp_logged_out`) and read in the browser so
 * the app also works as a fully static site (GitHub Pages):
 * - theme: dark mode is paused (round 3 answers, item 49), so the theme is always "light":
 *   `setTheme` and `toggleTheme` do nothing and a `yapp_theme=dark` cookie is ignored. The API
 *   stays so callers keep compiling; flip DARK_MODE_ENABLED (and restore the pre-paint lines noted
 *   in lib/site.ts) to bring it back.
 * - account (prototype session: a demo account id, or signed out): static HTML renders signed
 *   out, then the header switches after hydration. Which account this tab acts as lives in the
 *   store (`activeAccountId`, tab-local); the cookie says "signed in" and gives new tabs a default.
 *
 * There is one account type: anyone can order and make. Which side of a deal you're on is derived
 * per order or commission (`sideOf` in lib/selectors.ts), never stored here.
 */

export type Theme = "light" | "dark";

/** Dark mode is paused: light only. The dark values in app/globals.css are kept, dormant. */
export const DARK_MODE_ENABLED = false;

type Prefs = {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** Signed-in account id, or null when signed out. */
  account: string | null;
  /** The visitor logged out on purpose: signed-in pages send them to the welcome screen. */
  loggedOut: boolean;
  /** Sign in (or switch) to a demo account. Purely a prototype session. */
  signIn: (accountId: string) => void;
  /** Log out. `forget` also removes the account from this device's saved accounts. */
  signOut: (options?: { forget?: boolean }) => void;
};

/** Set by logging out, cleared by signing in. Tells it apart from a first visit via a shared link. */
const LOGGED_OUT_COOKIE = "yapp_logged_out";

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
  DARK_MODE_ENABLED && document.documentElement.classList.contains("dark") ? "dark" : "light";

const accountSnapshot = (): string | null => readCookie(ACCOUNT_COOKIE) || null;
const loggedOutSnapshot = (): boolean => readCookie(LOGGED_OUT_COOKIE) === "1";

/** Keeps the pre-paint `y-session` class (see lib/site.ts) true after the first load. */
const markSession = (signedIn: boolean) =>
  document.documentElement.classList.toggle("y-session", signedIn);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, themeSnapshot, () => "light" as Theme);
  const account = useSyncExternalStore(subscribe, accountSnapshot, () => null);
  const loggedOut = useSyncExternalStore(subscribe, loggedOutSnapshot, () => false);

  const setTheme = useCallback((next: Theme) => {
    if (!DARK_MODE_ENABLED) return;
    writeCookie("yapp_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    emit();
  }, []);

  const signIn = useCallback((accountId: string) => {
    writeCookie(ACCOUNT_COOKIE, accountId);
    writeCookie(LOGGED_OUT_COOKIE, null);
    markSession(true);
    actions.switchAccount(accountId);
    savedAccounts.touch(accountId);
    emit();
  }, []);

  const signOut = useCallback((options?: { forget?: boolean }) => {
    const current = readCookie(ACCOUNT_COOKIE);
    if (options?.forget && current) savedAccounts.forget(current);
    writeCookie(ACCOUNT_COOKIE, null);
    writeCookie(LOGGED_OUT_COOKIE, "1");
    markSession(false);
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
      loggedOut,
      signIn,
      signOut,
    }),
    [theme, account, loggedOut, setTheme, signIn, signOut],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Prefs {
  const value = useContext(PrefsContext);
  if (!value) throw new Error("usePrefs must be used inside <PrefsProvider>");
  return value;
}
