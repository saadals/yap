"use client";

import { AlertCircle, Plus, X } from "lucide-react";
import { useState } from "react";

import { TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { useToast } from "@/components/ui/toast";
import { creatorNet, money, moneyExact, priceLimitError, priceLimits } from "@/lib/format";
import { actions } from "@/lib/store";
import { FEE_PCT, PRICE_MAX_PER_YAPP, PRICE_MIN_PER_YAPP } from "@/lib/taxonomy";
import type { Creator, Package, PackageTier } from "@/lib/types";

import { ProfileSection, useDraft } from "./section";

const tiers: { id: PackageTier; label: string; hint: string }[] = [
  { id: "basic", label: "Basic", hint: "Your entry point. Most first-time buyers start here." },
  { id: "standard", label: "Standard", hint: "The one you'd recommend. Usually the most booked." },
  { id: "premium", label: "Premium", hint: "More videos or more polish, for bigger launches." },
];

type NumField = "price" | "deliveryDays" | "revisions" | "videos" | "maxSeconds";
type Field = "name" | "summary" | NumField | "includes";

// Price limits depend on the package's video count ($30–5,000 per Yapp; see `priceLimitError`).
const numFields: { id: NumField; label: string; min: number; max: number; unit?: string }[] = [
  { id: "price", label: "Price (USD)", min: PRICE_MIN_PER_YAPP, max: PRICE_MAX_PER_YAPP },
  { id: "deliveryDays", label: "Delivery days", min: 1, max: 60 },
  { id: "revisions", label: "Revisions", min: 2, max: 10 },
  { id: "videos", label: "Videos", min: 1, max: 20 },
  { id: "maxSeconds", label: "Max length (s)", min: 5, max: 600 },
];

const toNum = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));
const show = (value: number) => (Number.isNaN(value) ? "" : String(value));

function validate(packages: Package[]): Record<PackageTier, Partial<Record<Field, string>>> {
  const out = { basic: {}, standard: {}, premium: {} } as Record<PackageTier, Partial<Record<Field, string>>>;
  packages.forEach((p, index) => {
    const e = out[p.tier];
    if (p.name.trim().length < 3) e.name = "Name it (at least 3 characters).";
    if (p.summary.trim().length < 10) e.summary = "Say what's in it in one line.";
    for (const f of numFields) {
      const v = p[f.id];
      if (f.id === "price") {
        const error = priceLimitError(v, Number.isInteger(p.videos) && p.videos > 0 ? p.videos : 1);
        if (error) e.price = error;
      } else if (!Number.isInteger(v) || v < f.min || v > f.max) e[f.id] = `Whole number, ${f.min}–${f.max}.`;
    }
    if (!e.price && index > 0) {
      const previous = packages[index - 1];
      if (Number.isFinite(previous.price) && p.price <= previous.price)
        e.price = `Price it above ${tiers[index - 1].label} (${money(previous.price)}).`;
    }
    if (!p.includes.length) e.includes = "List at least one thing that's included.";
  });
  return out;
}

