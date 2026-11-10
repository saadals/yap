"use client";

import { Check, Plus } from "lucide-react";
import { useId, useState } from "react";

import { FilterChip } from "@/components/ui/chip";
import { PillButton } from "@/components/ui/pill-button";

import { toneSuggestions } from "./product-form";

/** Multi-select voice words from suggestions plus the business's own words. */
export function TonePicker({
  value,
  onChange,
  max = 5,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
}) {
  const labelId = useId();
  const hintId = useId();
  const [custom, setCustom] = useState("");
  const lower = value.map((tone) => tone.toLowerCase());
  const full = value.length >= max;
  const extra = value.filter(
    (tone) => !toneSuggestions.some((s) => s.toLowerCase() === tone.toLowerCase()),
  );

  const toggle = (tone: string) => {
    const on = lower.includes(tone.toLowerCase());
    if (on) onChange(value.filter((t) => t.toLowerCase() !== tone.toLowerCase()));
    else if (!full) onChange([...value, tone]);
  };

  const addCustom = () => {
    const text = custom.trim().replace(/\s+/g, " ");
    if (!text || full) return;
    const word = text[0].toUpperCase() + text.slice(1);
    if (!lower.includes(word.toLowerCase())) onChange([...value, word]);
    setCustom("");
  };

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={hintId} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span id={labelId} className="y-label">
          Tone of voice
        </span>
        <span className="y-micro y-fg-3">
          {value.length}/{max}
        </span>
      </div>
      <p id={hintId} className="y-micro y-fg-3 -mt-1 px-1">
        Pick up to {max} words. Creators match their delivery to these.
      </p>
      <div className="flex flex-wrap gap-2">
        {[...toneSuggestions, ...extra].map((tone) => {
          const pressed = lower.includes(tone.toLowerCase());
          return (
            <FilterChip
              key={tone}
              pressed={pressed}
              onClick={() => toggle(tone)}
              icon={pressed ? <Check size={16} aria-hidden /> : undefined}
              className={!pressed && full ? "opacity-45" : ""}
            >
              {tone}
            </FilterChip>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addCustom();
            }
          }}
          maxLength={24}
          disabled={full}
          placeholder={full ? `Up to ${max} words` : "Your own word, e.g. Cheeky"}
          aria-label="Add your own tone word"
          className="y-input min-w-0 flex-1"
        />
        <PillButton
          variant="soft"
          icon={<Plus size={18} aria-hidden />}
          onClick={addCustom}
          disabled={!custom.trim() || full}
          aria-label="Add tone word"
        >
          Add
        </PillButton>
      </div>
    </div>
  );
}
