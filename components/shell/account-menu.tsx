"use client";

import { CalendarCheck, ChevronRight, Ellipsis, ExternalLink, LogOut, Repeat2, RotateCcw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DropdownHeader, DropdownRow, DropdownSeparator } from "@/components/ui/dropdown";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { DeltaChip } from "@/components/ui/tags";
import { useToast } from "@/components/ui/toast";
import { moneyExact } from "@/lib/format";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { productivityChip } from "@/lib/productivity";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { DemoState } from "@/lib/store";

import { accountNav, normalizePath, productivityIcon } from "./nav";

/**
 * Can `accountId` see the page at `pathname`? Used when switching accounts: stay on the page if the
 * other person can open it too (e.g. a commission between them, or any public page), otherwise go
 * to "/", which routes to their home.
 */
function visibleTo(s: DemoState, accountId: string, pathname: string): boolean {
  const account = s.accounts.find((a) => a.id === accountId);
  if (!account) return false;
  const path = normalizePath(pathname);
  if (path === "/") return true;
  const work = path.match(/^\/work\/([^/]+)/);
  if (work) {
    const c = s.commissions.find((x) => x.id === work[1]);
    return Boolean(c && (c.businessId === account.businessId || c.creatorId === account.creatorId));
  }
  if (/^\/products\/[^/]+/.test(path)) return false;
  // Orders are public (or invite-only); everyone can open the page and it adapts to them.
  return /^\/(orders|explore|creators|discover|services|for|more|alerts|messages|work|wallet|billing|products|saved|settings|profile|productivity|pitches|how-it-works|about|for-creators|legal)(\/|$)/.test(
    path,
  );
}

/**
 * The Productivity row's chip (Site-wide 5.9.1): the hero figure of the account's default side
 * against the previous 30 days, from lib/productivity.ts (spend for a brand, earnings for a
 * creator; never an ad metric). Nothing when there's no change to show.
 */
export function ProductivityChip() {
  const s = useDemo();
  const chip = productivityChip(s);
  if (!chip) return null;
  return (
    <span title={chip.delta.text} className="flex flex-none">
      <DeltaChip direction={chip.delta.direction} good={chip.delta.good}>
        {chip.delta.label}
      </DeltaChip>
    </span>
  );
}

/** "Founder · Daftar" for a team member, "@laylatalks" for a creator, otherwise the email. */
function subtitleOf(s: DemoState): string {
  const account = me.account(s);
  const member = me.member(s);
  const creator = me.creator(s);
  if (member) return `${member.title} · ${me.business(s).name}`;
  return creator ? `@${creator.handle}` : account.email;
}

