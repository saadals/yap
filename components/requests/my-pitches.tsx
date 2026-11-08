"use client";

import Link from "next/link";
import { useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { commissionForPitch, pitchFunnel, pitchNextStep } from "@/components/creator/pitch-helpers";
import { WithdrawPitchButton } from "@/components/creator/pitch-status";
import { BusinessLogo } from "@/components/domain/business-logo";
import { PitchBadge } from "@/components/domain/status-badge";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { HOUR } from "@/lib/clock";
import { money, plural, timeAgo } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessById, me, pitchesForCreator, productById, requestById } from "@/lib/selectors";
import { type DemoState, useDemo, useHydrated } from "@/lib/store";
import { pitchStatus } from "@/lib/taxonomy";
import type { Pitch, PitchStatus } from "@/lib/types";

/** /pitches: every pitch the signed-in account's creator profile has sent, and where it stands. */
export function MyPitchesPage() {
  return (
    <AppShell>
      <Pitches />
    </AppShell>
  );
}

type FilterId = "all" | PitchStatus;
const statusOrder: PitchStatus[] = ["shortlisted", "viewed", "sent", "hired", "declined", "withdrawn"];

/**
 * How long businesses take to respond: first business message in the request thread, or the
 * hire itself when there was no message first. Only pitches with a response count.
 */
function averageResponseHours(s: DemoState, pitches: Pitch[]): number | null {
  const waits: number[] = [];
  for (const pitch of pitches) {
    const request = requestById(s, pitch.requestId);
    if (!request) continue;
    const sent = Date.parse(pitch.sentAt);
    const thread = s.threads.find(
      (t) => t.creatorId === pitch.creatorId && t.businessId === request.businessId && t.requestId === request.id,
    );
    const reply = thread?.messages.find((m) => m.from === "business" && Date.parse(m.at) > sent);
    if (reply) {
      waits.push(Date.parse(reply.at) - sent);
      continue;
    }
    if (pitch.status === "hired") {
      const commission = commissionForPitch(s, pitch);
      if (commission && Date.parse(commission.createdAt) > sent) waits.push(Date.parse(commission.createdAt) - sent);
    }
  }
  if (!waits.length) return null;
  return waits.reduce((a, b) => a + b, 0) / waits.length / HOUR;
}

function formatHours(hours: number): { value: string; unit: string } {
  if (hours < 24) return { value: String(Math.max(1, Math.round(hours))), unit: hours < 1.5 ? "hour" : "hours" };
  const days = Math.round((hours / 24) * 10) / 10;
  return { value: String(days), unit: days === 1 ? "day" : "days" };
}

function PitchesSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading pitches">
        <div className="flex flex-col gap-3 px-1 pt-2 pb-5">
          <Skeleton className="h-12 w-2/5" />
          <Skeleton className="h-5 w-72" />
        </div>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 !rounded-(--y-r-block)" />
        ))}
      </div>
    </Page>
  );
}

