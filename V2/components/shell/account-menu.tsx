"use client";

import {
  ArrowLeftRight,
  CalendarCheck,
  ChartNoAxesColumn,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Heart,
  LogOut,
  Package,
  PenLine,
  Repeat2,
  RotateCcw,
  Settings,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { urgentCount } from "@/lib/attention";
import { money, plural } from "@/lib/format";
import { defaultMode, homeFor, rememberMode, sideForMode, type Mode } from "@/lib/mode";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { DemoState } from "@/lib/store";

/**
 * Can `accountId` open the page at `pathname`? Used when switching demo accounts: stay on the page
 * if the other person can see it too (a job between them, an order, messages), otherwise go home.
 */
function visibleTo(s: DemoState, accountId: string, pathname: string): boolean {
  const account = s.accounts.find((a) => a.id === accountId);
  if (!account) return false;
  const job = pathname.match(/^\/jobs\/([^/]+)/);
  if (job) {
    const c = s.commissions.find((x) => x.id === job[1]);
    return Boolean(c && (c.businessId === account.businessId || c.creatorId === account.creatorId));
  }
  if (/^\/products\/[^/]+/.test(pathname)) return false;
  return /^\/(orders\/r-|creators|discover|messages|settings|account)/.test(pathname);
}

/** The other mode, and how to describe switching to it. */
export const switchCopy: Record<Mode, { to: Mode; label: string; line: string }> = {
  order: { to: "studio", label: "Switch to Studio", line: "Make videos for brands and get paid" },
  studio: { to: "order", label: "Switch to ordering", line: "Order videos for your own products" },
};

/** Go to the other mode's home (remembering it for shared pages). */
export function useSwitchMode() {
  const router = useRouter();
  const s = useDemo();
  return (to: Mode) => {
    rememberMode(s.activeAccountId, to);
    router.push(homeFor(to));
  };
}

function MenuLink({
  href,
  icon,
  label,
  detail,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  detail?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate} className="y-row !min-h-12 !px-3 rounded-(--y-r-sm)">
      <span className="flex-none">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      {detail ? <span className="y-small y-fg-2">{detail}</span> : null}
      <ChevronRight size={18} aria-hidden className="y-fg-3 y-flip flex-none" />
    </Link>
  );
}

function MenuButton({
  icon,
  label,
  detail,
  onClick,
  pressed,
}: {
  icon: React.ReactNode;
  label: string;
  detail?: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className="y-row !min-h-12 !px-3 rounded-(--y-r-sm)"
    >
      <span className="flex-none">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{label}</span>
        {detail ? <span className="y-micro y-fg-2">{detail}</span> : null}
      </span>
    </button>
  );
}

/**
 * Everything about the signed-in account: who you are, the mode switch, the pages that aren't in
 * the main navigation, demo tools and log out. Rendered in the desktop avatar sheet and on the
 * phone's Me page (`/account`). Light only (dark mode is paused, round 3 answers item 49), and one
 * "Log out" that asks first (item 57: "Log out and forget" is gone; a saved account is removed from
 * this device on the sign-in screen).
 */
