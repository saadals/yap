"use client";

import { AlertCircle, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { FieldShell, TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { money, plural, priceLimits } from "@/lib/format";
import { PRICE_MAX_PER_YAPP, PRICE_MIN_PER_YAPP } from "@/lib/taxonomy";
import type { Creator, Package, PackageTier } from "@/lib/types";

import { PACKAGE_NUMBERS, TIERS, newPackage, tierLabel, type PackageField } from "./draft";
import type { DraftProps } from "./profile-section";
import { EditorSection, GroupError } from "./section";

const toNum = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));
const showNum = (value: number) => (Number.isFinite(value) ? String(value) : "");

/** "4 days · 1 revision · 1 video · up to 45s" */
function packageLine(p: Package): string {
  const parts = [
    Number.isFinite(p.deliveryDays) ? plural(p.deliveryDays, "day") : null,
    Number.isFinite(p.revisions) ? plural(p.revisions, "revision") : null,
    Number.isFinite(p.videos) ? plural(p.videos, "video") : null,
    Number.isFinite(p.maxSeconds) ? `up to ${p.maxSeconds}s` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

/**
 * Packages: Basic, and optionally Standard and Premium, as rows. A row opens its editor in place
 * (one at a time). Prices stay inside the per-Yapp limits and go up from tier to tier.
 */
export function PackagesSection({ creator, draft, set, show, touch, errorCount }: DraftProps & { creator: Creator }) {
  /** null: open the first package with something to fix (after a save attempt); "none": all closed. */
  const [openTier, setOpenTier] = useState<PackageTier | "none" | null>(null);
  const [newItem, setNewItem] = useState<Record<PackageTier, string>>({ basic: "", standard: "", premium: "" });
  const hasError = (tier: PackageTier) =>
    (["name", "summary", "price", "includes", ...PACKAGE_NUMBERS.map((f) => f.id)] as PackageField[]).some((field) =>
      show(`packages.${tier}.${field}`),
    );
  const patch = (tier: PackageTier, change: Partial<Package>) =>
    set((d) => ({ ...d, packages: d.packages.map((p) => (p.tier === tier ? { ...p, ...change } : p)) }));
  const shown = openTier ?? draft.packages.find((p) => hasError(p.tier))?.tier ?? "none";
  const missing = TIERS.filter((t) => !draft.packages.some((p) => p.tier === t.id));

  const addTier = (tier: PackageTier) => {
    set((d) => {
      const index = TIERS.findIndex((t) => t.id === tier);
      const below = [...d.packages].reverse().find((p) => TIERS.findIndex((t) => t.id === p.tier) < index);
      const next = [...d.packages, newPackage(creator, tier, below)].sort(
        (a, b) => TIERS.findIndex((t) => t.id === a.tier) - TIERS.findIndex((t) => t.id === b.tier),
      );
      return { ...d, packages: next };
    });
    setOpenTier(tier);
  };

  const addInclude = (tier: PackageTier) => {
    const text = newItem[tier].trim();
    if (!text) return;
    const pkg = draft.packages.find((p) => p.tier === tier);
    if (pkg?.includes.some((item) => item.toLowerCase() === text.toLowerCase())) return;
    patch(tier, { includes: [...(pkg?.includes ?? []), text] });
    setNewItem((n) => ({ ...n, [tier]: "" }));
  };

  return (
    <EditorSection
      id="packages"
      title="Packages"
      description={`What brands can order from your profile. ${money(PRICE_MIN_PER_YAPP)}–${money(PRICE_MAX_PER_YAPP)} a video; you keep 100% and the brand pays Yapp's fee.`}
      errorCount={errorCount}
    >
      <div className="y-tile flex flex-col overflow-hidden !bg-transparent shadow-[inset_0_0_0_1px_var(--b-line)]">
        {draft.packages.map((pkg, index) => {
          const tier = TIERS.find((t) => t.id === pkg.tier)!;
          const open = shown === pkg.tier;
          const err = (field: PackageField) => show(`packages.${pkg.tier}.${field}`);
          const panelId = `package-${pkg.tier}`;
          return (
            <div key={pkg.tier} className={index ? "border-t border-(--b-line)" : ""}>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenTier(open ? "none" : pkg.tier)}
                className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-(--b-chip)"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className="y-micro y-fg-2 font-semibold tracking-wide uppercase">{tier.label}</span>
                    {hasError(pkg.tier) ? <AlertCircle size={14} aria-label="Has something to fix" className="text-(--y-danger)" /> : null}
                  </span>
                  <span className="truncate font-medium">{pkg.name.trim() || `Name your ${tier.label} package`}</span>
                  <span className="y-small y-fg-2">{packageLine(pkg)}</span>
                </span>
                <span className="y-num flex-none font-semibold">{Number.isFinite(pkg.price) ? money(pkg.price) : "No price"}</span>
                <ChevronDown size={18} aria-hidden className={`y-fg-2 flex-none transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open ? (
                <fieldset id={panelId} className="flex flex-col gap-5 px-4 pt-1 pb-5">
                  <legend className="sr-only">{tier.label} package</legend>
                  <p className="y-micro y-fg-2 -mt-1">{tier.hint}</p>
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
                    <TextField
                      label="Name"
                      name={`${pkg.tier}-name`}
                      required
                      maxLength={32}
                      value={pkg.name}
                      onChange={(event) => patch(pkg.tier, { name: event.target.value })}
                      onBlur={() => touch(`packages.${pkg.tier}.name`)}
                      error={err("name")}
                    />
                    <FieldShell label="Price" required error={err("price")}>
                      {({ id, describedBy }) => (
                        <div className="sb-money">
                          <span aria-hidden>$</span>
                          <input
                            id={id}
                            name={`${pkg.tier}-price`}
                            aria-describedby={describedBy}
                            aria-invalid={err("price") ? true : undefined}
                            className="y-input y-num"
                            type="number"
                            inputMode="numeric"
                            min={priceLimits(pkg.videos || 1).min}
                            max={priceLimits(pkg.videos || 1).max}
                            value={showNum(pkg.price)}
                            onChange={(event) => patch(pkg.tier, { price: toNum(event.target.value) })}
                            onBlur={() => touch(`packages.${pkg.tier}.price`)}
                          />
                        </div>
                      )}
                    </FieldShell>
                  </div>
                  <TextArea
                    label="What it is, in one line"
                    name={`${pkg.tier}-summary`}
                    required
                    rows={2}
                    maxLength={120}
                    value={pkg.summary}
                    onChange={(event) => patch(pkg.tier, { summary: event.target.value })}
                    onBlur={() => touch(`packages.${pkg.tier}.summary`)}
                    hint={`${pkg.summary.length}/120`}
                    error={err("summary")}
                  />
                  <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4">
                    {PACKAGE_NUMBERS.map((f) => (
                      <TextField
                        key={f.id}
                        label={f.label}
                        optionalLabel={false}
                        type="number"
                        inputMode="numeric"
                        min={f.min}
                        max={f.max}
                        value={showNum(pkg[f.id])}
                        onChange={(event) => patch(pkg.tier, { [f.id]: toNum(event.target.value) } as Partial<Package>)}
                        onBlur={() => touch(`packages.${pkg.tier}.${f.id}`)}
                        error={err(f.id)}
                      />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="y-label">
                      <span>What&apos;s included</span>
                      <span className="y-micro y-fg-2 font-medium">{pkg.includes.length}</span>
                    </p>
                    {pkg.includes.length ? (
                      <ul className="flex flex-wrap gap-1.5">
                        {pkg.includes.map((item) => (
                          <li key={item} className="y-chip !min-h-10 !pe-1">
                            {item}
                            <RoundIconButton
                              size="sm"
                              tone="soft"
                              label={`Remove “${item}” from ${tier.label}`}
                              className="!size-8"
                              onClick={() => patch(pkg.tier, { includes: pkg.includes.filter((i) => i !== item) })}
                            >
                              <X size={14} />
                            </RoundIconButton>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="flex gap-2">
                      <label className="min-w-0 flex-1">
                        <span className="sr-only">Add something {tier.label} includes</span>
                        <input
                          className="y-input"
                          maxLength={60}
                          placeholder="e.g. Captions burned in"
                          value={newItem[pkg.tier]}
                          onChange={(event) => setNewItem((n) => ({ ...n, [pkg.tier]: event.target.value }))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addInclude(pkg.tier);
                            }
                          }}
                        />
                      </label>
                      <PillButton
                        variant="soft"
                        icon={<Plus size={16} aria-hidden />}
                        disabled={!newItem[pkg.tier].trim()}
                        onClick={() => addInclude(pkg.tier)}
                        aria-label={`Add to ${tier.label}`}
                      >
                        Add
                      </PillButton>
                    </div>
                    {err("includes") ? <GroupError>{err("includes")}</GroupError> : null}
                  </div>
                  {pkg.tier !== "basic" ? (
                    <div>
                      <PillButton
                        variant="ghost"
                        size="sm"
                        className="-ms-3"
                        icon={<Trash2 size={16} aria-hidden />}
                        onClick={() => {
                          set((d) => ({ ...d, packages: d.packages.filter((p) => p.tier !== pkg.tier) }));
                          setOpenTier("none");
                        }}
                      >
                        Stop offering {tierLabel(pkg.tier)}
                      </PillButton>
                    </div>
                  ) : null}
                </fieldset>
              ) : null}
            </div>
          );
        })}
      </div>
      {missing.length ? (
        <div className="flex flex-wrap gap-2">
          {missing.map((tier) => (
            <PillButton key={tier.id} variant="soft" size="sm" icon={<Plus size={16} aria-hidden />} onClick={() => addTier(tier.id)}>
              Add a {tier.label} package
            </PillButton>
          ))}
        </div>
      ) : null}
    </EditorSection>
  );
}