export function AccountIdentity({ size = 48 }: { size?: number }) {
  const s = useDemo();
  const account = me.account(s);
  const business = me.business(s);
  return (
    <DropdownHeader>
      <span className="relative flex-none">
        <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name="" size={size} />
        {business.kind !== "personal" ? (
          <span className="absolute -end-1 -bottom-1 rounded-[9px] ring-2 ring-(--y-paper)">
            <BusinessLogo business={business} size={22} />
          </span>
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">{account.name}</span>
        <span className="y-small y-fg-2 block truncate" dir="ltr">
          {subtitleOf(s)}
        </span>
      </span>
    </DropdownHeader>
  );
}

/**
 * The account menu's rows, in the Site-wide 5.9.1 order: View your public account (only with a
 * public profile), Productivity, Wallet, Billing & receipts, Products, Saved creators, Settings,
 * More (phones), the demo controls together, then Log out with a confirmation. The same rows
 * render in the desktop dropdown and the phone's account sheet; `onDone` closes the sheet.
 */
export function AccountRows({
  showMore = false,
  onDone,
  onConfirm,
}: {
  showMore?: boolean;
  onDone?: () => void;
  onConfirm: (which: "logout" | "reset") => void;
}) {
  const s = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { signIn } = usePrefs();
  const account = me.account(s);
  const creator = me.creator(s);
  const otherAccount = s.accounts.find((a) => a.id !== account.id);
  const chevron = <ChevronRight size={18} aria-hidden className="y-fg-3 y-flip flex-none" />;
  const end = (node: React.ReactNode) => (showMore ? chevron : node);

  const switchTo = (accountId: string) => {
    signIn(accountId);
    onDone?.();
    const next = s.accounts.find((a) => a.id === accountId);
    toast({ message: `You're now ${next?.firstName ?? "signed in"} (demo)`, tone: "info" });
    if (!visibleTo(s, accountId, pathname)) router.push(paths.landing);
  };

  // The demo clock is fixed, so this stands in for a week passing (see `actions.skipSevenDays`).
  const skipSevenDays = () => {
    const result = actions.skipSevenDays();
    onDone?.();
    toast({
      message: result.mine
        ? `7 days skipped. ${moneyExact(result.mine)} of your campaign pay is now withdrawable.`
        : result.released
          ? "7 days skipped. Campaign pay for verified posts that are still up was released."
          : result.waiting
            ? "7 days skipped. Pending pay gets its date once its post is verified."
            : "7 days skipped. No pending campaign pay.",
      tone: "info",
    });
  };

  return (
    <>
      {creator ? (
        <DropdownRow href={paths.creator(creator.handle)} onClick={onDone} icon={<ExternalLink size={20} />} trailing={end(null)}>
          View your public account
        </DropdownRow>
      ) : null}
      <DropdownRow
        href={paths.productivity}
        onClick={onDone}
        icon={productivityIcon}
        trailing={
          <>
            <ProductivityChip />
            {showMore ? chevron : null}
          </>
        }
      >
        Productivity
      </DropdownRow>
      <DropdownSeparator />
      {accountNav.map((item) => (
        <DropdownRow key={item.href} href={item.href} onClick={onDone} icon={item.icon} trailing={end(null)}>
          {item.label}
        </DropdownRow>
      ))}
      {showMore ? (
        // Phones only: on desktop the footer holds what the More page lists.
        <div className="lg:hidden">
          <DropdownRow href={paths.more} onClick={onDone} icon={<Ellipsis size={20} />} trailing={chevron}>
            More
          </DropdownRow>
        </div>
      ) : null}
      <DropdownSeparator />
      <div role="group" aria-label="Demo controls">
        {otherAccount ? (
          <DropdownRow icon={<Repeat2 size={20} />} onClick={() => switchTo(otherAccount.id)}>
            <span className="block">Switch account (demo)</span>
            <span className="y-micro y-fg-2 block font-normal">To {otherAccount.name}</span>
          </DropdownRow>
        ) : null}
        <DropdownRow icon={<CalendarCheck size={20} />} onClick={skipSevenDays}>
          <span className="block">Skip 7 days (demo)</span>
          <span className="y-micro y-fg-2 block font-normal">Releases campaign pay whose posts are verified and still up</span>
        </DropdownRow>
        <DropdownRow icon={<RotateCcw size={20} />} onClick={() => onConfirm("reset")}>
          Reset demo data
        </DropdownRow>
      </div>
      <DropdownSeparator />
      <DropdownRow tone="danger" icon={<LogOut size={20} className="y-flip" />} onClick={() => onConfirm("logout")}>
        Log out
      </DropdownRow>
    </>
  );
}

/**
 * The two confirmations the account menu asks for. Log out keeps this account saved on the device
 * (the sign-in screen shows it for one-tap sign-in; it is removed only there).
 */
export function AccountConfirms({
  which,
  onClose,
}: {
  which: "logout" | "reset" | null;
  onClose: () => void;
}) {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const { signOut } = usePrefs();
  const account = me.account(s);
  return (
    <>
      <ConfirmModal
        open={which === "logout"}
        onClose={onClose}
        title="Log out of Yapp?"
        primary={{
          label: "Log out",
          onClick: () => {
            onClose();
            signOut();
            router.push(paths.landing);
          },
        }}
        link={{ label: "Cancel" }}
      >
        {account.firstName} stays saved on this device, so signing back in is one tap.
      </ConfirmModal>
      <ConfirmModal
        open={which === "reset"}
        onClose={onClose}
        title="Reset the demo data?"
        primary={{
          label: "Reset demo data",
          onClick: () => {
            actions.reset();
            onClose();
            toast({ message: "Demo data reset", tone: "info" });
          },
        }}
        link={{ label: "Keep my changes" }}
      >
        Orders, messages and everything else created in this browser go back to the original demo.
      </ConfirmModal>
    </>
  );
}

/** For the confirmations' state in the menu's owner. */
export function useAccountConfirm() {
  return useState<"logout" | "reset" | null>(null);
}
