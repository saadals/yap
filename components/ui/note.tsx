import type { ReactNode } from "react";

/**
 * Quiet inline note in a tinted tile: an icon and one line. md: money state in a details or
 * summary card ("$570 held · released to Maya when you approve", shield icon). sm: a small notice
 * above a list ("Private · only you and Maya see these comments", lock icon). Line icons only.
 */
export function Note({
  icon,
  size = "md",
  children,
  className = "",
}: {
  icon?: ReactNode;
  size?: "sm" | "md";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`y-note ${className}`} data-size={size}>
      {icon ? (
        <span aria-hidden className="y-note-ic">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0">{children}</span>
    </div>
  );
}
