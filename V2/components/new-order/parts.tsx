"use client";

import { AlertCircle, ChevronDown, Minus, Plus, X } from "lucide-react";
import { useId, useState } from "react";

import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import type { Product } from "@/lib/types";

/**
 * Building blocks shared by the ordering flows (new order, campaign, direct order). Local to this
 * area on purpose: the shared ui/ stays small.
 */

/** One question per card: a calm title, an optional hint, then the answer controls. */
export function Question({
  id,
  title,
  hint,
  optional = false,
  aside,
  children,
  className = "",
}: {
  id: string;
  title: string;
  hint?: React.ReactNode;
  optional?: boolean;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Block as="section" aria-labelledby={id} tone="paper" pad="md" className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={id} className="y-head">
            {title}
            {optional ? <span className="y-small y-fg-2 ms-2 font-normal">Optional</span> : null}
          </h2>
          {hint ? <p className="y-small y-fg-2 max-w-[60ch]">{hint}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </Block>
  );
}

/** A sub-heading inside a question card (two related answers in one card). */
export function SubLabel({ id, children, hint }: { id?: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 id={id} className="y-small font-semibold">
        {children}
      </h3>
      {hint ? <p className="y-micro y-fg-2">{hint}</p> : null}
    </div>
  );
}

/** Inline error for groups (cards, chips) where there is no single input to mark. */
export function GroupError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)" role="alert">
      <AlertCircle size={16} aria-hidden className="flex-none" />
      {message}
    </p>
  );
}

/**
 * Selectable tile (radio or checkbox). The native input stays as the visible check so keyboard
 * and screen readers work; the selected tile gets an ink ring.
 */
export function ChoiceTile({
  type = "radio",
  name,
  checked,
  onChange,
  disabled = false,
  label,
  children,
  className = "",
}: {
  type?: "radio" | "checkbox";
  name?: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  /** Accessible name when the visible content is long. */
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`y-tile relative flex items-start gap-3 p-4 ${
        disabled ? "cursor-not-allowed opacity-55" : "y-hoverable cursor-pointer"
      } ${checked ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""} ${className}`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>
      <input
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={label}
        className={`y-check mt-0.5 ${type === "radio" ? "!rounded-full" : ""}`}
      />
    </label>
  );
}

