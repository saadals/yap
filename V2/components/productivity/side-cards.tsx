"use client";

import { ArrowRight, Hourglass, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";

import { Block } from "@/components/ui/block";
import { money, moneyExact } from "@/lib/format";
import { paths } from "@/lib/paths";
import { NOT_ENOUGH, type BrandReport, type CreatorReport, type Figure, type ProductivityReport } from "@/lib/productivity";

import { DeltaChip } from "./figures";

/** A figure as a row in a card: label and basis, the value and its change. Opens what it means. */
function FigureRow({ figure, onOpen }: { figure: Figure; onOpen: (figure: Figure) => void }) {
  const known = figure.value !== null;
  return (
    <button
      type="button"
      role="listitem"
      onClick={() => onOpen(figure)}
      aria-label={`${figure.label}: ${known ? figure.display : `—, ${NOT_ENOUGH.toLowerCase()}`}${figure.delta ? `. ${figure.delta.text}` : ""}. About this figure`}
      className="y-row !px-0 text-start"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="y-small font-medium">{figure.label}</span>
        <span className="y-micro y-fg-2 truncate">{known ? figure.basis : NOT_ENOUGH}</span>
      </span>
      <span className="flex flex-none items-center gap-2">
        {figure.delta ? <DeltaChip delta={figure.delta} /> : null}
        <span className="y-body y-num font-medium">{figure.display}</span>
      </span>
    </button>
  );
}

const cardClass = "flex flex-col gap-1";

/** Brand: how quickly orders move (review time, changes, pitches, time to hire). */
export function SpeedCard({ report, onOpen }: { report: BrandReport; onOpen: (figure: Figure) => void }) {
  return (
    <Block as="section" tone="paper" pad="md" className={cardClass} aria-labelledby="pd-speed-t">
      <h2 id="pd-speed-t" className="y-head">
        How your orders move
      </h2>
      <div role="list" className="y-list">
        {report.speed.map((figure) => (
          <FigureRow key={figure.id} figure={figure} onOpen={onOpen} />
        ))}
      </div>
    </Block>
  );
}

/** Creator: pitches sent in the period by how far they got, and the win rate. */
export function PitchesCard({ report, onOpen }: { report: CreatorReport; onOpen: (figure: Figure) => void }) {
  const sent = report.funnel[0].count;
  return (
    <Block as="section" tone="paper" pad="md" className="flex flex-col gap-3" aria-labelledby="pd-pitch-t">
      <div className="flex items-center justify-between gap-3">
        <h2 id="pd-pitch-t" className="y-head">
          Your pitches
        </h2>
        <Link href={paths.pitches} className="y-small y-link font-medium">
          All pitches
        </Link>
      </div>
      {sent === 0 ? (
        <p className="y-small y-fg-2">
          No pitches sent in the {report.period.label.toLowerCase()}.{" "}
          <Link href={paths.findWork()} className="y-link font-medium text-(--y-ink)">
            Find work
          </Link>
        </p>
      ) : (
        <ol className="flex flex-col gap-2.5" aria-label={`Pitches sent in the ${report.period.label.toLowerCase()}`}>
          {report.funnel.map((step) => (
            <li key={step.id} className="grid grid-cols-[88px_minmax(0,1fr)_32px] items-center gap-3">
              <span className="y-small">{step.label}</span>
              <span aria-hidden className="h-2 overflow-hidden rounded-full bg-(--y-mist)">
                <span
                  className="block h-full rounded-full bg-(--y-ink)"
                  style={{ width: `${Math.max(step.count ? 4 : 0, (step.count / sent) * 100)}%` }}
                />
              </span>
              <span className="y-small y-num text-end font-medium">{step.count}</span>
            </li>
          ))}
        </ol>
      )}
      <div role="list" className="y-list border-t border-(--b-line)">
        <FigureRow figure={report.winRate} onOpen={onOpen} />
      </div>
    </Block>
  );
}

/** One short line about money that points to Billing or Earnings instead of repeating them. */
export function MoneyCard({ report }: { report: ProductivityReport }) {
  const link = (href: string, label: string) => (
    <Link href={href} className="y-small y-link inline-flex items-center gap-1 font-medium">
      {label} <ArrowRight size={14} aria-hidden className="y-flip" />
    </Link>
  );
  if (report.side === "brand") {
    const { held, campaignHeld } = report.money;
    return (
      <Block as="section" tone="paper" pad="md" className="flex items-start gap-3" aria-label="Money">
        <ShieldCheck size={18} aria-hidden className="mt-0.5 flex-none" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="y-small">
            <span className="font-semibold">{money(held)} held</span>
            <span className="y-fg-2">
              {" "}
              for work in progress{held > 0 && campaignHeld > 0 ? `, ${money(campaignHeld)} of it in campaigns` : ""}. It counts as spend
              once it&apos;s released.
            </span>
          </p>
          {link(paths.billing, "Billing and receipts")}
        </div>
      </Block>
    );
  }
  const { held, waitingOnPost, pending, withdrawable } = report.money;
  // Say where the pending money is; amounts only when it's in both places.
  const both = held > 0 && waitingOnPost > 0;
  const parts = [
    held > 0 ? `${both ? `${moneyExact(held)} ` : ""}for work in progress or in review` : "",
    waitingOnPost > 0 ? `${both ? `${moneyExact(waitingOnPost)} ` : ""}waiting on a post` : "",
  ].filter(Boolean);
  return (
    <Block as="section" tone="paper" pad="md" className="flex items-start gap-3" aria-label="Money">
      {withdrawable > 0 ? (
        <Wallet size={18} aria-hidden className="mt-0.5 flex-none" />
      ) : (
        <Hourglass size={18} aria-hidden className="mt-0.5 flex-none" />
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="y-small">
          <span className="font-semibold">{moneyExact(pending)} pending</span>
          {parts.length ? <span className="y-fg-2"> {parts.join(", ")}</span> : null}
          <span className="y-fg-2">. </span>
          <span className="font-semibold">{moneyExact(withdrawable)} ready to withdraw.</span>
        </p>
        {link(paths.wallet, "Earnings")}
      </div>
    </Block>
  );
}
