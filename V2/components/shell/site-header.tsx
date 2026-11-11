"use client";

import { ArrowLeft, Menu, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Brand } from "@/components/ui/brand";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { homeFor, type Mode } from "@/lib/mode";
import { paths } from "@/lib/paths";
import { me, unreadNotificationCount, unreadThreadCount } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

import { AccountSheet, useOtherModeWaiting } from "./account-menu";
import { desktopNav, isActive, publicNav } from "./nav";

/** A page's way back, shown in the phone header in place of the logo (AppShell `back`). */
export type HeaderBack = { href: string; label: string };

/**
 * The app header: a full-width glass bar. Signed in, desktop shows the current mode's navigation
 * (Inbox with one count for unread messages and alerts), "New order" (Ordering only) and the
 * avatar, which opens the account menu (the mode switch is its first tile) and carries a count
 * when the other mode has something waiting. Phones show the logo, or the page's `back` link in
 * its place, and "+" in Ordering; the rest lives in the tab bar and on the Me page.
 *
 * - `focus` (flows): only the logo and, on desktop, the avatar. No navigation, no "New order".
 * - `back`: phones only; replaces the logo (and the "Studio" tag) with "← {label}".
 * - `desktopOnly` hides it on phones (the full-screen Watch view draws its own controls).
 */
export function SiteHeader({
  signedIn,
  mode = "order",
  desktopOnly = false,
  focus = false,
  back,
}: {
  signedIn: boolean;
  mode?: Mode;
  desktopOnly?: boolean;
  focus?: boolean;
  back?: HeaderBack;
}) {
  const pathname = usePathname();
  const s = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const waiting = useOtherModeWaiting(mode);
  const links = signedIn ? desktopNav[mode] : publicNav;
  const unreadInbox = signedIn ? unreadThreadCount(s) + unreadNotificationCount(s) : 0;
  const account = me.account(s);
  const business = me.business(s);
  const showLogo = signedIn && business.kind !== "personal";
  const phoneBack = signedIn && back ? back : undefined;

  return (
    <header className={`y-header ${desktopOnly ? "max-lg:hidden" : ""}`}>
      <div className="mx-auto flex h-full max-w-[calc(1200px+var(--y-gutter)*2)] items-center gap-2 px-(--y-gutter)">
        {phoneBack ? (
          <Link
            href={phoneBack.href}
            className="-ms-2 inline-flex min-h-11 min-w-0 items-center gap-1.5 rounded-full px-2 font-medium lg:hidden"
          >
            <ArrowLeft size={20} aria-hidden className="y-flip flex-none" />
            <span className="truncate">{phoneBack.label}</span>
          </Link>
        ) : null}
        <div className={`flex items-center gap-2 ${phoneBack ? "max-lg:hidden" : ""}`}>
          <Brand href={signedIn ? homeFor(mode) : paths.landing} />
          {signedIn && mode === "studio" ? (
            <span className="y-badge" data-tone-badge="ink">
              Studio
            </span>
          ) : null}
        </div>

        {focus ? null : (
          <nav aria-label="Main" className="ms-4 hidden items-center gap-0.5 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="y-navlink relative"
                aria-current={isActive(link, pathname) ? "page" : undefined}
              >
                {link.label}
                {link.badge === "inbox" && unreadInbox > 0 ? (
                  <span className="y-bubble ms-1.5">
                    {unreadInbox}
                    <span className="sr-only"> unread</span>
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        )}

        <div className="ms-auto flex items-center gap-1.5">
          {signedIn ? (
            <>
              {mode === "order" && !focus ? (
                <>
                  <PillButton
                    href={paths.newOrder()}
                    variant="contrast"
                    size="sm"
                    icon={<Plus size={16} aria-hidden />}
                    className="ms-1 hidden lg:inline-flex"
                  >
                    New order
                  </PillButton>
                  <Link
                    href={paths.newOrder()}
                    className="y-round lg:hidden"
                    data-tone-btn="contrast"
                    data-size="sm"
                    aria-label="New order"
                  >
                    <Plus size={18} aria-hidden />
                  </Link>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                aria-label={`Account menu: ${account.name}${waiting.count ? `, ${waiting.text}` : ""}`}
                className="relative ms-1.5 flex items-center rounded-full max-lg:hidden"
              >
                <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name="" size={36} />
                {showLogo ? (
                  <span className="absolute -end-1 -bottom-1 rounded-[7px] ring-2 ring-(--y-paper)">
                    <BusinessLogo business={business} size={16} />
                  </span>
                ) : null}
                {waiting.count ? (
                  <span aria-hidden className="y-bubble absolute -end-1.5 -top-1.5 ring-2 ring-(--y-paper)">
                    {waiting.count}
                  </span>
                ) : null}
              </button>
            </>
          ) : (
            <>
              <PillButton href={paths.signIn()} variant="ghost" size="sm" className="hidden md:inline-flex">
                Sign in
              </PillButton>
              <PillButton href={paths.signIn({ new: 1 })} variant="contrast" size="sm" className="hidden sm:inline-flex">
                Get started
              </PillButton>
              <button
                type="button"
                className="y-round lg:hidden"
                data-tone-btn="soft"
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
        <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} mode={mode} />
      ) : (
        <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu" width="sm">
          <nav aria-label="Main" className="flex flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="y-row !px-2 y-head"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <PillButton href={paths.signIn()} variant="outline" onClick={() => setMenuOpen(false)}>
              Sign in
            </PillButton>
            <PillButton href={paths.signIn({ new: 1 })} variant="contrast" onClick={() => setMenuOpen(false)}>
              Get started
            </PillButton>
          </div>
        </Sheet>
      )}
    </header>
  );
}
