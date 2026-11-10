"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { ActionPill, PickNowButton } from "@/components/ui/action-pill";
import { PillButton } from "@/components/ui/pill-button";
import { SlotBar } from "@/components/ui/progress";
import { Tag, TierTag, TypeTag } from "@/components/ui/tags";
import { money, moneyRange, plural, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import type { WorkItem } from "@/lib/selectors";
import { formatById, jobTypeById, nicheById, platformById, tierById } from "@/lib/taxonomy";

import { useTakeWork } from "./take-work";

/** "TikTok + Reels", "TikTok + 2 more": one tag for a job's platforms. */
export function platformsLabel(ids: WorkItem["platforms"]) {
  if (!ids.length) return "";
  const names = ids.map((id) => platformById[id].name);
  return names.length > 2 ? `${names[0]} + ${names.length - 1} more` : names.join(" + ");
}

/** "4 taken · Closes Fri, Nov 13" / "7 pitches so far · Pitch by Wed, Nov 18". */
export function jobLine(item: WorkItem) {
  if (item.kind === "campaign" && item.slots) return `${item.slots.taken} taken · Closes ${weekdayDate(item.closesAt)}`;
  return `${plural(item.pitches, "pitch", "pitches")} so far · Pitch by ${weekdayDate(item.closesAt)}`;
}

/** The price as a figure and its unit: "$140" + "per Yapp", "$200–350" + "budget". */
export function payParts(item: WorkItem) {
  return item.pay.unit === "per-yapp"
    ? { figure: money(item.pay.amount), unit: "per Yapp" }
    : { figure: moneyRange(item.pay.min, item.pay.max), unit: "budget" };
}

/**
 * What a viewer can do with a job, one control wherever it shows (card, list row, the job page's
 * price card, the phone bar). Campaigns: the green Pick now with the slots left, or why not.
 * Custom orders: the dark Pitch now, or "Pitch sent". No creator profile: "Create a creator
 * profile to take work", which opens the creator setup.
 */
export function JobAction({
  item,
  place,
  onOpen,
}: {
  item: WorkItem;
  /** card: Find work cards · row: the list view · cta: the job page · bar: the phone bar. */
  place: "card" | "row" | "cta" | "bar";
  /** Opening the job page from here (remembers Find work for the back pill). */
  onOpen?: () => void;
}) {
  const take = useTakeWork();
  const big = place === "cta" || place === "bar";
  const size = big ? "lg" : "md";
  const { action } = item;
  const stop = (event: React.MouseEvent) => event.stopPropagation();

  if (action.reason === "no_profile") {
    const label = "Create a creator profile to take work";
    if (place === "row") {
      return (
        <PillButton variant="soft" size="sm" aria-label={label} onClick={() => take.setUp()} className="y-row-act">
          Set up a profile
        </PillButton>
      );
    }
    return (
      <ActionPill
        tone="dark"
        size={size}
        className="y-job-setup"
        onClick={(event) => {
          stop(event);
          take.setUp(item.kind === "custom" ? { pitch: item.request } : undefined);
        }}
      >
        {label}
      </ActionPill>
    );
  }

  if (item.kind === "campaign" && item.slots) {
    const { left, total } = item.slots;
    if (action.can) {
      if (place === "row") {
        return (
          <PillButton
            variant="neon"
            size="sm"
            className="y-row-act"
            aria-label={`Pick now, ${left} of ${total} remaining`}
            onClick={() => take.pick(item.request)}
          >
            Pick now · {left} left
          </PillButton>
        );
      }
      return (
        <PickNowButton
          left={left}
          total={total}
          count={place === "card" ? "of" : place === "bar" ? "of" : "left"}
          size={size}
          onClick={(event) => {
            stop(event);
            take.pick(item.request);
          }}
        />
      );
    }
    if (action.reason === "joined" && item.mySlot) {
      return place === "row" ? (
        <PillButton href={paths.commission(item.mySlot.id)} variant="soft" size="sm" className="y-row-act">
          Your slot
        </PillButton>
      ) : (
        <ActionPill tone="dark" size={size} href={paths.commission(item.mySlot.id)}>
          You picked a slot · open it
        </ActionPill>
      );
    }
    if (action.reason === "full") {
      return place === "row" ? (
        <span className="y-row-act y-small y-fg-2 font-medium">All slots taken</span>
      ) : (
        <PickNowButton left={0} total={total} size={size} />
      );
    }
    if (action.reason === "no_account") {
      return place === "row" ? (
        <PillButton href={paths.editProfile("accounts")} variant="soft" size="sm" className="y-row-act">
          Connect to pick
        </PillButton>
      ) : (
        <ActionPill tone="dark" size={size} href={paths.editProfile("accounts")}>
          {action.label}
        </ActionPill>
      );
    }
    if (action.reason === "below" || action.reason === "above") {
      return place === "row" ? (
        <span className="y-row-act y-small y-fg-2 font-medium">Not in your tier</span>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <ActionPill size={size} arrow={false} disabled>
            Not in your follower tier
          </ActionPill>
          <button
            type="button"
            className="y-link-btn y-hit relative z-[3]"
            onClick={(event) => {
              stop(event);
              take.tiers(item.request);
            }}
          >
            How tiers work
          </button>
        </div>
      );
    }
    return place === "row" ? (
      <span className="y-row-act y-small y-fg-2 font-medium">{action.label}</span>
    ) : (
      <ActionPill size={size} arrow={false} disabled>
        {action.label}
      </ActionPill>
    );
  }

  // Custom orders
  if (action.can) {
    if (place === "cta" || place === "bar") {
      return (
        <ActionPill tone="dark" size={size} count={place === "cta" ? "2 min" : undefined} onClick={() => take.pitch(item.request)}>
          Pitch now
        </ActionPill>
      );
    }
    return (
      <PillButton
        variant="contrast"
        size="sm"
        className="y-row-act relative z-[3]"
        onClick={(event) => {
          stop(event);
          take.pitch(item.request);
        }}
      >
        Pitch now
      </PillButton>
    );
  }
  if (action.reason === "pitched") {
    if (place === "cta" || place === "bar") {
      return (
        <ActionPill tone="dark" size={size} href="#your-pitch" arrow>
          Pitch sent · see it
        </ActionPill>
      );
    }
    return (
      <PillButton href={paths.order(item.id)} onClick={onOpen} variant="soft" size="sm" className="y-row-act relative z-[3]">
        Pitch sent
      </PillButton>
    );
  }
  return place === "cta" || place === "bar" ? (
    <ActionPill size={size} arrow={false} disabled>
      {action.label}
    </ActionPill>
  ) : (
    <span className="y-row-act y-small y-fg-2 font-medium">{action.label}</span>
  );
}

/** The tags under a job's title: type, tier, then format and platforms (or the ad-copy job type). */
export function JobTags({ item, className = "" }: { item: WorkItem; className?: string }) {
  const platforms = platformsLabel(item.platforms);
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      <TypeTag kind={item.kind === "campaign" ? "campaign" : "order"} />
      {item.kind === "campaign" && item.tierId ? <TierTag tier={tierById[item.tierId].label} /> : null}
      {item.jobType === "ad-copy" ? (
        <Tag tone="dark">{jobTypeById["ad-copy"].name}</Tag>
      ) : (
        <>
          {item.format ? <Tag>{formatById[item.format].name}</Tag> : null}
          {platforms ? <Tag>{platforms}</Tag> : null}
        </>
      )}
    </div>
  );
}

