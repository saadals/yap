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

import { isActive, phoneNav } from "./nav";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** The phone's glass tab bar for the current mode. The active item shows its name. */
export function TabBar({ mode }: { mode: Mode }) {
  const pathname = usePathname();
  const s = useDemo();
  const hasNews = unreadThreadCount(s) + unreadNotificationCount(s) > 0;
  const account = me.account(s);
  return (
    <nav aria-label="Main" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-50 lg:hidden">
      <ul className="y-tabbar mx-auto max-w-md">
        {phoneNav[mode].map((item) => {
          const active = isActive(item, pathname);
          const isMe = item.href === paths.account;
          const news = item.badge === "inbox" && hasNews;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="y-tab"
                aria-current={active ? "page" : undefined}
                aria-label={isMe ? "Me: account and settings" : news ? `${item.label}, new` : item.label}
              >
                {isMe ? (
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
 * Signed-in chrome: the header and, on phones, the tab bar, both for the current mode.
 *
 * - `mode`: shared pages that belong to one deal (an order, a job) pass the viewer's side of it
 *   (`modeForSide(sideOf(s, item))`). Mode pages (/home, /studio/…) don't need to: the route says.
 *   Pages that belong to neither (messages, account, settings) keep the mode the tab was last in.
 * - `focus` hides the tab bar for focused tasks (wizards, checkout) that own the bottom edge.
 * - `fullscreen` (the Watch view) drops the page padding and, on phones, the header.
 *
 * Visiting a signed-in page while signed out signs this tab in as its current demo account
 * (prototype session), unless the visitor logged out on purpose: then it goes to the landing page.
 */
export function AppShell({
  children,
  mode: explicitMode,
  focus = false,
  fullscreen = false,
}: {
  children: React.ReactNode;
  mode?: Mode;
  focus?: boolean;
  fullscreen?: boolean;
}) {
  const { account, loggedOut, signIn } = usePrefs();
  const s = useDemo();
  const hydrated = useHydrated();
  const router = useRouter();
  const pathname = usePathname();
  const current = s.activeAccountId;
  const mode = useMode(me.account(s), pathname, explicitMode);

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
      className={`flex min-h-dvh flex-col ${fullscreen ? "h-dvh overflow-hidden lg:h-auto lg:overflow-visible" : ""}`}
    >
      <SiteHeader signedIn mode={mode} desktopOnly={fullscreen} />
      <main
        id="main"
        className={`flex-1 ${
          fullscreen ? "min-h-0" : focus ? "pb-32 lg:pb-16" : "pb-[calc(var(--y-bar-h)+40px)] lg:pb-16"
        }`}
      >
        {children}
      </main>
      {focus ? null : <TabBar mode={mode} />}
    </div>
  );
}

/**
 * Public pages (landing, how it works, for creators, legal, and creator profiles and Discover for
 * signed-out visitors). The header adapts to the session; signed in, the tab bar stays on phones.
 */
export function PublicShell({
  children,
  footer = true,
  bottomBar = true,
  mode,
}: {
  children: React.ReactNode;
  footer?: boolean;
  /** Set false on pages that own the bottom edge (e.g. a sticky order bar). */
  bottomBar?: boolean;
  mode?: Mode;
}) {
  const { account } = usePrefs();
  const s = useDemo();
  const pathname = usePathname();
  const resolved = useMode(me.account(s), pathname, mode);
  const signedIn = Boolean(account);
  const showBar = signedIn && bottomBar;
  return (
    <div className={`flex min-h-dvh flex-col ${showBar ? "pb-[calc(var(--y-bar-h)+24px)] lg:pb-0" : ""}`}>
      <SiteHeader signedIn={signedIn} mode={resolved} />
      <main id="main" className="flex-1 pb-12">
        {children}
      </main>
      {footer ? <SiteFooter /> : null}
      {showBar ? <TabBar mode={resolved} /> : null}
    </div>
  );
}
