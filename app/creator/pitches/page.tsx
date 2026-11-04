"use client";

import { Clock, Eye, Send, Star, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { commissionForPitch, pitchFunnel, pitchNextStep } from "@/components/creator/pitch-helpers";
import { WithdrawPitchButton } from "@/components/creator/pitch-status";
import { BusinessLogo } from "@/components/domain/business-logo";
import { PitchBadge } from "@/components/domain/status-badge";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { AppShell } from "@/components/shell/app-shell";
import { HOUR } from "@/lib/clock";
import { money, plural, timeAgo } from "@/lib/format";
import { businessById, pitchesForCreator, productById, requestById } from "@/lib/selectors";
import { ME, type DemoState, useDemo } from "@/lib/store";
import { pitchStatus } from "@/lib/taxonomy";
import type { Pitch, PitchStatus } from "@/lib/types";

export default function PitchesPage() {
  return (
    <AppShell role="creator">
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
      (t) => t.creatorId === ME.creatorId && t.businessId === request.businessId && t.requestId === request.id,
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

function Stat({
  icon,
  value,
  unit,
  label,
  note,
}: {
  icon: React.ReactNode;
  value: string;
  unit?: string;
  label: string;
  note?: string;
}) {
  return (
    <Block tone="paper" pad="md" className="flex flex-col justify-between gap-5">
      <span className="y-round" data-tone-btn="soft" data-size="sm" aria-hidden>
        {icon}
      </span>
      <div>
        <p className="flex items-baseline gap-1">
          <span className="y-display y-num text-[40px] leading-none font-semibold tracking-[-0.04em]">{value}</span>
          {unit ? <span className="y-small font-semibold">{unit}</span> : null}
        </p>
        <p className="y-small mt-2 font-semibold">{label}</p>
        {note ? <p className="y-micro y-fg-2">{note}</p> : null}
      </div>
    </Block>
  );
}

function Pitches() {
  const s = useDemo();
  const [filter, setFilter] = useState<FilterId>("all");
  const pitches = pitchesForCreator(s);
  const funnel = pitchFunnel(pitches);
  const response = averageResponseHours(s, pitches);
  const responseLabel = response !== null ? formatHours(response) : null;

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
        description="Everything you've pitched on, where it stands, and what happens next."
        actions={
          <PillButton href="/creator/opportunities" variant="neon" arrow>
            Find requests
          </PillButton>
        }
      />

      <section aria-label="Pitch stats" className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        <Stat icon={<Send size={18} aria-hidden className="y-flip" />} value={String(funnel.sent)} label="Sent" note="All time, not counting withdrawn" />
        <Stat icon={<Eye size={18} aria-hidden />} value={String(funnel.viewRate)} unit="%" label="Viewed" note={`${funnel.viewed} of ${funnel.sent} opened`} />
        <Stat icon={<Star size={18} aria-hidden />} value={String(funnel.shortlisted)} label="Shortlisted" note="Including hires" />
        <Stat icon={<Trophy size={18} aria-hidden />} value={String(funnel.hired)} label="Hired" note={`${funnel.hireRate}% hire rate`} />
        <div className="col-span-2 md:col-span-1">
          <Stat
            icon={<Clock size={18} aria-hidden />}
            value={responseLabel?.value ?? "None yet"}
            unit={responseLabel?.unit}
            label="Business reply time"
            note={responseLabel ? "Average, from replies and hires" : "No replies to measure yet"}
          />
        </div>
      </section>

      <div className="flex flex-col gap-2 pt-8">
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
                  : "Find a request that fits what you make, write a short pitch and attach your closest samples. It takes about 5 minutes."
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
                  <PillButton href="/creator/opportunities" variant="contrast" arrow>
                    Browse requests
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
  const title = request?.title ?? "Request no longer available";
  const commission = pitch.status === "hired" ? commissionForPitch(s, pitch) : undefined;
  const canWithdraw = request?.status === "open" && (pitch.status === "sent" || pitch.status === "viewed");
  const closed = request && request.status !== "open" && pitch.status !== "hired" && pitch.status !== "declined" && pitch.status !== "withdrawn";

  return (
    <article data-tone="paper" className="y-block y-hoverable relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:gap-6 md:p-6">
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
                href={`/creator/opportunities/${request.id}`}
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
            {closed ? `${businessName} closed this request without hiring yet.` : pitchNextStep(pitch.status, businessName)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
        <PitchBadge status={pitch.status} />
        <div className="relative z-[3] flex flex-wrap gap-2">
          {commission ? (
            <PillButton
              href={`/creator/commissions/${commission.id}`}
              size="sm"
              variant="contrast"
              arrow
            >
              Open commission
            </PillButton>
          ) : null}
          {canWithdraw && request ? (
            <WithdrawPitchButton pitch={pitch} requestTitle={request.title} businessName={businessName} variant="outline" />
          ) : null}
        </div>
      </div>
    </article>
  );
}
