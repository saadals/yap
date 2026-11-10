"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";

import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { plural } from "@/lib/format";
import { niches } from "@/lib/taxonomy";
import type { NicheId, ProductAsset } from "@/lib/types";

import { AssetsEditor } from "./assets-editor";
import { ListEditor } from "./list-editor";
import {
  type FieldErrors,
  type ProductForm,
  type RequiredField,
  brandPalette,
  sameForm,
  surfaceOptions,
  validate,
} from "./product-form";
import { TonePicker } from "./tone-picker";

/* -------------------------------------------------------------------------- */
/* Form state                                                                  */
/* -------------------------------------------------------------------------- */

type Touchable = RequiredField | "website";

/** Form state for the product editor (new flow and edit sheet): values, errors, dirty. */
export function useProductForm(initial: ProductForm) {
  const [baseline, setBaseline] = useState(initial);
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<Touchable, boolean>>>({});
  const [forced, setForced] = useState<Partial<Record<Touchable, boolean>>>({});
  const errors = validate(form);
  return {
    form,
    baseline,
    setForm,
    errors,
    dirty: !sameForm(form, baseline),
    set: <K extends keyof ProductForm>(key: K, value: ProductForm[K]) =>
      setForm((current) => ({ ...current, [key]: value })),
    touch: (field: Touchable) => setTouched((current) => (current[field] ? current : { ...current, [field]: true })),
    /** Show errors for these fields now (Continue or Save was pressed). */
    reveal: (fields: Touchable[]) =>
      setForced((current) => ({ ...current, ...Object.fromEntries(fields.map((f) => [f, true])) })),
    errorFor: (field: keyof FieldErrors) => (touched[field] || forced[field] ? errors[field] : undefined),
    /** After a save: the current values become the new baseline. */
    commit: () => setBaseline(form),
    /** Throw away edits. */
    revert: () => {
      setForm(baseline);
      setTouched({});
      setForced({});
    },
  };
}

export type ProductFormState = ReturnType<typeof useProductForm>;

/* -------------------------------------------------------------------------- */
/* Field groups                                                                */
/* -------------------------------------------------------------------------- */

