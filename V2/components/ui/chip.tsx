import type { ReactNode } from "react";

export function Chip({
  children,
  icon,
  className = "",
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`y-chip ${className}`}>
      {icon}
      {children}
    </span>
  );
}

/**
 * Toggle pill for filters; pressed = black (white on night blocks). md: the 44px chunky pill
 * (white with a hairline). sm: the previews' small pressed pill (quiet fill, 32px on desktop and
 * 44px under 1024px) for sidebar filters, platforms, deadlines and quick picks.
 */
export function FilterChip({
  pressed,
  onClick,
  count,
  icon,
  size = "md",
  children,
  className = "",
}: {
  pressed: boolean;
  onClick: () => void;
  count?: number | string;
  icon?: ReactNode;
  size?: "sm" | "md";
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`y-filter ${className}`}
      data-size={size === "sm" ? "sm" : undefined}
    >
      {icon}
      <span>{children}</span>
      {count !== undefined ? <span className="y-count">{count}</span> : null}
    </button>
  );
}
