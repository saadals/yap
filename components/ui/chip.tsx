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

/** Chunky toggle pill used for filters; pressed = black (white on night blocks). */
export function FilterChip({
  pressed,
  onClick,
  count,
  icon,
  children,
  className = "",
}: {
  pressed: boolean;
  onClick: () => void;
  count?: number | string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`y-filter ${className}`}
    >
      {icon}
      <span>{children}</span>
      {count !== undefined ? <span className="y-count">{count}</span> : null}
    </button>
  );
}
