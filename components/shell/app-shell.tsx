"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { usePrefs } from "@/lib/prefs";
import { unreadThreadCount } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { isActive, primaryNav } from "./nav";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** Mobile: floating black pill bar; the active item becomes a white pill with its label. */
export function BottomBar() {
  const pathname = usePathname();
  const s = useDemo();
  const unread = unreadThreadCount(s);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:hidden"
    >
      <ul className="y-bar mx-auto flex h-(--y-bar-h) max-w-md items-center justify-between rounded-full px-2">
        {primaryNav.app.map((item) => {
          const active = isActive(item, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="y-bar-item relative"
                aria-current={active ? "page" : undefined}
              >
                {item.icon}
                <span className={active ? "" : "sr-only"}>{item.label}</span>
                {item.badge === "messages" && unread > 0 ? (
                  <span
                    className={`absolute top-2.5 grid size-4 place-items-center rounded-full bg-(--y-neon) text-[10px] font-bold text-(--y-on-color) ${active ? "end-1" : "end-2"}`}
                  >
                    {unread}
                    <span className="sr-only"> unread</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Signed-in chrome: header + mobile bottom bar. Visiting a signed-in page while signed out signs
 * this tab in as its current demo account (prototype session).
 * - `focus` hides the bottom bar for focused tasks (wizards, checkout) that own the bottom edge.
 * - `fullscreen` (the reels feed on Home) drops the page padding so the content can fill the
 *   space between the header and the bottom bar: use `h-(--y-fill-h)` for that height.
 */
export function AppShell({
  children,
  focus = false,
  fullscreen = false,
}: {
  children: React.ReactNode;
  focus?: boolean;
  fullscreen?: boolean;
}) {
  const { account, signIn } = usePrefs();
  const s = useDemo();
  const hydrated = useHydrated();
  const current = s.activeAccountId;
  // Only after hydration: during the hydration commit both values are still the server snapshot
  // (signed out, default account) and would sign every tab back in as the default account.
  useEffect(() => {
    if (hydrated && !account) signIn(current);
  }, [hydrated, account, current, signIn]);

  return (
    <div className={`flex min-h-dvh flex-col ${fullscreen ? "h-dvh overflow-hidden lg:h-auto lg:overflow-visible" : ""}`}>
      <SiteHeader signedIn />
      <main
        id="main"
        className={`flex-1 ${
          fullscreen
            ? "min-h-0"
            : focus
              ? "pb-32 lg:pb-16"
              : "pb-[calc(var(--y-bar-h)+40px)] lg:pb-16"
        }`}
      >
        {children}
      </main>
      {focus ? null : <BottomBar />}
    </div>
  );
}

/**
 * Shared/public pages (landing, creator browsing, profiles, auth). The header adapts to the
 * session; a signed-in user also keeps their bottom bar on mobile.
 */
export function PublicShell({
  children,
  footer = true,
  bottomBar = true,
}: {
  children: React.ReactNode;
  footer?: boolean;
  /** Set false on pages that own the bottom edge (e.g. a sticky commission bar). */
  bottomBar?: boolean;
}) {
  const { account } = usePrefs();
  const showBar = Boolean(account) && bottomBar;
  return (
    <div
      className={`flex min-h-dvh flex-col ${showBar ? "pb-[calc(var(--y-bar-h)+24px)] lg:pb-0" : ""}`}
    >
      <SiteHeader signedIn={Boolean(account)} />
      <main id="main" className="flex-1 pb-10">
        {children}
      </main>
      {footer ? <SiteFooter /> : null}
      {showBar ? <BottomBar /> : null}
    </div>
  );
}
