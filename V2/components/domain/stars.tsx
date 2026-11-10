"use client";

import { Star } from "lucide-react";
import { useRef } from "react";

/** "★ 4.9 (87)" — compact rating. */
export function Rating({
  value,
  count,
  size = "sm",
  className = "",
}: {
  value: number;
  count?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${size === "md" ? "y-body" : "y-small"} ${className}`}
      aria-label={`Rated ${value.toFixed(1)} out of 5${count !== undefined ? ` from ${count} reviews` : ""}`}
    >
      <Star size={size === "md" ? 18 : 15} aria-hidden className="fill-current" />
      <span aria-hidden className="y-num">{value.toFixed(1)}</span>
      {count !== undefined ? (
        <span aria-hidden className="y-fg-2 font-normal">
          ({count.toLocaleString("en-US")})
        </span>
      ) : null}
    </span>
  );
}

/** Five static stars (for review cards). */
export function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          aria-hidden
          className={i < Math.round(value) ? "fill-current" : "opacity-25"}
        />
      ))}
    </span>
  );
}

/** Accessible star input: a radiogroup with arrow-key support. */
export function StarInput({
  value,
  onChange,
  label,
  size = 32,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  size?: number;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const words = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label={label} className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            ref={(node) => {
              refs.current[n - 1] = node;
            }}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}, ${words[n]}`}
            tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
            onClick={() => onChange(n)}
            onKeyDown={(event) => {
              let next = 0;
              if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.min(5, (value || 0) + 1);
              if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.max(1, (value || 1) - 1);
              if (next) {
                event.preventDefault();
                onChange(next);
                refs.current[next - 1]?.focus();
              }
            }}
            className="rounded-full p-0.5 transition-transform duration-(--y-dur-1) hover:scale-110"
          >
            <Star
              size={size}
              aria-hidden
              strokeWidth={1.75}
              className={n <= value ? "fill-current" : "opacity-30"}
            />
          </button>
        ))}
      </div>
      <span className="y-small y-fg-2 min-w-16" aria-hidden>
        {words[value]}
      </span>
    </div>
  );
}
