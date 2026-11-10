"use client";

import { AlertCircle, Check } from "lucide-react";
import { useRef } from "react";

import type { BlockTone } from "@/components/ui/block";

/* -------------------------------------------------------------------------- */
/* Roving focus for radio groups (arrow keys move and select, like native)     */
/* -------------------------------------------------------------------------- */

function useRoving<T extends string>(values: T[], onChange: (value: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const rtl = event.currentTarget.closest("[dir]")?.getAttribute("dir") === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    let next = -1;
    if (event.key === forward || event.key === "ArrowDown") next = (index + 1) % values.length;
    if (event.key === backward || event.key === "ArrowUp")
      next = (index - 1 + values.length) % values.length;
    if (next < 0) return;
    event.preventDefault();
    onChange(values[next]);
    refs.current[next]?.focus();
  };
  const setRef = (index: number) => (node: HTMLButtonElement | null) => {
    refs.current[index] = node;
  };
  return { onKeyDown, setRef };
}

/* -------------------------------------------------------------------------- */
/* Chip radios: single choice among short options (team size, volume…)        */
/* -------------------------------------------------------------------------- */

export function ChipRadioGroup<T extends string>({
  label,
  labelledBy,
  options,
  value,
  onChange,
  invalid,
  describedBy,
  className = "",
}: {
  /** Accessible name when there is no visible label to point at. */
  label?: string;
  labelledBy?: string;
  options: { value: T; label: React.ReactNode }[];
  value: T | "";
  onChange: (value: T) => void;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}) {
  const values = options.map((option) => option.value);
  const { onKeyDown, setRef } = useRoving(values, onChange);
  const focusIndex = Math.max(0, values.indexOf(value as T));
  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`flex flex-wrap gap-2 ${className}`}
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={setRef(index)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={index === focusIndex ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => onKeyDown(event, index)}
          className="y-filter"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Choice cards: big selectable tiles (role, creator type, formats)            */
/* -------------------------------------------------------------------------- */

type CardOption<T extends string> = {
  value: T;
  title: React.ReactNode;
  body?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: BlockTone;
  extra?: React.ReactNode;
};

function Indicator({ checked, kind }: { checked: boolean; kind: "radio" | "checkbox" }) {
  return (
    <span
      aria-hidden
      className={`grid size-7 flex-none place-items-center rounded-full ${
        checked ? "bg-(--b-fg) text-(--b-bg)" : "shadow-[inset_0_0_0_2px_var(--b-fg-3)]"
      }`}
    >
      {checked ? (
        kind === "radio" ? (
          <span className="size-2.5 rounded-full bg-current" />
        ) : (
          <Check size={15} strokeWidth={3} />
        )
      ) : null}
    </span>
  );
}

function CardInner<T extends string>({
  option,
  checked,
  kind,
  size,
}: {
  option: CardOption<T>;
  checked: boolean;
  kind: "radio" | "checkbox";
  size: "md" | "lg";
}) {
  return (
    <>
      <span className="flex w-full items-start gap-4">
        {option.icon ? (
          <span
            aria-hidden
            className={`y-tile grid flex-none place-items-center !rounded-full max-sm:hidden ${size === "lg" ? "size-12" : "size-10"}`}
          >
            {option.icon}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={size === "lg" ? "y-head !text-[17px]" : "y-head"}>{option.title}</span>
          {option.body ? <span className="y-small y-fg-2">{option.body}</span> : null}
        </span>
        <Indicator checked={checked} kind={kind} />
      </span>
      {option.extra}
    </>
  );
}

const cardClass = (checked: boolean, size: "md" | "lg") =>
  `y-block y-hoverable flex w-full flex-col gap-3 text-start transition-[box-shadow,transform] duration-(--y-dur-1) active:scale-[0.99] ${
    size === "lg" ? "p-5" : "p-4"
  } ${checked ? "!shadow-[inset_0_0_0_2px_var(--y-ink)]" : ""}`;

/** Single-choice cards with radio semantics and arrow-key navigation. */
export function RadioCards<T extends string>({
  label,
  labelledBy,
  options,
  value,
  onChange,
  size = "md",
  className = "flex flex-col gap-2",
  invalid,
  describedBy,
}: {
  label?: string;
  labelledBy?: string;
  options: CardOption<T>[];
  value: T | "";
  onChange: (value: T) => void;
  size?: "md" | "lg";
  className?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const values = options.map((option) => option.value);
  const { onKeyDown, setRef } = useRoving(values, onChange);
  const focusIndex = Math.max(0, values.indexOf(value as T));
  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={className}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={setRef(index)}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === focusIndex ? 0 : -1}
            data-tone={option.tone ?? "paper"}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cardClass(checked, size)}
          >
            <CardInner option={option} checked={checked} kind="radio" size={size} />
          </button>
        );
      })}
    </div>
  );
}

/** Multi-choice cards (checkbox semantics). */
export function CheckCards<T extends string>({
  label,
  labelledBy,
  options,
  values,
  onToggle,
  size = "md",
  className = "grid gap-2 sm:grid-cols-2",
  describedBy,
}: {
  label?: string;
  labelledBy?: string;
  options: CardOption<T>[];
  values: T[];
  onToggle: (value: T) => void;
  size?: "md" | "lg";
  className?: string;
  describedBy?: string;
}) {
  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={className}
    >
      {options.map((option) => {
        const checked = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role="checkbox"
            aria-checked={checked}
            data-tone={option.tone ?? "paper"}
            onClick={() => onToggle(option.value)}
            className={cardClass(checked, size)}
          >
            <CardInner option={option} checked={checked} kind="checkbox" size={size} />
          </button>
        );
      })}
    </div>
  );
}

/** Toggle helper for multi-select arrays. */
export function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** Group label used above chip groups and card groups (matches FieldShell's label). */
export function GroupLabel({
  id,
  children,
  required,
  optional,
}: {
  id: string;
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <p id={id} className="y-label">
      <span>{children}</span>
      <span className="y-micro y-fg-2 font-medium">
        {required ? "Required" : optional ? "Optional" : ""}
      </span>
    </p>
  );
}

/** Inline error for groups (chips/cards) that aren't wrapped in a FieldShell. */
export function GroupError({ id, children }: { id?: string; children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
      <AlertCircle size={16} aria-hidden className="flex-none" />
      {children}
    </p>
  );
}
