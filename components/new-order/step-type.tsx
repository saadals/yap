"use client";

import { Checklist } from "@/components/ui/data";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { jobTypeById, jobTypes, nicheById, niches } from "@/lib/taxonomy";
import type { JobType, NicheId } from "@/lib/types";

import { errorId, fieldId, type OrderKind } from "./model";
import { controlProps, FieldError, Fld, StepCard } from "./parts";
import type { StepProps } from "./step-props";

const KINDS: { kind: OrderKind; eyebrow: string; title: string; body: string; points: string[] }[] = [
  {
    kind: "campaign",
    eyebrow: "Quantity",
    title: "UGC campaign",
    body: "Many creators make Yapps from one brief. Fixed price per video. Creators pick a slot and start.",
    points: ["Lots of Yapps fast", "No pitches to review", "Creators post on their accounts"],
  },
  {
    kind: "custom",
    eyebrow: "One creator",
    title: "Custom order",
    body: "One made-to-brief video. Creators send pitches with their idea and price. You choose.",
    points: ["You pick the creator", "Up to 2 revisions", "Run it as your ad"],
  },
];

/** Step 1: the kind of order, then the category and (custom orders) the job type. */
export function TypeStep({ form, d, set, err, headingRef, lockKind }: StepProps & { lockKind?: OrderKind }) {
  const kindErr = err("kind");
  const catErr = err("category");
  const product = d.product;
  const campaign = form.kind === "campaign";

  const chooseCategory = (value: string) =>
    set(() => {
      const category = value as NicheId | "";
      // A saved product carries its category: picking another one means choosing the product again.
      const keepProduct = !product || !category || product.niche === category;
      return { category, ...(keepProduct ? {} : { productId: "" }) };
    });

  return (
    <StepCard title="What do you need?" hint="Pick one. You can post the other kind later." headingRef={headingRef}>
      <div
        id={fieldId("kind")}
        role="radiogroup"
        aria-labelledby="nw-step-title"
        aria-describedby={kindErr ? errorId("kind") : undefined}
        data-invalid={kindErr ? "true" : undefined}
        tabIndex={-1}
        className="y-nw-types"
      >
        {KINDS.map((item) => {
          const checked = form.kind === item.kind;
          const disabled = Boolean(lockKind && lockKind !== item.kind);
          return (
            <label
              key={item.kind}
              className="y-nw-tcard"
              data-checked={checked ? "true" : undefined}
              data-disabled={disabled ? "true" : undefined}
              data-kind={item.kind}
            >
              <input
                type="radio"
                name="nw-kind"
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={() => set({ kind: item.kind })}
              />
              <span className="y-nw-tk" data-kind={item.kind}>
                {item.eyebrow}
              </span>
              <b>{item.title}</b>
              <span className="y-nw-tbody">{item.body}</span>
              <Checklist items={item.points} className="y-nw-tpoints" />
              {disabled ? <span className="y-nw-small">This draft is a custom order.</span> : null}
            </label>
          );
        })}
      </div>
      <FieldError field="kind" message={kindErr} />

      <div className="y-nw-frow">
        <Fld
          field="category"
          label="Category"
          error={catErr}
          hint={
            product && form.category === product.niche
              ? `Matches ${product.name}. Pick another and you'll choose the product again on Basics.`
              : "Sets the price guidance and where creators find your order."
          }
        >
          <select
            className="y-input y-nw-input"
            {...controlProps("category", catErr)}
            value={form.category}
            onChange={(event) => chooseCategory(event.target.value)}
          >
            <option value="">Choose…</option>
            {niches.map((niche) => (
              <option key={niche.id} value={niche.id}>
                {nicheById[niche.id].name}
              </option>
            ))}
          </select>
        </Fld>

        <Fld
          field="jobType"
          label="Job type"
          group
          labelId="nw-job-label"
          hint={campaign ? "Campaigns are always full videos." : jobTypeById[form.jobType].description}
        >
          {campaign ? (
            <p className="y-nw-fixed" aria-labelledby="nw-job-label">
              Full video
            </p>
          ) : (
            <SegmentedToggle<JobType>
              label="Job type"
              size="md"
              fill
              className="y-nw-seg"
              value={form.jobType}
              onChange={(jobType) => set({ jobType })}
              options={jobTypes.map((j) => ({ value: j.id, label: j.name }))}
            />
          )}
        </Fld>
      </div>
    </StepCard>
  );
}
