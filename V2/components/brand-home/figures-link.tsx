"use client";

import { ChartNoAxesColumn } from "lucide-react";
import Link from "next/link";

import { paths } from "@/lib/paths";
import { DEFAULT_RANGE, brandReport, periodFor } from "@/lib/productivity";
import { useDemo } from "@/lib/store";

/** The three figures Home shows, by id, with a short label for a 1/3-width cell. */
const SHOWN = [
  { id: "spend", label: "Spent" },
  { id: "videos", label: "Videos" },
  { id: "onTime", label: "On time" },
] as const;

/**
 * The quiet way into Productivity from Ordering Home: three of its figures for the last 30 days,
 * the whole card one link. Small numbers (Home already has its one green and needs no big figure);
 * nothing shows for a buyer profile that has never ordered.
 */
export function FiguresLink() {
  const s = useDemo();
  const report = brandReport(s, DEFAULT_RANGE);
  if (!report.hasHistory) return null;
  const figures = SHOWN.map((shown) => ({ ...shown, figure: report.kpis.find((f) => f.id === shown.id) }));
  const label = periodFor(DEFAULT_RANGE).label;
  return (
    <Link
      href={paths.productivity({ as: "brand" })}
      className="y-block y-hoverable flex flex-col gap-3 !rounded-(--y-r-block) p-5"
      data-tone="paper"
      aria-label={`Productivity, ${label.toLowerCase()}: ${figures
        .map(({ figure, label: name }) => `${name} ${figure?.display ?? "—"}`)
        .join(", ")}`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="y-small flex items-center gap-2 font-medium">
          <ChartNoAxesColumn size={17} aria-hidden />
          {label}
        </span>
        <span className="y-small y-link font-medium">Productivity</span>
      </span>
      <span className="grid grid-cols-3 gap-3" aria-hidden>
        {figures.map(({ id, label: name, figure }) => (
          <span key={id} className="flex min-w-0 flex-col gap-0.5">
            <span className="y-head y-num truncate font-normal">{figure?.display ?? "—"}</span>
            <span className="y-micro y-fg-2 truncate">{name}</span>
          </span>
        ))}
      </span>
    </Link>
  );
}
