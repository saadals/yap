"use client";

import { useId, useMemo } from "react";

import { FilterChip } from "@/components/ui/chip";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Sheet } from "@/components/ui/sheet";
import { money, plural } from "@/lib/format";
import type { DemoState } from "@/lib/store";
import { creatorKinds, languages, niches } from "@/lib/taxonomy";

import {
  type DeliveryCap,
  type Filters,
  PRICE_CEIL,
  PRICE_FLOOR,
  PRICE_STEP,
  clearSheetFilters,
  creatorPlatforms,
  fromPrice,
  matches,
  toggleIn,
} from "./filters";

const BIN = 50;

function Group({ legend, hint, children }: { legend: string; hint?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="flex flex-col gap-3 border-t border-(--b-line) pt-5 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-col gap-0.5">
        <h3 id={id} className="y-head">
          {legend}
        </h3>
        {hint ? <p className="y-small y-fg-2">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** Starting-price histogram and two sliders (minimum, maximum). */
function PriceRange({ s, value, onChange }: { s: DemoState; value: Filters; onChange: (next: Filters) => void }) {
  const bins = useMemo(() => {
    const count = Math.ceil((PRICE_CEIL - PRICE_FLOOR) / BIN);
    const out = Array.from({ length: count }, () => 0);
    for (const c of s.creators) {
      const from = fromPrice(c);
      if (!Number.isFinite(from)) continue;
      const index = Math.min(count - 1, Math.max(0, Math.floor((from - PRICE_FLOOR) / BIN)));
      out[index] += 1;
    }
    return out;
  }, [s.creators]);
  const max = Math.max(...bins, 1);
  const lo = value.priceMin ?? PRICE_FLOOR;
  const hi = value.priceMax ?? PRICE_CEIL;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-14 items-end gap-[3px]" aria-hidden>
        {bins.map((n, index) => {
          const start = PRICE_FLOOR + index * BIN;
          const inside = start + BIN > lo && start <= hi;
          return (
            <span
              key={start}
              className={`block flex-1 rounded-t-[5px] transition-colors duration-(--y-dur-2) ${inside ? "bg-(--b-fg)" : "bg-(--b-line-strong)"}`}
              style={{ height: n ? `${Math.max(14, (n / max) * 100)}%` : "3px" }}
            />
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="y-label">
            <span>Minimum</span>
            <span className="y-num font-semibold">{money(lo)}</span>
          </span>
          <input
            type="range"
            className="y-range"
            min={PRICE_FLOOR}
            max={PRICE_CEIL}
            step={PRICE_STEP}
            value={lo}
            aria-valuetext={money(lo)}
            onChange={(event) => {
              const next = Math.min(Number(event.target.value), hi);
              onChange({ ...value, priceMin: next <= PRICE_FLOOR ? null : next });
            }}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="y-label">
            <span>Maximum</span>
            <span className="y-num font-semibold">{hi >= PRICE_CEIL ? `${money(PRICE_CEIL)}+` : money(hi)}</span>
          </span>
          <input
            type="range"
            className="y-range"
            min={PRICE_FLOOR}
            max={PRICE_CEIL}
            step={PRICE_STEP}
            value={hi}
            aria-valuetext={hi >= PRICE_CEIL ? "No maximum" : money(hi)}
            onChange={(event) => {
              const next = Math.max(Number(event.target.value), lo);
              onChange({ ...value, priceMax: next >= PRICE_CEIL ? null : next });
            }}
          />
        </label>
      </div>
    </div>
  );
}

/**
 * The Filters sheet edits a draft; "Show N creators" applies it. N is live, so nobody applies
 * their way into an empty page.
 */
export function FilterSheet({
  s,
  open,
  draft,
  onDraft,
  onApply,
  onClose,
}: {
  s: DemoState;
  open: boolean;
  draft: Filters;
  onDraft: (next: Filters) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const count = s.creators.filter((c) => matches(c, draft)).length;
  const set = (patch: Partial<Filters>) => onDraft({ ...draft, ...patch });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filters"
      description="Prices are each creator's cheapest package. Payment is held until you approve the video."
      width="md"
      footer={
        <div className="flex items-center justify-between gap-3 pb-3 md:pb-0">
          <PillButton variant="ghost" onClick={() => onDraft(clearSheetFilters(draft))}>
            Clear all
          </PillButton>
          <PillButton variant="contrast" onClick={onApply} disabled={count === 0} aria-live="polite">
            {count === 0 ? "No creators match" : `Show ${plural(count, "creator")}`}
          </PillButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pt-1">
        <Group legend="Video language" hint="Creators who make videos in any of these.">
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <FilterChip
                key={lang.id}
                pressed={draft.langs.includes(lang.id)}
                onClick={() => set({ langs: toggleIn(draft.langs, lang.id) })}
              >
                {lang.name}
              </FilterChip>
            ))}
          </div>
        </Group>

        <Group legend="Category" hint="Products they've made videos for.">
          <div className="flex flex-wrap gap-2">
            {niches.map((niche) => (
              <FilterChip
                key={niche.id}
                pressed={draft.niches.includes(niche.id)}
                onClick={() => set({ niches: toggleIn(draft.niches, niche.id) })}
              >
                {niche.name}
              </FilterChip>
            ))}
          </div>
        </Group>

        <Group legend="Platform" hint="Where their videos usually run.">
          <div className="flex flex-wrap gap-2">
            {creatorPlatforms.map((platform) => (
              <FilterChip
                key={platform.id}
                pressed={draft.platforms.includes(platform.id)}
                onClick={() => set({ platforms: toggleIn(draft.platforms, platform.id) })}
              >
                {platform.name}
              </FilterChip>
            ))}
          </div>
        </Group>

        <Group legend="Kind of creator">
          <div className="flex flex-col gap-2">
            {creatorKinds.map((kind) => {
              const Icon = kind.icon;
              const on = draft.kinds.includes(kind.id);
              return (
                <label
                  key={kind.id}
                  className={`y-tile flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 ${on ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="y-check"
                    checked={on}
                    onChange={() => set({ kinds: toggleIn(draft.kinds, kind.id) })}
                  />
                  <Icon size={20} aria-hidden className="flex-none" />
                  <span className="flex min-w-0 flex-col">
                    <span className="y-small font-semibold">{kind.name}</span>
                    <span className="y-micro y-fg-2">{kind.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Group>

        <Group legend="Price range" hint="The price of their starting package.">
          <PriceRange s={s} value={draft} onChange={onDraft} />
        </Group>

        <Group legend="Delivery speed" hint="Based on their fastest package.">
          <SegmentedToggle<string>
            label="Delivery speed"
            size="md"
            className="w-fit flex-wrap"
            value={String(draft.days)}
            onChange={(v) => set({ days: Number(v) as DeliveryCap })}
            options={[
              { value: "0", label: "Any" },
              { value: "3", label: "3 days" },
              { value: "5", label: "5 days" },
              { value: "7", label: "7 days" },
            ]}
          />
        </Group>

        <Group legend="Availability">
          <label htmlFor="dsc-available" className="flex min-h-11 cursor-pointer items-center gap-4">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="y-small font-semibold">Available now</span>
              <span className="y-micro y-fg-2">Can start on your video this week.</span>
            </span>
            <input
              id="dsc-available"
              type="checkbox"
              role="switch"
              className="y-switch flex-none"
              checked={draft.available}
              onChange={(event) => set({ available: event.target.checked })}
            />
          </label>
        </Group>
      </div>
    </Sheet>
  );
}
