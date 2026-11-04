"use client";

import { Check, Plus } from "lucide-react";
import type { ReactNode } from "react";

import type { BlockTone } from "@/components/ui/block";

/** Marketing page container: the app's 1360px grid, blocks stacked with the 8px gap. */
export function MarketingMain({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto flex w-full max-w-[calc(1360px+var(--y-gutter)*2)] flex-col gap-2 px-(--y-gutter) pt-2 ${className}`}
    >
      {children}
    </div>
  );
}

/** Section opener with marketing rhythm: 64px above on mobile, 96px on desktop. */
export function SectionHeader({
  id,
  kicker,
  title,
  sub,
  action,
  className = "",
}: {
  id: string;
  kicker?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-5 px-1 pt-16 pb-4 md:flex-row md:items-end md:justify-between md:pt-24 md:pb-6 ${className}`}
    >
      <div className="flex max-w-[46rem] flex-col gap-3">
        {kicker ? <p className="y-chip w-fit">{kicker}</p> : null}
        <h2 id={id} className="y-display y-t-display text-balance">
          {title}
        </h2>
        {sub ? <p className="y-lead y-fg-2 max-w-[56ch]">{sub}</p> : null}
      </div>
      {action ? <div className="flex flex-none flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

/** Ticked points; the tick takes the block's foreground so it works on any tone. */
export function CheckList({
  items,
  className = "",
  size = "body",
}: {
  items: ReactNode[];
  className?: string;
  size?: "body" | "small";
}) {
  return (
    <ul className={`flex flex-col gap-3 ${className}`}>
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <span
            className={`grid flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg) ${size === "body" ? "mt-0.5 size-6" : "mt-px size-5"}`}
          >
            <Check size={size === "body" ? 14 : 12} strokeWidth={3} aria-hidden />
          </span>
          <span className={size === "body" ? "y-body" : "y-small"}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Small floating card used over hero visuals (elevated: it floats above the block). */
export function FloatWidget({
  tone,
  icon,
  title,
  sub,
  className = "",
}: {
  tone: BlockTone;
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-tone={tone}
      className={`y-block flex w-max max-w-[17rem] items-center gap-3 !rounded-[22px] p-2.5 pe-4 shadow-(--y-shadow-float) ${className}`}
    >
      {icon}
      <span className="flex min-w-0 flex-col">
        <span className="y-small font-semibold">{title}</span>
        {sub ? <span className="y-micro y-fg-2">{sub}</span> : null}
      </span>
    </div>
  );
}

/** Square icon tile for widgets and feature rows. */
export function IconTile({
  children,
  className = "",
  size = "md",
}: {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden
      className={`grid flex-none place-items-center bg-(--b-chip) text-(--b-chip-fg) ${size === "md" ? "size-11 rounded-[14px]" : "size-9 rounded-[12px]"} ${className}`}
    >
      {children}
    </span>
  );
}

/** Chunky numeral for steps ("01"). */
export function StepNumber({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={`y-display y-num block leading-[0.85] font-semibold tracking-[-0.05em] ${className}`}
    >
      {String(n).padStart(2, "0")}
    </span>
  );
}

export type FaqItem = { q: string; a: ReactNode };

/** Accordion built on <details>: keyboard and screen-reader support for free. */
export function Faq({ items, className = "" }: { items: FaqItem[]; className?: string }) {
  return (
    <div className={`flex flex-col ${className}`}>
      {items.map((item) => (
        <details key={item.q} className="group border-b border-(--b-line) last:border-b-0">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-(--y-r-sm) py-4 [&::-webkit-details-marker]:hidden">
            <span className="y-head">{item.q}</span>
            <span
              aria-hidden
              className="y-round transition-transform group-open:rotate-45"
              data-tone-btn="soft"
              data-size="sm"
            >
              <Plus size={18} />
            </span>
          </summary>
          <div className="y-body y-fg-2 flex max-w-[62ch] flex-col gap-3 pe-14 pb-6">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