export function AccountMenuBody({ mode, onNavigate }: { mode: Mode; onNavigate?: () => void }) {
  const s = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { signIn, signOut } = usePrefs();
  const switchMode = useSwitchMode();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLogOut, setConfirmLogOut] = useState(false);
  const account = me.account(s);
  const business = me.business(s);
  const member = me.member(s);
  const creator = me.creator(s);
  const otherAccount = s.accounts.find((a) => a.id !== account.id);
  const other = switchCopy[mode];
  const waiting = urgentCount(s, sideForMode[other.to]);
  const subtitle = member ? `${member.title} · ${business.name}` : creator ? `@${creator.handle}` : account.email;

  const switchAccount = (accountId: string) => {
    signIn(accountId);
    onNavigate?.();
    const next = s.accounts.find((a) => a.id === accountId);
    // A switched-to account starts in its own default mode (Nour: Ordering, Layla: Studio) on pages
    // that don't set one, not in whatever mode it was last left in this tab.
    if (next) rememberMode(next.id, defaultMode(next));
    toast({ message: `You're now ${next?.firstName ?? "signed in"} (demo)`, tone: "info" });
    if (next && !visibleTo(s, accountId, pathname)) router.push(homeFor(defaultMode(next)));
  };

  const logOut = () => {
    signOut();
    onNavigate?.();
    router.push(paths.landing);
  };

  // The demo clock is fixed, so this stands in for a week passing (see `actions.skipSevenDays`).
  const skipSevenDays = () => {
    const result = actions.skipSevenDays();
    onNavigate?.();
    toast({
      message: result.mine
        ? `7 days skipped. ${money(result.mine)} of your campaign pay is now withdrawable.`
        : result.released
          ? "7 days skipped. Campaign pay for verified posts that are still up was released."
          : result.waiting
            ? "7 days skipped. Pending pay gets its date once its post is verified."
            : "7 days skipped. No pending campaign pay.",
      tone: "info",
    });
  };

  const links =
    mode === "order"
      ? [
          { href: paths.products, icon: <Package size={20} aria-hidden />, label: "Products" },
          { href: paths.billing, icon: <CreditCard size={20} aria-hidden />, label: "Billing and receipts" },
          { href: paths.discover({ tab: "saved" }), icon: <Heart size={20} aria-hidden />, label: "Saved creators" },
        ]
      : [
          { href: paths.studioProfile(), icon: <PenLine size={20} aria-hidden />, label: "Edit your profile" },
          ...(creator
            ? [{ href: paths.creator(creator.handle), icon: <ExternalLink size={20} aria-hidden />, label: "View public profile" }]
            : []),
          { href: paths.earnings, icon: <Wallet size={20} aria-hidden />, label: "Earnings and payouts" },
        ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 px-1">
        <span className="relative flex-none">
          <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name={account.name} size={48} />
          {business.kind !== "personal" ? (
            <span className="absolute -end-1 -bottom-1 rounded-[9px] ring-2 ring-(--b-bg,var(--y-paper))">
              <BusinessLogo business={business} size={22} />
            </span>
          ) : null}
        </span>
        <div className="min-w-0">
          <p className="y-head truncate">{account.name}</p>
          <p className="y-small y-fg-2 truncate">{subtitle}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          switchMode(other.to);
        }}
        className="y-tile y-hoverable flex min-h-16 items-center gap-3 px-4 text-start"
      >
        <ArrowLeftRight size={20} aria-hidden className="flex-none" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">{other.label}</span>
          <span className="y-small y-fg-2">
            {waiting ? `${plural(waiting, "thing needs", "things need")} you there` : other.line}
          </span>
        </span>
        {waiting ? <span className="y-bubble">{waiting}</span> : null}
        <ChevronRight size={18} aria-hidden className="y-fg-3 y-flip flex-none" />
      </button>

      <nav aria-label="Account" className="flex flex-col">
        {links.map((link) => (
          <MenuLink key={link.href} {...link} onNavigate={onNavigate} />
        ))}
        <MenuLink
          href={paths.productivity({ as: mode === "studio" ? "creator" : "brand" })}
          icon={<ChartNoAxesColumn size={20} aria-hidden />}
          label="Productivity"
          onNavigate={onNavigate}
        />
        <MenuLink href={paths.settings()} icon={<Settings size={20} aria-hidden />} label="Settings" onNavigate={onNavigate} />
      </nav>

      <Block tone="mist" className="flex flex-col p-1.5 !rounded-(--y-r-tile)">
        <p className="y-eyebrow px-3 pt-2 pb-1">Demo tools</p>
        {otherAccount ? (
          <MenuButton
            icon={<Repeat2 size={20} aria-hidden />}
            label={`Switch account to ${otherAccount.name}`}
            detail="Play the other side of the same marketplace"
            onClick={() => switchAccount(otherAccount.id)}
          />
        ) : null}
        <MenuButton
          icon={<CalendarCheck size={20} aria-hidden />}
          label="Skip 7 days"
          detail="Releases campaign pay whose posts are verified and still up"
          onClick={skipSevenDays}
        />
        {confirmReset ? (
          <div className="flex flex-col gap-3 p-3" role="alert">
            <p className="y-small">
              Reset to the original demo data? Orders, messages and anything else you created in this
              browser will be cleared.
            </p>
            <div className="flex gap-2">
              <PillButton
                variant="contrast"
                size="sm"
                onClick={() => {
                  actions.reset();
                  setConfirmReset(false);
                  onNavigate?.();
                  toast({ message: "Demo data reset", tone: "info" });
                }}
              >
                Reset demo data
              </PillButton>
              <PillButton variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                Keep my changes
              </PillButton>
            </div>
          </div>
        ) : (
          <MenuButton icon={<RotateCcw size={20} aria-hidden />} label="Reset demo data" onClick={() => setConfirmReset(true)} />
        )}
      </Block>

      {confirmLogOut ? (
        <div className="y-tile flex flex-col gap-3 p-4" role="alert">
          <p className="y-small">
            Log out of {account.firstName}&apos;s account? It stays saved on this device for one-tap
            sign in.
          </p>
          <div className="flex gap-2">
            <PillButton variant="contrast" size="sm" onClick={logOut}>
              Log out
            </PillButton>
            <PillButton variant="ghost" size="sm" onClick={() => setConfirmLogOut(false)}>
              Stay signed in
            </PillButton>
          </div>
        </div>
      ) : (
        <MenuButton
          icon={<LogOut size={20} aria-hidden className="y-flip" />}
          label="Log out"
          onClick={() => setConfirmLogOut(true)}
        />
      )}
    </div>
  );
}

export function AccountSheet({ open, onClose, mode }: { open: boolean; onClose: () => void; mode: Mode }) {
  return (
    <Sheet open={open} onClose={onClose} title="Account" width="sm">
      <AccountMenuBody mode={mode} onNavigate={onClose} />
    </Sheet>
  );
}
