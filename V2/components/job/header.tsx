"use client";

import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Badge } from "@/components/ui/badge";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { lengthLabel, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { commissionById, requestById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import { formatById, languageById } from "@/lib/taxonomy";
import type { Commission, Role } from "@/lib/types";

import { jobStatus, type Job, type NextAction } from "./helpers";

/**
 * Where "back" goes from a job: Jobs for the creator, the campaign for a brand's campaign slot,
 * Orders otherwise. The page's own link (desktop) and the shell's phone header both use it.
 */
export function jobBack(c: Commission, side: Role): { href: string; label: string } {
  if (side === "creator") return { href: paths.studioJobs(), label: "Jobs" };
  if (c.source === "campaign" && c.requestId) return { href: paths.order(c.requestId), label: "Campaign" };
  return { href: paths.orders(), label: "Orders" };
}

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

export function JobHeader({
  job,
  action,
  actionsRef,
}: {
  job: Job;
  action: NextAction | null;
  /** Watched so the sticky strip appears once the header's buttons scroll away. */
  actionsRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { commission: c, side, slot } = job;
  const status = jobStatus(c, side);
  const back = jobBack(c, side);
  // Ad copy has no format, length or platform to show: what to write, and the language.
  const meta = (
    job.adCopy
      ? [
          "Ad copy writing",
          c.brief.copy?.pieces.length ? plural(c.brief.copy.pieces.length, "piece") : null,
          languageById[c.brief.languages[0]]?.name,
        ]
      : [
          slot ? "UGC campaign" : formatById[c.brief.format]?.name,
          `${plural(c.brief.videoCount, "video")} × ${lengthLabel(c.brief.durationSec)}`,
          c.brief.languages.map((id) => languageById[id].name).join(" and "),
          slot ? slot.platformName : null,
        ]
  )
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="flex flex-col gap-4 pb-5 md:pb-6">
      <Link
        href={back.href}
        className="y-backlink y-small y-fg-2 -ms-1 inline-flex w-fit items-center gap-1.5 rounded-full py-1 pe-2 font-medium hover:text-(--y-ink)"
      >
        <ArrowLeft size={16} aria-hidden className="y-flip" />
        {back.label}
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <PartyLine job={job} />
          <h1 className="y-display y-t-display max-w-[30ch] text-balance">{c.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Badge tone={status.tone} icon={status.icon}>
              {status.label}
            </Badge>
            <span className="y-small y-fg-2">{meta}</span>
          </div>
        </div>
        <div ref={actionsRef} className="hidden flex-none items-center gap-2 lg:flex">
          <ActionButtons action={action} where="header" />
        </div>
      </div>

      <Stepper commission={c} />
    </header>
  );
}

/** "(face) Layla Mansour · Repeat of “…”": who it's with and where it came from. */
function PartyLine({ job }: { job: Job }) {
  const s = useDemo();
  const { commission: c, side, creator, business, slot } = job;
  const request = c.requestId ? requestById(s, c.requestId) : undefined;
  const previous = c.previousCommissionId ? commissionById(s, c.previousCommissionId) : undefined;
  const previousIsMine = previous && (side === "business" ? previous.businessId === c.businessId : previous.creatorId === c.creatorId);

  const source = slot ? (
    c.requestId ? (
      <Link href={paths.order(c.requestId)} className="y-link">
        Slot {c.campaignSlot ?? ""}
        <span className="max-sm:hidden"> of {request ? `“${request.title}”` : "the campaign"}</span>
      </Link>
    ) : (
      `Slot ${c.campaignSlot ?? ""}`
    )
  ) : previous && previousIsMine ? (
    <Link href={paths.job(previous.id)} className="y-link">
      Repeat<span className="max-sm:hidden"> of “{previous.title}”</span>
    </Link>
  ) : c.source === "request" && c.requestId ? (
    <Link href={paths.order(c.requestId)} className="y-link">
      {side === "business" ? "From your custom order" : "Hired from a custom order"}
    </Link>
  ) : c.source === "repeat" ? (
    "Repeat order"
  ) : (
    "Direct order"
  );

  return (
    <div className="flex items-center gap-2.5">
      {side === "business" && creator ? <FaceAvatar id={creator.id} name="" size={28} /> : null}
      {side === "creator" && business ? <BusinessLogo business={business} size={28} /> : null}
      <p className="y-small y-fg-2 min-w-0 truncate">
        {side === "business" && creator ? (
          <Link href={paths.creator(creator.handle)} className="font-medium text-(--y-ink) hover:underline">
            {creator.name}
          </Link>
        ) : (
          <span className="font-medium text-(--y-ink)">{job.businessName}</span>
        )}
        {" · "}
        {source}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stepper                                                                     */
/* -------------------------------------------------------------------------- */

const customSteps = ["Agreed", "Making", "Review", "Approved and paid"];
const slotSteps = ["Slot taken", "Review copy", "Approved", "Posted", "Paid"];

/** Index of the current step; `labels.length` when everything is done; null for ended jobs. */
function progress(c: Commission): { labels: string[]; current: number } | null {
  if (c.source === "campaign") {
    switch (c.status) {
      case "in_progress":
      case "revision":
        return { labels: slotSteps, current: 1 };
      case "delivered":
      case "disputed":
        return { labels: slotSteps, current: 2 };
      case "completed":
        if (c.payment.status === "released") return { labels: slotSteps, current: 5 };
        return { labels: slotSteps, current: c.post?.status === "live" ? 4 : 3 };
      default:
        return null;
    }
  }
  switch (c.status) {
    case "offered":
      return { labels: customSteps, current: 0 };
    case "in_progress":
    case "revision":
      return { labels: customSteps, current: 1 };
    case "delivered":
    case "disputed":
      return { labels: customSteps, current: 2 };
    case "completed":
      return { labels: customSteps, current: 4 };
    default:
      return null;
  }
}

export function Stepper({ commission }: { commission: Commission }) {
  const p = progress(commission);
  if (!p) return null;
  return (
    <ol className="flex max-w-[720px] gap-1.5" aria-label="Progress">
      {p.labels.map((label, index) => {
        const done = index < p.current;
        const current = index === p.current;
        return (
          <li key={label} className="flex min-w-0 flex-1 flex-col gap-1.5" aria-current={current ? "step" : undefined}>
            <span
              aria-hidden
              className={`h-1 rounded-full ${done ? "bg-(--y-ink)" : current ? "bg-(--y-ink) opacity-40" : "bg-(--y-line-strong)"}`}
            />
            <span
              className={`y-micro inline-flex items-center gap-1 leading-tight ${current ? "font-medium text-(--y-ink)" : "y-fg-2"}`}
            >
              {done ? <Check size={12} strokeWidth={3} aria-hidden className="flex-none max-sm:hidden" /> : null}
              <span className={current ? "" : "max-sm:sr-only"}>{label}</span>
              <span className="sr-only">{done ? " (done)" : current ? " (now)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/* The next step's buttons: header, sticky strip, phone bar                    */
/* -------------------------------------------------------------------------- */

export function ActionButtons({ action, where }: { action: NextAction | null; where: "header" | "strip" | "bar" }) {
  if (!action) return null;
  const bar = where === "bar";
  // Forms in the stage panel show their own button on desktop; the phone bar submits them.
  if (action.form && !bar) return null;
  const size = bar ? "md" : where === "strip" ? "sm" : "md";
  // The phone bar uses the short labels so two buttons fit at 375px; the full label stays the name.
  const words = (full: string, short?: string) =>
    bar && short && short !== full ? { text: short, aria: full } : { text: full, aria: undefined };
  const second = action.secondary;
  const secondWords = second ? words(second.label, second.short) : null;
  const secondary =
    second && secondWords ? (
      second.href ? (
        <PillButton href={second.href} variant="outline" size={size} aria-label={secondWords.aria}>
          {secondWords.text}
        </PillButton>
      ) : (
        <PillButton variant="outline" size={size} onClick={second.run} aria-label={secondWords.aria}>
          {secondWords.text}
        </PillButton>
      )
    ) : null;
  const main = words(action.label, action.short);
  const primary = action.form ? (
    <PillButton
      type="submit"
      form={action.form}
      variant={action.variant}
      size={size}
      icon={action.icon}
      className={bar ? "flex-1" : ""}
      aria-label={main.aria}
    >
      {main.text}
    </PillButton>
  ) : action.href ? (
    <PillButton
      href={action.href}
      variant={action.variant}
      size={size}
      icon={action.icon}
      arrow={action.arrow && !bar}
      className={bar ? "flex-1" : ""}
      aria-label={main.aria}
    >
      {main.text}
    </PillButton>
  ) : (
    <PillButton
      variant={action.variant}
      size={size}
      icon={action.icon}
      arrow={action.arrow && !bar}
      onClick={action.run}
      className={bar && !action.waiting ? "flex-1" : ""}
      aria-label={bar && action.waiting ? action.label : main.aria}
    >
      {bar && action.waiting ? "Message" : main.text}
    </PillButton>
  );
  return (
    <>
      {secondary}
      {primary}
    </>
  );
}

/** Desktop: a slim glass strip under the site header once the header's buttons scroll away. */
export function StickyStrip({
  job,
  action,
  watch,
}: {
  job: Job;
  action: NextAction | null;
  watch: React.RefObject<HTMLDivElement | null>;
}) {
  const [away, setAway] = useState(false);
  useEffect(() => {
    const el = watch.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setAway(!entry.isIntersecting && entry.boundingClientRect.top < 80),
      { rootMargin: "-60px 0px 0px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [watch]);
  if (!away || !action || action.form) return null;
  const status = jobStatus(job.commission, job.side);
  return (
    <div className="job-strip fixed inset-x-0 z-30 max-lg:hidden" role="region" aria-label="Next step">
      <div className="mx-auto flex h-14 max-w-[calc(1200px+var(--y-gutter)*2)] items-center gap-3 px-(--y-gutter)">
        <span className="y-small min-w-0 flex-1 truncate font-medium">{job.commission.title}</span>
        <Badge tone={status.tone} icon={status.icon}>
          {status.label}
        </Badge>
        <ActionButtons action={action} where="strip" />
      </div>
    </div>
  );
}

/** Phones: the next step in a glass bar at the bottom edge (the job page has no tab bar). */
export function PhoneBar({ action }: { action: NextAction | null }) {
  if (!action) return null;
  return (
    <div className="job-bar fixed inset-x-3 z-40 lg:hidden">
      <div className="y-bar mx-auto flex max-w-md items-center gap-2 rounded-full p-1.5">
        {action.waiting ? <span className="y-small min-w-0 flex-1 truncate ps-3 font-medium">{action.waiting}</span> : null}
        <ActionButtons action={action} where="bar" />
      </div>
    </div>
  );
}
