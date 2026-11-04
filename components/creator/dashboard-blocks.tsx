"use client";

import { ArrowRight, Eye, MailOpen, MessageSquareReply, Repeat2, Send, Star, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { StarRow } from "@/components/domain/stars";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { MiniBars } from "@/components/ui/charts";
import { TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { money, moneyRange, plural, shortDate, timeAgo } from "@/lib/format";
import type { Fit } from "@/lib/selectors";
import { businessById, isActive } from "@/lib/selectors";
import { ME, actions, type DemoState, useDemo } from "@/lib/store";
import { formatById } from "@/lib/taxonomy";
import type { Business, ContentRequest, Pitch, Review } from "@/lib/types";

import { pitchFunnel } from "./pitch-helpers";

/* -------------------------------------------------------------------------- */
/* Next step (the screen's one neon element)                                   */
/* -------------------------------------------------------------------------- */

export type NextStep = {
  eyebrow: string;
  title: string;
  detail: string;
  chip?: string;
  cta: string;
  href: string;
};

export function NextStepBlock({ step, className = "" }: { step: NextStep; className?: string }) {
  return (
    <Block tone="neon" pad="lg" className={`group flex flex-col justify-between gap-6 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="y-micro flex items-center gap-2 font-semibold">
          <span aria-hidden className="size-2 rounded-full bg-(--y-on-color)" />
          {step.eyebrow}
        </span>
        {step.chip ? <span className="y-chip">{step.chip}</span> : null}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="y-display y-title">
          <Link
            href={step.href}
            className="after:absolute after:inset-0 after:rounded-(--y-r-block) after:content-['']"
          >
            {step.title}
          </Link>
        </h2>
        <p className="y-small y-fg-2">{step.detail}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="y-small font-semibold">{step.cta}</span>
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-(--y-on-color) text-(--y-neon) transition-transform duration-(--y-dur-2) group-hover:scale-105"
        >
          <ArrowRight size={24} className="y-flip" />
        </span>
      </div>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Money (butter)                                                              */
/* -------------------------------------------------------------------------- */

export function MoneyBlock({
  available,
  held,
  thisMonth,
  monthly,
  monthLabels,
  className = "",
}: {
  available: number;
  held: number;
  thisMonth: number;
  monthly: number[];
  monthLabels: string[];
  className?: string;
}) {
  return (
    <Block tone="butter" pad="md" className={`flex flex-col gap-6 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="y-micro y-fg-2">Available to withdraw</h2>
          <p className="y-display y-num mt-1 text-[56px] leading-[0.95] font-semibold tracking-[-0.05em] md:text-[64px]">
            {money(available)}
          </p>
        </div>
        <PillButton href="/creator/earnings" size="sm" variant="contrast">
          Earnings
        </PillButton>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div className="y-tile flex flex-col gap-1 p-3">
          <dt className="y-micro y-fg-2">Held in protection</dt>
          <dd className="y-head y-num">{money(held)}</dd>
          <dd className="y-micro y-fg-2">Released when clients approve</dd>
        </div>
        <div className="y-tile flex flex-col gap-1 p-3">
          <dt className="y-micro y-fg-2">Earned this month</dt>
          <dd className="y-head y-num">{money(thisMonth)}</dd>
          <dd className="y-micro y-fg-2">You keep 100%</dd>
        </div>
      </dl>
      <div>
        <MiniBars values={monthly} labels={monthLabels} className="!h-24" />
        <p className="sr-only">
          Earnings by month:{" "}
          {monthLabels.map((label, i) => `${label} ${money(monthly[i] ?? 0)}`).join(", ")}.
        </p>
      </div>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Pitch performance                                                           */
/* -------------------------------------------------------------------------- */

export function PitchPerformance({ pitches, className = "" }: { pitches: Pitch[]; className?: string }) {
  const f = pitchFunnel(pitches);
  const rows = [
    { label: "Sent", value: f.sent, icon: <Send size={16} aria-hidden className="y-flip" /> },
    { label: "Viewed", value: f.viewed, icon: <Eye size={16} aria-hidden /> },
    { label: "Shortlisted", value: f.shortlisted, icon: <Star size={16} aria-hidden /> },
    { label: "Hired", value: f.hired, icon: <Trophy size={16} aria-hidden /> },
  ];
  return (
    <Block tone="paper" pad="md" className={`flex flex-col gap-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="y-head">Pitch performance</h2>
          <p className="y-small y-fg-2">Last 30 days</p>
        </div>
        <div className="text-end">
          <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
            {f.hireRate}
            <span className="text-xl">%</span>
          </p>
          <p className="y-micro y-fg-2">hire rate</p>
        </div>
      </div>
      {f.sent ? (
        <ul className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <li key={row.label} className="grid grid-cols-[112px_1fr_32px] items-center gap-3">
              <span className="y-small flex items-center gap-2 font-medium">
                {row.icon}
                {row.label}
              </span>
              <span className="h-3 overflow-hidden rounded-full bg-(--b-chip)" aria-hidden>
                <span
                  className="y-bars-grow block h-full rounded-full bg-(--b-fg)"
                  style={{ width: `${Math.max(4, (row.value / f.sent) * 100)}%` }}
                />
              </span>
              <span className="y-small y-num text-end font-semibold">{row.value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2">
          No pitches in the last 30 days. Creators who pitch twice a week get hired most often.
        </p>
      )}
      <PillButton href="/creator/pitches" size="sm" variant="outline" className="w-fit">
        My pitches
      </PillButton>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Opportunities (lavender = match)                                            */
/* -------------------------------------------------------------------------- */

export function OpportunityList({
  items,
  className = "",
}: {
  items: { request: ContentRequest; fit: Fit; invited: boolean; pitchCount: number }[];
  className?: string;
}) {
  const s = useDemo();
  return (
    <Block tone="lavender" pad="md" className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="y-head">Picked for your formats and dialects</h2>
          <p className="y-small y-fg-2">Best fit first. You haven&apos;t pitched on these yet.</p>
        </div>
        <PillButton href="/creator/opportunities" size="sm" variant="contrast" className="flex-none">
          See all
        </PillButton>
      </div>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map(({ request, fit, invited, pitchCount }) => {
            const business = businessById(s, request.businessId);
            const FormatIcon = formatById[request.brief.format].icon;
            return (
              <li key={request.id}>
                <article className="y-tile y-hoverable relative flex items-center gap-3 p-3 md:p-4">
                  {business ? <BusinessLogo business={business} size={44} /> : null}
                  <div className="min-w-0 flex-1">
                    <p className="y-micro y-fg-2 flex flex-wrap items-center gap-x-1.5">
                      <span className="font-semibold text-(--b-fg)">{business?.name}</span>
                      <span aria-hidden>·</span>
                      <FormatIcon size={12} aria-hidden />
                      <span>{formatById[request.brief.format].name}</span>
                      {invited ? (
                        <>
                          <span aria-hidden>·</span>
                          <MailOpen size={12} aria-hidden />
                          <span className="font-semibold text-(--b-fg)">Invited you</span>
                        </>
                      ) : null}
                    </p>
                    <h3 className="y-small mt-0.5 font-semibold">
                      <Link
                        href={`/creator/opportunities/${request.id}`}
                        className="after:absolute after:inset-0 after:rounded-(--y-r-tile) after:content-['']"
                      >
                        {request.title}
                      </Link>
                    </h3>
                    <p className="y-micro y-fg-2">
                      <span className="y-num font-semibold text-(--b-fg)">
                        {moneyRange(request.budget.min, request.budget.max)}
                      </span>{" "}
                      · {plural(pitchCount, "pitch", "pitches")} so far
                    </p>
                  </div>
                  <span className="flex flex-none flex-col items-end">
                    <span className="y-display y-num text-[28px] leading-none font-semibold">
                      {fit.score}
                      <span className="text-base">%</span>
                    </span>
                    <span className="y-micro y-fg-2">fit</span>
                  </span>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="y-small">
          You&apos;ve pitched on every open request that fits. New ones arrive daily; we&apos;ll alert
          you.
        </p>
      )}
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Repeat clients                                                              */
/* -------------------------------------------------------------------------- */

export type RepeatClient = { business: Business; completed: number; active: number; last: string };

export function repeatClients(s: DemoState): RepeatClient[] {
  const map = new Map<string, RepeatClient>();
  for (const c of s.commissions) {
    if (c.creatorId !== ME.creatorId) continue;
    const business = businessById(s, c.businessId);
    if (!business) continue;
    const entry = map.get(business.id) ?? { business, completed: 0, active: 0, last: "" };
    if (c.status === "completed") {
      entry.completed += 1;
      const when = c.completedAt ?? c.createdAt;
      if (!entry.last || Date.parse(when) > Date.parse(entry.last)) entry.last = when;
    } else if (isActive(c) && c.status !== "offered") {
      entry.active += 1;
    }
    map.set(business.id, entry);
  }
  return [...map.values()]
    .filter((e) => e.completed > 0)
    .sort((a, b) => b.completed + b.active - (a.completed + a.active) || Date.parse(b.last) - Date.parse(a.last));
}

export function RepeatClients({
  clients,
  rate,
  className = "",
}: {
  clients: RepeatClient[];
  rate: number;
  className?: string;
}) {
  return (
    <Block tone="paper" pad="md" className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="y-head">Repeat clients</h2>
          <p className="y-small y-fg-2">Your best source of work</p>
        </div>
        <span className="y-round" data-tone-btn="soft" data-size="sm" aria-hidden>
          <Repeat2 size={18} />
        </span>
      </div>
      <p className="flex items-baseline gap-2">
        <span className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
          {rate}
          <span className="text-xl">%</span>
        </span>
        <span className="y-small y-fg-2">of your clients came back for more</span>
      </p>
      {clients.length ? (
        <ul className="flex flex-col gap-2">
          {clients.slice(0, 4).map((client) => (
            <li key={client.business.id} className="y-tile flex items-center gap-3 p-3">
              <BusinessLogo business={client.business} size={40} />
              <div className="min-w-0 flex-1">
                <p className="y-small font-semibold">{client.business.name}</p>
                <p className="y-micro y-fg-2">
                  {plural(client.completed, "commission")} done · last {shortDate(client.last)}
                </p>
              </div>
              {client.active ? (
                <Badge tone="ink" icon={<Repeat2 size={14} aria-hidden />}>
                  Working again
                </Badge>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2">
          Finish your first commission and it shows up here. Happy clients can rehire you in one tap.
        </p>
      )}
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Latest review                                                               */
/* -------------------------------------------------------------------------- */

export function LatestReview({ review, handle, className = "" }: { review?: Review; handle: string; className?: string }) {
  const s = useDemo();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [touched, setTouched] = useState(false);
  const business = review ? businessById(s, review.businessId) : undefined;
  const error = reply.trim().length < 10 ? "Write at least 10 characters." : null;

  return (
    <Block tone="night" pad="md" className={`flex flex-col gap-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="y-head">Latest review</h2>
        {review ? <StarRow value={review.rating} /> : null}
      </div>
      {review ? (
        <>
          <blockquote className="y-display text-[22px] leading-snug md:text-[24px]">
            &ldquo;{review.text}&rdquo;
          </blockquote>
          <div className="flex items-center gap-3">
            {business ? <BusinessLogo business={business} size={40} /> : null}
            <div className="min-w-0 flex-1">
              <p className="y-small font-semibold">
                {review.authorName}, {review.authorTitle}
              </p>
              <p className="y-micro y-fg-2">
                {business?.name} · {formatById[review.format].name} · {timeAgo(review.createdAt)}
              </p>
            </div>
          </div>
          {review.reply ? (
            <div className="y-tile flex flex-col gap-1 p-3">
              <p className="y-micro y-fg-2">Your reply</p>
              <p className="y-small">{review.reply}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {!review.reply ? (
              <PillButton
                size="sm"
                variant="contrast"
                icon={<MessageSquareReply size={16} aria-hidden />}
                onClick={() => setOpen(true)}
              >
                Reply publicly
              </PillButton>
            ) : null}
            <PillButton href={`/creators/${handle}#reviews`} size="sm" variant="outline">
              All reviews
            </PillButton>
          </div>
          <Sheet
            open={open}
            onClose={() => setOpen(false)}
            title={`Reply to ${review.authorName}`}
            description="Your reply shows under the review on your public profile."
            footer={
              <div className="flex justify-end gap-2">
                <PillButton variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </PillButton>
                <PillButton
                  variant="contrast"
                  disabled={Boolean(error)}
                  onClick={() => {
                    actions.replyToReview(review.id, reply.trim());
                    setOpen(false);
                    setReply("");
                    toast({ message: "Reply posted on your profile." });
                  }}
                >
                  Post reply
                </PillButton>
              </div>
            }
          >
            <TextArea
              label="Your reply"
              required
              rows={5}
              maxLength={400}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={`Thank you, ${review.authorName.split(" ")[0]}! It was a pleasure working on…`}
              hint={`${reply.length}/400`}
              error={touched ? error : null}
            />
          </Sheet>
        </>
      ) : (
        <p className="y-small y-fg-2">
          Reviews appear here when clients approve your work. Each one makes the next hire easier.
        </p>
      )}
    </Block>
  );
}
