"use client";

import { CalendarClock, CircleCheck, Clock, Eye, PencilLine, Repeat2 } from "lucide-react";

import { CreatorCard } from "@/components/domain/creator-card";
import { ProtectedNote } from "@/components/domain/money";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { SectionLabel } from "@/components/ui/page";
import { money, plural, shortDate } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import {
  creatorByHandle,
  pastCollaborators,
  productById,
  similarCreators,
  startingPrice,
} from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { ME, useDemo, useHydrated } from "@/lib/store";
import type { Creator } from "@/lib/types";

import { PackagesBlock } from "./packages";
import { FeaturedWork, PortfolioGrid } from "./portfolio";
import { AboutBlock, ProfileHero, TrustStats } from "./profile-sections";
import { availabilityLabel, cheapestPackage, responseLabel } from "./profile-utils";
import { ReviewsBlock } from "./reviews";
import { ProfileSkeleton } from "./skeletons";

export function normalizeHandle(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  try {
    return decodeURIComponent(value).replace(/^@/, "").toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

export function CreatorNotFound({ handle }: { handle: string }) {
  return (
    <Block tone="paper" pad="md" className="mx-auto w-full max-w-2xl">
      <EmptyState
        headingLevel={2}
        title={`We couldn't find @${handle || "that creator"}`}
        body="The link may be mistyped, or the creator may have changed their handle. Browse everyone who's taking work right now."
        shape="tower"
        tint="sun"
        face="calm"
        action={
          <PillButton href="/creators" variant="contrast" arrow>
            Browse creators
          </PillButton>
        }
      />
    </Block>
  );
}

/** What a business carries into "commission again" with this creator, if they've worked together. */
function repeatInfo(s: DemoState, creator: Creator, isBusiness: boolean) {
  if (!isBusiness) return null;
  const entry = pastCollaborators(s).find((e) => e.creator.id === creator.id);
  if (!entry) return null;
  const product = productById(s, entry.last.brief.productId);
  return {
    count: entry.count,
    last: entry.last,
    product,
    learnings: product?.learnings.length ?? 0,
    href: `/creators/${creator.handle}/commission?repeat=${entry.last.id}`,
  };
}

function RepeatBlock({ creator, repeat }: { creator: Creator; repeat: NonNullable<ReturnType<typeof repeatInfo>> }) {
  return (
    <Block tone="lavender" pad="md" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
          <Repeat2 size={20} aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="y-head">You&apos;ve worked with {creator.firstName} before</h2>
          <p className="y-small y-fg-2">
            {plural(repeat.count, "completed commission")} · last one &ldquo;{repeat.last.title}&rdquo;
            {repeat.last.completedAt ? `, ${shortDate(repeat.last.completedAt)}` : ""}.
          </p>
        </div>
      </div>
      <p className="y-small">
        Commission again and your brief
        {repeat.product ? `, ${repeat.product.name} context` : ""}
        {repeat.learnings ? ` and ${plural(repeat.learnings, "learning")}` : ""} carry forward. Review,
        tweak, send.
      </p>
      <PillButton href={repeat.href} variant="contrast" arrow className="w-full sm:w-fit lg:w-full">
        Commission again
      </PillButton>
    </Block>
  );
}

export function CreatorProfile({ handle }: { handle: string }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const { role } = usePrefs();
  const creator = creatorByHandle(s, handle);

  if (!creator) return hydrated ? <CreatorNotFound handle={handle} /> : <ProfileSkeleton />;

  const isOwn = role === "creator" && creator.id === ME.creatorId;
  const isBusiness = role === "business";
  const from = startingPrice(creator);
  const cheapest = cheapestPackage(creator);
  const commissionHref = `/creators/${creator.handle}/commission`;
  const repeat = repeatInfo(s, creator, isBusiness);
  const similar = similarCreators(s, creator, 4);

  const availability = (
    <p className="y-small flex items-center gap-2">
      {creator.available ? (
        <CircleCheck size={17} aria-hidden className="flex-none text-(--y-success)" />
      ) : (
        <CalendarClock size={17} aria-hidden className="flex-none" />
      )}
      <span>
        {availabilityLabel(creator)}
        {!creator.available ? (
          <span className="y-fg-2"> · you can still send an offer for later</span>
        ) : null}
      </span>
    </p>
  );

  return (
    <div className="flex flex-col">
      {isOwn ? (
        <Block tone="sky" pad="sm" className="mb-2 flex items-start gap-3 !px-5">
          <Eye size={20} aria-hidden className="mt-0.5 flex-none" />
          <p className="y-small">
            <span className="font-semibold">This is how businesses see your profile.</span>{" "}
            <span className="y-fg-2">
              Changes you make to your portfolio, packages or availability show up here straight away.
            </span>
          </p>
        </Block>
      ) : null}

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="flex flex-col gap-2 lg:col-span-8">
          <ProfileHero creator={creator} canMessage={isBusiness} />
          <TrustStats creator={creator} />
          {repeat ? (
            <div className="lg:hidden">
              <RepeatBlock creator={creator} repeat={repeat} />
            </div>
          ) : null}
          <FeaturedWork s={s} creator={creator} />
          <PortfolioGrid s={s} creator={creator} />
          <PackagesBlock creator={creator} showCta={!isOwn} />
          <AboutBlock s={s} creator={creator} />
          <ReviewsBlock s={s} creator={creator} />
        </div>

        <aside className="hidden lg:col-span-4 lg:block" aria-label={isOwn ? "Your profile" : `Commission ${creator.firstName}`}>
          <div className="sticky top-24 flex flex-col gap-2">
            <Block tone="paper" pad="md" className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="y-small y-fg-2">From</span>
                <span className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
                  {money(from)}
                </span>
                {cheapest ? (
                  <span className="y-small y-fg-2">
                    {cheapest.name} · {cheapest.deliveryDays}-day delivery ·{" "}
                    {plural(cheapest.revisions, "revision")}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 border-t border-(--b-line) pt-4">
                {availability}
                <p className="y-small flex items-center gap-2">
                  <Clock size={17} aria-hidden className="flex-none" />
                  Usually replies {responseLabel(creator.responseHours)}
                </p>
              </div>
              {isOwn ? (
                <PillButton
                  href="/creator/profile"
                  variant="neon"
                  size="lg"
                  arrow
                  icon={<PencilLine size={18} aria-hidden />}
                  className="w-full"
                >
                  Edit profile
                </PillButton>
              ) : (
                <PillButton href={commissionHref} variant="neon" size="lg" arrow className="w-full">
                  Commission {creator.firstName}
                </PillButton>
              )}
              {isOwn ? null : (
                <p className="y-micro y-fg-2 -mt-2 text-center">
                  You&apos;re only charged if {creator.firstName} accepts
                </p>
              )}
            </Block>
            {isOwn ? null : <ProtectedNote />}
            {repeat ? <RepeatBlock creator={creator} repeat={repeat} /> : null}
          </div>
        </aside>
      </div>

      {similar.length ? (
        <section aria-labelledby="similar-heading">
          <SectionLabel id="similar-heading" action={<PillButton href="/creators" variant="ghost" size="sm">See all</PillButton>}>
            Similar creators
          </SectionLabel>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((other) => (
              <CreatorCard key={other.id} creator={other} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Mobile sticky action bar, within thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:hidden">
        <div className="y-bar mx-auto flex max-w-md items-center gap-3 rounded-full p-2 ps-6">
          {isOwn ? (
            <>
              <span className="y-small min-w-0 flex-1 truncate font-medium opacity-80">Your public profile</span>
              <PillButton href="/creator/profile" variant="neon" arrow>
                Edit profile
              </PillButton>
            </>
          ) : (
            <>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="y-micro opacity-70">
                  From · {cheapest ? `${cheapest.deliveryDays}-day delivery` : ""}
                </span>
                <span className="y-display y-num text-[22px] font-semibold tracking-[-0.02em]">
                  {money(from)}
                </span>
              </span>
              <PillButton href={commissionHref} variant="neon" arrow>
                Commission {creator.firstName}
              </PillButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