export function BasicsFields({ state }: { state: ProductFormState }) {
  const { form, set, touch, errorFor } = state;
  const colorId = useId();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          label="Product name"
          name="name"
          required
          maxLength={60}
          autoComplete="off"
          placeholder="e.g. Daftar Invoices"
          value={form.name}
          onChange={(event) => set("name", event.target.value)}
          onBlur={() => touch("name")}
          error={errorFor("name")}
        />
        <SelectField
          label="Category"
          name="niche"
          optionalLabel={false}
          value={form.niche}
          onChange={(event) => set("niche", event.target.value as NicheId)}
          options={niches.map((n) => ({ value: n.id, label: n.name }))}
        />
      </div>
      <TextField
        label="One-liner"
        name="oneLiner"
        required
        maxLength={120}
        placeholder="e.g. Make and send an invoice over WhatsApp in about 10 seconds."
        value={form.oneLiner}
        onChange={(event) => set("oneLiner", event.target.value)}
        onBlur={() => touch("oneLiner")}
        error={errorFor("oneLiner")}
        hint={`What it does, in one sentence. It opens every brief. ${form.oneLiner.length}/120`}
      />
      <TextField
        label="Website or app link"
        name="website"
        inputMode="url"
        autoComplete="url"
        placeholder="e.g. daftar.app/invoices"
        value={form.website}
        onChange={(event) => set("website", event.target.value)}
        onBlur={() => touch("website")}
        error={errorFor("website")}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="y-label mb-2 w-full">
          <span>Where it runs</span>
          <span className="y-micro y-fg-3 font-medium">Optional</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {surfaceOptions.map((option) => {
            const checked = form.surfaces.includes(option.id);
            return (
              <label
                key={option.id}
                className={`y-tile flex min-h-11 cursor-pointer items-center gap-3 py-2 ps-3 pe-4 transition-shadow ${
                  checked ? "shadow-[inset_0_0_0_1.5px_var(--b-fg)]" : "hover:shadow-[inset_0_0_0_1.5px_var(--b-line)]"
                }`}
              >
                <input
                  type="checkbox"
                  className="y-check"
                  checked={checked}
                  onChange={() =>
                    set(
                      "surfaces",
                      checked
                        ? form.surfaces.filter((x) => x !== option.id)
                        : surfaceOptions.map((o) => o.id).filter((x) => x === option.id || form.surfaces.includes(x)),
                    )
                  }
                />
                <span className="y-small font-medium">{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="y-label mb-2 w-full">
          <span>Brand colour</span>
          <span className="y-micro y-fg-3 font-medium">For your product mark</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {[
            ...brandPalette,
            ...(brandPalette.some((c) => c.value.toLowerCase() === form.brandColor.toLowerCase())
              ? []
              : [{ value: form.brandColor, name: "Current colour" }]),
          ].map((color) => {
            const checked = color.value.toLowerCase() === form.brandColor.toLowerCase();
            return (
              <label key={color.value} className="relative cursor-pointer" title={color.name}>
                <input
                  type="radio"
                  name={`${colorId}-brand`}
                  value={color.value}
                  checked={checked}
                  onChange={() => set("brandColor", color.value)}
                  className="peer sr-only"
                  aria-label={color.name}
                />
                <span
                  aria-hidden
                  className={`grid size-10 place-items-center rounded-full text-white transition-transform peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--b-fg) ${
                    checked ? "scale-105 shadow-[0_0_0_3px_var(--b-bg),0_0_0_5px_var(--b-fg)]" : "hover:scale-105"
                  }`}
                  style={{ background: color.value }}
                >
                  {checked ? <Check size={17} strokeWidth={3} /> : null}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}

export function StoryFields({ state }: { state: ProductFormState }) {
  const { form, set, touch, errorFor } = state;
  return (
    <div className="flex flex-col gap-5">
      <TextArea
        label="The problem it solves"
        name="problem"
        required
        rows={3}
        maxLength={500}
        placeholder="e.g. They lose money chasing customers who say they'll pay tomorrow."
        value={form.problem}
        onChange={(event) => set("problem", event.target.value)}
        onBlur={() => touch("problem")}
        error={errorFor("problem")}
        hint="Say it the way your users would complain about it. It's the hook of most videos."
      />
      <TextArea
        label="Who it's for"
        name="audience"
        required
        rows={3}
        maxLength={500}
        placeholder="e.g. Freelancers in the US and Canada, 25–40, who send invoices from their phone."
        value={form.audience}
        onChange={(event) => set("audience", event.target.value)}
        onBlur={() => touch("audience")}
        error={errorFor("audience")}
        hint="Who, where and roughly what age. Creators pick a language and setting from it."
      />
      <TextArea
        label="What it does"
        name="description"
        rows={3}
        maxLength={800}
        placeholder="A short paragraph a creator could read before filming."
        value={form.description}
        onChange={(event) => set("description", event.target.value)}
      />
      <ListEditor
        label="Features worth showing"
        hint="Most important first. Creators usually demo the top two."
        noun="feature"
        items={form.features}
        onChange={(items) => set("features", items)}
        placeholder="e.g. Send an invoice on WhatsApp in 10 seconds"
        max={8}
      />
    </div>
  );
}

export function VoiceFields({ state }: { state: ProductFormState }) {
  const { form, set } = state;
  return (
    <div className="flex flex-col gap-6">
      <TonePicker value={form.tone} onChange={(tone) => set("tone", tone)} />
      <div className="grid gap-6 xl:grid-cols-2">
        <ListEditor
          label="Please do"
          noun="do"
          reorder={false}
          items={form.dos}
          onChange={(items) => set("dos", items)}
          placeholder="e.g. Film at a real shop counter"
          max={8}
        />
        <ListEditor
          label="Please avoid"
          noun="don't"
          reorder={false}
          items={form.donts}
          onChange={(items) => set("donts", items)}
          placeholder="e.g. Don't say “accounting”"
          max={8}
        />
      </div>
      <TextField
        label="Call to action"
        name="cta"
        maxLength={120}
        placeholder="e.g. Download Daftar and send your first invoice free"
        value={form.cta}
        onChange={(event) => set("cta", event.target.value)}
        hint="The last thing viewers hear."
      />
    </div>
  );
}

/** Product files (logo, screens, a demo login): added to the form, saved with it, Undo on remove. */
export function FilesFields({ state }: { state: ProductFormState }) {
  const toast = useToast();
  const { form, setForm } = state;
  const addAssets = (assets: ProductAsset[]) => {
    setForm((current) => ({ ...current, assets: [...current.assets, ...assets] }));
    toast({
      message: `Added ${assets.length === 1 ? assets[0].name : plural(assets.length, "file")}. Save to keep ${assets.length === 1 ? "it" : "them"}.`,
    });
  };
  const removeAsset = (asset: ProductAsset, index: number) => {
    setForm((current) => ({ ...current, assets: current.assets.filter((a) => a.id !== asset.id) }));
    toast({
      message: `Removed ${asset.name}`,
      action: {
        label: "Undo",
        onClick: () =>
          setForm((current) => {
            if (current.assets.some((a) => a.id === asset.id)) return current;
            const assets = [...current.assets];
            assets.splice(Math.min(index, assets.length), 0, asset);
            return { ...current, assets };
          }),
      },
    });
  };
  return <AssetsEditor assets={form.assets} onAdd={addAssets} onRemove={removeAsset} />;
}

/** Which parts of the form changed (for "Leave without saving?"). */
const sectionFields: { label: string; keys: (keyof ProductForm)[] }[] = [
  { label: "basics", keys: ["name", "oneLiner", "website", "niche", "surfaces", "brandColor"] },
  { label: "the story", keys: ["problem", "audience", "description", "features"] },
  { label: "voice", keys: ["tone", "dos", "donts", "cta"] },
  { label: "files", keys: ["assets"] },
];

export function changedSections(a: ProductForm, b: ProductForm): string[] {
  return sectionFields
    .filter((section) => section.keys.some((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key])))
    .map((section) => section.label);
}
