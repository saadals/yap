"use client";

import { Info, PlugZap } from "lucide-react";

import { CountUp } from "@/components/ui/count-up";
import { DetailRows } from "@/components/ui/data";
import { KpiCard } from "@/components/ui/kpi-card";
import { Sheet } from "@/components/ui/sheet";
import { Sparkline } from "@/components/ui/charts";
import { DeltaChip } from "@/components/ui/tags";
import { formatFigure, NOT_ENOUGH, type AdMetric, type Figure, type Period, type ProductivitySide } from "@/lib/productivity";

/** Formats every frame of a count-up the way the final value is shown ("$180", "67%", "3"). */
function frameFormat(figure: Figure) {
  const final = figure.value ?? 0;
  return (n: number) => (Math.abs(n - final) < 0.005 ? figure.display : formatFigure(figure.unit === "money" ? Math.round(n) : n, figure.unit));
}

/**
 * One figure as a KPI card. The whole card opens its definition (the info note), so the label
 * carries a small info mark instead of a separate 44px button. Below the minimum it shows "—" and
 * "Not enough data yet", never a 0% or 100%.
 */
export function FigureCard({
  figure,
  hero = false,
  onOpen,
}: {
  figure: Figure;
  hero?: boolean;
  onOpen: (figure: Figure) => void;
}) {
  const known = figure.value !== null;
  return (
    <div className="y-pd-kpi" data-hero={hero ? "true" : undefined}>
      <KpiCard
        tone={hero ? "neon" : "paper"}
        curve="monotone"
        label={
          <span className="y-pd-kpi-l">
            {figure.label}
            <Info size={13} strokeWidth={2} aria-hidden />
          </span>
        }
        value={known ? <CountUp value={figure.value!} format={frameFormat(figure)} /> : null}
        empty={
          <>
            <span className="y-kpi-v !m-0">—</span>
            <span>{NOT_ENOUGH}</span>
          </>
        }
        delta={figure.delta ? { label: figure.delta.label, direction: figure.delta.direction, good: figure.delta.good } : undefined}
        spark={figure.spark}
      />
      <button
        type="button"
        className="y-pd-kpi-hit"
        aria-label={`${figure.label}: ${known ? figure.display : `—, ${NOT_ENOUGH.toLowerCase()}`}${figure.delta ? `. ${figure.delta.text}` : ""}. About this figure`}
        onClick={() => onOpen(figure)}
      />
    </div>
  );
}

/**
 * The figures that need a connected ad account: their names and "Connect an ad account", no
 * number and no button (nothing can be connected in this version; round 3 answers, item 36).
 */
export function AdMetricsCard({ metrics, side }: { metrics: AdMetric[]; side: ProductivitySide }) {
  return (
    <div className="y-pd-kpi" data-wide="true">
      <KpiCard
        label={metrics.map((m) => m.label).join(" · ")}
        value={null}
        empty={
          <>
            <span className="flex items-center gap-2 font-medium text-(--y-ink)">
              <PlugZap size={16} strokeWidth={2} aria-hidden />
              {side === "brand" ? "Connect an ad account" : "Shown when brands connect an ad account"}
            </span>
            <span>Not available in this version</span>
          </>
        }
      />
    </div>
  );
}

/** A figure as a small tile (speed figures, win rate) that opens its definition. */
export function FigureTile({ figure, onOpen }: { figure: Figure; onOpen: (figure: Figure) => void }) {
  const known = figure.value !== null;
  return (
    <button
      type="button"
      className="y-stat y-pd-tile"
      data-size="md"
      onClick={() => onOpen(figure)}
      aria-label={`${figure.label}: ${known ? figure.display : `—, ${NOT_ENOUGH.toLowerCase()}`}${figure.delta ? `. ${figure.delta.text}` : ""}. About this figure`}
    >
      <span className="y-stat-v">{figure.display}</span>
      <span className="y-stat-k y-pd-kpi-l">
        {figure.label}
        <Info size={12} strokeWidth={2} aria-hidden />
      </span>
      <span className="y-pd-tile-sub">
        {!known ? (
          NOT_ENOUGH
        ) : figure.delta ? (
          <DeltaChip direction={figure.delta.direction} good={figure.delta.good}>
            {figure.delta.label}
          </DeltaChip>
        ) : (
          figure.basis
        )}
      </span>
    </button>
  );
}

/** The info note: what a figure means, what it rests on, and its minimum. */
export function FigureSheet({
  figure,
  period,
  onClose,
}: {
  figure: Figure | null;
  period: Period;
  onClose: () => void;
}) {
  return (
    <Sheet open={figure !== null} onClose={onClose} title={figure?.label ?? ""} description={period.label} width="sm">
      {figure ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="y-fig-xl">{figure.display}</span>
              {figure.delta ? (
                <DeltaChip direction={figure.delta.direction} good={figure.delta.good}>
                  {figure.delta.label}
                </DeltaChip>
              ) : null}
            </div>
            {figure.spark.length > 1 ? <Sparkline values={figure.spark} curve="monotone" height={44} /> : null}
          </div>
          <DetailRows
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
              <p className="y-small y-fg-2">
                {figure.minimum} Until then it shows “—”, never a 0% or 100% from too few orders.
              </p>
            ) : null}
            <p className="y-small y-fg-2">From your orders on Yapp only. Nothing here comes from an ad account.</p>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
