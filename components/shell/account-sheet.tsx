"use client";

import {
  CalendarCheck,
  ChevronRight,
  ExternalLink,
  LogOut,
  Moon,
  Repeat2,
  RotateCcw,
  Sun,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { money } from "@/lib/format";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { DemoState } from "@/lib/store";

import { accountNav } from "./nav";

/**
 * Can `accountId` see the page at `pathname`? Used when switching accounts: stay on the page if the
 * other person can open it too (e.g. a commission between them), otherwise go to Home.
 */
function visibleTo(s: DemoState, accountId: string, pathname: string): boolean {
  const account = s.accounts.find((a) => a.id === accountId);
  if (!account) return false;
  const work = pathname.match(/^\/work\/([^/]+)/);
  if (work) {
    const c = s.commissions.find((x) => x.id === work[1]);
    return Boolean(c && (c.businessId === account.businessId || c.creatorId === account.creatorId));
  }
  // Orders are public (or invite-only); everyone can open the page and it adapts to them.
  if (/^\/(orders\/[^/]+|explore|creators|messages|work|wallet|billing|products|saved|settings|profile|pitches)/.test(pathname))
    return !/^\/products\/[^/]+/.test(pathname);
  return false;
}

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { isDark, toggleTheme, signIn, signOut } = usePrefs();
  const [confirmReset, setConfirmReset] = useState(false);
  const account = me.account(s);
  const business = me.business(s);
  const member = me.member(s);
  const creator = me.creator(s);
  const otherAccount = s.accounts.find((a) => a.id !== account.id);
  const subtitle = [
    member ? `${member.title} · ${business.name}` : creator ? `@${creator.handle}` : account.email,
  ][0];

  const switchTo = (accountId: string) => {
    signIn(accountId);
    onClose();
    const next = s.accounts.find((a) => a.id === accountId);
    toast({ message: `You're now ${next?.firstName ?? "signed in"} (demo)`, tone: "info" });
    if (!visibleTo(s, accountId, pathname)) router.push(paths.home);
  };

  const logOut = (forget: boolean) => {
    signOut({ forget });
    onClose();
    router.push(paths.landing);
  };

  const jumpToMonthEnd = () => {
    const result = actions.closeMonth();
    onClose();
    toast({
      message: result.released
        ? `Month closed. ${money(result.released)} of campaign earnings is now withdrawable.`
        : result.locked
          ? "Month closed. Pending earnings stay locked until their posts are live."
          : "Month closed. No pending campaign earnings.",
      tone: "info",
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Account" width="sm">
      <div className="y-tile flex items-center gap-3 p-4">
        <span className="relative">
          <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name={account.name} size={52} />
          {business.kind !== "personal" ? (
            <span className="absolute -end-1 -bottom-1 rounded-[10px] ring-2 ring-(--b-chip)">
              <BusinessLogo business={business} size={24} />
            </span>
          ) : null}
        </span>
        <div className="min-w-0">
          <p className="y-head truncate">{account.name}</p>
          <p className="y-small y-fg-2 truncate">{subtitle}</p>
        </div>
      </div>

      <nav aria-label="Account" className="mt-3 flex flex-col gap-1">
        {creator ? (
          <Link
            href={paths.creator(creator.handle)}
            onClick={onClose}
            className="flex min-h-12 items-center gap-3 rounded-full px-3 font-medium hover:bg-(--b-chip)"
          >
            <ExternalLink size={20} aria-hidden />
            <span className="flex-1">View public profile</span>
            <ChevronRight size={18} aria-hidden className="y-fg-3 y-flip" />
          </Link>
        ) : null}
        {accountNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex min-h-12 items-center gap-3 rounded-full px-3 font-medium hover:bg-(--b-chip)"
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            <ChevronRight size={18} aria-hidden className="y-fg-3 y-flip" />
          </Link>
        ))}
      </nav>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {otherAccount ? (
          <button
            type="button"
            onClick={() => switchTo(otherAccount.id)}
            className="y-tile y-hoverable flex min-h-16 items-center gap-3 px-4 text-start"
          >
            <Repeat2 size={20} aria-hidden className="flex-none" />
            <span className="flex flex-col">
              <span className="y-micro y-fg-2">Switch account (demo)</span>
              <span className="y-small font-semibold">{otherAccount.name}</span>
            </span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={toggleTheme}
          aria-pressed={isDark}
          className="y-tile y-hoverable flex min-h-16 items-center gap-3 px-4 text-start"
        >
          {isDark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
          <span className="flex flex-col">
            <span className="y-micro y-fg-2">Theme</span>
            <span className="y-small font-semibold">{isDark ? "Light mode" : "Dark mode"}</span>
          </span>
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={jumpToMonthEnd}
          className="flex min-h-12 items-center gap-3 rounded-full px-3 font-medium hover:bg-(--b-chip)"
        >
          <CalendarCheck size={20} aria-hidden />
          <span className="flex flex-col text-start">
            <span>Jump to month end (demo)</span>
            <span className="y-micro y-fg-2 font-normal">Unlocks pending campaign earnings whose posts are live</span>
          </span>
        </button>
        {confirmReset ? (
          <div className="y-tile flex flex-col gap-3 p-4" role="alert">
            <p className="y-small">
              Reset the prototype to its original demo data? Orders, messages and anything else you
              created in this browser will be cleared.
            </p>
            <div className="flex gap-2">
              <PillButton
                variant="contrast"
                size="sm"
                onClick={() => {
                  actions.reset();
                  setConfirmReset(false);
                  onClose();
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
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex min-h-12 items-center gap-3 rounded-full px-3 font-medium hover:bg-(--b-chip)"
          >
            <RotateCcw size={20} aria-hidden />
            Reset demo data
          </button>
        )}
        <button
          type="button"
          onClick={() => logOut(false)}
          className="flex min-h-12 items-center gap-3 rounded-full px-3 font-medium hover:bg-(--b-chip)"
        >
          <LogOut size={20} aria-hidden className="y-flip" />
          <span className="flex flex-col text-start">
            <span>Log out</span>
            <span className="y-micro y-fg-2 font-normal">Keep this account saved for one-tap sign in</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => logOut(true)}
          className="flex min-h-12 items-center gap-3 rounded-full px-3 font-medium hover:bg-(--b-chip)"
        >
          <UserX size={20} aria-hidden className="text-(--y-danger)" />
          <span className="flex flex-col text-start">
            <span>Log out and forget this account</span>
            <span className="y-micro y-fg-2 font-normal">Remove it from this device</span>
          </span>
        </button>
      </div>
    </Sheet>
  );
}
