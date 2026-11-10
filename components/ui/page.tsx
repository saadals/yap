import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { textDir } from "@/lib/taxonomy";
import type { LanguageId } from "@/lib/types";

/** Standard page container: max 1360px, page gutter, top spacing under the header. */
export function Page({
  children,
  className = "",
  width = "wide",
}: {
  children: React.ReactNode;
  className?: string;
  /** wide = 1360px app/browse pages, narrow = 880px forms and focused tasks. */
  width?: "wide" | "narrow";
}) {
  return (
    <div
      className={`mx-auto w-full px-(--y-gutter) pt-3 md:pt-5 ${
        width === "narrow" ? "max-w-[calc(880px+var(--y-gutter)*2)]" : "max-w-[calc(1360px+var(--y-gutter)*2)]"
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
