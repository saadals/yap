"use client";

import { ArrowDownRight, ArrowUpRight, Info, PlugZap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { KeyValues } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { AD_ACCOUNT_LINE, NOT_ENOUGH, type AdMetric, type Delta, type Figure, type Period, type ProductivitySide } from "@/lib/productivity";

/**
 * A change against the previous period: an arrow and "18%" or "6 pts". Green when it moved the good
 * way, red when the bad way, and neutral when the figure has no better direction (a brand's spend,
 * how many videos it ordered): more spend is neither good nor bad news.
 */
export function DeltaChip({ delta }: { delta: Delta }) {
  const Icon = delta.direction === "up" ? ArrowUpRight : ArrowDownRight;
  const tone = delta.good === null ? "neutral" : delta.good ? "success" : "danger";
  return (
    <Badge tone={tone} icon={<Icon size={13} strokeWidth={2.25} aria-hidden />} className="y-num">
      <span className="sr-only">{delta.direction === "up" ? "Up " : "Down "}</span>
      {delta.label}
    </Badge>
  );
}

const spoken = (figure: Figure) =>
  `${figure.label}: ${figure.value === null ? `—, ${NOT_ENOUGH.toLowerCase()}` : figure.display}${figure.delta ? `. ${figure.delta.text}` : ""}. About this figure`;

/**
 * One key figure as a tile: its label, a light big number and the change against the previous
 * period. Below the minimum it shows "—" and "Not enough data yet", never a 0% or 100% from too
 * few orders. The whole tile opens what the figure means.
 */
export function FigureTile({ figure, onOpen, className = "" }: { figure: Figure; onOpen: (figure: Figure) => void; className?: string }) {
  const known = figure.value !== null;
  return (
    <button
      type="button"
      onClick={() => onOpen(figure)}
      aria-label={spoken(figure)}
      data-tone="paper"
      className={`y-block y-hoverable flex min-w-0 flex-col items-start gap-2 !rounded-(--y-r-block) p-4 text-start md:p-5 ${className}`}
    >
      <span className="y-small y-fg-2 flex w-full items-center gap-1.5">
        <span className="truncate">{figure.label}</span>
        <Info size={13} strokeWidth={2} aria-hidden className="flex-none opacity-70" />
      </span>
      <span className="y-display y-num text-[28px] leading-none tracking-[-0.02em] md:text-[32px]">{figure.display}</span>
      <span className="y-micro y-fg-2 flex min-h-6 w-full items-center">
        {!known ? NOT_ENOUGH : figure.delta ? <DeltaChip delta={figure.delta} /> : <span className="y-clamp-2">{figure.basis}</span>}
      </span>
    </button>
  );
}

/**
 * The figures that need a connected ad account: their names and one plain line, no number and no
 * button (nothing can be connected in this version; round 3 answers, item 36).
 */
export function AdMetricsLine({ metrics, side }: { metrics: AdMetric[]; side: ProductivitySide }) {
  // "Reach and hook rate": names after the first are mid-sentence (acronyms keep their capitals).
  const names = metrics.map((m, i) => (i === 0 || m.label === m.label.toUpperCase() ? m.label : m.label.charAt(0).toLowerCase() + m.label.slice(1)));
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
  return (
    <p className="y-small y-fg-2 flex items-start gap-2">
      <PlugZap size={16} aria-hidden className="mt-0.5 flex-none" />
      <span>
        <span className="font-medium text-(--y-ink)">{list}</span>
        {side === "brand"
          ? ` · ${AD_ACCOUNT_LINE} to see them. Not available in this version yet.`
          : " · Shown once the brands you work with connect an ad account. Not available in this version yet."}
      </span>
    </p>
  );
}

/** What a figure means, what it rests on, and its minimum. */
export function FigureSheet({ figure, period, onClose }: { figure: Figure | null; period: Period; onClose: () => void }) {
  return (
    <Sheet open={figure !== null} onClose={onClose} title={figure?.label ?? ""} description={period.label} width="sm">
      {figure ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="y-display y-num text-[40px] leading-none tracking-[-0.03em]">{figure.display}</span>
            {figure.delta ? <DeltaChip delta={figure.delta} /> : null}
          </div>
          <KeyValues
            rows={[
              { label: period.label, value: figure.display },
              { label: `The ${period.compareLabel}`, value: figure.previousDisplay },
              { label: "Based on", value: figure.basis },
            ]}
          />
          <div className="flex flex-col gap-2">
            <h3 className="y-small font-semibold">How it&apos;s worked out</h3>
            <p className="y-small y-fg-2">{figure.definition}</p>
            {figure.minimum ? (
              <p className="y-small y-fg-2">{figure.minimum} Until then it shows “—”, never a 0% or 100% from too few orders.</p>
            ) : null}
            <p className="y-small y-fg-2">From your orders on Yapp only. Nothing here comes from an ad account.</p>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
