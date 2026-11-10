"use client";

import { Bell, ChevronDown, Ellipsis, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { CreateSheet } from "@/components/feed/create-sheet";
import { Brand } from "@/components/ui/brand";
import {
  Dropdown,
  DropdownColumn,
  DropdownColumns,
  DropdownFooter,
  DropdownItem,
} from "@/components/ui/dropdown";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { paths } from "@/lib/paths";
import { me, unreadNotificationCount, unreadThreadCount } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

import { AccountConfirms, AccountIdentity, AccountRows, useAccountConfirm } from "./account-menu";
import { discoverHrefFor } from "./home";
import { desktopNav, homeFor, isActive, normalizePath, type NavItem } from "./nav";
import { NotificationsSheet } from "./notifications-sheet";
import { audiences, isServicesPath, services } from "./services";

/**
 * "in" or "out" once the session is known; "unknown" in the static HTML of a public page, where
 * both versions are drawn and the pre-paint `y-session` class (lib/site.ts) shows the right one,
 * so a signed-in visitor never sees "Sign in" flash before the header settles.
 */
export type Session = "in" | "out" | "unknown";

const only = (session: Session, side: "in" | "out") =>
  session === "unknown" ? (side === "in" ? "y-in-only" : "y-out-only") : "";

/**
 * The header. Desktop (from 1024px): a floating glass bar with the logo, Discover, Services,
 * Work, Messages, Profile, then New order, the bell and the avatar's account menu; signed out,
 * Discover, Services, How it works, Sign in and Get started (Site-wide 5.4.4). Phones: a glass bar
 * with the logo, "+" (signed in) and More. `desktopOnly` hides it on phones (the feed draws its
 * own floating controls).
 */
export function SiteHeader({ session, desktopOnly = false }: { session: Session; desktopOnly?: boolean }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useAccountConfirm();
  const signedIn = session === "in";
  const maybeIn = session !== "out";
  const maybeOut = session !== "in";

  return (
    <header className={`y-hdr ${desktopOnly ? "max-lg:hidden" : ""}`}>
      {/* Desktop */}
      <div className="y-hdr-bar max-lg:hidden">
        <Brand href={homeFor()} />
        <NavLinks session={session} />
        <div className="y-hdr-end">
          {maybeIn ? (
            <div className={`contents ${only(session, "in")}`}>
              <PillButton href={paths.newOrder()} variant="contrast" size="sm" icon={<Plus size={16} strokeWidth={2.4} aria-hidden />} className="y-hdr-order">
                New order
              </PillButton>
              <BellButton onOpen={() => setNotesOpen(true)} />
              <AccountMenu onConfirm={setConfirm} />
            </div>
          ) : null}
          {maybeOut ? (
            <div className={`contents ${only(session, "out")}`}>
              <PillButton href={paths.signIn()} variant="soft" size="sm" className="y-hdr-order">
                Sign in
              </PillButton>
              <PillButton href={paths.signUp} variant="contrast" size="sm" className="y-hdr-order">
                Get started
              </PillButton>
            </div>
          ) : null}
        </div>
      </div>

      {/* Phones */}
      <div className="y-phead lg:hidden">
        <Brand href={homeFor()} />
        <div className="y-phead-end">
          {maybeIn ? (
            <button
              type="button"
              className={`y-phead-btn ${only(session, "in")}`}
              aria-label="Create: new order or find work"
              aria-haspopup="dialog"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={20} strokeWidth={2.2} aria-hidden />
            </button>
          ) : null}
          {maybeOut ? (
            <PillButton href={paths.signUp} variant="contrast" size="sm" className={`me-1 ${only(session, "out")}`}>
              Get started
            </PillButton>
          ) : null}
          <MoreLink />
        </div>
      </div>

      {maybeIn ? (
        <>
          <NotificationsSheet open={notesOpen} onClose={() => setNotesOpen(false)} />
          <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} />
          {signedIn ? <AccountConfirms which={confirm} onClose={() => setConfirm(null)} /> : null}
        </>
      ) : null}
    </header>
  );
}

/** The phones' More icon: the page that holds what the desktop footer does. */
function MoreLink() {
  const pathname = usePathname();
  const here = normalizePath(pathname) === paths.more;
  return (
    <Link
      href={paths.more}
      className="y-phead-btn"
      aria-label="More"
      aria-current={here ? "page" : undefined}
    >
      <Ellipsis size={22} aria-hidden />
    </Link>
  );
}

