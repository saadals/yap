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
            style={{ flexGrow: segment.value, flexBasis: 0, minWidth: 4, background: segment.color }}
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
            style={{ height: `${Math.max(8, (value / max) * 100)}%`, animationDelay: `${index * 40}ms` }}
          />
          {labels ? <span className="y-micro y-fg-2">{labels[index]}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function Sparkline({
  values,
  width = 120,
  height = 36,
  className = "",
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((value, index) => [
    index * step,
    height - 4 - ((value - min) / span) * (height - 8),
  ]);
  const d = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden
      className={`overflow-visible ${className}`}
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="4" fill="currentColor" />
    </svg>
  );
}
