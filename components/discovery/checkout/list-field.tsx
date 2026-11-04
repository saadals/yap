"use client";

import { Plus, X } from "lucide-react";
import { useId, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";

/** Short add/remove list for brief lines (must include, avoid, references). Enter adds. */
export function ListField({
  label,
  hint,
  items,
  onChange,
  placeholder,
  max = 8,
  icon,
  noun = "line",
  field,
}: {
  label: string;
  hint?: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  max?: number;
  icon?: React.ReactNode;
  noun?: string;
  /** For "jump to field" links. */
  field?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const full = items.length >= max;

  const add = () => {
    const text = draft.trim();
    if (!text) {
      setError(`Type a ${noun} first.`);
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
          {items.length ? `${items.length} of ${max}` : "Optional"}
        </span>
      </label>
      {items.length ? (
        <ul className="flex flex-col gap-1.5" aria-label={label}>
          {items.map((item, index) => (
            <li key={item} className="y-tile flex min-h-12 items-center gap-3 py-1.5 ps-4 pe-1.5">
              {icon ? (
                <span aria-hidden className="flex-none">
                  {icon}
                </span>
              ) : null}
              <span className="y-small flex-1">{item}</span>
              <RoundIconButton
                label={`Remove “${item}”`}
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
        <p className="y-micro y-fg-3 px-1">That&apos;s the maximum. Remove one to add another.</p>
      ) : (
        <div className="flex gap-2">
          <input
            id={`${id}-input`}
            data-field={field}
            className="y-input"
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
          <PillButton variant="soft" onClick={add} icon={<Plus size={18} aria-hidden />} className="flex-none">
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
