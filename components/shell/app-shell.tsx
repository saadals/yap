"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { FaceAvatar } from "@/components/ui/face-avatar";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { me, unreadNotificationCount, unreadThreadCount } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { isActive, mobileNav } from "./nav";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * The phone's glass tab bar: icons only, the active item shows its name in a black pill. On the
 * feed its icons follow the reel in view (see `data-reel-tone` in app/globals.css).
 */
export function BottomBar() {
  const pathname = usePathname();
  const s = useDemo();
  const hasNews = unreadThreadCount(s) + unreadNotificationCount(s) > 0;
  const account = me.account(s);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-50 lg:hidden"
    >
      <ul className="y-tabbar mx-auto max-w-md">
        {mobileNav.map((item) => {
          const active = isActive(item, pathname);
          const isProfile = item.href === paths.profile;
          const news = item.badge === "inbox" && hasNews;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="y-tab"
                aria-current={active ? "page" : undefined}
                aria-label={isProfile ? "Profile and account" : news ? `${item.label}, new` : item.label}
              >
                {isProfile ? (
                  <span className="y-tab-me">
                    <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name="" size={30} />
                  </span>
                ) : (
                  item.icon
                )}
                {active ? <span className="y-tab-label">{item.label}</span> : null}
                {news ? <span aria-hidden className="y-tab-dot" /> : null}
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
 * - `fullscreen` (the reels feed on Home) drops the page padding and, on phones, the header: the
 *   content fills the screen with the bottom bar floating over it (`--y-fill-h` is that height).
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
  const { account, loggedOut, signIn } = usePrefs();
  const s = useDemo();
  const hydrated = useHydrated();
  const router = useRouter();
  const current = s.activeAccountId;
  // Only after hydration: during the hydration commit both values are still the server snapshot
  // (signed out, default account) and would sign every tab back in as the default account.
  // A shared demo link signs the visitor in; someone who logged out goes to the welcome screen.
  useEffect(() => {
    if (!hydrated || account) return;
    if (loggedOut) router.replace(paths.landing);
    else signIn(current);
  }, [hydrated, account, loggedOut, current, signIn, router]);

  if (hydrated && !account && loggedOut) return null;

  return (
    <div className={`flex min-h-dvh flex-col ${fullscreen ? "h-dvh overflow-hidden lg:h-auto lg:overflow-visible" : ""}`}>
      <SiteHeader signedIn desktopOnly={fullscreen} />
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
