"use client";

import { AlertCircle, Minus, Plus, X } from "lucide-react";
import { useId, useState } from "react";

import { Block, type BlockTone } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import type { Reference } from "@/lib/types";

/**
 * One question per block: a calm title, an optional hint, then the answer controls. `icon` marks
 * what the block is about (money, fit) where a tinted card used to say it.
 */
export function Question({
  id,
  title,
  icon,
  hint,
  tone = "paper",
  optional = false,
  aside,
  children,
  className = "",
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  tone?: BlockTone;
  optional?: boolean;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Block
      as="section"
      aria-labelledby={id}
      tone={tone}
      pad="md"
      className={`flex flex-col gap-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={id} className={`y-head ${icon ? "flex items-center gap-2" : ""}`}>
            {icon}
            {title}
            {optional ? <span className="y-small y-fg-3 ms-2 font-medium">Optional</span> : null}
          </h2>
          {hint ? <p className="y-small y-fg-2 max-w-[60ch]">{hint}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </Block>
  );
}

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

/** − 3 + stepper with a chunky numeral. */
export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  unit: (value: number) => string;
}) {
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <RoundIconButton
        label={`One fewer ${label.toLowerCase()}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="disabled:opacity-40"
      >
        <Minus size={20} aria-hidden />
      </RoundIconButton>
      <output
        aria-live="polite"
        className="y-display y-num w-16 text-center text-[44px] leading-none font-semibold tracking-[-0.04em]"
      >
        {value}
      </output>
      <RoundIconButton
        label={`One more ${label.toLowerCase()}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="disabled:opacity-40"
      >
        <Plus size={20} aria-hidden />
      </RoundIconButton>
      <span className="y-small y-fg-2">{unit(value)}</span>
    </div>
  );
}

/** Editable list of short lines (must include / avoid). Enter adds, each row can be removed. */
export function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  max = 10,
  marker,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  max?: number;
  marker: React.ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const add = () => {
    const text = draft.trim();
    if (!text || items.includes(text) || items.length >= max) return;
    onChange([...items, text]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-2">
      {items.length ? (
        <ul className="flex flex-col gap-2" aria-label={label}>
          {items.map((item, index) => (
            <li key={index} className="y-tile flex items-center gap-2 py-1.5 ps-3 pe-1.5">
              <span aria-hidden className="flex-none">
                {marker}
              </span>
              <label className="sr-only" htmlFor={`${inputId}-${index}`}>
                {label} {index + 1}
              </label>
              <input
                id={`${inputId}-${index}`}
                value={item}
                onChange={(event) =>
                  onChange(items.map((x, i) => (i === index ? event.target.value : x)))
                }
                onBlur={() => {
                  if (!item.trim()) onChange(items.filter((_, i) => i !== index));
                }}
                className="y-small min-h-10 w-full min-w-0 bg-transparent font-medium outline-none"
              />
              <button
                type="button"
                className="y-round"
                data-tone-btn="soft"
                data-size="sm"
                aria-label={`Remove "${item}"`}
                title="Remove"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <X size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {items.length < max ? (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`${inputId}-new`}>
            Add to {label.toLowerCase()}
          </label>
          <input
            id={`${inputId}-new`}
            className="y-input"
            placeholder={placeholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
          <PillButton
            variant="contrast"
            size="md"
            disabled={!draft.trim()}
            onClick={add}
            icon={<Plus size={18} aria-hidden />}
          >
            Add
          </PillButton>
        </div>
      ) : (
        <p className="y-micro y-fg-3 px-1">That&apos;s the maximum of {max}. Keep it focused.</p>
      )}
    </div>
  );
}

/** Reference rows: a link or account plus what you like about it. */
export function ReferenceEditor({
  items,
  onChange,
}: {
  items: Reference[];
  onChange: (items: Reference[]) => void;
}) {
  const baseId = useId();
  const update = (index: number, patch: Partial<Reference>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={item.id} className="y-tile flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="y-micro y-fg-2">Reference {index + 1}</span>
            <button
              type="button"
              className="y-round"
              data-tone-btn="soft"
              data-size="sm"
              aria-label={`Remove reference ${index + 1}`}
              title="Remove"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <label className="sr-only" htmlFor={`${baseId}-${index}-label`}>
            Link or account for reference {index + 1}
          </label>
          <input
            id={`${baseId}-${index}-label`}
            className="y-input !bg-(--b-bg)"
            placeholder="Link or account, e.g. tiktok.com/@shopowner"
            value={item.label}
            onChange={(event) => update(index, { label: event.target.value })}
          />
          <label className="sr-only" htmlFor={`${baseId}-${index}-note`}>
            What you like about reference {index + 1}
          </label>
          <input
            id={`${baseId}-${index}-note`}
            className="y-input !bg-(--b-bg)"
            placeholder="What you like about it, e.g. the pace of the first 3 seconds"
            value={item.note ?? ""}
            onChange={(event) => update(index, { note: event.target.value })}
          />
        </div>
      ))}
      {items.length < 5 ? (
        <PillButton
          variant="soft"
          className="w-fit"
          icon={<Plus size={18} aria-hidden />}
          onClick={() =>
            onChange([...items, { id: `ref-${Date.now().toString(36)}`, label: "", note: "" }])
          }
        >
          {items.length ? "Add another reference" : "Add a reference"}
        </PillButton>
      ) : null}
    </div>
  );
}

/** Brief-strength meter (brief help). Lives in the brief strength block. */
export function StrengthMeter({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <span className="flex items-baseline gap-1 leading-none">
          <span className="y-display y-num text-[44px] font-semibold tracking-[-0.04em]">{score}</span>
          <span className="y-small y-fg-2">/ 100</span>
        </span>
        <span className="y-badge" data-tone-badge="ink">
          {label}
        </span>
      </div>
      <div
        className="y-progress"
        role="meter"
        aria-label="Brief strength"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
        aria-valuetext={`${score} out of 100, ${label}`}
      >
        <span style={{ width: `${Math.max(4, score)}%` }} />
      </div>
    </div>
  );
}
