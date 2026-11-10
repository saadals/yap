"use client";

import { AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";

/** One section of the profile editor: an anchored card with a title, one line and its content. */
export function EditorSection({
  id,
  title,
  description,
  errorCount = 0,
  instant = false,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: React.ReactNode;
  /** Errors to fix in this section (shown after a save attempt). */
  errorCount?: number;
  /** Changes here save as you go (portfolio, accounts), not with "Save changes". */
  instant?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Block
      as="section"
      id={id}
      tone="paper"
      pad="md"
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-32 flex-col gap-6 xl:scroll-mt-20"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1">
          <h2 id={`${id}-title`} className="y-display y-title">
            {title}
          </h2>
          {description ? <p className="y-small y-fg-2 max-w-[60ch]">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {errorCount ? (
            <Badge tone="danger" icon={<AlertCircle size={14} aria-hidden />}>
              {errorCount === 1 ? "1 thing to fix" : `${errorCount} things to fix`}
            </Badge>
          ) : instant ? (
            <span className="y-micro y-fg-2">Saves as you go</span>
          ) : null}
          {action}
        </div>
      </header>
      {children}
    </Block>
  );
}

/** A small inline error under a group of chips or a list. */
export function GroupError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
      <AlertCircle size={16} aria-hidden className="flex-none" /> {children}
    </p>
  );
}

/** The legend row of a group of chips: label on the start side, a note on the end side. */
export function GroupLabel({ id, label, note }: { id: string; label: string; note?: string }) {
  return (
    <p id={id} className="y-label">
      <span>{label}</span>
      {note ? <span className="y-micro y-fg-2 font-medium">{note}</span> : null}
    </p>
  );
}