/** Discover, Services, then the rest of the session's links. Also used by the signed-out landing. */
export function NavLinks({ session }: { session: Session }) {
  const s = useDemo();
  const pathname = usePathname();
  const unreadMessages = session === "out" ? 0 : unreadThreadCount(s);
  const inNav = desktopNav(true, session === "in" ? discoverHrefFor(s, true) : paths.discover);
  const outNav = desktopNav(false, paths.discover);
  const before = session === "out" ? outNav.before : inNav.before;

  const link = (item: NavItem, extra = "") => {
    const current = isActive(item, pathname);
    return (
      <Link
        key={item.label}
        href={item.href}
        className={`y-navlink ${extra}`}
        aria-current={current ? "page" : undefined}
      >
        {item.label}
        {item.badge === "messages" && unreadMessages > 0 ? (
          <span className="y-nav-count y-num">
            {unreadMessages}
            <span className="sr-only"> unread</span>
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav aria-label="Main" className="y-hdr-links">
      {before.map((item) => link(item))}
      <ServicesMenu />
      {session !== "in" ? outNav.after.map((item) => link(item, only(session, "out"))) : null}
      {session !== "out" ? inNav.after.map((item) => link(item, only(session, "in"))) : null}
    </nav>
  );
}

/** Services (Site-wide 5.8): two columns, the hidden services left out (answers, item 37). */
export function ServicesMenu() {
  const pathname = usePathname();
  const current = isServicesPath(normalizePath(pathname) + "/");
  return (
    <Dropdown
      label="Services"
      hover
      width={640}
      offset={22}
      triggerClassName={`y-navlink ${current ? "is-current" : ""}`}
      trigger={
        <>
          Services
          <ChevronDown size={14} strokeWidth={2} aria-hidden className="y-dd-chev" />
        </>
      }
    >
      <DropdownColumns>
        <DropdownColumn title="What we do">
          {services.map((entry) => (
            <DropdownItem
              key={entry.slug}
              href={entry.href}
              icon={<entry.icon size={18} aria-hidden />}
              title={entry.title}
              description={entry.description}
              badge={entry.badge}
            />
          ))}
        </DropdownColumn>
        <DropdownColumn title="Who it's for">
          {audiences.map((entry) => (
            <DropdownItem
              key={entry.slug}
              href={entry.href}
              icon={<entry.icon size={18} aria-hidden />}
              title={entry.title}
              description={entry.description}
            />
          ))}
        </DropdownColumn>
      </DropdownColumns>
      <DropdownFooter
        links={[
          {
            href: paths.howItWorks,
            label: (
              <>
                New to Yapp? <b className="font-semibold">See how it works</b>
              </>
            ),
          },
          { href: paths.forCreators, label: "For creators" },
        ]}
      />
    </Dropdown>
  );
}

function BellButton({ onOpen }: { onOpen: () => void }) {
  const s = useDemo();
  const unread = unreadNotificationCount(s);
  return (
    <button
      type="button"
      className="y-hdr-circle"
      aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      aria-haspopup="dialog"
      onClick={onOpen}
    >
      <Bell size={19} strokeWidth={1.9} aria-hidden />
      {unread > 0 ? <span aria-hidden className="y-hdr-dot" /> : null}
    </button>
  );
}

/** The avatar's dropdown (Site-wide 5.9.1): 340px glass panel anchored to the end. */
function AccountMenu({ onConfirm }: { onConfirm: (which: "logout" | "reset") => void }) {
  const s = useDemo();
  const account = me.account(s);
  const business = me.business(s);
  const showLogo = business.kind !== "personal";
  return (
    <Dropdown
      label="Account"
      align="end"
      width={340}
      offset={18}
      className="y-acct-dd"
      triggerLabel={`Account menu: ${account.name}`}
      triggerClassName="y-hdr-avatar"
      trigger={
        <>
          <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name="" size={42} />
          {showLogo ? (
            <span className="y-hdr-avatar-logo">
              <BusinessLogo business={business} size={18} />
            </span>
          ) : null}
        </>
      }
    >
      <AccountIdentity />
      <AccountRows
        onConfirm={(which) => {
          // The menu closes as the row is chosen: give focus back to the avatar, so the
          // confirmation returns it there.
          document.querySelector<HTMLElement>(".y-acct-dd .y-dd-trigger")?.focus();
          onConfirm(which);
        }}
      />
    </Dropdown>
  );
}
