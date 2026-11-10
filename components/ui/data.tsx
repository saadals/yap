import { Check } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Definition list for briefs (the job page, the order page's Brief tab, New order's check step):
 * term over detail, two columns from 768px, a hairline above each pair. `wide` spans both columns.
 */
export function DefinitionList({
  items,
  columns = 2,
  className = "",
}: {
  items: { term: ReactNode; detail: ReactNode; wide?: boolean }[];
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <dl className={`y-dl ${className}`} data-cols={columns}>
      {items.map((item, index) => (
        <div key={index} data-wide={item.wide ? "true" : undefined}>
          <dt>{item.term}</dt>
          <dd>{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Label on the start side, value on the end, a hairline between rows: money details, summaries,
 * "Maya receives $456 · Yapp fee (20%) $114". `total` is the bold last row; `look` colours a value
 * (red "Today", green "Released").
 */
export function DetailRows({
  rows,
  total,
  className = "",
}: {
  rows: { label: ReactNode; value: ReactNode; look?: "danger" | "success" }[];
  total?: { label: ReactNode; value: ReactNode };
  className?: string;
}) {
  return (
    <div className={`y-rows ${className}`}>
      {rows.map((row, index) => (
        <div key={index} data-look={row.look}>
          <span>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
      {total ? (
        <div data-look="total">
          <span>{total.label}</span>
          <span>{total.value}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Small stat box: a light value over a label, with an optional sub-line (green when good, red
 * when not). Use "—" as the value until there is enough data (round 3 answers, item 20).
 * sm: the person and brand cards (18px value); md: the Discover side panel (22px).
 */
export function StatBox({
  value,
  label,
  sub,
  good = true,
  size = "sm",
  className = "",
}: {
  value: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  good?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div className={`y-stat ${className}`} data-size={size}>
      <span className="y-stat-v">{value}</span>
      <span className="y-stat-k">{label}</span>
      {sub ? (
        <span className="y-stat-d" data-good={good ? undefined : "false"}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}

/** Even grid of `StatBox`es (3 across by default), 8px apart. */
export function StatGrid({
  columns = 3,
  children,
  className = "",
}: {
  columns?: 2 | 3 | 4;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`y-statgrid ${className}`} style={{ "--cols": columns } as React.CSSProperties}>
      {children}
    </div>
  );
}

/**
 * Checklist with green ticks. `plain`: ticks beside muted lines (the job page's CTA card).
 * `circle`: ticks in a tinted circle ("What happens" in a sheet).
 */
export function Checklist({
  items,
  look = "plain",
  className = "",
}: {
  items: ReactNode[];
  look?: "plain" | "circle";
  className?: string;
}) {
  return (
    <ul className={`y-checks ${className}`} data-look={look}>
      {items.map((item, index) => (
        <li key={index}>
          <span className="y-checks-ic" aria-hidden>
            <Check size={look === "circle" ? 12 : 15} strokeWidth={3} />
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}
