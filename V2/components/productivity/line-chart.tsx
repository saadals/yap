"use client";

import { useId, useState } from "react";

type Point = [number, number];

/**
 * Monotone cubic through the points (Fritsch–Carlson, as d3's monotoneX): smooth, but it never
 * overshoots a point, so a flat run stays flat and a running total never dips.
 */
function monotonePath(points: Point[]): string {
  const f = (n: number) => n.toFixed(2);
  if (points.length < 3) return points.map(([x, y], i) => `${i ? "L" : "M"}${f(x)},${f(y)}`).join(" ");
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

/**
 * Productivity's one chart: a running total over the period (ink line, faint fill) against the
 * previous period at the same points (dashed). Pointer or touch snaps a read-out to the nearest
 * point. `label` is the summary sentence for screen readers; a visually hidden table carries the
 * numbers. No animation: the figures above already say the totals.
 */
export function LineChart({
  values,
  compare,
  labels,
  axis,
  legend,
  format,
  label,
  className = "",
}: {
  values: number[];
  compare?: number[];
  labels: string[];
  axis: string[];
  legend: { value: string; compare?: string };
  format: (value: number) => string;
  label: string;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const gradientId = `pdc${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const all = compare ? [...values, ...compare] : values;
  const max = Math.max(...all, 0);
  const min = Math.min(...all, 0);
  const range = max - min || 1;
  const toPoints = (series: number[]): Point[] =>
    series.map((value, index) => [
      series.length > 1 ? (index / (series.length - 1)) * 100 : 50,
      6 + (1 - (value - min) / range) * 88,
    ]);
  const points = toPoints(values);
  const line = monotonePath(points);
  const last = points[points.length - 1];
  const point = active === null ? null : points[active];

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    setActive(Math.round(x * (values.length - 1)));
  };

  return (
    <figure className={`m-0 flex flex-col gap-2 ${className}`}>
      <figcaption className="sr-only">{label}</figcaption>
      <div
        aria-hidden
        dir="ltr"
        className="relative h-[168px] touch-pan-y md:h-[208px]"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--y-ink)", stopOpacity: 0.09 }} />
              <stop offset="1" style={{ stopColor: "var(--y-ink)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((index) => {
            const y = 6 + (index / 3) * 88;
            return (
              <line key={index} x1="0" x2="100" y1={y} y2={y} stroke="var(--y-line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            );
          })}
          {compare ? (
            <path
              d={monotonePath(toPoints(compare))}
              fill="none"
              stroke="var(--y-ink-3)"
              strokeWidth="1.6"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <path d={`${line} L100,100 L0,100 Z`} fill={`url(#${gradientId})`} />
          <path
            d={line}
            fill="none"
            stroke="var(--y-ink)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {last && !point ? (
          <span
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--y-ink) ring-3 ring-(--y-paper)"
            style={{ left: `${last[0]}%`, top: `${last[1]}%` }}
          />
        ) : null}
        {point && active !== null ? (
          <>
            <span className="absolute inset-y-0 w-px bg-(--y-line-strong)" style={{ left: `${point[0]}%` }} />
            <span
              className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--y-ink) ring-3 ring-(--y-paper)"
              style={{ left: `${point[0]}%`, top: `${point[1]}%` }}
            />
            <span
              className="y-micro y-num absolute -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-full bg-(--y-night) px-2.5 py-1 font-medium whitespace-nowrap text-(--y-night-fg)"
              style={{ left: `${Math.min(86, Math.max(14, point[0]))}%`, top: `${point[1]}%` }}
            >
              {format(values[active])}
              <span className="opacity-70"> · {labels[active]}</span>
            </span>
          </>
        ) : null}
      </div>
      <div aria-hidden className="y-micro y-fg-2 flex justify-between">
        {axis.map((tick, index) => (
          <span key={`${tick}-${index}`}>{tick}</span>
        ))}
      </div>
      <div aria-hidden className="y-micro y-fg-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-0.5 w-4 rounded-full bg-(--y-ink)" />
          {legend.value}
        </span>
        {legend.compare ? (
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block w-4 border-t-2 border-dashed border-(--y-ink-3)" />
            {legend.compare}
          </span>
        ) : null}
      </div>
      <div className="sr-only">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">{legend.value}</th>
              {compare ? <th scope="col">{legend.compare ?? "Comparison"}</th> : null}
            </tr>
          </thead>
          <tbody>
            {values.map((value, index) => (
              <tr key={index}>
                <th scope="row">{labels[index]}</th>
                <td>{format(value)}</td>
                {compare ? <td>{compare[index] === undefined ? "" : format(compare[index])}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
