"use client";

import { AlertCircle, MoreHorizontal, Pause, Play, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { clock } from "@/lib/format";
import type { Aspect, Video } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Overflow menu (⋯)                                                           */
/* -------------------------------------------------------------------------- */

export type MenuItem = {
  label: string;
  icon?: React.ReactNode;
  href?: string;
  /** Opens outside the app (a creator's post). */
  external?: boolean;
  onSelect?: () => void;
  /** Shown greyed out with this reason under the label. */
  disabled?: string;
  /** Destructive (delete, remove): shown in the danger colour. */
  danger?: boolean;
};

const itemClass =
  "y-small flex w-full min-h-11 items-center gap-2.5 rounded-(--y-r-sm) px-3 py-2 text-start font-medium outline-none hover:bg-(--b-chip) focus-visible:bg-(--b-chip) disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent";

/**
 * A ⋯ button that opens a small menu. Enter/Space opens, arrows move, Esc closes and returns
 * focus, Tab leaves, a click outside closes.
 */
export function OverflowMenu({
  label,
  items,
  size = "sm",
  tone = "soft",
  className = "",
}: {
  label: string;
  items: MenuItem[];
  size?: "sm" | "md";
  tone?: "soft" | "outline" | "ghost";
  className?: string;
}) {
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
    const entries = [...(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [])];
    const index = entries.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
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
        data-tone-btn={tone}
        data-size={size}
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
          className="y-block absolute end-0 top-full z-30 mt-2 flex min-w-60 flex-col !rounded-(--y-r-tile) p-1.5 shadow-(--y-shadow-float)"
        >
          {items.map((item) =>
            item.href && !item.disabled ? (
              item.external ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  role="menuitem"
                  className={itemClass}
                  onClick={() => setOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} href={item.href} role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
                  {item.icon}
                  {item.label}
                </Link>
              )
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`${itemClass} ${item.danger ? "text-(--y-danger)" : ""}`}
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

/* -------------------------------------------------------------------------- */
/* Form bits                                                                   */
/* -------------------------------------------------------------------------- */

/** Inline error for groups (radio cards, lists) where there is no single input to mark. */
export function GroupError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
      <AlertCircle size={16} aria-hidden className="flex-none" />
      {message}
    </p>
  );
}

/** Selectable tile (radio or checkbox). The native input stays so keyboard and readers work. */
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
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`y-tile y-hoverable relative flex cursor-pointer items-center gap-3 p-3.5 ${
        checked ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""
      } ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</span>
      <input
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={label}
        className={`y-check flex-none ${type === "radio" ? "!rounded-full" : ""}`}
      />
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
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  marker: React.ReactNode;
  max?: number;
  invalid?: boolean;
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
                className="y-small min-h-10 w-full min-w-0 bg-transparent font-medium outline-none"
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
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
          <PillButton variant="outline" disabled={!draft.trim()} onClick={add} icon={<Plus size={16} aria-hidden />}>
            Add
          </PillButton>
        </div>
      ) : (
        <p className="y-micro y-fg-3 px-1">That&apos;s the maximum of {max}. Keep it focused.</p>
      )}
    </div>
  );
}

/** Plain list with a marker per line. */
export function Bullets({ items, marker }: { items: string[]; marker?: React.ReactNode }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="y-small flex gap-2">
          {marker ?? <span aria-hidden className="mt-[7px] size-1.5 flex-none rounded-full bg-current" />}
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The header's one meta line: "TikTok · 10K–20K followers · $120 per Yapp". Each fact keeps its
 * words together, so a wrap falls between facts, never inside a date.
 */
export function MetaLine({ items }: { items: (string | null | undefined | false)[] }) {
  const facts = items.filter((x): x is string => Boolean(x));
  return (
    <span>
      {facts.map((fact, index) => (
        <span key={fact}>
          <span className="whitespace-nowrap">{fact}</span>
          {index < facts.length - 1 ? " · " : null}
        </span>
      ))}
    </span>
  );
}

/** A labelled group inside a rail card. */
export function RailSection({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="y-micro y-fg-2 font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Phones: the next step in a sticky glass bar above the tab bar               */
/* -------------------------------------------------------------------------- */

/**
 * The order's single next action on phones, floating above the tab bar. Renders nothing on
 * desktop (the header carries it there). Leave room for it with <BarSpacer />.
 */
export function MobileBar({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px+var(--y-bar-h)+10px)] z-40 lg:hidden"
    >
      <div className="y-bar mx-auto flex max-w-md items-center gap-3 rounded-full p-1.5 ps-5">{children}</div>
    </div>
  );
}

export const BarSpacer = () => <div aria-hidden className="h-20 lg:hidden" />;

/* -------------------------------------------------------------------------- */
/* Video bits                                                                  */
/* -------------------------------------------------------------------------- */

const ratio: Record<Aspect, number> = { "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "16:9": 16 / 9 };

/**
 * Diagonal "Review copy" watermark over a player's frame (not its controls). Put it inside a
 * relative box the width of the player.
 */
export function Watermark({ video, small = false }: { video: Video; small?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[4] mx-auto w-full overflow-hidden rounded-(--y-r-tile)"
      style={{ aspectRatio: String(ratio[video.aspect]) }}
    >
      <div className="absolute -inset-1/2 flex -rotate-[28deg] flex-col items-center justify-center gap-[14%]">
        {[0, 1, 2, 3, 4].map((row) => (
          <span
            key={row}
            className={`y-display ${small ? "text-[10px]" : "text-[18px]"} font-semibold whitespace-nowrap text-white opacity-45 [text-shadow:0_1px_3px_rgb(0_0_0/0.45)] ${
              row % 2 ? "ps-[30%]" : ""
            }`}
          >
            Review copy · Review copy · Review copy
          </span>
        ))}
      </div>
    </div>
  );
}

/** A simulated play tile for the campaign's explainer video (no real media). */
export function ExplainerTile({ name, durationSec }: { name: string; durationSec: number }) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const toggle = () => {
    if (playing) {
      window.clearInterval(timer.current);
      setPlaying(false);
      return;
    }
    let t = elapsed >= durationSec ? 0 : elapsed;
    setElapsed(t);
    setPlaying(true);
    timer.current = window.setInterval(() => {
      t = Math.min(durationSec, t + 0.25);
      setElapsed(t);
      if (t >= durationSec) {
        window.clearInterval(timer.current);
        setPlaying(false);
      }
    }, 250);
  };

  return (
    <div className="y-tile flex flex-col gap-2.5 p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="y-round flex-none"
          data-tone-btn="contrast"
          data-size="sm"
          aria-label={playing ? "Pause explainer" : "Play explainer"}
          aria-pressed={playing}
          onClick={toggle}
        >
          {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden className="y-flip" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="y-small font-medium">Your explainer video</p>
          <p className="y-micro y-fg-2 truncate">{name}</p>
        </div>
        <span className="y-micro y-num y-fg-2 flex-none">
          {playing || elapsed > 0 ? `${clock(elapsed)} / ` : ""}
          {clock(durationSec)}
        </span>
      </div>
      {playing || elapsed > 0 ? (
        <div className="y-progress" aria-hidden>
          <span style={{ width: `${(elapsed / durationSec) * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
}
