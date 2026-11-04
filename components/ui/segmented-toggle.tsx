"use client";

import { useRef } from "react";

/** Weekly / Monthly style toggle. A radiogroup with roving focus and arrow-key navigation. */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "sm",
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
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
    <div role="radiogroup" aria-label={label} className={`y-seg ${className}`} data-size={size}>
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
          </button>
        );
      })}
    </div>
  );
}
