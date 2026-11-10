"use client";

import { BadgeCheck } from "lucide-react";

import { median } from "@/components/requests/shared";
import { money, plural } from "@/lib/format";
import { addonById, ORDER_DEADLINE_OPTIONS, RAW_FOOTAGE_INCLUDED, usageById, usageOptions } from "@/lib/taxonomy";
import type { AddonId, UsageOptionId } from "@/lib/types";

import { controlProps, Fld, PillGroup, StepCard } from "./parts";
import type { StepProps } from "./step-props";

const WANTED_ADDONS: AddonId[] = ["subtitles", "extra-hooks", "post-to-account"];

/** Step 5: the deadline the brand sets, and how the videos may be used (part of the price). */
export function TermsStep({ form, d, set, err, headingRef }: StepProps) {
  const campaign = form.kind === "campaign";
  const deadlineErr = err("deadline");
  const usageErr = err("usage");
  const pool = d.market.pool;
  const addonStats = (id: AddonId) => {
    const offers = pool.flatMap((q) => q.creator.addons.filter((a) => a.id === id));
    return { count: offers.length, price: Math.round(median(offers.map((a) => a.price)) / 5) * 5 };
  };

  return (
    <StepCard title="Deadline and rights" headingRef={headingRef}>
      <Fld
        field="deadline"
        label="Deadline · you set it"
        group
        labelId="nw-deadline-label"
        error={deadlineErr}
        hint={
          <>
            {campaign
              ? "Time a creator has to upload version 1 after picking a slot."
              : d.adCopy
                ? "Time the hired writer has to deliver version 1."
                : "Time the hired creator has to deliver version 1."}{" "}
            Creators see it as set by {d.brandName}.
          </>
        }
      >
        <PillGroup<number>
          field="deadline"
          labelId="nw-deadline-label"
          error={deadlineErr}
          options={ORDER_DEADLINE_OPTIONS.map((days) => ({ value: days, label: plural(days, "day") }))}
          selected={[form.deadlineDays]}
          onToggle={(deadlineDays) => set({ deadlineDays })}
        />
      </Fld>

      <Fld
        field="usage"
        label="Usage rights"
        error={usageErr}
        hint={`${usageById[form.usage]?.description ?? ""} Included in the price, with no separate rights fee. ${
          d.adCopy ? "" : RAW_FOOTAGE_INCLUDED
        }`}
      >
        <select
          className="y-input y-nw-input"
          {...controlProps("usage", usageErr)}
          value={form.usage}
          onChange={(event) => set({ usage: event.target.value as UsageOptionId })}
        >
          {usageOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </Fld>

      {form.kind === "custom" && !d.adCopy ? (
        <Fld
          field="addons"
          label="Extras to quote"
          optional
          group
          labelId="nw-addons-label"
          hint="Creators include these in their pitch price. You can still change them when you hire."
        >
          <PillGroup<AddonId>
            field="addons"
            labelId="nw-addons-label"
            multiple
            checkmark
            options={WANTED_ADDONS.map((id) => {
              const stats = addonStats(id);
              return {
                value: id,
                label: (
                  <>
                    {addonById[id].name}
                    {stats.count ? <span className="y-nw-pill-meta"> · usually +{money(stats.price)}</span> : null}
                  </>
                ),
              };
            })}
            selected={form.addons}
            onToggle={(id) =>
              set((f) => ({ addons: f.addons.includes(id) ? f.addons.filter((a) => a !== id) : [...f.addons, id] }))
            }
          />
        </Fld>
      ) : null}

      {!d.adCopy ? (
        <p className="y-nw-small y-nw-included">
          <BadgeCheck size={16} aria-hidden />
          Two revisions included. {RAW_FOOTAGE_INCLUDED}
        </p>
      ) : (
        <p className="y-nw-small y-nw-included">
          <BadgeCheck size={16} aria-hidden />
          Two revisions included.
        </p>
      )}
    </StepCard>
  );
}