/** − 3 + stepper with a light numeral. */
export function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  unit: (value: number) => string;
}) {
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <RoundIconButton
        label={step === 1 ? `One fewer` : `${step} fewer`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className="disabled:opacity-40"
      >
        <Minus size={18} aria-hidden />
      </RoundIconButton>
      <output aria-live="polite" className="y-display y-num w-14 text-center text-[32px] leading-none">
        {value}
      </output>
      <RoundIconButton
        label={step === 1 ? `One more` : `${step} more`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className="disabled:opacity-40"
      >
        <Plus size={18} aria-hidden />
      </RoundIconButton>
      <span className="y-small y-fg-2">{unit(value)}</span>
    </div>
  );
}

/** Editable list of short lines (must include, avoid, talking points). Enter adds. */
export function ListEditor({
  label,
  items,
  onChange,
  placeholder,
  marker,
  max = 8,
  invalid = false,
  describedBy,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  marker: React.ReactNode;
  max?: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const inputId = useId();
  const add = () => {
    const text = draft.trim();
    if (!text) return;
    if (items.some((item) => item.trim().toLowerCase() === text.toLowerCase())) {
      setNote("That one's already on the list.");
      return;
    }
    if (items.length >= max) return;
    onChange([...items, text]);
    setDraft("");
    setNote(null);
  };
  return (
    <div className="flex flex-col gap-2">
      {items.length ? (
        <ul className="flex flex-col gap-1.5" aria-label={label}>
          {items.map((item, index) => (
            <li key={index} className="y-tile flex items-center gap-2 py-1 ps-3 pe-1">
              <span aria-hidden className="flex-none">
                {marker}
              </span>
              <label className="sr-only" htmlFor={`${inputId}-${index}`}>
                {label} {index + 1}
              </label>
              <input
                id={`${inputId}-${index}`}
                value={item}
                onChange={(event) => onChange(items.map((x, i) => (i === index ? event.target.value : x)))}
                onBlur={() => {
                  if (!item.trim()) onChange(items.filter((_, i) => i !== index));
                }}
                className="y-small min-h-10 w-full min-w-0 bg-transparent outline-none"
              />
              <button
                type="button"
                className="y-round"
                data-tone-btn="ghost"
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
            aria-invalid={invalid ? true : undefined}
            aria-describedby={describedBy}
            onChange={(event) => {
              setDraft(event.target.value);
              setNote(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
          <PillButton variant="soft" disabled={!draft.trim()} onClick={add} icon={<Plus size={16} aria-hidden />}>
            Add
          </PillButton>
        </div>
      ) : (
        <p className="y-micro y-fg-2 px-1">That&apos;s the most this list holds. Keep it focused.</p>
      )}
      {note ? (
        <p className="y-micro y-fg-2 px-1" role="status">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Quiet disclosure for optional detail ("Creative direction", "More details"). Controlled when
 * `open` is passed (so a step can open it to show an error), uncontrolled otherwise.
 */
export function Disclosure({
  title,
  summary,
  open,
  onToggle,
  defaultOpen = false,
  children,
  id,
}: {
  title: string;
  /** One line shown while closed (what's already in it). */
  summary?: React.ReactNode;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
  id?: string;
}) {
  const [own, setOwn] = useState(defaultOpen);
  const isOpen = open ?? own;
  const bodyId = useId();
  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setOwn(next);
    onToggle?.(next);
  };
  return (
    <Block as="section" tone="paper" pad="none" id={id} className="flex flex-col">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={toggle}
        className="flex min-h-16 w-full items-center gap-3 rounded-(--y-r-block) px-5 py-3 text-start md:px-6"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="y-head">{title}</span>
          {summary && !isOpen ? <span className="y-small y-fg-2">{summary}</span> : null}
        </span>
        <ChevronDown
          size={18}
          aria-hidden
          className={`flex-none transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? (
        <div id={bodyId} className="flex flex-col gap-6 px-5 pb-6 md:px-6">
          {children}
        </div>
      ) : null}
    </Block>
  );
}

/** Product monogram on its brand colour (white text stays readable on every seed colour). */
export function ProductMark({ product, size = 40 }: { product: Pick<Product, "name" | "brandColor">; size?: number }) {
  return (
    <span
      aria-hidden
      className="y-display grid flex-none place-items-center font-semibold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        background: product.brandColor,
        fontSize: Math.round(size * 0.42),
      }}
    >
      {product.name.slice(0, 1)}
    </span>
  );
}

/** Small inline spinner for "Posting…" style buttons. */
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}

/** Whole-dollar input with a "$" prefix. Empty reads as 0 (the step's validation explains). */
export function MoneyInput({
  label,
  value,
  onChange,
  invalid,
  describedBy,
  suffix,
  name,
}: {
  label: string;
  name?: string;
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
  describedBy?: string;
  suffix?: string;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label htmlFor={id} className="y-label">
        <span>{label}</span>
      </label>
      <div className="relative">
        <span aria-hidden className="y-fg-2 pointer-events-none absolute inset-y-0 start-4 flex items-center">
          $
        </span>
        <input
          id={id}
          name={name}
          inputMode="numeric"
          autoComplete="off"
          className="y-input y-num !ps-8"
          value={value ? String(value) : ""}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            const digits = event.target.value.replace(/[^\d]/g, "").slice(0, 6);
            onChange(digits ? Number(digits) : 0);
          }}
        />
        {suffix ? (
          <span aria-hidden className="y-small y-fg-2 pointer-events-none absolute inset-y-0 end-4 flex items-center">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}
