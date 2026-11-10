"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

const OPEN_DELAY = 120;
const CLOSE_DELAY = 200;
const ITEM = "[data-dd-item]";

/** Only one dropdown is open at a time: opening one closes the others. */
const closers = new Set<() => void>();

/**
 * Glass dropdown panel anchored under a nav item: the Services menu and the account menu
 * (Site-wide spec 5.8). Disclosure pattern: the trigger is a button with `aria-expanded`, the
 * panel a group of links. Opens on click; with `hover`, also after 120ms of pointer hover, and it
 * closes 200ms after the pointer leaves both (a bridge covers the gap). Enter, Space or ↓ opens it
 * and focuses the first item; ↑ ↓ move within a column, ← → between columns, Home and End jump;
 * Esc closes and returns focus to the trigger; tabbing out or clicking outside closes it. One
 * open at a time. Phones get no dropdown: the same items live on the More page.
 *
 * The trigger is a button drawn by the dropdown: pass its content and class (`y-navlink` for a nav
 * item). A `.y-dd-chev` icon inside it turns over while the panel is open.
 *
 *   <Dropdown label="Services" hover width={640} triggerClassName="y-navlink"
 *     trigger={<>Services <ChevronDown size={14} className="y-dd-chev" aria-hidden /></>}>
 *     <DropdownColumns>…<DropdownItem …/>…</DropdownColumns>
 *   </Dropdown>
 */