/**
 * One open job on Find work (Work spec 6.5.9): brand, title, tags, the slot bar or the pitches so
 * far, the price with the creator's net, and the action. The whole card opens the job page; the
 * action buttons do their own thing.
 */
export function JobCard({ item, onOpen }: { item: WorkItem; onOpen: () => void }) {
  const pay = payParts(item);
  return (
    <article data-tone="paper" className="y-block y-hoverable y-job">
      <span className="y-job-peek" aria-hidden>
        Details <ArrowRight size={14} strokeWidth={2.25} className="y-flip" />
      </span>
      <div className="y-job-top">
        <BusinessLogo business={item.business} size={40} />
        <span className="min-w-0">
          <b className="block truncate font-semibold">{item.brandName}</b>
          <span className="y-job-cat">{nicheById[item.category].name}</span>
        </span>
        {item.invited ? (
          <Tag className="y-job-new ms-auto">Invited</Tag>
        ) : item.isNew ? (
          <Tag className="y-job-new ms-auto">New</Tag>
        ) : null}
      </div>
      <h3 className="y-display y-job-t">
        <Link href={paths.order(item.id)} onClick={onOpen} className="y-job-link">
          {item.title}
        </Link>
      </h3>
      <JobTags item={item} />
      {item.kind === "campaign" && item.slots ? <SlotBar total={item.slots.total} taken={item.slots.taken} /> : null}
      <p className="y-job-sub y-num">{jobLine(item)}</p>
      <div className="y-job-bot">
        <span className="min-w-0">
          <span className="y-fig-m y-num block">
            <span className="whitespace-nowrap">{pay.figure}</span>
            <span className="y-fig-unit">{pay.unit}</span>
          </span>
          <span className="y-job-net y-num">{item.pay.netLabel}</span>
        </span>
        {item.kind === "custom" && item.action.reason !== "no_profile" ? (
          <JobAction item={item} place="card" onOpen={onOpen} />
        ) : null}
      </div>
      {item.kind === "campaign" || item.action.reason === "no_profile" ? (
        <div className="relative z-[3]">
          <JobAction item={item} place="card" onOpen={onOpen} />
        </div>
      ) : null}
    </article>
  );
}

