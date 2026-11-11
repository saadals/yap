"use client";

import { AppShell, PublicShell } from "@/components/shell/app-shell";
import type { HeaderBack } from "@/components/shell/site-header";
import type { Mode } from "@/lib/mode";
import { usePrefs } from "@/lib/prefs";
import { useHydrated } from "@/lib/store";

/**
 * The shell for pages anyone can browse (Discover, creator profiles): the signed-in app chrome
 * when there's a session, the public chrome otherwise. Until hydration it renders the public
 * chrome without a footer (static HTML can't know the session), so a signed-in visit never
 * flashes the dark footer. `mode` is passed to AppShell (a creator's own profile is Studio).
 *
 * `detail` and `back` pass through for a creator profile: signed in, AppShell `detail` (no tab
 * bar) with the header's phone back link; signed out, PublicShell `detail` (room below the footer
 * for the order bar). The public header has no back link, so signed-out visitors keep the page's
 * own (`.y-backlink` only hides under a shell that shows `back`).
 */
export function BrowseShell({
  children,
  mode,
  detail = false,
  back,
}: {
  children: React.ReactNode;
  mode?: Mode;
  detail?: boolean;
  back?: HeaderBack;
}) {
  const { account } = usePrefs();
  const hydrated = useHydrated();
  if (hydrated && account)
    return (
      <AppShell mode={mode} detail={detail} back={back}>
        {children}
      </AppShell>
    );
  return (
    <PublicShell footer={hydrated} detail={detail}>
      {children}
    </PublicShell>
  );
}
