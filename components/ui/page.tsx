import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { textDir } from "@/lib/taxonomy";
import type { LanguageId } from "@/lib/types";

/** Standard page container: the page gutter (the header's 72px sides on desktop), top spacing under the header. */
export function Page({
  children,
  className = "",
  width = "wide",
}: {
  children: React.ReactNode;
  className?: string;
  /** wide = app/browse pages on the header's margins (1376px at most), narrow = 880px forms and focused tasks. */
  width?: "wide" | "narrow";
}) {
  return (
    <div
      className={`mx-auto w-full px-(--y-gutter) pt-3 md:pt-5 ${
        width === "narrow" ? "max-w-[calc(880px+var(--y-gutter)*2)]" : "max-w-[calc(1376px+var(--y-gutter)*2)]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Page title row. Use once per page. `back` renders a small back link above the title.
 * Actions sit on the end side on desktop and wrap below on mobile.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  back,
  actions,
  className = "",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-4 px-1 pt-2 pb-5 md:flex-row md:items-end md:justify-between md:pb-6 ${className}`}>
      <div className="flex min-w-0 flex-col gap-2">
        {back ? (
          <Link
            href={back.href}
            className="y-small y-fg-2 -ms-1 inline-flex w-fit items-center gap-1.5 rounded-full py-1 pe-2 font-medium hover:text-(--y-ink)"
          >
            <ArrowLeft size={16} aria-hidden className="y-flip" />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? <div className="y-eyebrow">{eyebrow}</div> : null}
        <h1 className="y-display y-t-display">{title}</h1>
        {description ? <p className="y-lead y-fg-2 max-w-[62ch]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Small label above a group of blocks (32px rhythm between unrelated groups). */
export function SectionLabel({
  children,
  action,
  id,
  className = "",
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-1 pt-8 pb-3 ${className}`}>
      <h2 id={id} className="y-head">
        {children}
      </h2>
      {action}
    </div>
  );
}

/**
 * Container for the redesigned pages (Discover, Work, the job page, the order page, New order,
 * Productivity; round 3 answers, item 56): 1520px wide, 72px sides from 1024px, 20px on phones,
 * 36px under the header on desktop. Restyled pages keep `Page`.
 */
export function WidePage({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`y-wide ${className}`}>{children}</div>;
}

/** The back pill above a detail page: "← Work", "← Find work". 44px tap target. */
export function BackPill({
  href,
  label,
  onClick,
  className = "",
}: {
  href: string;
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link href={href} onClick={onClick} className={`y-back ${className}`}>
      <ArrowLeft size={16} strokeWidth={2} aria-hidden className="y-flip" />
      {label}
    </Link>
  );
}

/**
 * Section head on the redesigned pages: eyebrow, H2 (34px, 26 on phones) and an optional item on
 * the end side (a link, the "Sample data" chip, arrows). 26px below it.
 */
export function SectionHead({
  title,
  eyebrow,
  aside,
  id,
  as: Heading = "h2",
  className = "",
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  aside?: React.ReactNode;
  id?: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={`y-sechead ${className}`}>
      <div className="y-sechead-l">
        {eyebrow ? <span className="y-eyebrow">{eyebrow}</span> : null}
        <Heading id={id} className="y-display y-title">
          {title}
        </Heading>
      </div>
      {aside ? <div className="flex flex-none items-center gap-3">{aside}</div> : null}
    </div>
  );
}

/**
 * Card head: an 18px title, an optional muted count after it, and a link or meta on the end side
 * ("Your orders 3 · All orders", "Deliveries · 1 version · 1 of 2 revisions used").
 */
export function CardHead({
  title,
  count,
  aside,
  id,
  as: Heading = "h3",
  className = "",
}: {
  title: React.ReactNode;
  count?: React.ReactNode;
  aside?: React.ReactNode;
  id?: string;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={`y-cardhead ${className}`}>
      <Heading id={id} className="y-cardhead-t">
        {title}
        {count !== undefined && count !== null ? <span className="y-cardhead-n">{count}</span> : null}
      </Heading>
      {aside ? <div className="y-cardhead-a">{aside}</div> : null}
    </div>
  );
}

/** Text in a video's own language inside the English UI: tags the language, and Arabic runs RTL. */
export function InLang({
  lang,
  children,
  className = "",
  as: Tag = "span",
}: {
  lang: LanguageId;
  children: React.ReactNode;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  return (
    <Tag dir={textDir(lang)} lang={lang} className={className}>
      {children}
    </Tag>
  );
}
