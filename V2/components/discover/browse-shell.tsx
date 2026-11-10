"use client";

import { AppShell, PublicShell } from "@/components/shell/app-shell";
import type { Mode } from "@/lib/mode";
import { usePrefs } from "@/lib/prefs";
import { useHydrated } from "@/lib/store";

/**
 * The shell for pages anyone can browse (Discover, creator profiles): the signed-in app chrome
 * when there's a session, the public chrome otherwise. Until hydration it renders the public
 * chrome without a footer (static HTML can't know the session), so a signed-in visit never
 * flashes the dark footer. `mode` is passed to AppShell (a creator's own profile is Studio).
 */
export function BrowseShell({ children, mode }: { children: React.ReactNode; mode?: Mode }) {
  const { account } = usePrefs();
  const hydrated = useHydrated();
  if (hydrated && account) return <AppShell mode={mode}>{children}</AppShell>;
  return <PublicShell footer={hydrated}>{children}</PublicShell>;
}

/**
 * Where a fixed bottom bar sits on phones: above the glass tab bar when it's showing (signed in),
 * at the bottom edge otherwise. Returns a class for the bar's wrapper.
 */
export function useBottomBarOffset(): string {
  const { account } = usePrefs();
  return account
    ? "bottom-[calc(env(safe-area-inset-bottom)+10px+var(--y-bar-h)+8px)]"
    : "bottom-[calc(env(safe-area-inset-bottom)+10px)]";
}
