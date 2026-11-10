"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { FaceAvatar } from "@/components/ui/face-avatar";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { me, unreadNotificationCount, unreadThreadCount } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { isActive, mobileNav, normalizePath } from "./nav";
import { ShellFooter, type FooterKind } from "./site-footer";
import { SiteHeader, type Session } from "./site-header";

/**
 * The phone's glass tab bar (round 3 answers, item 19): Home · Discover · Work · Messages · Alerts ·
 * Profile, icons only, the active tab shows its label (below 375px wide, its icon only). Every
 * target is 44px. Messages carries the unread count, Alerts the red dot. No tab is active on the
 * More page. On the feed it follows the reel in view (`data-reel-tone`, app/globals.css).
 */
export function BottomBar({ current }: { current?: string } = {}) {
  // `current` stands in for the address (Discover's read-only phone preview passes paths.home).
  const routerPath = usePathname();
  const pathname = current ?? routerPath;
  const s = useDemo();
  const unreadMessages = unreadThreadCount(s);
  const unreadAlerts = unreadNotificationCount(s);
  const account = me.account(s);
  const onMore = normalizePath(pathname) === paths.more;
  return (
    <nav aria-label="Tabs" className="y-tabs-wrap lg:hidden">
      <ul className="y-tabs">
        {mobileNav.map((item) => {
          const active = !onMore && isActive(item, pathname);
          const isProfile = item.href === paths.profile;
          const count = item.badge === "messages" ? unreadMessages : 0;
          const dot = item.badge === "alerts" && unreadAlerts > 0;
          const name =
            count > 0
              ? `${item.label}, ${count} unread`
              : dot
                ? `${item.label}, ${unreadAlerts} new`
                : item.label;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="y-tabs-item"
                aria-current={active ? "page" : undefined}
                aria-label={name}
              >
                <span className="y-tabs-icon">
                  {isProfile ? (
                    <span className="y-tabs-me">
                      <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name="" size={28} />
                    </span>
                  ) : (
                    item.icon
                  )}
                  {count > 0 ? (
                    <span aria-hidden className="y-tabs-count y-num">
                      {count > 9 ? "9+" : count}
                    </span>
                  ) : null}
                  {dot ? <span aria-hidden className="y-tabs-dot" /> : null}
                </span>
                {active ? (
                  <span aria-hidden className="y-tabs-label">
                    {item.label}
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
 * Signed-in chrome: header, the phone tab bar, and the compact footer on desktop. Visiting a
 * signed-in page while signed out signs this tab in as its current demo account (prototype
 * session); someone who logged out goes to the welcome instead.
 * - `focus` hides the tab bar for focused tasks (wizards, checkout) that own the bottom edge.
 * - `fullscreen` (the reels feed) drops the page padding, the footer and, on phones, the header:
 *   the content fills the screen with the tab bar floating over it (`--y-fill-h` is that height).
 * - `footer`: "compact" (default) is one quiet row on desktop; "full" the dark footer (Discover);
 *   "none". Phones never get a footer.
 */
export function AppShell({
  children,
  focus = false,
  fullscreen = false,
  footer = "compact",
}: {
  children: React.ReactNode;
  focus?: boolean;
  fullscreen?: boolean;
  footer?: FooterKind;
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
      <SiteHeader session="in" desktopOnly={fullscreen} />
      <main
        id="main"
        className={`flex-1 ${
          fullscreen
            ? "min-h-0"
            : focus
              ? "pb-32 lg:pb-16"
              : "pb-[calc(var(--y-bar-h)+40px+env(safe-area-inset-bottom))] lg:pb-16"
        }`}
      >
        {children}
      </main>
      {fullscreen ? null : <ShellFooter kind={footer} />}
      {focus ? null : <BottomBar />}
    </div>
  );
}

/**
 * Public pages (marketing, services, Discover signed out, creator profiles, legal). The header
 * adapts to the session, and a signed-in visitor keeps the tab bar on phones. In the static HTML
 * the session isn't known yet: both versions are drawn and the pre-paint class picks one.
 * - `footer`: "full" (default), "compact" or "none"; desktop only.
 */
export function PublicShell({
  children,
  footer = "full",
  bottomBar = true,
}: {
  children: React.ReactNode;
  footer?: FooterKind;
  /** Set false on pages that own the bottom edge (e.g. a sticky commission bar). */
  bottomBar?: boolean;
}) {
  const { account } = usePrefs();
  const hydrated = useHydrated();
  const session: Session = hydrated ? (account ? "in" : "out") : "unknown";
  const bar = !bottomBar || session === "out" ? "off" : session === "in" ? "on" : "maybe";
  return (
    <div className="flex min-h-dvh flex-col" data-bar={bar}>
      <SiteHeader session={session} />
      <main id="main" className="flex-1 pb-10 lg:pb-16">
        {children}
      </main>
      <ShellFooter kind={footer} />
      {bar === "on" ? <BottomBar /> : null}
      {bar === "maybe" ? (
        <div className="y-in-only">
          <BottomBar />
        </div>
      ) : null}
    </div>
  );
}
