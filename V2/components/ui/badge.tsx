import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "active"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "ink"
  | "neon";

/**
 * Status badge: always icon + label so status never relies on colour alone. The five status looks:
 * neutral = waiting on someone, active = moving (black on a green tint), success = done,
 * warning = needs attention, danger = negative or closed. `info`, `ink` and `neon` are for
 * non-status labels.
 */
export function Badge({
  tone = "neutral",
  icon,
  children,
  className = "",
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`y-badge ${className}`} data-tone-badge={tone}>
      {icon}
      {children}
    </span>
  );
}
