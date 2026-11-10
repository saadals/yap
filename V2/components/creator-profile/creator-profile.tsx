"use client";

import { ArrowLeft, Eye, PencilLine } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { BrowseShell, useBottomBarOffset } from "@/components/discover/browse-shell";
import { CreatorTile } from "@/components/discover/creator-tile";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { money } from "@/lib/format";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { creatorByHandle, me, similarCreators } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import type { Creator, Package } from "@/lib/types";

import "@/app/styles/discover.css";

import { AboutBlock } from "./about";
import { BookingCard, orderHref } from "./booking";
import { ProfileHeader } from "./profile-header";
import { ReviewsBlock } from "./reviews";
import { normalizeHandle, packagesInOrder, repeatHref, tierName } from "./utils";
import { VideosBlock } from "./videos";

/** /creators/[handle]: anyone's public profile. Your own profile opens in Studio. */
export function CreatorProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = normalizeHandle(params?.handle);
  const s = useDemo();
  const hydrated = useHydrated();
  const { account } = usePrefs();
  const creator = creatorByHandle(s, handle);
  const own = Boolean(account && creator && me.creator(s)?.id === creator.id);

  return (
    <BrowseShell mode={own ? "studio" : undefined}>
      <Page>
        {creator ? (
          // A different account (or creator) starts fresh: its own package selection.
          <CreatorProfile key={`${s.activeAccountId}:${creator.id}`} creator={creator} own={own} />
        ) : hydrated ? (
          <CreatorNotFound handle={handle} />
        ) : (
          <ProfileSkeleton />
        )}
      </Page>
    </BrowseShell>
  );
}