function Pitches() {
  const s = useDemo();
  const hydrated = useHydrated();
  const [filter, setFilter] = useState<FilterId>("all");
  const [setupOpen, setSetupOpen] = useState(false);

  // Who's signed in decides everything here, so wait for the saved state.
  if (!hydrated) return <PitchesSkeleton />;

  const creator = me.creator(s);
  if (!creator) {
    return (
      <Page>
        <PageHeader title="My pitches" />
        <Block tone="paper" pad="md">
          <EmptyState
            title="Pitch on orders that fit you"
            body="Set up a creator profile and you can pitch on custom requests and take slots in UGC campaigns, right from this account."
            shape="bean"
            tint="mint"
            face="smile"
            action={
              <PillButton variant="contrast" arrow onClick={() => setSetupOpen(true)}>
                Set up a creator profile
              </PillButton>
            }
          />
        </Block>
        {setupOpen ? (
          <CreatorSetupSheet open reason="to pitch on orders" onClose={() => setSetupOpen(false)} onDone={() => setSetupOpen(false)} />
        ) : null}
      </Page>
    );
  }

  const pitches = pitchesForCreator(s, creator.id);
  const funnel = pitchFunnel(pitches);
  const response = averageResponseHours(s, pitches);
  const responseLabel = response !== null ? formatHours(response) : null;
  // The stats as one plain line under the title instead of a row of tiles.
  const stats = funnel.sent
    ? [
        `${funnel.sent} sent`,
        `${funnel.shortlisted} shortlisted`,
        `${funnel.hired} hired`,
        responseLabel ? `replies in about ${responseLabel.value} ${responseLabel.unit}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Everything you've pitched on and where it stands.";

  const counts = statusOrder
    .map((status) => ({ status, count: pitches.filter((p) => p.status === status).length }))
    .filter((c) => c.count > 0);
  const shown = [...(filter === "all" ? pitches : pitches.filter((p) => p.status === filter))].sort(
    (a, b) =>
      statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) ||
      Date.parse(b.sentAt) - Date.parse(a.sentAt),
  );

  return (
    <Page>
      <PageHeader
        title="My pitches"
        description={stats}
        actions={
          <PillButton href={paths.explore("orders")} variant="neon" arrow>
            Find orders
          </PillButton>
        }
      />

      <div className="flex flex-col gap-2">
        {pitches.length ? (
          <div className="y-scroll-x -mx-1 px-1 pb-1">
            <div className="flex w-max gap-2" role="group" aria-label="Filter by status">
              <FilterChip pressed={filter === "all"} count={pitches.length} onClick={() => setFilter("all")}>
                All
              </FilterChip>
              {counts.map(({ status, count }) => (
                <FilterChip key={status} pressed={filter === status} count={count} onClick={() => setFilter(status)}>
                  {pitchStatus[status].label}
                </FilterChip>
              ))}
            </div>
          </div>
        ) : null}

        {shown.length ? (
          <ul className="flex flex-col gap-2" aria-live="polite">
            {shown.map((pitch) => (
              <li key={pitch.id}>
                <PitchRow pitch={pitch} />
              </li>
            ))}
          </ul>
        ) : (
          <Block tone="paper" pad="md">
            <EmptyState
              title={pitches.length ? "No pitches with this status" : "No pitches yet"}
              body={
                pitches.length
                  ? "Pick another status above, or see every pitch you've sent."
                  : "Find an order that fits what you make, write a short pitch and attach your closest samples. It takes about 5 minutes."
              }
              shape="bean"
              tint="mint"
              face="smile"
              action={
                pitches.length ? (
                  <PillButton variant="contrast" onClick={() => setFilter("all")}>
                    Show all pitches
                  </PillButton>
                ) : (
                  <PillButton href={paths.explore("orders")} variant="contrast" arrow>
                    Browse orders
                  </PillButton>
                )
              }
            />
          </Block>
        )}
      </div>
    </Page>
  );
}

function PitchRow({ pitch }: { pitch: Pitch }) {
  const s = useDemo();
  const request = requestById(s, pitch.requestId);
  const business = request ? businessById(s, request.businessId) : undefined;
  const product = request ? productById(s, request.brief.productId) : undefined;
  const businessName = business?.name ?? "The business";
  const title = request?.title ?? "Order no longer available";
  const commission = pitch.status === "hired" ? commissionForPitch(s, pitch) : undefined;
  const canWithdraw = request?.status === "open" && (pitch.status === "sent" || pitch.status === "viewed");
  const closed =
    request &&
    request.status !== "open" &&
    pitch.status !== "hired" &&
    pitch.status !== "declined" &&
    pitch.status !== "withdrawn";

  return (
    <article
      data-tone="paper"
      className="y-block y-hoverable relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:gap-6 md:p-6"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {business ? <BusinessLogo business={business} size={48} /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="y-micro y-fg-2 truncate">
            {businessName}
            {product ? ` · ${product.name}` : ""}
          </p>
          <h2 className="y-head">
            {request ? (
              <Link
                href={paths.order(request.id)}
                className="after:absolute after:inset-0 after:rounded-(--y-r-block) after:content-['']"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h2>
          <p className="y-small y-fg-2">
            <span className="y-num font-semibold text-(--b-fg)">{money(pitch.price)}</span> ·{" "}
            {plural(pitch.deliveryDays, "day")} · Sent {timeAgo(pitch.sentAt)}
          </p>
          <p className="y-small mt-1 max-w-[62ch]">
            {closed ? `${businessName} closed this order without hiring yet.` : pitchNextStep(pitch.status, businessName)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
        <PitchBadge status={pitch.status} />
        <div className="relative z-[3] flex flex-wrap gap-2">
          {commission ? (
            <PillButton href={paths.commission(commission.id)} size="sm" variant="contrast" arrow>
              Open the work
            </PillButton>
          ) : null}
          {canWithdraw && request ? (
            <WithdrawPitchButton
              pitch={pitch}
              requestTitle={request.title}
              businessName={businessName}
              variant="outline"
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}
