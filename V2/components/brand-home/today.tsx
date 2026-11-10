"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { libraryVideos } from "@/components/library/data";
import { ProtectedNote } from "@/components/domain/money";
import { Block } from "@/components/ui/block";
import { List } from "@/components/ui/list";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { attention } from "@/lib/attention";
import { HOUR, NOW, TIME_ZONE, TZ_OFFSET } from "@/lib/clock";
import { money, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessSpend, me } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

import { FiguresLink } from "./figures-link";
import { LatestVideos } from "./latest-videos";
import { NeedsYou } from "./needs-you";
import { orderItems, sortItems } from "./order-items";
import { OrderRow } from "./order-row";
import { StartOrder } from "./start-order";

const IN_PROGRESS_ROWS = 5;
const LATEST_VIDEOS = 5;

/** "Good morning" from the demo clock (Eastern). */
function greeting() {
  const hour = Math.floor(((NOW + TZ_OFFSET) / HOUR) % 24);
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}
const today = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
}).format(NOW);

/**
 * Ordering's Home ("Today"): what needs you, what's in progress, a way to start an order with a
 * quiet line of figures into Productivity under it, and your latest approved videos. Five blocks at
 * most; the one green action is the most urgent thing to do, or starting an order when nothing
 * waits.
 */
export function BrandToday() {
  const s = useDemo();
  const hydrated = useHydrated();
  if (!hydrated) return <TodaySkeleton />;

  const account = me.account(s);
  const needs = attention(s, "business");
  // Say it once: a delivery waiting for review is already a Needs you row.
  // Quiet rows (no "needs you" ordering or chips): jobs by due date, then campaigns, then requests.
  const inProgress = sortItems(
    orderItems(s)
      .filter(
        (item) =>
          (item.stage === "progress" || (item.stage === "open" && item.kind === "request")) &&
          !(item.kind === "job" && item.commission.status === "delivered"),
      )
      .map((item) => ({ ...item, needsYou: false })),
  );
  const allOpen = orderItems(s).filter((item) => item.stage !== "done").length;
  const held = businessSpend(s).held;
  const videos = libraryVideos(s).slice(0, LATEST_VIDEOS);

  const header = (description: string) => (
    <PageHeader eyebrow={today} title={`${greeting()}, ${account.firstName}`} description={description} />
  );

  // Never ordered: one job on the page, starting the first order.
  if (!orderItems(s).length && !videos.length) {
    return (
      <Page>
        {header("Get your first video made. Pick how you want to work; payment is held until you approve.")}
        <div className="flex max-w-[640px] flex-col gap-3">
          <StartOrder highlight />
          <ProtectedNote compact />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      {header(needs.length ? `${plural(needs.length, "thing")} ${needs.length === 1 ? "needs" : "need"} you.` : "You're all caught up. Nothing is waiting on you.")}

      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {needs.length ? (
          <section aria-labelledby="needs-title" className="min-w-0 lg:col-start-1">
            <SectionLabel id="needs-title" className="!pt-0">
              Needs you
            </SectionLabel>
            <NeedsYou items={needs} />
          </section>
        ) : null}

        <section aria-labelledby="progress-title" className="min-w-0 lg:col-start-1">
          <SectionLabel
            id="progress-title"
            className={needs.length ? "" : "!pt-0"}
            action={
              held > 0 ? (
                <Link href={paths.billing} className="y-small y-fg-2 inline-flex items-center gap-1.5 hover:text-(--y-ink)">
                  <ShieldCheck size={15} aria-hidden />
                  <span>
                    <span className="y-num font-medium text-(--y-ink)">{money(held)}</span> held
                    <span aria-hidden> · </span>
                    <span className="y-link">Billing</span>
                  </span>
                </Link>
              ) : undefined
            }
          >
            In progress
          </SectionLabel>
          {inProgress.length ? (
            <List label="In progress">
              {inProgress.slice(0, IN_PROGRESS_ROWS).map((item) => (
                <OrderRow key={item.key} item={item} quiet />
              ))}
              <Link role="listitem" href={paths.orders()} className="y-row y-small !min-h-12 justify-center font-medium">
                All orders <span className="y-fg-2 y-num">{allOpen}</span>
              </Link>
            </List>
          ) : (
            <Block tone="paper" pad="md">
              <p className="y-small y-fg-2">
                Nothing in progress. Orders you place show up here until the video is approved.
              </p>
            </Block>
          )}
        </section>

        <aside
          aria-label="Start an order"
          className="min-w-0 pt-8 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:self-start lg:pt-[34px]"
        >
          <div className="flex flex-col gap-3 lg:sticky lg:top-[calc(var(--y-header-h)+16px)]">
            <StartOrder highlight={needs.length === 0} />
            <FiguresLink />
          </div>
        </aside>

        {videos.length ? (
          <section aria-labelledby="videos-title" className="min-w-0 lg:col-start-1">
            <SectionLabel
              id="videos-title"
              action={
                <Link href={paths.library()} className="y-small y-link font-medium">
                  Library
                </Link>
              }
            >
              Your latest videos
            </SectionLabel>
            <LatestVideos items={videos} />
          </section>
        ) : null}
      </div>
    </Page>
  );
}

function TodaySkeleton() {
  return (
    <Page>
      <div aria-busy="true" aria-label="Loading your home" className="flex flex-col gap-3 pb-6">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]" aria-hidden>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-64 w-full !rounded-(--y-r-block)" />
          <Skeleton className="mt-6 h-5 w-28" />
          <Skeleton className="h-56 w-full !rounded-(--y-r-block)" />
        </div>
        <Skeleton className="h-80 w-full !rounded-(--y-r-block)" />
      </div>
    </Page>
  );
}
