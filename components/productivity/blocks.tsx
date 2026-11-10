"use client";

import { ArrowRight, Hourglass, ShieldCheck, Wallet } from "lucide-react";
import Link from "next/link";

import { Block } from "@/components/ui/block";
import { LineChart } from "@/components/ui/charts";
import { CardHead } from "@/components/ui/page";
import { StatusChip } from "@/components/ui/tags";
import { money, moneyExact } from "@/lib/format";
import { paths } from "@/lib/paths";
import type { BrandReport, CreatorReport, Figure, ProductivityReport } from "@/lib/productivity";

import { FigureTile } from "./figures";

/** The hero figure over the period (a running total), against the previous period at the same point. */
export function TrendCard({ report }: { report: ProductivityReport }) {
  const { period, series } = report;
  const hero = report.kpis[0];
  const what = report.side === "brand" ? "spend" : "earnings";
  const empty = series.values.every((v) => v === 0) && series.compare.every((v) => v === 0);
  const previousTotal = series.compare[series.compare.length - 1] ?? 0;
  const summary = `${hero.label}: ${hero.display} in the ${period.label.toLowerCase()}, against ${moneyExact(previousTotal)} in the ${period.compareLabel}.`;
  return (
    <Block as="section" tone="paper" pad="none" className="y-pd-card" aria-labelledby="pd-trend-t">
      <CardHead id="pd-trend-t" as="h2" title={report.side === "brand" ? "Spend over time" : "Earnings over time"} aside={`vs ${period.compareLabel}`} />
      {empty ? (
        <div className="y-pd-flat">
          <p className="y-small y-fg-2">
            No {what} released in the {period.label.toLowerCase()} or the {period.compareLabel}. Try a longer range.
          </p>
        </div>
      ) : (
        <LineChart
          key={`${report.side}-${period.range}`}
          className="y-pd-chart"
          values={series.values}
          compare={series.compare}
          labels={series.labels}
          axis={series.axis}
          grid={4}
          height="var(--pd-chart-h)"
          curve="monotone"
          format={(n) => moneyExact(n)}
          legend={{ value: period.label, compare: `The ${period.compareLabel}` }}
          label={summary}
        />
      )}
    </Block>
  );
}

/** Brand: what's open right now, and how quickly orders move. */
export function BrandWorkCard({ report, onOpen }: { report: BrandReport; onOpen: (figure: Figure) => void }) {
  return (
    <Block as="section" tone="paper" pad="none" className="y-pd-card" aria-labelledby="pd-work-t">
      <CardHead
        id="pd-work-t"
        as="h2"
        title="Your orders"
        aside={
          <Link href={paths.work("ordered")} className="y-pd-link">
            Open Work <ArrowRight size={14} aria-hidden className="y-flip" />
          </Link>
        }
      />
      <p className="y-eyebrow mt-1">Open now</p>
      {report.openWork.length ? (
        <ul className="y-pd-status">
          {report.openWork.map((row) => (
            <li key={row.id} title={row.hint}>
              <StatusChip look={row.look}>{row.label}</StatusChip>
              <span className="y-num">{row.count}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2 py-3">Nothing open right now.</p>
      )}
      <p className="y-eyebrow mt-5">Speed · {report.period.label.toLowerCase()}</p>
      <div className="y-statgrid mt-2" style={{ "--cols": 2 } as React.CSSProperties}>
        {report.speed.map((figure) => (
          <FigureTile key={figure.id} figure={figure} onOpen={onOpen} />
        ))}
      </div>
    </Block>
  );
}

/** Creator: pitches sent in the period by how far they got, and the win rate. */
export function PitchFunnelCard({ report, onOpen }: { report: CreatorReport; onOpen: (figure: Figure) => void }) {
  const sent = report.funnel[0].count;
  return (
    <Block as="section" tone="paper" pad="none" className="y-pd-card" aria-labelledby="pd-work-t">
      <CardHead
        id="pd-work-t"
        as="h2"
        title="Your pitches"
        aside={
          <Link href={paths.pitches} className="y-pd-link">
            All pitches <ArrowRight size={14} aria-hidden className="y-flip" />
          </Link>
        }
      />
      {sent === 0 ? (
        <div className="y-pd-flat">
          <p className="y-small y-fg-2">
            No pitches sent in the {report.period.label.toLowerCase()}.{" "}
            <Link href={paths.findWork()} className="y-link font-medium text-(--y-ink)">
              Find work
            </Link>
          </p>
        </div>
      ) : (
        <ol className="y-pd-funnel" aria-label={`Pitches sent in the ${report.period.label.toLowerCase()}`}>
          {report.funnel.map((step, index) => {
            const before = index ? report.funnel[index - 1].count : 0;
            return (
              <li key={step.id}>
                <span className="y-pd-funnel-l">{step.label}</span>
                <span className="y-pd-funnel-bar" aria-hidden>
                  <span style={{ width: `${Math.max(step.count ? 4 : 0, (step.count / sent) * 100)}%` }} />
                </span>
                <span className="y-pd-funnel-n y-num">
                  {step.count}
                  {index > 0 && before > 0 ? <small>{Math.round((step.count / before) * 100)}%</small> : null}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <div className="y-statgrid mt-4" style={{ "--cols": 1 } as React.CSSProperties}>
        <FigureTile figure={report.winRate} onOpen={onOpen} />
      </div>
    </Block>
  );
}

/** One short line about money that points to Billing or Wallet instead of repeating them. */
export function MoneyLine({ report }: { report: ProductivityReport }) {
  if (report.side === "brand") {
    const { held, campaignHeld } = report.money;
    return (
      <Block as="section" tone="paper" pad="none" className="y-pd-money" aria-label="Money">
        <span className="y-pd-money-ic" aria-hidden>
          <ShieldCheck size={18} />
        </span>
        <p className="y-small y-pd-money-t">
          <span className="font-semibold">{money(held)} held</span>
          <span className="y-fg-2">
            {" "}
            for work in progress{held > 0 && campaignHeld > 0 ? `, ${money(campaignHeld)} of it in campaigns` : ""}. It
            counts as spend once it&apos;s released.
          </span>
        </p>
        <Link href={paths.billing} className="y-pd-link flex-none">
          Billing and receipts <ArrowRight size={14} aria-hidden className="y-flip" />
        </Link>
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
    <Block as="section" tone="paper" pad="none" className="y-pd-money" aria-label="Money">
      <span className="y-pd-money-ic" aria-hidden>
        {withdrawable > 0 ? <Wallet size={18} /> : <Hourglass size={18} />}
      </span>
      <p className="y-small y-pd-money-t">
        <span className="font-semibold">{moneyExact(pending)} pending</span>
        {parts.length ? <span className="y-fg-2"> {parts.join(", ")}</span> : null}
        <span className="y-fg-2"> · </span>
        <span className="font-semibold">{moneyExact(withdrawable)} ready to withdraw</span>
      </p>
      <Link href={paths.wallet} className="y-pd-link flex-none">
        Wallet <ArrowRight size={14} aria-hidden className="y-flip" />
      </Link>
    </Block>
  );
}