/** One job as a row of the list view (Work spec 6.5.7). */
export function JobRow({ item, onOpen }: { item: WorkItem; onOpen: () => void }) {
  const pay = payParts(item);
  const meta = [item.brandName, nicheById[item.category].name, platformsLabel(item.platforms)].filter(Boolean).join(" · ");
  return (
    <div className="y-lrow" role="row">
      <div className="y-lrow-t" role="cell">
        <BusinessLogo business={item.business} size={36} />
        <span className="min-w-0">
          <Link href={paths.order(item.id)} onClick={onOpen} className="y-lrow-link">
            {item.title}
          </Link>
          <small>{meta}</small>
        </span>
      </div>
      <span className="y-lrow-type" role="cell">
        <Tag tone="green">{item.kind === "campaign" ? "Yapp" : "Order"}</Tag>
      </span>
      <span className="y-lrow-fmt y-small y-fg-2" role="cell">
        {item.jobType === "ad-copy" ? jobTypeById["ad-copy"].name : item.format ? formatById[item.format].name : ""}
      </span>
      <span className="y-lrow-pay y-num" role="cell">
        {pay.figure}
        {item.pay.unit === "per-yapp" ? <small>/Yapp</small> : null}
        <span className="y-lrow-net">{item.pay.netLabel}</span>
      </span>
      <span className="y-lrow-open" role="cell">
        {item.kind === "campaign" && item.slots ? (
          <>
            <SlotBar total={item.slots.total} taken={item.slots.taken} size="sm" />
            <span className="y-lrow-n y-num">
              {item.slots.left} of {item.slots.total} left
            </span>
          </>
        ) : (
          <span className="y-small y-fg-2 y-num">{plural(item.pitches, "pitch", "pitches")}</span>
        )}
        <span className="y-lrow-n y-lrow-due">
          {item.kind === "campaign" ? "Closes" : "Pitch by"} {weekdayDate(item.closesAt)}
        </span>
      </span>
      <span className="y-lrow-act" role="cell">
        <JobAction item={item} place="row" onOpen={onOpen} />
      </span>
    </div>
  );
}
