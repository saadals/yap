"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { ArrowCircle } from "@/components/ui/action-pill";
import { useReducedMotion } from "@/components/ui/motion";
import { SlotBar } from "@/components/ui/progress";
import { money, moneyRange, shortDate, timeAgoInline } from "@/lib/format";
import { paths } from "@/lib/paths";
import type { WorkItem } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { formatById, jobTypeById, nicheById, orderKinds } from "@/lib/taxonomy";

import { liveBriefs, tickerItems, type TickerItem } from "./data";

/* ------------------------------------------------------------------ ticker */

/**
 * One line of the latest activity on Yapp, sliding up a line every 2.8s and looping. It pauses
 * while pointed at, and stands still under reduced motion (the newest event stays).
 */
export function Ticker({ items }: { items: TickerItem[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [instant, setInstant] = useState(false);
  const [paused, setPaused] = useState(false);
  const count = items.length;
  const moving = !reduced && !paused && count > 1;

  useEffect(() => {
    if (!moving) return;
    const timer = window.setInterval(() => {
      setInstant(false);
      setIndex((current) => current + 1);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [moving]);

  if (!count) return <div className="y-dsc-ticker" aria-hidden />;
  // The first line is repeated at the end, so the loop back to it is seamless.
  const lines = count > 1 ? [...items, items[0]] : items;
  const shown = reduced ? 0 : Math.min(index, count);
  return (
    <div
      className="y-dsc-ticker"
      role="region"
      aria-label="Latest on Yapp"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <ul
        className="y-dsc-ticker-list"
        data-instant={instant || reduced ? "true" : undefined}
        style={{ transform: `translateY(${-22 * shown}px)` }}
        onTransitionEnd={() => {
          if (index >= count) {
            setInstant(true);
            setIndex(0);
          }
        }}
      >
        {lines.map((item, position) => (
          <li key={`${item.id}-${position}`} aria-hidden={position === count ? true : undefined}>
            {item.parts.map((part, at) =>
              typeof part === "string" ? <span key={at}>{part}</span> : <b key={at}>{part.strong}</b>,
            )}
            <span> · {timeAgoInline(item.at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------- Live briefs */

const kindName = (item: WorkItem) => (item.kind === "campaign" ? orderKinds.campaign.name : orderKinds.custom.name);

function briefMeta(item: WorkItem) {
  const work = item.format ? formatById[item.format]?.name : jobTypeById[item.jobType]?.name;
  return [item.brandName, kindName(item), nicheById[item.category]?.name, work].filter(Boolean).join(" · ");
}

function BriefRow({ item, onOpen }: { item: WorkItem; onOpen: (id: string) => void }) {
  const slots = item.slots;
  const hot = slots ? slots.left <= 3 : false;
  const price =
    item.pay.unit === "per-yapp" ? money(item.pay.amount) : moneyRange(item.pay.min, item.pay.max);
  return (
    <li>
      <button type="button" className="y-dsc-brief" onClick={() => onOpen(item.id)}>
        <BusinessLogo business={item.business} size={40} />
        <span className="y-dsc-brief-txt">
          <span className="y-dsc-brief-t">{item.title}</span>
          <span className="y-dsc-brief-s">{briefMeta(item)}</span>
        </span>
        <span className="y-dsc-brief-st" data-hot={hot ? "true" : undefined}>
          {slots ? (
            <>
              <span className="y-num">
                {slots.left} of {slots.total} left
              </span>
              <SlotBar total={slots.total} taken={slots.taken} size="sm" continuous />
            </>
          ) : (
            <span>Due {shortDate(item.request.dueDate)}</span>
          )}
        </span>
        <span className="y-dsc-brief-pay">
          <b className="y-num">{price}</b>
          <span>{item.pay.unit === "per-yapp" ? "per Yapp" : "budget"}</span>
        </span>
        <ChevronRight size={16} aria-hidden className="y-dsc-chev" />
      </button>
    </li>
  );
}

/** The six newest open orders; a row opens the order view, "Open Work" goes to Find work. */
export function LiveBriefs({ s, onOpen }: { s: DemoState; onOpen: (id: string) => void }) {
  const { items, newToday } = liveBriefs(s);
  return (
    <section data-tone="paper" className="y-block y-dsc-briefs" aria-labelledby="dsc-briefs-title">
      <div className="y-dsc-briefs-h">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 id="dsc-briefs-title" className="y-dsc-h3">
            Live briefs
          </h2>
          {newToday > 0 ? (
            <span className="y-delta y-dsc-new">
              <span aria-hidden className="y-dsc-pulse" />
              {newToday} new today
            </span>
          ) : null}
        </div>
        <Link href={paths.findWork()} className="y-dsc-open" aria-label="Open Work">
          <span className="y-dsc-open-t" aria-hidden>
            Open Work
          </span>
          <ArrowCircle tone="light" size={28} />
        </Link>
      </div>
      {items.length ? (
        <ul className="y-dsc-briefs-list">
          {items.map((item) => (
            <BriefRow key={item.id} item={item} onOpen={onOpen} />
          ))}
        </ul>
      ) : (
        <p className="y-dsc-empty">No open orders right now. New ones show up here as soon as they&apos;re posted.</p>
      )}
    </section>
  );
}

/* -------------------------------------------------------------- left column */

/** Headline, one line, the ticker and Live briefs: the hero's left column (656px on desktop). */
export function HeroIntro({ s, onOpenOrder }: { s: DemoState; onOpenOrder: (id: string) => void }) {
  return (
    <div className="y-dsc-hero-l">
      <h1 className="y-display y-dsc-h1">
        Find the voice that <br className="max-md:hidden" />
        sells your tech.
      </h1>
      <p className="y-dsc-sub">
        Creators across the US &amp; Canada who make apps, SaaS and gadgets click. Short videos, clear
        prices, and the numbers to prove it, before you spend a dollar.
      </p>
      <Ticker items={tickerItems(s)} />
      <LiveBriefs s={s} onOpen={onOpenOrder} />
    </div>
  );
}
