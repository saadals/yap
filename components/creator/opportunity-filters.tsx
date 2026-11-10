"use client";

import { FilterChip } from "@/components/ui/chip";
import { PillButton } from "@/components/ui/pill-button";
import { money } from "@/lib/format";
import { formatById, languageById } from "@/lib/taxonomy";
import type { FormatId, LanguageId } from "@/lib/types";

export type OpportunityFilterState = {
  formats: FormatId[];
  languages: LanguageId[];
  minBudget: number;
};

export const BUDGET_STEPS = [0, 100, 150, 200, 250, 300, 400, 500, 750, 1000];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** Format, language and minimum budget filters. Rendered in a sidebar (desktop) or a sheet (mobile). */
export function OpportunityFilters({
  value,
  onChange,
  formatCounts,
  languageCounts,
  savedMinBudget,
  onSaveMinBudget,
}: {
  value: OpportunityFilterState;
  onChange: (next: OpportunityFilterState) => void;
  formatCounts: [FormatId, number][];
  languageCounts: [LanguageId, number][];
  savedMinBudget: number;
  onSaveMinBudget: (amount: number) => void;
}) {
  const steps = [...new Set([...BUDGET_STEPS, savedMinBudget, value.minBudget])].sort((a, b) => a - b);
  const stepIndex = Math.max(
    0,
    steps.findIndex((step) => step >= value.minBudget),
  );
  return (
    <div className="flex flex-col gap-7">
      <fieldset className="flex flex-col gap-3">
        <legend className="y-label mb-3">Format</legend>
        <div className="flex flex-wrap gap-2">
          {formatCounts.map(([id, count]) => {
            const Icon = formatById[id].icon;
            return (
              <FilterChip
                key={id}
                pressed={value.formats.includes(id)}
                count={count}
                icon={<Icon size={16} aria-hidden />}
                onClick={() => onChange({ ...value, formats: toggle(value.formats, id) })}
              >
                {formatById[id].name}
              </FilterChip>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="y-label mb-3">Language</legend>
        <div className="flex flex-wrap gap-2">
          {languageCounts.map(([id, count]) => (
            <FilterChip
              key={id}
              pressed={value.languages.includes(id)}
              count={count}
              onClick={() => onChange({ ...value, languages: toggle(value.languages, id) })}
            >
              {languageById[id].name}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <label htmlFor="min-budget" className="y-label">
          <span>Minimum budget</span>
          <span className="y-num font-semibold">
            {value.minBudget > 0 ? `${money(value.minBudget)}+` : "Any"}
          </span>
        </label>
        <input
          id="min-budget"
          type="range"
          className="y-range"
          min={0}
          max={steps.length - 1}
          step={1}
          value={stepIndex}
          aria-valuetext={value.minBudget > 0 ? `${money(value.minBudget)} or more` : "Any budget"}
          onChange={(e) => onChange({ ...value, minBudget: steps[Number(e.target.value)] ?? 0 })}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="y-micro y-fg-2">
            Hides custom orders whose top budget is below this. Your default is{" "}
            {savedMinBudget > 0 ? money(savedMinBudget) : "any budget"}.
          </p>
          {value.minBudget !== savedMinBudget ? (
            <PillButton size="sm" variant="outline" onClick={() => onSaveMinBudget(value.minBudget)}>
              Make default
            </PillButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
