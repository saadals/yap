"use client";

import { Plus, X } from "lucide-react";
import { useId, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";

/** Add/remove list of short lines (dos, don'ts, features). Enter adds the line. */
export function ListInput({
  label,
  hint,
  items,
  onChange,
  placeholder,
  max = 5,
  icon,
  itemNoun = "line",
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  max?: number;
  /** Leading icon for each saved line. */
  icon?: React.ReactNode;
  itemNoun?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const full = items.length >= max;

  const add = () => {
    const text = draft.trim();
    if (!text) {
      setError(`Type a ${itemNoun} first.`);
      return;
    }
    if (items.some((item) => item.toLowerCase() === text.toLowerCase())) {
      setError("That one's already on the list.");
      return;
    }
    onChange([...items, text]);
    setDraft("");
    setError(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-input`} className="y-label">
        <span>{label}</span>
        <span className="y-micro y-fg-3 font-medium">
          {items.length > 0 ? `${items.length} of ${max}` : "Optional"}
        </span>
      </label>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label={label}>
          {items.map((item, index) => (
            <li
              key={item}
              className="y-tile y-enter flex min-h-13 items-center gap-3 py-1.5 ps-4 pe-1.5"
            >
              {icon ? (
                <span aria-hidden className="flex-none">
                  {icon}
                </span>
              ) : null}
              <span className="y-small flex-1">{item}</span>
              <RoundIconButton
                label={`Remove "${item}"`}
                size="sm"
                tone="outline"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <X size={16} aria-hidden />
              </RoundIconButton>
            </li>
          ))}
        </ul>
      ) : null}
      {full ? (
        <p className="y-micro y-fg-3 px-1">That&apos;s plenty. Remove one to add another.</p>
      ) : (
        <div className="flex gap-2">
          <input
            id={`${id}-input`}
            className="y-input flex-1"
            value={draft}
            placeholder={placeholder}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
          <PillButton
            variant="outline"
            onClick={add}
            icon={<Plus size={18} aria-hidden />}
            aria-label={`Add ${itemNoun}`}
            className="flex-none !px-4"
          >
            Add
          </PillButton>
        </div>
      )}
      {error ? (
        <p id={`${id}-error`} className="y-small px-1 font-medium text-(--y-danger)" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="y-micro y-fg-3 px-1">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
