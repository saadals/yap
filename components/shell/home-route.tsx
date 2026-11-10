"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { DiscoverPage } from "@/components/discover/discover-page";
import { WelcomeScene } from "@/components/landing/welcome-scene";
import { useMediaQuery } from "@/lib/hooks";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { useDemo, useHydrated } from "@/lib/store";

import { DESKTOP_QUERY, desktopHomeOf } from "./home";

export { DESKTOP_QUERY, desktopHomeOf, discoverHrefFor, type DesktopHome } from "./home";

/*
 * A sign-in from the welcome at "/" that heads for another page ("Ask for Yapps" → New order,
 * "Make Yapps" → Find work, any sign-in on a phone → the feed) keeps the welcome on screen until
 * that page opens, so "/" never shows Discover in between. Read during render, like the session.
 */
let leavingTo: string | null = null;
const leaveListeners = new Set<() => void>();
const subscribeLeave = (listener: () => void) => {
  leaveListeners.add(listener);
  return () => leaveListeners.delete(listener);
};
function leaveWelcome(destination: string) {
  leavingTo = destination;
  leaveListeners.forEach((listener) => listener());
}

/**
 * "/" for everyone (Site-wide 5.1.2 as corrected by answers, items 11, 43, 58, 59):
 * - signed out, any width: the bubble landing with sign-in;
 * - signed in on desktop: Discover, rendered here; an account whose home is Work goes to Work;
 * - signed in on a phone: the feed at /home.
 * The static HTML is the signed-out landing; a signed-in visitor never sees it, because the
 * pre-paint `y-session` class (lib/site.ts) hides it until this decides.
 */
export function HomeRoute() {
  const hydrated = useHydrated();
  const { account } = usePrefs();
  // Decided once, when the page opens: narrowing a desktop window later doesn't swap Discover for
  // the feed (Site-wide 5.1.1). Only read after hydration, so the server's `false` never shows.
  const [desktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches,
  );
  const s = useDemo();
  const router = useRouter();
  const leaving = useSyncExternalStore(subscribeLeave, () => leavingTo, () => null);
  const signedIn = hydrated && Boolean(account);
  const home = desktopHomeOf(s);
  const redirect =
    !signedIn || leaving ? null : !desktop ? paths.home : home === "work" ? paths.work() : null;

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  // A later visit to "/" starts fresh.
  useEffect(
    () => () => {
      leavingTo = null;
    },
    [],
  );

  if (!signedIn || leaving) {
    return <WelcomeScene onLeave={(destination) => destination !== paths.landing && leaveWelcome(destination)} />;
  }
  if (redirect) return <div className="min-h-dvh" aria-busy="true" />;
  return <DiscoverPage />;
}

/**
 * Pages that exist on phones only (the feed, the More page): desktop goes to "/". Before
 * hydration the page is hidden at desktop widths by CSS (`.y-phone-only`), so it never shows there.
 */
export function PhoneOnly({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const router = useRouter();
  const away = hydrated && desktop;

  useEffect(() => {
    if (away) router.replace(paths.landing);
  }, [away, router]);

  if (away) return null;
  return <div className="y-phone-only">{children}</div>;
}
