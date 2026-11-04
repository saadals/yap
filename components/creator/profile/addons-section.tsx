"use client";

import { useState } from "react";

import { TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { actions } from "@/lib/store";
import { addonById, addons } from "@/lib/taxonomy";
import type { AddonId, Creator, CreatorAddon } from "@/lib/types";

import { ProfileSection, useDraft } from "./section";

type Row = { on: boolean; price: number; extraDays: number };

const toNum = (value: string) => (value.trim() === "" ? Number.NaN : Number(value));
const show = (value: number) => (Number.isNaN(value) ? "" : String(value));

/** Sensible starting prices when an add-on is first switched on. */
const suggested: Record<AddonId, { price: number; extraDays: number }> = {
  "extra-revision": { price: 35, extraDays: 1 },
  "raw-footage": { price: 50, extraDays: 0 },
  subtitles: { price: 40, extraDays: 0 },
  "ad-rights-90": { price: 90, extraDays: 0 },
  "ad-rights-365": { price: 220, extraDays: 0 },
  rush: { price: 80, extraDays: -2 },
  "extra-hooks": { price: 60, extraDays: 1 },
  "post-to-account": { price: 150, extraDays: 0 },
};

export function AddonsSection({ creator }: { creator: Creator }) {
  const toast = useToast();
  const source = Object.fromEntries(
    addons.map((a) => {
      const mine = creator.addons.find((x) => x.id === a.id);
      return [
        a.id,
        mine
          ? { on: true, price: mine.price, extraDays: mine.extraDays ?? 0 }
          : { on: false, price: suggested[a.id].price, extraDays: suggested[a.id].extraDays },
      ];
    }),
  ) as Record<AddonId, Row>;
  const { draft, set, dirty, reset } = useDraft(source);
  const [attempted, setAttempted] = useState(false);

  const errors = Object.fromEntries(
    addons.map((a) => {
      const row = draft[a.id];
      if (!row.on) return [a.id, { price: null, extraDays: null }];
      return [
        a.id,
        {
          price: Number.isInteger(row.price) && row.price >= 5 && row.price <= 5000 ? null : "Whole dollars, $5–5,000.",
          extraDays:
            Number.isInteger(row.extraDays) && row.extraDays >= -10 && row.extraDays <= 30
              ? null
              : "Whole days, −10 to 30.",
        },
      ];
    }),
  ) as Record<AddonId, { price: string | null; extraDays: string | null }>;
  const errorCount = Object.values(errors).reduce((n, e) => n + (e.price ? 1 : 0) + (e.extraDays ? 1 : 0), 0);
  const enabled = addons.filter((a) => draft[a.id].on).length;
  const patch = (id: AddonId, change: Partial<Row>) => set((d) => ({ ...d, [id]: { ...d[id], ...change } }));

  return (
    <ProfileSection
      id="addons"
      title="Add-ons"
      description="Extras clients can add to any package. Organic use is always included."
      summary={
        creator.addons.length
          ? `${creator.addons.length} offered · ${creator.addons.map((a) => addonById[a.id].name).join(", ")}`
          : "None offered yet"
      }
      dirty={dirty}
      attempted={attempted}
      errorCount={errorCount}
      saveLabel="Save add-ons"
      onDiscard={() => {
        reset();
        setAttempted(false);
      }}
      onSave={() => {
        setAttempted(true);
        if (errorCount) return;
        const next: CreatorAddon[] = addons
          .filter((a) => draft[a.id].on)
          .map((a) => ({
            id: a.id,
            price: draft[a.id].price,
            ...(draft[a.id].extraDays ? { extraDays: draft[a.id].extraDays } : {}),
          }));
        actions.updateCreator(creator.id, { addons: next });
        setAttempted(false);
        toast({ message: `Add-ons saved. ${enabled} on offer.` });
      }}
    >
      <ul className="flex flex-col gap-2">
        {addons.map((addon) => {
          const row = draft[addon.id];
          const Icon = addon.icon;
          const switchId = `addon-${addon.id}`;
          return (
            <li key={addon.id} data-tone="mist" className="y-block flex flex-col gap-4 !rounded-(--y-r-tile) p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 flex-none place-items-center rounded-full bg-(--b-chip)" aria-hidden>
                  <Icon size={18} />
                </span>
                <label htmlFor={switchId} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
                  <span className="y-small font-semibold">{addon.name}</span>
                  <span className="y-micro y-fg-2">
                    {addon.description}
                    {addon.id === "post-to-account" && creator.kind !== "influencer"
                      ? " Best for creators with an engaged audience."
                      : ""}
                  </span>
                </label>
                <input
                  id={switchId}
                  type="checkbox"
                  role="switch"
                  className="y-switch mt-1"
                  checked={row.on}
                  onChange={(e) => patch(addon.id, { on: e.target.checked })}
                />
              </div>
              {row.on ? (
                <div className="grid grid-cols-2 gap-3 sm:max-w-md sm:ps-13">
                  <TextField
                    label="Price (USD)"
                    required
                    type="number"
                    inputMode="numeric"
                    min={5}
                    value={show(row.price)}
                    onChange={(e) => patch(addon.id, { price: toNum(e.target.value) })}
                    error={attempted || dirty ? errors[addon.id].price : null}
                  />
                  <TextField
                    label={addon.id === "rush" ? "Days saved" : "Extra days"}
                    type="number"
                    inputMode="numeric"
                    min={addon.id === "rush" ? 0 : -10}
                    max={30}
                    value={show(addon.id === "rush" ? Math.abs(row.extraDays) : row.extraDays)}
                    onChange={(e) => {
                      const value = toNum(e.target.value);
                      patch(addon.id, { extraDays: addon.id === "rush" && !Number.isNaN(value) ? -Math.abs(value) : value });
                    }}
                    hint={addon.id === "rush" ? "Taken off the package time" : "Added to the package time"}
                    error={attempted || dirty ? errors[addon.id].extraDays : null}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </ProfileSection>
  );
}