export function PackagesEditor({ creator }: { creator: Creator }) {
  const toast = useToast();
  const source: Package[] = tiers.map(
    ({ id }) =>
      creator.packages.find((p) => p.tier === id) ?? {
        id: `pk-${creator.firstName.toLowerCase()}-${id}`,
        tier: id,
        name: "",
        summary: "",
        price: Number.NaN,
        deliveryDays: Number.NaN,
        revisions: 2,
        videos: 1,
        maxSeconds: 60,
        includes: [],
      },
  );
  const { draft, set, dirty, reset } = useDraft<Package[]>(source);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [newItem, setNewItem] = useState<Record<PackageTier, string>>({ basic: "", standard: "", premium: "" });

  const errors = validate(draft);
  const errorCount = Object.values(errors).reduce((sum, e) => sum + Object.keys(e).length, 0);
  const err = (tier: PackageTier, field: Field) =>
    attempted || touched[`${tier}.${field}`] || (field === "price" && dirty) ? (errors[tier][field] ?? null) : null;
  const touch = (tier: PackageTier, field: Field) => setTouched((t) => ({ ...t, [`${tier}.${field}`]: true }));
  const patch = (tier: PackageTier, change: Partial<Package>) =>
    set((list) => list.map((p) => (p.tier === tier ? { ...p, ...change } : p)));

  const addInclude = (tier: PackageTier) => {
    const text = newItem[tier].trim();
    if (!text) return;
    const pkg = draft.find((p) => p.tier === tier);
    if (pkg?.includes.some((i) => i.toLowerCase() === text.toLowerCase())) {
      toast({ message: "That's already on the list.", tone: "info" });
      return;
    }
    patch(tier, { includes: [...(pkg?.includes ?? []), text] });
    setNewItem((n) => ({ ...n, [tier]: "" }));
  };

  return (
    <ProfileSection
      id="packages"
      title="Packages"
      description={`Prices must go up from Basic to Premium. Each price is what the buyer pays; you earn it less the ${FEE_PCT}% Yapp fee. Usage rights and raw footage come with every order.`}
      summary={creator.packages.map((p) => `${p.name} ${money(p.price)}`).join(" · ")}
      dirty={dirty}
      attempted={attempted}
      errorCount={errorCount}
      saveLabel="Save packages"
      onDiscard={() => {
        reset();
        setAttempted(false);
        setTouched({});
      }}
      onSave={() => {
        setAttempted(true);
        if (errorCount) return;
        actions.updateCreator(creator.id, {
          packages: draft.map((p) => ({ ...p, name: p.name.trim(), summary: p.summary.trim() })),
        });
        setAttempted(false);
        setTouched({});
        toast({ message: "Packages saved. New offers use these prices." });
      }}
    >
      <div className="grid gap-2 lg:grid-cols-3">
        {draft.map((pkg, index) => {
          const tier = tiers[index];
          return (
            <fieldset
              key={pkg.tier}
              data-tone="mist"
              className="y-block flex min-w-0 flex-col gap-4 !rounded-(--y-r-tile) p-4"
            >
              <legend className="sr-only">{tier.label} package</legend>
              <div className="flex flex-col gap-0.5" aria-hidden>
                <p className="y-head">{tier.label}</p>
                <p className="y-micro y-fg-2">{tier.hint}</p>
              </div>
              <TextField
                label="Name"
                required
                maxLength={32}
                value={pkg.name}
                onChange={(e) => patch(pkg.tier, { name: e.target.value })}
                onBlur={() => touch(pkg.tier, "name")}
                error={err(pkg.tier, "name")}
              />
              <TextArea
                label="Summary"
                required
                rows={2}
                maxLength={120}
                value={pkg.summary}
                onChange={(e) => patch(pkg.tier, { summary: e.target.value })}
                onBlur={() => touch(pkg.tier, "summary")}
                hint={`${pkg.summary.length}/120`}
                error={err(pkg.tier, "summary")}
              />
              {/* items-end: a label that wraps in a narrow column keeps the two inputs on one line. */}
              <div className="grid grid-cols-2 items-end gap-3">
                {numFields.map((f) => (
                  <TextField
                    key={f.id}
                    label={f.label}
                    required
                    type="number"
                    inputMode="numeric"
                    min={f.id === "price" ? priceLimits(pkg.videos || 1).min : f.min}
                    max={f.id === "price" ? priceLimits(pkg.videos || 1).max : f.max}
                    value={show(pkg[f.id])}
                    onChange={(e) => patch(pkg.tier, { [f.id]: toNum(e.target.value) } as Partial<Package>)}
                    onBlur={() => touch(pkg.tier, f.id)}
                    error={err(pkg.tier, f.id)}
                    hint={
                      f.id === "price" && Number.isFinite(pkg.price) && pkg.price > 0
                        ? `You earn ${moneyExact(creatorNet(pkg.price))} after the ${FEE_PCT}% Yapp fee`
                        : undefined
                    }
                    className={f.id === "price" ? "col-span-2" : ""}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <p className="y-label">
                  <span>What&apos;s included</span>
                  <span className="y-micro y-fg-3 font-medium">{pkg.includes.length}</span>
                </p>
                <ul className="flex flex-col gap-1.5">
                  {pkg.includes.map((item) => (
                    <li key={item} className="flex items-center gap-2 rounded-(--y-r-sm) bg-(--b-chip) py-1 ps-3 pe-1">
                      <span className="y-small flex-1">{item}</span>
                      <RoundIconButton
                        size="sm"
                        tone="soft"
                        label={`Remove "${item}" from ${tier.label}`}
                        onClick={() => patch(pkg.tier, { includes: pkg.includes.filter((i) => i !== item) })}
                      >
                        <X size={16} />
                      </RoundIconButton>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <label className="min-w-0 flex-1">
                    <span className="sr-only">Add an item to {tier.label}</span>
                    <input
                      className="y-input"
                      maxLength={60}
                      placeholder="e.g. Captions burned in"
                      value={newItem[pkg.tier]}
                      onChange={(e) => setNewItem((n) => ({ ...n, [pkg.tier]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addInclude(pkg.tier);
                        }
                      }}
                    />
                  </label>
                  <PillButton
                    variant="contrast"
                    className="!min-h-[52px]"
                    icon={<Plus size={16} aria-hidden />}
                    disabled={!newItem[pkg.tier].trim()}
                    onClick={() => addInclude(pkg.tier)}
                    aria-label={`Add to ${tier.label}`}
                  >
                    Add
                  </PillButton>
                </div>
                {err(pkg.tier, "includes") ? (
                  <p className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
                    <AlertCircle size={16} aria-hidden /> {err(pkg.tier, "includes")}
                  </p>
                ) : null}
              </div>
            </fieldset>
          );
        })}
      </div>
    </ProfileSection>
  );
}
