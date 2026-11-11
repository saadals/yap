"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { FaceAvatar } from "@/components/ui/face-avatar";
import { useMode, type Mode } from "@/lib/mode";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { me, unreadNotificationCount, unreadThreadCount } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { useOtherModeWaiting } from "./account-menu";
import { isActive, phoneNav } from "./nav";
import { SiteFooter } from "./site-footer";
import { SiteHeader, type HeaderBack } from "./site-header";

/**
 * The phone's glass tab bar for the current mode: five fixed columns, each an icon over its label;
 * the active tab is a dark pill of the same size. Inbox gets a dot for unread messages or alerts,
 * Me (the viewer's avatar) a dot when the other mode has something waiting.
 */
export function TabBar({ mode }: { mode: Mode }) {
  const pathname = usePathname();
  const s = useDemo();
  const hasNews = unreadThreadCount(s) + unreadNotificationCount(s) > 0;
  const waiting = useOtherModeWaiting(mode);
  const account = me.account(s);
  return (
    <nav aria-label="Main" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+10px)] z-50 lg:hidden">
      <ul className="y-tabbar mx-auto max-w-md">
        {phoneNav[mode].map((item) => {
          const active = isActive(item, pathname);
          const isMe = item.href === paths.account;
          const dot = isMe ? waiting.count > 0 : item.badge === "inbox" && hasNews;
          const label = isMe
            ? `Me: account and settings${waiting.count ? `, ${waiting.text}` : ""}`
            : dot
              ? `${item.label}, new`
              : item.label;
          return (
            <li key={item.href}>
              <Link href={item.href} className="y-tab" aria-current={active ? "page" : undefined} aria-label={label}>
                <span className="y-tab-icon">
                  {isMe ? (
                    <span className="y-tab-me">
                      <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name="" size={22} />
                    </span>
                  ) : (
                    item.icon
                  )}
                  {dot ? <span aria-hidden className="y-tab-dot" /> : null}
                </span>
                <span className="y-tab-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Signed-in chrome: the header and, on phones, the tab bar, both for the current mode.
 *
 * - `mode`: shared pages that belong to one deal (an order, a job) pass the viewer's side of it
 *   (`modeForSide(sideOf(s, item))`). Mode pages (/home, /studio/…) don't need to: the route says.
 *   Pages that belong to neither (messages, account, settings) keep the mode the tab was last in.
 * - `focus`: flows (a new order, a direct order, a new product). No tab bar, and a minimal header:
 *   the logo, plus the avatar on desktop; no navigation, "New order" or "+".
 * - `detail`: one thing's own page (a job, an order, a creator profile, an open conversation,
 *   Watch). No tab bar, the normal header. The page's one phone action bar sits at the bottom
 *   edge, and the main area leaves room for that one bar.
 * - `back`: on phones the header shows "← {label}" in place of the logo, and in-page back links
 *   marked `.y-backlink` hide there (desktop keeps them). Meant for `detail` pages.
 * - `fullscreen` (the Watch view) drops the page padding and, on phones, the header.
 *
 * Without the tab bar (`focus`, `detail`) `--y-bar-bottom` drops to the safe area + 10px, so any
 * bar positioned with `bottom: var(--y-bar-bottom)` sits at the bottom edge.
 *
 * Visiting a signed-in page while signed out signs this tab in as its current demo account
 * (prototype session), unless the visitor logged out on purpose: then it goes to the landing page.
 */
export function AppShell({
  children,
  mode: explicitMode,
  focus = false,
  detail = false,
  back,
  fullscreen = false,
}: {
  children: React.ReactNode;
  mode?: Mode;
  focus?: boolean;
  detail?: boolean;
  back?: HeaderBack;
  fullscreen?: boolean;
}) {
  const { account, loggedOut, signIn } = usePrefs();
  const s = useDemo();
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const current = s.activeAccountId;
  const mode = useMode(me.account(s), pathname, explicitMode);
  const tabBar = !focus && !detail;

  // Only after hydration: during the hydration commit both values are still the server snapshot.
  useEffect(() => {
    if (!hydrated || account) return;
    if (loggedOut) router.replace(paths.landing);
    else signIn(current);
  }, [hydrated, account, loggedOut, current, signIn, router]);

  if (hydrated && !account && loggedOut) return null;

  return (
    <div
      data-mode={mode}
      data-header-back={back ? "" : undefined}
      className={`flex min-h-dvh flex-col ${tabBar ? "" : "y-no-tabbar"} ${
        fullscreen ? "h-dvh overflow-hidden lg:h-auto lg:overflow-visible" : ""
      }`}
    >
      <SiteHeader signedIn mode={mode} desktopOnly={fullscreen} focus={focus} back={back} />
      <main
        id="main"
        className={`flex-1 ${
          fullscreen
            ? "min-h-0"
            : focus
              ? "pb-32 lg:pb-16"
              : detail
                ? "pb-[calc(env(safe-area-inset-bottom,0px)+88px)] lg:pb-16"
                : "pb-[calc(var(--y-bar-h)+40px)] lg:pb-16"
        }`}
      >
        {children}
      </main>
      {tabBar ? <TabBar mode={mode} /> : null}
    </div>
  );
}

/**
 * Public pages (landing, how it works, for creators, legal, and creator profiles and Discover for
 * signed-out visitors). The header adapts to the session; signed in, the tab bar stays on phones
 * unless `bottomBar` is false or the page is a `detail` page. `detail` also leaves room below the
 * footer for the page's own phone action bar (a creator profile's order bar), which sits at the
 * bottom edge whenever the tab bar isn't showing.
 */
export function PublicShell({
  children,
  footer = true,
  bottomBar = true,
  detail = false,
  mode,
}: {
  children: React.ReactNode;
  footer?: boolean;
  /** Set false on pages that own the bottom edge (e.g. a sticky order bar). */
  bottomBar?: boolean;
  detail?: boolean;
  mode?: Mode;
}) {
  const { account } = usePrefs();
  const s = useDemo();
  const pathname = usePathname();
  const resolved = useMode(me.account(s), pathname, mode);
  const signedIn = Boolean(account);
  const showBar = signedIn && bottomBar && !detail;
  return (
    <div
      className={`flex min-h-dvh flex-col ${
        showBar
          ? "pb-[calc(var(--y-bar-h)+24px)] lg:pb-0"
          : `y-no-tabbar ${detail ? "pb-[calc(env(safe-area-inset-bottom,0px)+80px)] lg:pb-0" : ""}`
      }`}
    >
      <SiteHeader signedIn={signedIn} mode={resolved} />
      <main id="main" className="flex-1 pb-12">
        {children}
      </main>
      {footer ? <SiteFooter /> : null}
      {showBar ? <TabBar mode={resolved} /> : null}
    </div>
  );
}
