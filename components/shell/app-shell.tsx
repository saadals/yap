"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { usePrefs } from "@/lib/prefs";
import { unreadThreadCount } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { Role } from "@/lib/types";

import { isActive, primaryNav } from "./nav";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** Mobile: floating black pill bar; the active item becomes a white pill with its label. */
export function BottomBar({ role }: { role: Role }) {
  const pathname = usePathname();
  const s = useDemo();
  const unread = unreadThreadCount(s, role);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:hidden"
    >
      <ul className="y-bar mx-auto flex h-(--y-bar-h) max-w-md items-center justify-between rounded-full px-2">
        {primaryNav[role].map((item) => {
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
 * Signed-in chrome for /business/* and /creator/* pages: header + mobile bottom bar.
 * Visiting a role's pages signs you in as that role (prototype session).
 * `focus` hides the bottom bar for focused tasks (wizards, checkout) that own the bottom edge.
 */
export function AppShell({
  role,
  children,
  focus = false,
}: {
  role: Role;
  children: React.ReactNode;
  focus?: boolean;
}) {
  const prefs = usePrefs();
  const { setRole } = prefs;
  useEffect(() => {
    if (prefs.role !== role) setRole(role);
  }, [prefs.role, role, setRole]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader role={role} />
      <main
        id="main"
        className={`flex-1 ${focus ? "pb-32 lg:pb-16" : "pb-[calc(var(--y-bar-h)+40px)] lg:pb-16"}`}
      >
        {children}
      </main>
      {focus ? null : <BottomBar role={role} />}
    </div>
  );
}

/**
 * Shared/public pages (landing, creator browsing, profiles, auth). The header adapts to the
 * signed-in role; a signed-in user also keeps their bottom bar on mobile.
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
  const { role } = usePrefs();
  const showBar = Boolean(role) && bottomBar;
  return (
    <div
      className={`flex min-h-dvh flex-col ${showBar ? "pb-[calc(var(--y-bar-h)+24px)] lg:pb-0" : ""}`}
    >
      <SiteHeader role={role} />
      <main id="main" className="flex-1 pb-10">
        {children}
      </main>
      {footer ? <SiteFooter /> : null}
      {showBar && role ? <BottomBar role={role} /> : null}
    </div>
  );
}
