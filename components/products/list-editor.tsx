"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";

/**
 * Editable list of short lines (features, dos, don'ts): edit in place, add, remove, reorder.
 * Reordering uses buttons (keyboard and touch friendly) and announces the new position.
 */
export function ListEditor({
  label,
  hint,
  noun,
  items,
  onChange,
  placeholder,
  max = 10,
}: {
  label: string;
  hint?: string;
  /** Singular noun used in accessible names ("feature", "do"). */
  noun: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  max?: number;
}) {
  const labelId = useId();
  const hintId = useId();
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const upRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const downRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const addRef = useRef<HTMLInputElement>(null);

  const short = (text: string) => (text.length > 40 ? `${text.slice(0, 40)}…` : text) || `empty ${noun}`;

  const add = () => {
    const text = draft.trim();
    if (!text || items.length >= max) return;
    onChange([...items, text]);
    setDraft("");
    setAnnouncement(`Added ${noun}: ${short(text)}`);
  };

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setAnnouncement(`Moved to position ${target + 1} of ${items.length}`);
    window.requestAnimationFrame(() => {
      const preferred = delta < 0 ? upRefs.current[target] : downRefs.current[target];
      const fallback = delta < 0 ? downRefs.current[target] : upRefs.current[target];
      (preferred && !preferred.disabled ? preferred : fallback)?.focus();
    });
  };

  const remove = (index: number) => {
    const removed = items[index];
    onChange(items.filter((_, i) => i !== index));
    setAnnouncement(`Removed ${noun}: ${short(removed)}`);
    window.requestAnimationFrame(() => addRef.current?.focus());
  };

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={hint ? hintId : undefined} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span id={labelId} className="y-label">
          {label}
        </span>
        <span className="y-micro y-fg-3">
          {items.length}/{max}
        </span>
      </div>
      {hint ? (
        <p id={hintId} className="y-micro y-fg-3 -mt-1 px-1">
          {hint}
        </p>
      ) : null}

      {items.length ? (
        <ol className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-2">
              <textarea
                rows={1}
                value={item}
                aria-label={`${noun[0].toUpperCase()}${noun.slice(1)} ${index + 1} of ${items.length}`}
                onChange={(event) => {
                  const next = [...items];
                  next[index] = event.target.value;
                  onChange(next);
                }}
                onKeyDown={(event) => {
                  // One line per item; Enter would only add a stray line break.
                  if (event.key === "Enter") event.preventDefault();
                }}
                className="y-input min-h-[52px] flex-1 [field-sizing:content]"
              />
              <span className="flex flex-none items-center justify-end gap-1">
                <button
                  type="button"
                  ref={(node) => {
                    upRefs.current[index] = node;
                  }}
                  className="y-round disabled:opacity-35"
                  data-tone-btn="outline"
                  data-size="sm"
                  aria-label={`Move “${short(item)}” up`}
                  title="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={18} aria-hidden />
                </button>
                <button
                  type="button"
                  ref={(node) => {
                    downRefs.current[index] = node;
                  }}
                  className="y-round disabled:opacity-35"
                  data-tone-btn="outline"
                  data-size="sm"
                  aria-label={`Move “${short(item)}” down`}
                  title="Move down"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={18} aria-hidden />
                </button>
                <RoundIconButton label={`Remove “${short(item)}”`} size="sm" onClick={() => remove(index)}>
                  <X size={18} aria-hidden />
                </RoundIconButton>
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {items.length < max ? (
        <div className="flex gap-2">
          <input
            ref={addRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            aria-label={`New ${noun}`}
            className="y-input min-w-0 flex-1"
          />
          <PillButton
            variant="soft"
            icon={<Plus size={18} aria-hidden />}
            onClick={add}
            disabled={!draft.trim()}
            aria-label={`Add ${noun}`}
          >
            Add
          </PillButton>
        </div>
      ) : (
        <p className="y-micro y-fg-3 px-1">That&apos;s the maximum. Remove one to add another.</p>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
