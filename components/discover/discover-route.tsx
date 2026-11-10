"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { DESKTOP_QUERY, desktopHomeOf } from "@/components/shell/home-route";
import { useMediaQuery } from "@/lib/hooks";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { useDemo, useHydrated } from "@/lib/store";

import { DiscoverPage } from "./discover-page";

/**
 * The page at /discover. Signed in on desktop, an account whose desktop home is Discover goes to
 * "/" (one address for it there); an account whose home is Work (it only makes videos) stays,
 * because /discover is how it reaches Discover. Signed out, and on phones, it shows here.
 */
export function DiscoverRoute() {
  const hydrated = useHydrated();
  const { account } = usePrefs();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const s = useDemo();
  const router = useRouter();
  const away = hydrated && Boolean(account) && desktop && desktopHomeOf(s) === "discover";

  useEffect(() => {
    if (away) router.replace(paths.landing);
  }, [away, router]);

  if (away) return <div className="min-h-dvh" aria-busy="true" />;
  return <DiscoverPage />;
}
