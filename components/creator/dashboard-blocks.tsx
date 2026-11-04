"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/domain/business-logo";
import { CommissionBadge } from "@/components/domain/status-badge";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { dueLabel, money, moneyRange, plural } from "@/lib/format";
import type { Fit } from "@/lib/selectors";
import { businessById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { Commission, ContentRequest } from "@/lib/types";

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

/** Block title with a quiet "see all" link on the end side. */
function BlockHeader({ title, href, link }: { title: string; href: string; link: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="y-head">{title}</h2>
      <Link href={href} className="y-small y-link relative z-[3] font-semibold">
        {link}
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Due soon: compact rows                                                      */
/* -------------------------------------------------------------------------- */

export function DueSoon({ items, className = "" }: { items: Commission[]; className?: string }) {
  const s = useDemo();
  return (
    <Block tone="paper" pad="md" className={`flex flex-col gap-2 ${className}`}>
      <BlockHeader title="Due soon" href="/creator/commissions" link="All commissions" />
      {items.length ? (
        <ul className="flex flex-col">
          {items.map((c) => {
            const business = businessById(s, c.businessId);
            const due = dueLabel(c.dueDate);
            return (
              <li key={c.id} className="relative flex items-center gap-3 border-t border-(--b-line) py-3 first:border-t-0">
                {business ? <BusinessLogo business={business} size={36} /> : null}
                <div className="min-w-0 flex-1">
                  <h3 className="y-small y-clamp-2 font-semibold sm:truncate">
                    <Link href={`/creator/commissions/${c.id}`} className="after:absolute after:inset-0 after:content-['']">
                      {c.title}
                    </Link>
                  </h3>
                  <p className="y-micro y-fg-2 truncate">
                    {business?.name}
                    {" · "}
                    <span className={due.urgency === "late" ? "text-(--y-danger)" : ""}>{due.text}</span>
                  </p>
                  <CommissionBadge status={c.status} className="mt-2 sm:hidden" />
                </div>
                <CommissionBadge status={c.status} className="hidden flex-none sm:inline-flex" />
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p className="y-small y-fg-2 max-w-[48ch]">
            Nothing in production. Accept an offer or win a pitch and it lands here.
          </p>
          <PillButton href="/creator/opportunities" size="sm" variant="outline">
            Find work
          </PillButton>
        </div>
      )}
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Money (butter): one small block                                             */
/* -------------------------------------------------------------------------- */

export function MoneyBlock({
  available,
  held,
  className = "",
}: {
  available: number;
  held: number;
  className?: string;
}) {
  return (
    <Block tone="butter" pad="md" className={`y-hoverable flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="y-small font-semibold">
          <Link
            href="/creator/earnings"
            className="after:absolute after:inset-0 after:rounded-(--y-r-block) after:content-['']"
          >
            Available to withdraw
          </Link>
        </h2>
        <ArrowRight size={18} aria-hidden className="y-flip flex-none" />
      </div>
      <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
        {money(available)}
      </p>
      <p className="y-micro y-fg-2">
        {held > 0 ? `${money(held)} held until clients approve` : "Nothing held right now"}
      </p>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Opportunities (lavender = fit)                                              */
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
    <Block tone="lavender" pad="md" className={`flex flex-col gap-2 ${className}`}>
      <BlockHeader title="New opportunities for you" href="/creator/opportunities" link="See all" />
      {items.length ? (
        <ul className="flex flex-col">
          {items.map(({ request, fit, invited, pitchCount }) => {
            const business = businessById(s, request.businessId);
            return (
              <li
                key={request.id}
                className="relative flex items-center gap-3 border-t border-(--b-line) py-3 first:border-t-0"
              >
                {business ? <BusinessLogo business={business} size={36} /> : null}
                <div className="min-w-0 flex-1">
                  <h3 className="y-small y-clamp-2 font-semibold sm:truncate">
                    <Link
                      href={`/creator/opportunities/${request.id}`}
                      className="after:absolute after:inset-0 after:content-['']"
                    >
                      {request.title}
                    </Link>
                  </h3>
                  <p className="y-micro y-fg-2 truncate">
                    {business?.name}
                    {invited ? " · Invited you" : ""} · {moneyRange(request.budget.min, request.budget.max)} ·{" "}
                    {plural(pitchCount, "pitch", "pitches")}
                  </p>
                </div>
                <span className="y-display y-num flex-none text-[22px] leading-none font-semibold" aria-label={`${fit.score}% fit`}>
                  {fit.score}
                  <span className="y-micro ms-0.5 font-medium">% fit</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="y-small pt-2">
          You&apos;ve pitched on every open request that fits. New ones arrive daily.
        </p>
      )}
    </Block>
  );
}
