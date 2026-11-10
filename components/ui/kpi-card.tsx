import type { ReactNode } from "react";

import { Block } from "./block";
import { Sparkline } from "./charts";
import { DeltaChip, SampleChip } from "./tags";

/**
 * KPI card (Productivity, wallet and profile figures): label, a light large value, an optional
 * delta chip and a sparkline. `tone="neon"` is the green version for the one highlighted figure in
 * a row (the first card); its delta and sparkline turn black. A figure the platform can't compute
 * yet passes `value={null}` and an `empty` line ("Connect an ad account"), and shows no number
 * (round 3 answers, item 36). Pass `<CountUp>` as `value` for a count-up on first view.
 */
export function KpiCard({
  label,
  value,
  delta,
  spark,
  sample = false,
  empty,
  tone = "paper",
  curve = "smooth",
  className = "",
}: {
  label: ReactNode;
  value: ReactNode | null;
  /** `good`: undefined = up is good, null = no better direction (neutral chip). */
  delta?: { label: ReactNode; direction: "up" | "down"; good?: boolean | null };
  spark?: number[];
  /** Sparkline shape: "monotone" for running totals and steps (see `LineChart`). */
  curve?: "smooth" | "monotone";
  /** Adds the dashed "Sample" chip: every sample figure carries it. */
  sample?: boolean;
  /** Shown instead of the value when `value` is null. */
  empty?: ReactNode;
  tone?: "paper" | "neon";
  className?: string;
}) {
  return (
    <Block tone={tone} pad="none" className={`y-kpi ${className}`}>
      <div className="y-kpi-top">
        <span className="min-w-0 truncate">{label}</span>
        <span className="flex flex-none items-center gap-1.5">
          {sample ? <SampleChip /> : null}
          {delta && value !== null ? (
            <DeltaChip direction={delta.direction} good={delta.good}>
              {delta.label}
            </DeltaChip>
          ) : null}
        </span>
      </div>
      {value === null ? (
        <div className="y-kpi-empty">{empty}</div>
      ) : (
        <>
          <span className="y-kpi-v">{value}</span>
          {spark && spark.length > 1 ? <Sparkline values={spark} curve={curve} className="mt-auto" /> : null}
        </>
      )}
    </Block>
  );
}
