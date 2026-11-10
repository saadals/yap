"use client";

import { Ban, Check, Plus } from "lucide-react";
import { useId, useState } from "react";

import { FilterChip } from "@/components/ui/chip";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { cities } from "@/lib/data";
import { actions } from "@/lib/store";
import { countries, niches } from "@/lib/taxonomy";
import type { NicheId } from "@/lib/types";

import { ChipRadioGroup, GroupError, GroupLabel, toggleIn } from "./choice";
import { ListInput } from "./list-input";
import { PRODUCT_COLOUR, surfaceLabels, type ProductDraft } from "./product-preview";

/**
 * Onboarding steps for ordering videos (company and first product). Shared by the "Order
 * videos" and "Both" paths in <Onboarding>. The product is saved with `actions.saveProduct`.
 */

export type OrderData = ProductDraft & {
  company: string;
  website: string;
  cityId: string;
  industry: NicheId | "";
  skipProduct: boolean;
};

export type Errors = Partial<Record<string, string | null>>;

export const initialOrderData = (domain: string): OrderData => ({
  company: "",
  website: domain,
  cityId: "",
  industry: "",
  productName: "",
  oneLiner: "",
  problem: "",
  audience: "",
  surfaces: [],
  features: [],
  tone: [],
  dos: [],
  donts: [],
  cta: "",
  skipProduct: false,
});

const toneWords = ["Casual", "Warm", "Funny", "Straight-talking", "Energetic", "Calm", "Premium", "Playful"];

export const cityOptions = [
  { value: "", label: "Choose a city" },
  ...cities.map((city) => ({
    value: city.id,
    label: `${city.name}, ${countries[city.countryId].name}`,
  })),
];

const websitePattern = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;
const cleanWebsite = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export function validateCompany(d: OrderData & { name: string }): Errors {
  const e: Errors = {};
  if (d.name.trim().length < 2) e.name = "Enter your name.";
  if (d.company.trim().length < 2) e.company = "Enter your company or brand name.";
  if (d.website.trim() && !websitePattern.test(d.website.trim()))
    e.website = "That doesn't look like a web address. Try something like daftar.app.";
  if (!d.cityId) e.cityId = "Choose where you're based.";
  if (!d.industry) e.industry = "Choose the closest industry.";
  return e;
}

export function validateProduct(d: OrderData): Errors {
  const e: Errors = {};
  if (d.productName.trim().length < 2) e.productName = "Name the product the videos are about.";
  if (d.oneLiner.trim().length < 8) e.oneLiner = "Describe what it does in one line.";
  if (d.oneLiner.length > 90) e.oneLiner = "Keep it under 90 characters.";
  if (d.surfaces.length === 0) e.surfaces = "Choose at least one place people use it.";
  return e;
}

export function validateAudience(d: OrderData): Errors {
  const e: Errors = {};
  if (d.problem.trim().length < 10) e.problem = "Describe the problem in a sentence or two.";
  if (d.audience.trim().length < 6) e.audience = "Describe who you want to reach.";
  return e;
}

export function validateVoice(d: OrderData): Errors {
  const e: Errors = {};
  if (d.tone.length === 0) e.tone = "Pick at least one word for the tone.";
  if (d.cta.trim().length < 4) e.cta = "Tell viewers what to do next.";
  return e;
}

/** Save the product to the signed-in account (sign in first). Returns its id, or null if skipped. */
export function saveOrderProduct(d: OrderData): string | null {
  const name = d.productName.trim();
  if (d.skipProduct || !name) return null;
  return actions.saveProduct({
    name,
    oneLiner: d.oneLiner.trim(),
    description: [d.oneLiner.trim(), d.problem.trim()].filter(Boolean).join(" "),
    website: cleanWebsite(d.website),
    niche: d.industry || "b2b",
    surfaces: d.surfaces,
    audience: d.audience.trim(),
    problem: d.problem.trim(),
    features: d.features,
    tone: d.tone,
    dos: d.dos,
    donts: d.donts,
    cta: d.cta.trim() || "Try it free",
    brandColor: PRODUCT_COLOUR,
  });
}

