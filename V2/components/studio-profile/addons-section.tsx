"use client";

import { addons } from "@/lib/taxonomy";
import type { AddonId, Creator } from "@/lib/types";

import type { AddonDraft } from "./draft";
import type { DraftProps } from "./profile-section";
import { EditorSection, GroupError } from "./section";

const toNum = (value: string) =>
  value.trim() === "" ? Number.NaN : Number(value);
const showNum = (value: number) =>
  Number.isFinite(value) ? String(value) : "";

/** Add-ons: extras brands can add to any package. A switch per add-on; its price shows when on. */
export function AddonsSection({
  creator,
  draft,
  set,
  show,
  touch,
  errorCount,
}: DraftProps & { creator: Creator }) {
  const patch = (id: AddonId, change: Partial<AddonDraft>) =>
    set((d) => ({
      ...d,
      addons: { ...d.addons, [id]: { ...d.addons[id], ...change } },
    }));
  const on = addons.filter((a) => draft.addons[a.id].on).length;

  return (
    <EditorSection
      id="addons"
      title="Add-ons"
      description={`Extras brands can add to any package. Organic use on their own accounts is always included. ${on} on offer.`}
      errorCount={errorCount}
    >
      <ul className="y-tile flex flex-col overflow-hidden !bg-transparent shadow-[inset_0_0_0_1px_var(--b-line)]">
        {addons.map((addon, index) => {
          const row = draft.addons[addon.id];
          const Icon = addon.icon;
          const switchId = `addon-${addon.id}`;
          const rush = addon.id === "rush";
          const priceError = show(`addons.${addon.id}.price`);
          const daysError = show(`addons.${addon.id}.extraDays`);
          return (
            <li
              key={addon.id}
              className={`flex flex-col gap-2 px-4 py-3 ${index ? "border-t border-(--b-line)" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                  aria-hidden
                  className="y-tile grid size-9 flex-none place-items-center !rounded-full"
                >
                  <Icon size={16} />
                </span>
                <label
                  htmlFor={switchId}
                  className="flex min-w-0 flex-1 basis-48 cursor-pointer flex-col"
                >
                  <span className="y-small font-semibold">{addon.name}</span>
                  <span className="y-micro y-fg-2">
                    {addon.description}
                    {addon.id === "post-to-account" &&
                    creator.kind !== "influencer"
                      ? " Best with an engaged audience."
                      : ""}
                  </span>
                </label>
                {row.on ? (
                  <span className="order-last flex basis-full items-center gap-3 ps-12 sm:order-none sm:basis-auto sm:ps-0">
                    <span className="sb-money w-24">
                      <span aria-hidden>$</span>
                      <input
                        name={`addon-${addon.id}-price`}
                        aria-label={`Price for ${addon.name}`}
                        aria-invalid={priceError ? true : undefined}
                        className="y-input y-num !min-h-10"
                        type="number"
                        inputMode="numeric"
                        min={5}
                        value={showNum(row.price)}
                        onChange={(event) =>
                          patch(addon.id, { price: toNum(event.target.value) })
                        }
                        onBlur={() => touch(`addons.${addon.id}.price`)}
                      />
                    </span>
                    <span className="sb-suffix w-28">
                      <input
                        name={`addon-${addon.id}-days`}
                        aria-label={
                          rush
                            ? `Days faster with ${addon.name}`
                            : `Extra days for ${addon.name}`
                        }
                        aria-invalid={daysError ? true : undefined}
                        className="y-input y-num !min-h-10"
                        type="number"
                        inputMode="numeric"
                        min={rush ? 0 : -10}
                        max={30}
                        value={showNum(
                          rush ? Math.abs(row.extraDays) : row.extraDays,
                        )}
                        onChange={(event) => {
                          const value = toNum(event.target.value);
                          patch(addon.id, {
                            extraDays:
                              rush && Number.isFinite(value)
                                ? -Math.abs(value)
                                : value,
                          });
                        }}
                        onBlur={() => touch(`addons.${addon.id}.extraDays`)}
                      />
                      <span aria-hidden>
                        {rush ? "days less" : "extra days"}
                      </span>
                    </span>
                  </span>
                ) : null}
                <input
                  id={switchId}
                  type="checkbox"
                  role="switch"
                  className="y-switch flex-none"
                  checked={row.on}
                  onChange={(event) =>
                    patch(addon.id, { on: event.target.checked })
                  }
                />
              </div>
              {priceError || daysError ? (
                <GroupError>{priceError ?? daysError}</GroupError>
              ) : null}
            </li>
          );
        })}
      </ul>
    </EditorSection>
  );
}
