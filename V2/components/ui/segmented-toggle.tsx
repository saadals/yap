"use client";

import { useRef } from "react";

/**
 * Segmented control: a radiogroup with roving focus and arrow-key navigation; the selected option
 * is the dark primary pill. sm 34px (compact toggles), md 40px (the previews' Work tabs, order
 * tabs, Productivity's brand/creator switch), lg 44px (Find work's type bar). An option can carry
 * a count (it turns green when selected). `fill` makes it span its row on phones, with the options
 * sharing it evenly; `phoneCounts={false}` drops the counts under 768px when the labels need the
 * room (Find work's type bar).
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "sm",
  fill = false,
  phoneCounts = true,
  className = "",
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md" | "lg";
  fill?: boolean;
  phoneCounts?: boolean;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const rtl =
      (event.currentTarget as HTMLElement).closest("[dir]")?.getAttribute("dir") === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    let next = -1;
    if (event.key === forward || event.key === "ArrowDown") next = (index + 1) % options.length;
    if (event.key === backward || event.key === "ArrowUp")
      next = (index - 1 + options.length) % options.length;
    if (next >= 0) {
      event.preventDefault();
      onChange(options[next].value);
      refs.current[next]?.focus();
    }
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`y-seg ${className}`}
      data-size={size}
      data-fill={fill ? "true" : undefined}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={`y-seg-count ${phoneCounts ? "" : "max-md:hidden"}`}>
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
