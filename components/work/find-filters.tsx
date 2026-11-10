"use client";

import { FilterChip } from "@/components/ui/chip";
import type { WorkFacets } from "@/lib/selectors";
import { WORK_CLOSING_STEPS, WORK_PAY_STEPS, jobTypes, niches, platforms } from "@/lib/taxonomy";

import type { FindState } from "./find-query";

/** A checkbox row with a facet count (dimmed at zero, still clickable). */
function Option({
  checked,
  count,
  onToggle,
  children,
}: {
  checked: boolean;
  count: number;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className="y-fopt"
      data-zero={count ? undefined : "true"}
      onClick={onToggle}
    >
      <span className="y-fopt-box" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <span className="y-fopt-n y-num">{count}</span>
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="y-fgroup" role="group" aria-label={label}>
      <div className="y-eyebrow">{label}</div>
      {children}
    </div>
  );
}

const toggle = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/**
 * Find work's filter groups (Work spec 6.5.8; round 3 answers item 31): Job type, Category,
 * Platform, Pay at least, Closes within. Counts are faceted (each group applies every other
 * filter, not its own). The same component sits under the sidebar's nav on desktop and in the
 * Filters sheet below 1180px. The Category group is the finder's category select shown twice.
 */
export function FindFilters({
  state,
  facets,
  onChange,
  onClear,
  showHead = true,
}: {
  state: FindState;
  facets: WorkFacets;
  onChange: (patch: Partial<FindState>) => void;
  onClear: () => void;
  showHead?: boolean;
}) {
  return (
    <div className="y-fside" aria-label="Filters" role="region">
      {showHead ? (
        <div className="y-fside-h">
          <b>Filters</b>
          <button type="button" className="y-link-btn y-hit" onClick={onClear}>
            Clear all
          </button>
        </div>
      ) : null}
      <Group label="Job type">
        {jobTypes.map((j) => (
          <Option
            key={j.id}
            checked={state.jobTypes.includes(j.id)}
            count={facets.jobTypes[j.id] ?? 0}
            onToggle={() => onChange({ jobTypes: toggle(state.jobTypes, j.id) })}
          >
            {j.name}
          </Option>
        ))}
      </Group>
      <Group label="Category">
        {niches.map((n) => (
          <Option
            key={n.id}
            checked={state.categories.includes(n.id)}
            count={facets.categories[n.id] ?? 0}
            onToggle={() => onChange({ categories: toggle(state.categories, n.id) })}
          >
            {n.name}
          </Option>
        ))}
      </Group>
      <Group label="Platform">
        <div className="y-fpills">
          <FilterChip size="sm" pressed={state.platform === "any"} onClick={() => onChange({ platform: "any" })}>
            Any
          </FilterChip>
          {platforms.map((p) => (
            <FilterChip
              key={p.id}
              size="sm"
              pressed={state.platform === p.id}
              count={facets.platforms[p.id] ?? 0}
              className={facets.platforms[p.id] ? "" : "y-fpill-zero"}
              onClick={() => onChange({ platform: state.platform === p.id ? "any" : p.id })}
            >
              {p.name}
            </FilterChip>
          ))}
        </div>
      </Group>
      <Group label="Pay at least">
        <div className="y-fpills">
          {[0, ...WORK_PAY_STEPS].map((v) => (
            <FilterChip key={v} size="sm" pressed={state.minPay === v} onClick={() => onChange({ minPay: v })}>
              {v ? `$${v}+` : "Any"}
            </FilterChip>
          ))}
        </div>
      </Group>
      <Group label="Closes within">
        <div className="y-fpills">
          {[0, ...WORK_CLOSING_STEPS].map((d) => (
            <FilterChip key={d} size="sm" pressed={state.within === d} onClick={() => onChange({ within: d })}>
              {d === 0 ? "Any time" : d === 7 ? "1 week" : `${d} days`}
            </FilterChip>
          ))}
        </div>
      </Group>
    </div>
  );
}