function CreatorProfile({ creator, own }: { creator: Creator; own: boolean }) {
  const s = useDemo();
  const { account } = usePrefs();
  const signedIn = Boolean(account);
  const barOffset = useBottomBarOffset();
  const packages = packagesInOrder(creator);
  // Starts on the cheapest package ("From $140"); Standard is marked as the most popular.
  const [selectedId, setSelectedId] = useState(packages[0]?.id ?? "");
  const selected: Package | undefined = creator.packages.find((p) => p.id === selectedId) ?? packages[0];
  const repeat = signedIn && !own ? repeatHref(s, creator) : null;
  // Never suggest the viewer's own profile.
  const ownId = signedIn ? me.ids(s).creatorId : undefined;
  const similar = similarCreators(s, creator, 5)
    .filter((c) => c.id !== ownId)
    .slice(0, 4);

  const booking = (placement: "rail" | "inline") => (
    <BookingCard
      id={placement === "rail" ? "book" : "book-inline"}
      creator={creator}
      selected={selected}
      onSelect={setSelectedId}
      own={own}
      signedIn={signedIn}
      repeat={repeat}
      hideOrderOnPhones={placement === "inline"}
    />
  );

  return (
    <div className="flex flex-col">
      {own ? null : (
        <Link
          href={paths.discover()}
          className="y-small y-fg-2 -ms-1 mb-2 inline-flex min-h-9 w-fit items-center gap-1.5 rounded-full pe-2 font-medium hover:text-(--y-ink)"
        >
          <ArrowLeft size={16} aria-hidden className="y-flip" />
          Find creators
        </Link>
      )}
      {own ? (
        <Block tone="paper" pad="sm" className="mb-3 flex flex-col gap-3 !px-5 sm:flex-row sm:items-center">
          <Eye size={20} aria-hidden className="flex-none max-sm:hidden" />
          <p className="y-small min-w-0 flex-1">
            <span className="font-medium">This is your public profile.</span>{" "}
            <span className="y-fg-2">It&apos;s what brands see. Changes to your videos, packages or availability show here straight away.</span>
          </p>
          <PillButton
            href={paths.studioProfile()}
            variant="neon"
            size="sm"
            icon={<PencilLine size={15} aria-hidden />}
            className="max-lg:hidden"
          >
            Edit profile
          </PillButton>
        </Block>
      ) : null}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4 [&>*]:min-w-0">
        <div className="flex flex-col gap-3 lg:col-span-8 lg:gap-4">
          <ProfileHeader creator={creator} own={own} />
          <VideosBlock s={s} creator={creator} />
          <div className="lg:hidden">{booking("inline")}</div>
          <AboutBlock creator={creator} />
          <ReviewsBlock s={s} creator={creator} own={own} />
        </div>
        <aside className="hidden lg:col-span-4 lg:block" aria-label={own ? "Your packages" : `Order from ${creator.firstName}`}>
          <div className="y-rail">{booking("rail")}</div>
        </aside>
      </div>

      {similar.length ? (
        <section aria-labelledby="similar-heading">
          <SectionLabel
            id="similar-heading"
            action={
              <PillButton href={paths.discover()} variant="ghost" size="sm">
                See all
              </PillButton>
            }
          >
            Similar creators
          </SectionLabel>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {similar.map((other) => (
              <CreatorTile key={other.id} creator={other} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Phones: the next step stays in reach, above the tab bar. */}
      <div aria-hidden className="h-24 lg:hidden" />
      <div className={`fixed inset-x-0 z-40 px-3 lg:hidden ${barOffset}`}>
        <div className="y-bar mx-auto flex max-w-md items-center gap-3 rounded-full p-1.5 ps-5">
          {own ? (
            <>
              <span className="y-small min-w-0 flex-1 truncate font-medium">Your public profile</span>
              <PillButton href={paths.studioProfile()} variant="neon" arrow>
                Edit profile
              </PillButton>
            </>
          ) : selected ? (
            <>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="y-micro y-fg-2 truncate">
                  {packages.length > 1 ? `${tierName[selected.tier]} · ` : ""}
                  {selected.deliveryDays}-day delivery
                </span>
                <span className="flex items-baseline gap-1 whitespace-nowrap">
                  {selected.id === packages[0]?.id && packages.length > 1 ? (
                    <span className="y-micro y-fg-2">From</span>
                  ) : null}
                  <span className="y-display y-num text-[20px]">{money(selected.price)}</span>
                </span>
              </span>
              <PillButton href={orderHref(creator, selected, signedIn)} variant="neon" arrow>
                Order from {creator.firstName}
              </PillButton>
            </>
          ) : (
            <span className="y-small y-fg-2 px-1 py-2.5">{creator.firstName} hasn&apos;t set up packages yet</span>
          )}
        </div>
      </div>
    </div>
  );
}

function CreatorNotFound({ handle }: { handle: string }) {
  return (
    <Block tone="paper" pad="md" className="mx-auto mt-4 w-full max-w-2xl">
      <h1 className="sr-only">Creator not found</h1>
      <EmptyState
        title={`We couldn't find @${handle || "that creator"}`}
        body="The link may be mistyped, or the creator may have changed their handle. Everyone taking work right now is on Discover."
        shape="tower"
        tint="sun"
        face="calm"
        action={
          <PillButton href={paths.discover()} variant="contrast" arrow>
            Find creators
          </PillButton>
        }
      />
    </Block>
  );
}

function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12" aria-busy="true" aria-label="Loading profile">
      <div className="flex flex-col gap-4 lg:col-span-8">
        <div data-tone="paper" className="y-block y-pad-md flex gap-5" aria-hidden>
          <Skeleton className="size-20 flex-none !rounded-full md:size-26" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-5 w-28 !rounded-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div data-tone="paper" className="y-block y-pad-md grid gap-5 md:grid-cols-[260px_1fr]" aria-hidden>
          <Skeleton className="aspect-[9/16] w-full !rounded-(--y-r-tile)" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      <div className="hidden lg:col-span-4 lg:block" aria-hidden>
        <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-4">
          <Skeleton className="h-9 w-full !rounded-full" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-12 w-full !rounded-full" />
        </div>
      </div>
    </div>
  );
}
