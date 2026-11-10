"use client";

import { Bell, Menu, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { CreateSheet } from "@/components/feed/create-sheet";
import { Brand } from "@/components/ui/brand";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { paths } from "@/lib/paths";
import { me, unreadNotificationCount, unreadThreadCount } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

import { AccountSheet } from "./account-sheet";
import { homeFor, isActive, primaryNav } from "./nav";
import { NotificationsSheet } from "./notifications-sheet";

/**
 * Floating glass pill header. Adapts to the session (signed in: one nav for every account). Below
 * 1024px, signed in, it's the logo and "+" only: the bell and avatar live in the tab bar.
 * `desktopOnly` hides it on phones (the reels feed draws its own floating controls).
 */
export function SiteHeader({ signedIn, desktopOnly = false }: { signedIn: boolean; desktopOnly?: boolean }) {
  const pathname = usePathname();
  const s = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const links = primaryNav[signedIn ? "app" : "public"];
  const unreadNotes = signedIn ? unreadNotificationCount(s) : 0;
  const unreadMessages = signedIn ? unreadThreadCount(s) : 0;
  const account = me.account(s);
  const business = me.business(s);
  const showLogo = signedIn && business.kind !== "personal";

  return (
    <header className={`sticky top-0 z-40 px-(--y-gutter) pt-2 ${desktopOnly ? "max-lg:hidden" : ""}`}>
      <div
        data-tone="paper"
        data-glass="strong"
        className="y-block y-glass mx-auto flex h-16 max-w-[1360px] items-center gap-2 !rounded-full ps-4 pe-2 md:ps-5"
      >
        <Brand href={homeFor(signedIn)} />

        <nav aria-label="Main" className="ms-3 hidden items-center gap-0.5 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="y-navlink relative"
              aria-current={isActive(link, pathname) ? "page" : undefined}
            >
              {link.label}
              {link.badge === "messages" && unreadMessages > 0 ? (
                <span className="ms-1.5 grid size-5 place-items-center rounded-full bg-(--y-ink) text-[11px] font-semibold text-(--y-paper)">
                  {unreadMessages}
                  <span className="sr-only"> unread</span>
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          {signedIn ? (
            <>
              <PillButton
                href={paths.newOrder()}
                variant="contrast"
                size="sm"
                icon={<Plus size={16} aria-hidden />}
                className="hidden lg:inline-flex"
              >
                New order
              </PillButton>
              <button
                type="button"
                className="y-round lg:hidden"
                data-tone-btn="soft"
                data-size="sm"
                aria-label="Create: new order or make a Yapp"
                aria-haspopup="dialog"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={19} aria-hidden />
              </button>
              <button
                type="button"
                className="y-round relative max-lg:hidden"
                data-tone-btn="soft"
                data-size="sm"
                aria-label={`Notifications${unreadNotes ? `, ${unreadNotes} unread` : ""}`}
                onClick={() => setNotesOpen(true)}
              >
                <Bell size={19} aria-hidden />
                {unreadNotes > 0 ? (
                  <span
                    aria-hidden
                    className="absolute end-2.5 top-2.5 size-2.5 rounded-full bg-(--y-red) ring-2 ring-(--y-paper)"
                  />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                aria-label={`Account menu: ${account.name}`}
                className="relative flex items-center rounded-full max-lg:hidden"
              >
                <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name="" size={44} />
                {showLogo ? (
                  <span className="absolute -end-1 -bottom-1 rounded-[9px] ring-2 ring-(--y-paper)">
                    <BusinessLogo business={business} size={20} />
                  </span>
                ) : null}
              </button>
            </>
          ) : (
            <>
              <PillButton href={paths.signIn()} variant="ghost" size="sm" className="hidden md:inline-flex">
                Sign in
              </PillButton>
              <PillButton href={paths.signUp} variant="contrast" size="sm" className="hidden sm:inline-flex">
                Get started
              </PillButton>
              <button
                type="button"
                className="y-round lg:hidden"
                data-tone-btn="contrast"
                data-size="sm"
                aria-label="Menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(true)}
              >
                <Menu size={20} aria-hidden />
              </button>
            </>
          )}
        </div>
      </div>

      {signedIn ? (
        <>
          <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
          <NotificationsSheet open={notesOpen} onClose={() => setNotesOpen(false)} />
          <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
        </>
      ) : (
        <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" width="sm">
          <nav aria-label="Main" className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="y-tile y-display flex min-h-16 items-center px-5 text-2xl font-medium"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <PillButton href={paths.signIn()} variant="outline" onClick={() => setMenuOpen(false)}>
              Sign in
            </PillButton>
            <PillButton href={paths.signUp} variant="contrast" onClick={() => setMenuOpen(false)}>
              Get started
            </PillButton>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 px-1">
            <span className="y-small y-fg-2">Appearance</span>
            <ThemeToggle />
          </div>
        </Sheet>
      )}
    </header>
  );
}
