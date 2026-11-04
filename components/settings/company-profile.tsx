"use client";

import { BadgeCheck, Check, Globe, MapPin } from "lucide-react";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { SelectField, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { cities } from "@/lib/data/cities";
import { cityLabel, me } from "@/lib/selectors";
import { ME, actions, useDemo } from "@/lib/store";
import { countries, niches } from "@/lib/taxonomy";
import type { Business, NicheId } from "@/lib/types";

/** Dark brand colours that keep the white monogram readable (contrast 4.5:1 or better). */
const palette: { name: string; value: string }[] = [
  { name: "Emerald", value: "#0F7A5C" },
  { name: "Forest", value: "#166534" },
  { name: "Teal", value: "#0E7490" },
  { name: "Ocean", value: "#1F4FD1" },
  { name: "Navy", value: "#1D1D6B" },
  { name: "Violet", value: "#6D28D9" },
  { name: "Plum", value: "#86198F" },
  { name: "Berry", value: "#BE185D" },
  { name: "Brick", value: "#B4232A" },
  { name: "Rust", value: "#9A3412" },
  { name: "Olive", value: "#3F6212" },
  { name: "Graphite", value: "#27272A" },
];

const teamSizes = ["Just me", "2–10 people", "11–50 people", "51–200 people", "200+ people"];

type Form = Pick<Business, "name" | "monogram" | "tagline" | "website" | "cityId" | "industry" | "teamSize" | "brandColor">;

const pick = (b: Business): Form => ({
  name: b.name,
  monogram: b.monogram,
  tagline: b.tagline,
  website: b.website,
  cityId: b.cityId,
  industry: b.industry,
  teamSize: b.teamSize,
  brandColor: b.brandColor,
});

function validate(form: Form) {
  const site = form.website.trim().replace(/^https?:\/\//i, "");
  return {
    name: form.name.trim().length < 2 ? "Enter your company name." : form.name.trim().length > 40 ? "Keep it under 40 characters." : null,
    monogram: !/^[\p{L}\p{N}]{1,2}$/u.test(form.monogram.trim()) ? "Use 1 or 2 letters." : null,
    tagline:
      form.tagline.trim().length < 6
        ? "Add a short line about what you do, like “Invoices and stock for small shops”."
        : form.tagline.trim().length > 80
          ? `Keep it under 80 characters (${form.tagline.trim().length} now).`
          : null,
    website: site && !/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(site) ? "Enter a web address like daftar.app." : null,
  };
}

export function CompanyProfileForm() {
  const s = useDemo();
  const business = me.business(s);
  // Remount when the stored business changes from elsewhere (another tab, reset).
  return <Inner key={JSON.stringify(pick(business))} business={business} />;
}

function Inner({ business }: { business: Business }) {
  const toast = useToast();
  const [form, setForm] = useState<Form>(() => pick(business));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = validate(form);
  const dirty = JSON.stringify(form) !== JSON.stringify(pick(business));
  const show = (key: keyof typeof errors) => (touched[key] ? errors[key] : null);
  const blur = (key: string) => () => setTouched((t) => ({ ...t, [key]: true }));
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const swatches = palette.some((p) => p.value.toLowerCase() === business.brandColor.toLowerCase())
    ? palette
    : [{ name: "Current", value: business.brandColor }, ...palette];
  const city = cities.find((c) => c.id === form.cityId);

  const save = () => {
    setTouched({ name: true, monogram: true, tagline: true, website: true });
    if (errors.name || errors.monogram || errors.tagline || errors.website) return;
    const previous = pick(business);
    const next: Form = {
      ...form,
      name: form.name.trim(),
      monogram: form.monogram.trim().toUpperCase().slice(0, 1) + form.monogram.trim().slice(1).toLowerCase(),
      tagline: form.tagline.trim(),
      website: form.website.trim().replace(/^https?:\/\//i, "").replace(/\/$/, ""),
    };
    actions.updateBusiness(ME.businessId, next);
    toast({
      message: "Saved. Creators will see the update on your requests.",
      action: { label: "Undo", onClick: () => actions.updateBusiness(ME.businessId, previous) },
    });
  };

  return (
    <form
      noValidate
      className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <TextField
            label="Company name"
            required
            autoComplete="organization"
            value={form.name}
            onChange={(event) => set("name", event.target.value)}
            onBlur={blur("name")}
            error={show("name")}
          />
          <TextField
            label="Monogram"
            required
            maxLength={2}
            hint="On your logo"
            value={form.monogram}
            onChange={(event) => set("monogram", event.target.value)}
            onBlur={blur("monogram")}
            error={show("monogram")}
          />
        </div>
        <TextField
          label="Tagline"
          required
          hint="Shown on every request."
          value={form.tagline}
          onChange={(event) => set("tagline", event.target.value)}
          onBlur={blur("tagline")}
          error={show("tagline")}
        />
        <TextField
          label="Website"
          inputMode="url"
          autoComplete="url"
          placeholder="daftar.app"
          value={form.website}
          onChange={(event) => set("website", event.target.value)}
          onBlur={blur("website")}
          error={show("website")}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField
            label="City"
            required
            options={cities.map((c) => ({ value: c.id, label: `${c.name}, ${countries[c.countryId].name}` }))}
            value={form.cityId}
            onChange={(event) => set("cityId", event.target.value)}
          />
          <SelectField
            label="Industry"
            required
            options={niches.map((n) => ({ value: n.id, label: n.name }))}
            value={form.industry}
            onChange={(event) => set("industry", event.target.value as NicheId)}
          />
          <SelectField
            label="Team size"
            required
            options={(teamSizes.includes(form.teamSize) ? teamSizes : [form.teamSize, ...teamSizes]).map((size) => ({
              value: size,
              label: size,
            }))}
            value={form.teamSize}
            onChange={(event) => set("teamSize", event.target.value)}
          />
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="y-label mb-3 w-full">
            <span>Brand colour</span>
            <span className="y-micro y-fg-3 font-medium">Behind your monogram</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {swatches.map((swatch) => {
              const checked = form.brandColor.toLowerCase() === swatch.value.toLowerCase();
              return (
                <label key={swatch.value} className="relative grid size-11 cursor-pointer place-items-center">
                  <input
                    type="radio"
                    name="brand-colour"
                    value={swatch.value}
                    checked={checked}
                    onChange={() => set("brandColor", swatch.value)}
                    aria-label={swatch.name}
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className="grid size-11 place-items-center rounded-full text-white ring-offset-2 ring-offset-(--b-bg) peer-checked:ring-2 peer-checked:ring-(--b-fg) peer-focus-visible:outline-[2.5px] peer-focus-visible:outline-offset-4 peer-focus-visible:outline-(--b-fg) peer-focus-visible:outline-solid"
                    style={{ background: swatch.value }}
                  >
                    {checked ? <Check size={18} strokeWidth={3} /> : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <PillButton type="submit" variant="contrast" disabled={!dirty}>
            Save company profile
          </PillButton>
          {dirty ? (
            <PillButton
              variant="ghost"
              onClick={() => {
                setForm(pick(business));
                setTouched({});
              }}
            >
              Discard changes
            </PillButton>
          ) : null}
        </div>
      </div>

      <aside aria-label="Preview" className="y-tile flex h-fit flex-col gap-4 p-5">
        <p className="y-micro y-fg-2">How creators see you</p>
        <div className="flex items-center gap-3">
          <BusinessLogo
            business={{ name: form.name, monogram: form.monogram.trim() || "?", brandColor: form.brandColor }}
            size={64}
          />
          <div className="min-w-0">
            <p className="y-head flex items-center gap-1.5 truncate">
              <span className="truncate">{form.name.trim() || "Your company"}</span>
              {business.verified ? <BadgeCheck size={16} role="img" aria-label="Verified" className="flex-none" /> : null}
            </p>
            <p className="y-micro y-fg-2 truncate">{niches.find((n) => n.id === form.industry)?.name} · {form.teamSize}</p>
          </div>
        </div>
        <p className="y-small">{form.tagline.trim() || "Your tagline appears here."}</p>
        <div className="y-micro y-fg-2 flex flex-col gap-1">
          <span className="flex items-center gap-1.5">
            <MapPin size={12} aria-hidden /> {city ? cityLabel(city.id) : form.cityId}
          </span>
          {form.website.trim() ? (
            <span className="flex items-center gap-1.5 break-all">
              <Globe size={12} aria-hidden /> {form.website.trim().replace(/^https?:\/\//i, "")}
            </span>
          ) : null}
        </div>
      </aside>
    </form>
  );
}
