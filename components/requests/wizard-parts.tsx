"use client";

import { AlertCircle } from "lucide-react";

/** Inline error for groups (radio cards, chips) where there is no single input to mark. */
export function GroupError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
      <AlertCircle size={16} aria-hidden className="flex-none" />
      {message}
    </p>
  );
}

/**
 * Selectable tile (radio or checkbox). The real input stays visible as the check so focus,
 * keyboard and screen readers all work natively; the selected tile gets an ink ring.
 */
export function ChoiceTile({
  type = "radio",
  name,
  checked,
  onChange,
  onHover,
  disabled = false,
  children,
  className = "",
  label,
}: {
  type?: "radio" | "checkbox";
  name?: string;
  checked: boolean;
  onChange: () => void;
  onHover?: (on: boolean) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Accessible name when the visible content is long. */
  label?: string;
}) {
  return (
    <label
      className={`y-tile y-hoverable relative flex cursor-pointer items-start gap-3 p-4 ${
        checked ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""
      } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
      onMouseEnter={onHover ? () => onHover(true) : undefined}
      onMouseLeave={onHover ? () => onHover(false) : undefined}
    >
      <input
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        onFocus={onHover ? () => onHover(true) : undefined}
        onBlur={onHover ? () => onHover(false) : undefined}
        aria-label={label}
        className={`y-check order-last mt-0.5 ${type === "radio" ? "!rounded-full" : ""}`}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>
    </label>
  );
}