/* -------------------------------------------------------------------------- */
/* Steps                                                                       */
/* -------------------------------------------------------------------------- */

type StepProps<T> = { data: T; set: (patch: Partial<T>) => void; errors: Errors };

export function CompanyStep({
  data,
  set,
  errors,
  prefilled,
}: StepProps<OrderData & { name: string }> & { prefilled: string }) {
  const industryId = useId();
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          label="Your name"
          required
          autoComplete="name"
          value={data.name}
          error={errors.name}
          onChange={(event) => set({ name: event.target.value })}
        />
        <TextField
          label="Company or brand"
          required
          autoComplete="organization"
          placeholder="e.g. Daftar"
          value={data.company}
          error={errors.company}
          onChange={(event) => set({ company: event.target.value })}
        />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          label="Website"
          type="url"
          inputMode="url"
          dir="ltr"
          autoComplete="url"
          placeholder="yourcompany.com"
          hint={
            prefilled && data.website === prefilled
              ? "Filled in from your email. Change it if it's different."
              : undefined
          }
          value={data.website}
          error={errors.website}
          onChange={(event) => set({ website: event.target.value })}
        />
        <SelectField
          label="Where you're based"
          required
          options={cityOptions}
          value={data.cityId}
          error={errors.cityId}
          onChange={(event) => set({ cityId: event.target.value })}
        />
      </div>
      <div className="flex flex-col gap-3">
        <GroupLabel id={industryId} required>
          Industry
        </GroupLabel>
        <ChipRadioGroup
          labelledBy={industryId}
          options={niches.map((niche) => ({ value: niche.id, label: niche.name }))}
          value={data.industry}
          onChange={(industry) => set({ industry })}
          invalid={Boolean(errors.industry)}
        />
        <GroupError>{errors.industry}</GroupError>
      </div>
    </>
  );
}

export function ProductStep({ data, set, errors }: StepProps<OrderData>) {
  const surfacesId = useId();
  return (
    <>
      <TextField
        label="Product name"
        required
        placeholder="e.g. Daftar Invoices"
        value={data.productName}
        error={errors.productName}
        onChange={(event) => set({ productName: event.target.value })}
      />
      <TextField
        label="One-liner"
        required
        maxLength={90}
        placeholder="e.g. Send an invoice over WhatsApp in about 10 seconds."
        hint={`${data.oneLiner.length}/90 · What it does, in words your customers use.`}
        value={data.oneLiner}
        error={errors.oneLiner}
        onChange={(event) => set({ oneLiner: event.target.value })}
      />
      <div className="flex flex-col gap-3">
        <GroupLabel id={surfacesId} required>
          Where people use it
        </GroupLabel>
        <div
          role="group"
          aria-labelledby={surfacesId}
          data-invalid={errors.surfaces ? true : undefined}
          className="flex flex-wrap gap-2"
        >
          {(["ios", "android", "web"] as const).map((surface) => (
            <FilterChip
              key={surface}
              pressed={data.surfaces.includes(surface)}
              onClick={() => set({ surfaces: toggleIn(data.surfaces, surface) })}
            >
              {surfaceLabels[surface]}
            </FilterChip>
          ))}
        </div>
        <GroupError>{errors.surfaces}</GroupError>
      </div>
    </>
  );
}

export function AudienceStep({ data, set, errors }: StepProps<OrderData>) {
  return (
    <>
      <TextArea
        label="What problem does it solve?"
        required
        rows={3}
        placeholder="e.g. Shop owners lose money chasing customers who 'will pay tomorrow'. Asking feels awkward and the notebook gets messy."
        value={data.problem}
        error={errors.problem}
        onChange={(event) => set({ problem: event.target.value })}
      />
      <TextArea
        label="Who is it for?"
        required
        rows={3}
        placeholder="e.g. Freelancers in the US and Canada, 25–40, who send invoices from their phone and still track them in a spreadsheet."
        value={data.audience}
        error={errors.audience}
        onChange={(event) => set({ audience: event.target.value })}
      />
    </>
  );
}

