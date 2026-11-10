"use client";

import { AlertCircle, ChevronDown, MoreHorizontal, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";

/** Inline error for groups (radio cards, lists) where there is no single input to mark. */
export function GroupError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
      <AlertCircle size={16} aria-hidden className="flex-none" />
      {message}
    </p>
  );
}

/** Selectable tile (radio). The native input stays as the check so keyboard and readers work. */
export function ChoiceTile({
  name,
  checked,
  onChange,
  disabled = false,
  label,
  children,
  className = "",
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`y-tile y-hoverable relative flex cursor-pointer items-start gap-3 p-4 ${
        checked ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""
      } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={label}
        className="y-check order-last mt-0.5 !rounded-full"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">{children}</span>
    </label>
  );
}

/** Editable list of short lines (talking points, restrictions). Enter adds; rows can be removed. */
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
                onChange={(event) => onChange(items.map((x, i) => (i === index ? event.target.value : x)))}
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
            aria-invalid={invalid ? true : undefined}
            aria-describedby={describedBy}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
          <PillButton variant="contrast" disabled={!draft.trim()} onClick={add} icon={<Plus size={18} aria-hidden />}>
            Add
          </PillButton>
        </div>
      ) : (
        <p className="y-micro y-fg-3 px-1">That&apos;s the maximum of {max}. Keep it focused.</p>
      )}
    </div>
  );
}

/** Plain bullet list. */
export function Bullets({ items, marker }: { items: string[]; marker?: React.ReactNode }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="y-small flex gap-2">
          {marker ?? <span aria-hidden className="mt-2 size-1.5 flex-none rounded-full bg-current" />}
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Quiet disclosure ("Show history", "See all money movements"). */
export function Disclosure({
  summary,
  hint,
  children,
  className = "",
}: {
  summary: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={`group ${className}`}>
      <summary className="y-small flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronDown size={16} aria-hidden className="flex-none transition-transform group-open:rotate-180" />
        <span className="min-w-0 flex-1">{summary}</span>
        {hint ? <span className="y-micro y-fg-2 font-normal group-open:hidden">{hint}</span> : null}
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}

/** Small inline spinner for "Holding…" style buttons. */
export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ width: size, height: size }}
    />
  );
}

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  onSelect?: () => void;
  /** Shown greyed out with a reason under the label. */
  disabled?: string;
};

const itemClass =
  "y-small flex w-full items-center gap-2.5 rounded-(--y-r-sm) px-3 py-2.5 text-start font-medium outline-none hover:bg-(--b-chip) focus-visible:bg-(--b-chip) disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent";

/**
 * A row's ⋯ overflow: a round button that opens a small menu. Enter/Space opens, arrows move,
 * Esc closes and returns focus, Tab leaves.
 */
export function RowMenu({ label, items, className = "" }: { label: string; items: MenuItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const onMenuKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const entries = [
      ...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []),
    ];
    const index = entries.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      entries[(index + step + entries.length) % entries.length]?.focus();
    }
  };

  return (
    <div ref={rootRef} className={`relative z-[3] flex-none ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className="y-round"
        data-tone-btn="soft"
        data-size="sm"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          data-tone="paper"
          onKeyDown={onMenuKey}
          className="y-block absolute end-0 top-full z-30 mt-2 flex min-w-56 flex-col !rounded-(--y-r-tile) p-1.5 shadow-(--y-shadow-float)"
        >
          {items.map((item) =>
            item.href && !item.disabled ? (
              <Link key={item.label} href={item.href} role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={itemClass}
                disabled={Boolean(item.disabled)}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {item.icon}
                <span className="flex flex-col">
                  {item.label}
                  {item.disabled ? <span className="y-micro y-fg-2 font-normal">{item.disabled}</span> : null}
                </span>
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

/** A list of actions inside a "More" sheet. Disabled items show why. */
export function ActionList({ items }: { items: MenuItem[] }) {
  const row =
    "y-body flex min-h-12 w-full items-center gap-3 rounded-(--y-r-sm) px-2 py-2 text-start font-semibold transition-colors hover:bg-(--b-chip) disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent";
  return (
    <ul className="-mx-2 flex flex-col">
      {items.map((item) => (
        <li key={item.label}>
          {item.href && !item.disabled ? (
            <Link href={item.href} className={row} onClick={item.onSelect}>
              {item.icon}
              {item.label}
            </Link>
          ) : (
            <button type="button" className={row} disabled={Boolean(item.disabled)} onClick={item.onSelect}>
              {item.icon}
              <span className="flex flex-col">
                {item.label}
                {item.disabled ? <span className="y-micro y-fg-2 font-normal">{item.disabled}</span> : null}
              </span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
