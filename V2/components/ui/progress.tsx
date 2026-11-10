import { Fragment } from "react";

/** Thin progress bar (V2). `value` 0–1. `done` turns it green (the job is finished). */
export function ProgressBar({
  value,
  label,
  done = false,
  className = "",
}: {
  value: number;
  /** Accessible description, e.g. "3 of 10 videos approved". */
  label: string;
  done?: boolean;
  className?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`y-progress ${className}`}
      data-tone={done ? "done" : undefined}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Key / value rows for side rails and summaries (a <dl>). */
export function KeyValues({
  rows,
  className = "",
}: {
  rows: { label: React.ReactNode; value: React.ReactNode }[];
  className?: string;
}) {
  // dt/dd are direct children of the grid, so `.y-kv > dd` (right-aligned values) applies.
  return (
    <dl className={`y-kv ${className}`}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
