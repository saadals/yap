"use client";

import { useId, useRef, useState } from "react";

import { useSeenOnce } from "./motion";

/** Stacked bar of labelled segments; the text equivalent goes in `label` (never colour alone). */
export function StackedBar({
  segments,
  label,
  className = "",
}: {
  segments: { value: number; color: string }[];
  label: string;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <span
      role="img"
      aria-label={label}
      className={`flex h-2.5 gap-[2px] overflow-hidden rounded-full ${className}`}
    >
      {total === 0 ? <span className="flex-1 rounded-full bg-(--b-line)" /> : null}
      {segments.map((segment, index) =>
        segment.value > 0 ? (
          <span
            key={index}
            className="h-full rounded-full"
            style={{
              flexGrow: segment.value,
              flexBasis: 0,
              minWidth: 4,
              background: segment.color,
            }}
          />
        ) : null,
      )}
    </span>
  );
}

/** Simple bar chart (values only); pair with a visible total or table for screen readers. */
export function MiniBars({
  values,
  labels,
  highlightLast = true,
  className = "",
}: {
  values: number[];
  labels?: string[];
  highlightLast?: boolean;
  className?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={`flex h-28 items-end gap-2 ${className}`} aria-hidden>
      {values.map((value, index) => (
        <div key={index} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span
            className={`y-bars-grow block w-full max-w-10 rounded-full ${
              highlightLast && index === values.length - 1 ? "bg-(--b-fg)" : "bg-(--b-line-strong)"
            }`}
            style={{
              height: `${Math.max(8, (value / max) * 100)}%`,
              animationDelay: `${index * 40}ms`,
            }}
          />
          {labels ? <span className="y-micro y-fg-2">{labels[index]}</span> : null}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Smooth line chart (Discover spec 4.3.4)                                    */
/* -------------------------------------------------------------------------- */

type Point = [number, number];

/** Catmull-Rom through the points, as cubic Béziers (the curve passes through every point). */
function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  const f = (n: number) => n.toFixed(2);
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

/**
 * Monotone cubic through the points (Fritsch–Carlson, as d3's monotoneX): smooth, but it never
 * overshoots a point, so a flat run stays flat and a running total never dips. For step-like data.
 */
function monotonePath(points: Point[]): string {
  if (points.length < 3) return smoothPath(points);
  const f = (n: number) => n.toFixed(2);
  const n = points.length;
  const slopes = points.slice(0, -1).map((p, i) => (points[i + 1][1] - p[1]) / (points[i + 1][0] - p[0] || 1));
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === n - 1) return slopes[n - 2];
    const a = slopes[i - 1];
    const b = slopes[i];
    if (a * b <= 0) return 0;
    const dxA = points[i][0] - points[i - 1][0];
    const dxB = points[i + 1][0] - points[i][0];
    return (3 * (dxA + dxB)) / ((2 * dxB + dxA) / a + (dxB + 2 * dxA) / b);
  });
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const third = (x2 - x1) / 3;
    d += ` C${f(x1 + third)},${f(y1 + tangents[i] * third)} ${f(x2 - third)},${f(y2 - tangents[i + 1] * third)} ${f(x2)},${f(y2)}`;
  }
  return d;
}

const defaultFormat = (value: number) =>
  value >= 100
    ? Math.round(value).toLocaleString("en-US")
    : value.toFixed(value < 10 ? 2 : 1).replace(/\.0+$/, "");

/**
 * Smooth line or area chart. The line draws in from the start the first time it is in view (1.7s;
 * change the chart's `key` to draw it again), the end dot appears after it, and hovering snaps a
 * read-out to the nearest point. Green line on light surfaces, black on a green block. An optional
 * dashed comparison line shares the scale. `label` is the one-sentence summary for screen readers;
 * a visually hidden table carries the numbers.
 */
export function LineChart({
  values,
  compare,
  label,
  labels,
  axis,
  legend,
  format = defaultFormat,
  unit,
  height = 170,
  fill = true,
  hover = true,
  endDot = true,
  draw = true,
  grid = 0,
  curve = "smooth",
  className = "",
}: {
  values: number[];
  /** Dashed comparison series (same length), e.g. "Typical paid social" or the previous period. */
  compare?: number[];
  /** Sentence for screen readers: "CAC fell from $55 to $38 between May and November". Empty:
   *  decorative (no caption, no table), as in `Sparkline`. */
  label: string;
  /** One label per point, for the read-out and the hidden table ("Oct 11"). */
  labels?: string[];
  /** Tick labels under the chart, spread evenly ("MAY", "JUN" or "Oct 11", "Oct 25", "Nov 9"). */
  axis?: string[];
  legend?: { value: string; compare?: string };
  format?: (value: number) => string;
  /** Muted unit after the value in the read-out ("views", "%"). */
  unit?: string;
  /** Plot height in px (or any CSS length). */
  height?: number | string;
  fill?: boolean;
  hover?: boolean;
  endDot?: boolean;
  /** Draw in on first view. Off: shown at once. */
  draw?: boolean;
  /** Number of faint horizontal grid lines. */
  grid?: number;
  /** "smooth" (Catmull-Rom, the default) or "monotone" (never overshoots: running totals, steps). */
  curve?: "smooth" | "monotone";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const path = curve === "monotone" ? monotonePath : smoothPath;
  const seen = useSeenOnce(ref);
  const [active, setActive] = useState<number | null>(null);
  const gradientId = `ych${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const all = compare ? [...values, ...compare] : values;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const toPoints = (series: number[]): Point[] =>
    series.map((value, index) => [
      series.length > 1 ? (index / (series.length - 1)) * 100 : 50,
      8 + (1 - (value - min) / range) * 84,
    ]);
  const points = toPoints(values);
  const line = path(points);
  const last = points[points.length - 1];
  const drawn = !draw || seen;

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    setActive(Math.round(x * (values.length - 1)));
  };
  const point = active === null ? null : points[active];

  return (
    <figure ref={ref} className={`y-chart m-0 ${className}`} data-drawn={drawn ? "true" : "false"}>
      {label ? <figcaption className="sr-only">{label}</figcaption> : null}
      <div
        className="y-chart-plot"
        dir="ltr"
        style={
          {
            "--chart-h": typeof height === "number" ? `${height}px` : height,
          } as React.CSSProperties
        }
        onPointerMove={hover ? onMove : undefined}
        onPointerDown={hover ? onMove : undefined}
        onPointerLeave={hover ? () => setActive(null) : undefined}
        aria-hidden
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--chart-line)", stopOpacity: 0.26 }} />
              <stop offset="1" style={{ stopColor: "var(--chart-line)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {Array.from({ length: grid }, (_, index) => {
            const y = 8 + (index / Math.max(1, grid - 1)) * 84;
            return (
              <line
                key={index}
                x1="0"
                x2="100"
                y1={y}
                y2={y}
                stroke="var(--y-line)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {compare ? (
            <path
              d={path(toPoints(compare))}
              fill="none"
              stroke="var(--chart-compare)"
              strokeWidth="1.6"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {fill ? <path d={`${line} L100,100 L0,100 Z`} fill={`url(#${gradientId})`} /> : null}
          <path
            d={line}
            fill="none"
            stroke="var(--chart-line)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {endDot && last ? (
          <span className="y-chart-end" style={{ left: `${last[0]}%`, top: `${last[1]}%` }} />
        ) : null}
        {point && active !== null ? (
          <>
            <span className="y-chart-vl" style={{ left: `${point[0]}%` }} />
            <span className="y-chart-dot" style={{ left: `${point[0]}%`, top: `${point[1]}%` }} />
            <span
              className="y-chart-tip"
              style={{ left: `${Math.min(88, Math.max(12, point[0]))}%`, top: `${point[1]}%` }}
            >
              {format(values[active])}
              {unit ? <span> {unit}</span> : null}
              {labels?.[active] ? <span> · {labels[active]}</span> : null}
            </span>
          </>
        ) : null}
      </div>
      {axis?.length ? (
        <div className="y-chart-axis" aria-hidden>
          {axis.map((tick, index) => (
            <span key={`${tick}-${index}`}>{tick}</span>
          ))}
        </div>
      ) : null}
      {legend ? (
        <div className="y-chart-legend" aria-hidden>
          <span>
            <i />
            {legend.value}
          </span>
          {legend.compare ? (
            <span>
              <i data-compare="true" />
              {legend.compare}
            </span>
          ) : null}
        </div>
      ) : null}
      {label ? (
        // A table ignores width and overflow, so the visually hidden box is a div around it.
        <div className="sr-only">
          <table>
            <caption>{label}</caption>
            <thead>
              <tr>
                <th scope="col">Point</th>
                <th scope="col">{legend?.value ?? "Value"}</th>
                {compare ? <th scope="col">{legend?.compare ?? "Comparison"}</th> : null}
              </tr>
            </thead>
            <tbody>
              {values.map((value, index) => (
                <tr key={index}>
                  <th scope="row">{labels?.[index] ?? index + 1}</th>
                  <td>
                    {format(value)}
                    {unit ? ` ${unit}` : ""}
                  </td>
                  {compare ? (
                    <td>{compare[index] === undefined ? "" : format(compare[index])}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </figure>
  );
}

/**
 * Sparkline: the same smooth line at 34px, full width, no read-out. For KPI cards and table rows.
 * Decorative: the figure next to it carries the number.
 */
export function Sparkline({
  values,
  height = 34,
  fill = false,
  endDot = false,
  curve = "smooth",
  className = "",
}: {
  values: number[];
  height?: number;
  fill?: boolean;
  endDot?: boolean;
  curve?: "smooth" | "monotone";
  className?: string;
}) {
  return (
    <div aria-hidden className={className}>
      <LineChart
        values={values}
        label=""
        height={height}
        fill={fill}
        endDot={endDot}
        hover={false}
        curve={curve}
      />
    </div>
  );
}
