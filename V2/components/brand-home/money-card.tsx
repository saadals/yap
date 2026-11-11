"use client";

import { ChartNoAxesColumn, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Block } from "@/components/ui/block";
import { money } from "@/lib/format";
import { paths } from "@/lib/paths";
import { DEFAULT_RANGE, brandReport, periodFor } from "@/lib/productivity";
import { businessSpend } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

/** The three Productivity figures Home shows, by id, with a short label for a 1/3-width cell. */
const SHOWN = [
  { id: "spend", label: "Spent" },
  { id: "videos", label: "Videos" },
  { id: "onTime", label: "On time" },
] as const;

/** Each half of the card is one link, with the row hover (`.y-row`) laid out as a column. */
const HALF = "y-row !flex-col !items-stretch !gap-3 !p-5";

/**
 * Ordering Home's money card, the first thing in the side column: what's held for work in
 * progress (the page's one big number, into Billing), then three Productivity figures for the last
 * 30 days (small numbers, into Productivity). Without money held it is only the figures; a buyer
 * profile that has never ordered sees nothing.
 */
export function MoneyCard() {
  const s = useDemo();
  const held = businessSpend(s).held;
  const report = brandReport(s, DEFAULT_RANGE);
  if (held <= 0 && !report.hasHistory) return null;

  const figures = SHOWN.map((shown) => ({ ...shown, figure: report.kpis.find((f) => f.id === shown.id) }));
  const period = periodFor(DEFAULT_RANGE).label;

  return (
    <Block as="section" aria-label="Money" tone="paper" pad="none" className="overflow-hidden">
      {held > 0 ? (
        <Link href={paths.billing} className={HALF} aria-label={`Billing: ${money(held)} held for work in progress`}>
          <span className="flex items-center justify-between gap-3">
            <span className="y-small flex items-center gap-2 font-medium">
              <ShieldCheck size={17} aria-hidden />
              Held for work in progress
            </span>
            <span className="y-small y-link font-medium">Billing</span>
          </span>
          <span className="flex flex-col gap-1.5" aria-hidden>
            <span className="y-display y-num text-[36px] leading-none font-normal tracking-[-0.03em]">{money(held)}</span>
            <span className="y-micro y-fg-2">Paid to creators only when you approve.</span>
          </span>
        </Link>
      ) : null}
      {report.hasHistory ? (
        <Link
          href={paths.productivity({ as: "brand" })}
          className={`${HALF} ${held > 0 ? "border-t border-(--b-line)" : ""}`}
          aria-label={`Productivity, ${period.toLowerCase()}: ${figures
            .map(({ figure, label }) => `${label} ${figure?.display ?? "—"}`)
            .join(", ")}`}
        >
          <span className="flex items-center justify-between gap-3">
            <span className="y-small flex items-center gap-2 font-medium">
              <ChartNoAxesColumn size={17} aria-hidden />
              {period}
            </span>
            <span className="y-small y-link font-medium">Productivity</span>
          </span>
          <span className="grid grid-cols-3 gap-3" aria-hidden>
            {figures.map(({ id, label, figure }) => (
              <span key={id} className="flex min-w-0 flex-col gap-0.5">
                <span className="y-head y-num truncate font-normal">{figure?.display ?? "—"}</span>
                <span className="y-micro y-fg-2 truncate">{label}</span>
              </span>
            ))}
          </span>
        </Link>
      ) : null}
    </Block>
  );
}
