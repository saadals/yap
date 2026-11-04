"use client";

import { AlertCircle, CircleDot } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";

/**
 * Local draft of a slice of the store. `dirty` compares by value. When the store changes
 * underneath (another tab, demo reset) and there are no local edits, the draft follows it.
 */
export function useDraft<T>(source: T) {
  const sourceKey = JSON.stringify(source);
  const [state, setState] = useState<{ key: string; draft: T }>({ key: sourceKey, draft: source });
  let current = state;
  if (state.key !== sourceKey) {
    const hadEdits = JSON.stringify(state.draft) !== state.key;
    current = { key: sourceKey, draft: hadEdits ? state.draft : source };
    setState(current);
  }
  const dirty = JSON.stringify(current.draft) !== sourceKey;
  return {
    draft: current.draft,
    dirty,
    set: (next: T | ((previous: T) => T)) =>
      setState((st) => ({
        ...st,
        draft: typeof next === "function" ? (next as (previous: T) => T)(st.draft) : next,
      })),
    reset: () => setState({ key: sourceKey, draft: source }),
  };
}

/** A profile section: title, unsaved indicator, content and its own Save / Discard. */
export function ProfileSection({
  id,
  title,
  description,
  dirty = false,
  onSave,
  onDiscard,
  saveLabel = "Save",
  errorCount = 0,
  attempted = false,
  aside,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  dirty?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  errorCount?: number;
  attempted?: boolean;
  /** Extra header content on the end side (e.g. a primary action). */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Block
      as="section"
      tone="paper"
      pad="md"
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-24 flex-col gap-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-title`} className="y-display y-title flex flex-wrap items-center gap-2">
            {title}
          </h2>
          {description ? <p className="y-small y-fg-2 max-w-[56ch]">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? (
            <Badge tone="warning" icon={<CircleDot size={14} aria-hidden />}>
              Unsaved changes
            </Badge>
          ) : null}
          {aside}
        </div>
      </header>
      {children}
      {onSave ? (
        <footer className="flex flex-col gap-3 border-t border-(--b-line) pt-4 sm:flex-row sm:items-center sm:justify-end">
          {attempted && errorCount > 0 ? (
            <p role="alert" className="y-small flex items-center gap-1.5 font-medium text-(--y-danger) sm:me-auto">
              <AlertCircle size={16} aria-hidden />
              Fix {errorCount === 1 ? "1 thing" : `${errorCount} things`} to save.
            </p>
          ) : !dirty ? (
            <p className="y-micro y-fg-2 sm:me-auto">All changes saved.</p>
          ) : null}
          <div className="flex gap-2">
            <PillButton variant="ghost" disabled={!dirty} onClick={onDiscard}>
              Discard
            </PillButton>
            <PillButton variant="contrast" disabled={!dirty} onClick={onSave}>
              {saveLabel}
            </PillButton>
          </div>
        </footer>
      ) : null}
    </Block>
  );
}