export function VoiceStep({ data, set, errors }: StepProps<OrderData>) {
  const toneId = useId();
  const [customTone, setCustomTone] = useState("");
  // Open the optional extras on return visits that already have some; never toggled by React after.
  const [extrasOpen] = useState(() => data.features.length + data.dos.length + data.donts.length > 0);
  const addTone = () => {
    const word = customTone.trim();
    if (!word) return;
    const normalised = word.charAt(0).toUpperCase() + word.slice(1);
    if (!data.tone.some((t) => t.toLowerCase() === normalised.toLowerCase()))
      set({ tone: [...data.tone, normalised] });
    setCustomTone("");
  };
  const extraTones = data.tone.filter((word) => !toneWords.includes(word));

  return (
    <>
      <div className="flex flex-col gap-3">
        <GroupLabel id={toneId} required>
          Tone
        </GroupLabel>
        <div
          role="group"
          aria-labelledby={toneId}
          data-invalid={errors.tone ? true : undefined}
          className="flex flex-wrap gap-2"
        >
          {[...toneWords, ...extraTones].map((word) => (
            <FilterChip
              key={word}
              pressed={data.tone.includes(word)}
              onClick={() => set({ tone: toggleIn(data.tone, word) })}
            >
              {word}
            </FilterChip>
          ))}
        </div>
        <div className="flex gap-2">
          <label htmlFor={`${toneId}-custom`} className="sr-only">
            Add your own tone word
          </label>
          <input
            id={`${toneId}-custom`}
            className="y-input flex-1"
            placeholder="Add your own word"
            maxLength={24}
            value={customTone}
            onChange={(event) => setCustomTone(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTone();
              }
            }}
          />
          <PillButton
            variant="outline"
            onClick={addTone}
            disabled={!customTone.trim()}
            icon={<Plus size={18} aria-hidden />}
            aria-label="Add tone word"
            className="flex-none !px-4"
          >
            Add
          </PillButton>
        </div>
        <GroupError>{errors.tone}</GroupError>
      </div>
      <TextField
        label="Call to action"
        required
        placeholder="e.g. Download Daftar and send your first invoice free"
        hint="The last thing viewers hear."
        value={data.cta}
        error={errors.cta}
        onChange={(event) => set({ cta: event.target.value })}
      />

      <details className="group border-t border-(--b-line) pt-6" open={extrasOpen || undefined}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col">
            <span className="y-head">Features, dos and don&apos;ts</span>
            <span className="y-small y-fg-2">Optional. Add them now or later from Products.</span>
          </span>
          <span
            aria-hidden
            className="y-round transition-transform group-open:rotate-45"
            data-tone-btn="soft"
            data-size="sm"
          >
            <Plus size={18} />
          </span>
        </summary>
        <div className="flex flex-col gap-5 pt-5">
          <ListInput
            label="Features worth showing"
            hint="The two or three things a viewer should see on screen."
            items={data.features}
            onChange={(features) => set({ features })}
            placeholder="e.g. Send an invoice straight to WhatsApp"
            itemNoun="feature"
          />
          <div className="grid gap-5 md:grid-cols-2">
            <ListInput
              label="Dos"
              items={data.dos}
              onChange={(dos) => set({ dos })}
              placeholder="e.g. Show the send moment early"
              icon={<Check size={16} strokeWidth={2.5} />}
              itemNoun="do"
            />
            <ListInput
              label="Don'ts"
              items={data.donts}
              onChange={(donts) => set({ donts })}
              placeholder="e.g. Don't say 'accounting'"
              icon={<Ban size={16} />}
              itemNoun="don't"
            />
          </div>
        </div>
      </details>
    </>
  );
}
