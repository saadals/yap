"use client";

import { useRef } from "react";

/** Six single-digit boxes: auto-advance, backspace to previous, paste fills all. Always LTR. */
export function OtpInput({
  value,
  onChange,
  label,
  invalid,
  describedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join("").slice(0, 6));
  };

  return (
    <div role="group" aria-label={label} dir="ltr" className="flex justify-between gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`${index + 1} / 6`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={digit}
          autoFocus={index === 0}
          className="y-input y-display y-num h-16 w-full min-w-0 !rounded-[18px] !px-0 text-center text-[28px] font-semibold"
          onChange={(event) => {
            const char = event.target.value.replace(/\D/g, "").slice(-1);
            setDigit(index, char);
            if (char && index < 5) refs.current[index + 1]?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digit && index > 0) refs.current[index - 1]?.focus();
            if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
            if (event.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (pasted) {
              event.preventDefault();
              onChange(pasted);
              refs.current[Math.min(pasted.length, 5)]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}
