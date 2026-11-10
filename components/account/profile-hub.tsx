"use client";

import { Building2, ChevronRight, ExternalLink, Link2, Pencil, UserCog, Video } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { AccountSheet } from "@/components/shell/account-sheet";
import { accountNav, type NavItem } from "@/components/shell/nav";
import { Block } from "@/components/ui/block";
import { Chip } from "@/components/ui/chip";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";
import { me } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { CreatorSetupSheet } from "./creator-setup-sheet";
import { socialsSummary } from "./social";

/**
 * /profile (the Profile tab): who you are on Yapp and where your account things live.
 * - Identity: face, name, @handle or email, Business or Personal account.
 * - With a creator profile: View public profile, Edit profile, and connected accounts in one line.
 * - Without one: one slim "Make videos on Yapp too" block that opens the setup sheet.
 * - A calm list of account destinations (Wallet, Billing, Products, Saved, Business account, Settings),
 *   ending with the account sheet (log out, switch account and the demo controls).
 */
export function ProfileHub() {
  const hydrated = useHydrated();
  if (!hydrated) return <HubSkeleton />;
  return <Hub />;
}

function HubSkeleton() {
  return (
    <Page width="narrow">
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading your profile">
        <Block tone="paper" pad="lg" className="flex items-center gap-4">
          <Skeleton className="size-20 !rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </Block>
        <Block tone="paper" pad="md" className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Block>
      </div>
    </Page>
  );
}

function Hub() {
  const s = useDemo();
  const account = me.account(s);
  const business = me.business(s);
  const creator = me.creator(s);
  const isBusiness = account.kind === "business";
  const [setupOpen, setSetupOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const connected = socialsSummary(creator?.socials);

  const destinations: (NavItem & { detail?: string })[] = [
    ...accountNav.filter((item) => item.href !== paths.settings()),
    {
      href: paths.settings("business"),
      label: "Business account",
      icon: <Building2 size={20} aria-hidden />,
      detail: isBusiness ? business.name : "Upgrade",
    },
    ...accountNav.filter((item) => item.href === paths.settings()),
  ];

  return (
    <Page width="narrow">
      <div className="flex flex-col gap-2">
        <Block as="section" tone="paper" pad="lg" aria-labelledby="profile-name" className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <span className="relative flex-none">
              <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name="" size={80} />
              {isBusiness ? (
                <span className="absolute -end-1 -bottom-1 rounded-[12px] ring-[3px] ring-(--b-bg)">
                  <BusinessLogo business={business} size={30} />
                </span>
              ) : null}
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 id="profile-name" className="y-display y-title truncate">
                {creator?.name ?? account.name}
              </h1>
              <p className="y-small y-fg-2 truncate" dir="ltr">
                {creator ? `@${creator.handle}` : account.email}
              </p>
              <Chip className="w-fit">{isBusiness ? "Business account" : "Personal account"}</Chip>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {creator ? (
              <PillButton href={paths.creator(creator.handle)} variant="contrast" icon={<ExternalLink size={16} aria-hidden />}>
                View public profile
              </PillButton>
            ) : null}
            <PillButton
              href={creator ? paths.editProfile() : paths.settings("you")}
              variant={creator ? "outline" : "contrast"}
              icon={<Pencil size={16} aria-hidden />}
            >
              {creator ? "Edit profile" : "Edit your details"}
            </PillButton>
          </div>

          {creator ? (
            <Link
              href={paths.editProfile("accounts")}
              className="y-small flex min-h-11 items-center gap-2 border-t border-(--b-line) pt-4"
            >
              <Link2 size={16} aria-hidden className="flex-none" />
              <span className="min-w-0 flex-1 truncate">
                {connected || <span className="y-fg-2">No accounts connected yet</span>}
              </span>
              <span className="y-fg-2 flex-none">{connected ? "Manage" : "Connect"}</span>
              <ChevronRight size={16} aria-hidden className="y-fg-3 y-flip flex-none" />
            </Link>
          ) : null}
        </Block>

        {creator ? null : (
          <Block as="section" tone="paper" pad="md" className="flex flex-wrap items-center gap-4" aria-labelledby="make-title">
            <span aria-hidden className="grid size-11 flex-none place-items-center rounded-full bg-(--b-chip)">
              <Video size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="make-title" className="y-head">
                Make videos on Yapp too
              </h2>
              <p className="y-small y-fg-2">Pitch on orders and take campaign slots from this account.</p>
            </div>
            <PillButton variant="contrast" size="sm" onClick={() => setSetupOpen(true)}>
              Set up
            </PillButton>
          </Block>
        )}

        <Block as="nav" tone="paper" pad="sm" aria-label="Your account">
          <ul className="flex flex-col">
            {destinations.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-14 items-center gap-3 rounded-full px-3 font-medium hover:bg-(--b-chip)"
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.detail ? <span className="y-small y-fg-2">{item.detail}</span> : null}
                  <ChevronRight size={18} aria-hidden className="y-fg-3 y-flip" />
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => setAccountOpen(true)}
                className="flex min-h-14 w-full items-center gap-3 rounded-full px-3 text-start font-medium hover:bg-(--b-chip)"
              >
                <UserCog size={20} aria-hidden />
                <span className="flex-1">Account</span>
                <span className="y-small y-fg-2">Log out, demo tools</span>
                <ChevronRight size={18} aria-hidden className="y-fg-3 y-flip" />
              </button>
            </li>
          </ul>
        </Block>
      </div>

      <CreatorSetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} />
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
    </Page>
  );
}
