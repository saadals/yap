import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "ink" | "neon";

/** Status badge: always icon + label so status never relies on colour alone. */
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
