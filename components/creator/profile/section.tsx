"use client";

import { AlertCircle, ChevronDown, CircleDot } from "lucide-react";
import { createContext, useContext, useState } from "react";

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

/** When provided, sections collapse to a one-line summary and only one is open at a time. */
const AccordionContext = createContext<{ openId: string | null; toggle: (id: string) => void } | null>(null);
export const ProfileAccordion = AccordionContext.Provider;

/**
 * A profile section: title, unsaved indicator, content and its own Save / Discard. Inside a
 * `ProfileAccordion` it collapses to its title and `summary`; content stays mounted while
 * collapsed so unsaved drafts survive switching sections.
 */
export function ProfileSection({
  id,
  title,
  description,
  summary,
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
  /** One line shown while the section is collapsed. */
  summary?: React.ReactNode;
  dirty?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  errorCount?: number;
  attempted?: boolean;
  /** Extra header content on the end side (e.g. a primary action). Shown while open. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const accordion = useContext(AccordionContext);
  const open = !accordion || accordion.openId === id;
  const subline = open ? description : summary;
  return (
    <Block
      as="section"
      tone="paper"
      pad="md"
      id={id}
      aria-labelledby={`${id}-title`}
      className={`flex scroll-mt-24 flex-col gap-6 ${open ? "" : "y-hoverable"}`}
    >
      <header className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id={`${id}-title`} className="y-head">
            {accordion ? (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`${id}-panel`}
                onClick={() => accordion.toggle(id)}
                className="text-start after:absolute after:-inset-2 after:rounded-(--y-r-tile) after:content-['']"
              >
                {title}
              </button>
            ) : (
              title
            )}
          </h2>
          {subline ? <p className={`y-small y-fg-2 max-w-[56ch] ${open ? "" : "truncate"}`}>{subline}</p> : null}
        </div>
        <div className="relative z-[3] flex flex-wrap items-center gap-2">
          {dirty ? (
            <Badge tone="warning" icon={<CircleDot size={14} aria-hidden />}>
              Unsaved changes
            </Badge>
          ) : null}
          {open ? aside : null}
        </div>
        {accordion ? (
          <ChevronDown
            size={22}
            aria-hidden
            className={`flex-none transition-transform duration-(--y-dur-2) ${open ? "rotate-180" : ""}`}
          />
        ) : null}
      </header>
      <div id={`${id}-panel`} hidden={!open} className={`${open ? "flex" : "hidden"} flex-col gap-6`}>
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
      </div>
    </Block>
  );
}