export function Dropdown({
  label,
  trigger,
  triggerClassName = "",
  triggerLabel,
  hover = false,
  align = "start",
  width,
  offset = 12,
  className = "",
  children,
}: {
  /** Accessible name of the panel. */
  label: string;
  /** What the trigger button shows. */
  trigger: ReactNode;
  triggerClassName?: string;
  /** Accessible name for a trigger without visible text (the avatar). */
  triggerLabel?: string;
  hover?: boolean;
  /** Which edge of the trigger the panel lines up with. */
  align?: "start" | "end";
  width?: number;
  /** Gap between the trigger's bottom edge and the panel, px. */
  offset?: number;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const focusFirst = useRef(false);
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const triggerId = `${baseId}-trigger`;

  const clearTimer = () => window.clearTimeout(timer.current);
  const show = () => {
    clearTimer();
    closers.forEach((close) => close());
    setOpen(true);
  };
  const hide = (returnFocus = false) => {
    clearTimer();
    setOpen(false);
    if (returnFocus) document.getElementById(triggerId)?.focus();
  };

  // Register so another dropdown opening closes this one.
  useEffect(() => {
    const close = () => setOpen(false);
    if (!open) return;
    closers.add(close);
    return () => {
      closers.delete(close);
    };
  }, [open]);

  // Outside pointer closes; focus the first item when opened from the keyboard.
  useEffect(() => {
    if (!open) return;
    if (focusFirst.current) {
      focusFirst.current = false;
      panelRef.current?.querySelector<HTMLElement>(ITEM)?.focus();
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onTriggerKey = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
      event.preventDefault();
      focusFirst.current = true;
      if (open) panelRef.current?.querySelector<HTMLElement>(ITEM)?.focus();
      else show();
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      hide(true);
    }
  };

  const onPanelKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      hide(true);
      return;
    }
    const items = Array.from(panel.querySelectorAll<HTMLElement>(ITEM));
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (current < 0) return;
    const columns = Array.from(panel.querySelectorAll<HTMLElement>("[data-dd-col]"));
    const colOf = (node: HTMLElement) => columns.findIndex((col) => col.contains(node));
    const inColumn = (col: number) =>
      col < 0 ? items : items.filter((node) => colOf(node) === col);
    const here = colOf(items[current]);
    const siblings = inColumn(here);
    const at = siblings.indexOf(items[current]);
    const rtl = getComputedStyle(panel).direction === "rtl";
    let next: HTMLElement | undefined;
    if (event.key === "ArrowDown") next = siblings[(at + 1) % siblings.length];
    else if (event.key === "ArrowUp") next = siblings[(at - 1 + siblings.length) % siblings.length];
    else if (event.key === "Home") next = items[0];
    else if (event.key === "End") next = items[items.length - 1];
    else if (
      (event.key === "ArrowRight" || event.key === "ArrowLeft") &&
      columns.length > 1 &&
      here >= 0
    ) {
      const step = (event.key === "ArrowRight") !== rtl ? 1 : -1;
      const target = inColumn((here + step + columns.length) % columns.length);
      next = target[Math.min(at, target.length - 1)];
    }
    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`y-dd ${className}`}
      onPointerEnter={(event) => {
        if (!hover || event.pointerType !== "mouse") return;
        clearTimer();
        if (!open) timer.current = window.setTimeout(show, OPEN_DELAY);
      }}
      onPointerLeave={(event) => {
        if (!hover || event.pointerType !== "mouse") return;
        clearTimer();
        timer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
      }}
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <button
        type="button"
        id={triggerId}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={triggerLabel}
        className={`y-dd-trigger ${triggerClassName}`}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onTriggerKey}
      >
        {trigger}
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-label={label}
          className="y-dd-panel"
          data-align={align}
          style={{ width, "--dd-offset": `${offset}px` } as React.CSSProperties}
          onKeyDown={onPanelKey}
          onClick={(event) => {
            // A link or a menu row (DropdownRow as a button) closes the panel once it's chosen.
            if ((event.target as HTMLElement).closest("a[href], button[data-dd-item]")) setOpen(false);
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** Columns inside a dropdown (Services: "What we do" | "Who it's for"). */
export function DropdownColumns({
  template = "1.25fr 1fr",
  children,
}: {
  /** CSS grid-template-columns. */
  template?: string;
  children: ReactNode;
}) {
  return (
    <div className="y-dd-cols" style={{ gridTemplateColumns: template }}>
      {children}
    </div>
  );
}

/** One column with an eyebrow title; arrow keys move within it. */
export function DropdownColumn({ title, children }: { title?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="y-dd-col" data-dd-col role="group" aria-labelledby={title ? id : undefined}>
      {title ? (
        <div id={id} className="y-eyebrow y-dd-eyebrow">
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/**
 * Services item: an icon tile (turns green on hover and focus), a title, a one-line description
 * and an optional chip ("Most popular").
 */
export function DropdownItem({
  href,
  icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description?: string;
  badge?: string;
}) {
  return (
    <Link href={href} className="y-dd-item" data-dd-item>
      <span className="y-dd-ic" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="y-dd-t">
          {title}
          {badge ? <span className="y-dd-pop">{badge}</span> : null}
        </span>
        {description ? <span className="y-dd-d">{description}</span> : null}
      </span>
    </Link>
  );
}

/** Account-menu row: an icon, a label, something on the end side (a chip); `danger` for Log out. */
export function DropdownRow(
  props: {
    icon?: ReactNode;
    trailing?: ReactNode;
    tone?: "danger";
    children: ReactNode;
  } & ({ href: string; onClick?: () => void } | { href?: undefined; onClick: () => void }),
) {
  const { icon, trailing, tone, children } = props;
  const content = (
    <>
      {icon ? (
        <span aria-hidden className="flex flex-none">
          {icon}
        </span>
      ) : null}
      <span className="y-dd-grow">{children}</span>
      {trailing}
    </>
  );
  if (props.href !== undefined) {
    return (
      <Link
        href={props.href}
        onClick={props.onClick}
        className="y-dd-row"
        data-dd-item
        data-look={tone}
      >
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={props.onClick}
      className="y-dd-row"
      data-dd-item
      data-look={tone}
    >
      {content}
    </button>
  );
}

/** The account menu's top card (avatar, name, role). Not focusable. */
export function DropdownHeader({ children }: { children: ReactNode }) {
  return <div className="y-dd-head">{children}</div>;
}

export function DropdownSeparator() {
  return <div className="y-dd-sep" role="separator" />;
}

/** Bottom strip: "New to Yapp? See how it works →" on one side, "For creators →" on the other. */
export function DropdownFooter({ links }: { links: { href: string; label: ReactNode }[] }) {
  return (
    <div className="y-dd-foot">
      {links.map((link) => (
        <Link key={link.href} href={link.href} data-dd-item>
          <span>{link.label}</span>
          <ArrowRight size={14} strokeWidth={2.25} aria-hidden className="y-flip" />
        </Link>
      ))}
    </div>
  );
}
