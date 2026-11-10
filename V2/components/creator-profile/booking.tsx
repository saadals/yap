"use client";

import { Check, ChevronDown, Film, PencilLine, Repeat2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { KeyValues } from "@/components/ui/progress";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { creatorNet, lengthLabel, money, moneyExact, plural, priceWithNet } from "@/lib/format";
import { paths } from "@/lib/paths";
import { RAW_FOOTAGE_INCLUDED, addonById, usageOptions } from "@/lib/taxonomy";
import type { Creator, Package } from "@/lib/types";

import { extraDaysLabel, packagesInOrder, popularPackage, tierName } from "./utils";

/** Where "Order" goes: the order page, or sign-in first (then back to the order page). */
export function orderHref(creator: Creator, pkg: Package | undefined, signedIn: boolean): string {
  const href = paths.orderCreator(creator.handle, { package: pkg?.id });
  return signedIn ? href : paths.signIn({ next: href });
}

/** A package's own list, without raw footage (it comes with every order, said once below). */
const packageExtras = (pkg: Package) => pkg.includes.filter((item) => !/raw footage/i.test(item));

/**
 * The booking card: pick Basic, Standard or Premium, see what's included, order. Sits in the
 * sticky rail on desktop and in the page on phones (where the sticky bottom bar holds the order
 * button, so `hideOrderOnPhones` keeps one green per view).
 *
 * Prices are listed prices: what the brand pays, nothing on top. Usage rights (one of four options,
 * chosen when ordering) and raw footage come with every order, so they're stated once as included,
 * never as add-ons. Your own profile shows the packages without an order button and with what you
 * earn beside each price (Yapp's 20% comes out of the creator's side).
 */
export function BookingCard({
  creator,
  selected,
  onSelect,
  own,
  signedIn,
  repeat,
  hideOrderOnPhones = false,
  id,
}: {
  creator: Creator;
  selected: Package | undefined;
  onSelect: (id: string) => void;
  own: boolean;
  signedIn: boolean;
  /** "Order again" link for past collaborators. */
  repeat: string | null;
  hideOrderOnPhones?: boolean;
  id?: string;
}) {
  const [addonsOpen, setAddonsOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const packages = packagesInOrder(creator);
  const popular = popularPackage(creator);
  // Only add-ons that still exist (usage rights and raw footage stopped being add-ons).
  const addons = creator.addons.filter((addon) => addon.id in addonById);
  const key = id ?? "booking";

  if (!selected) {
    return (
      <Block tone="paper" pad="md" id={id} className="flex flex-col gap-2">
        <h2 className="y-head">Packages</h2>
        <p className="y-small y-fg-2">
          {own
            ? "You haven't set up packages yet. Add one so brands can order from you."
            : `${creator.firstName} hasn't set up packages yet. Send a message to ask for a quote.`}
        </p>
        {own ? (
          <PillButton href={paths.studioProfile("packages")} variant="outline" size="sm" className="w-fit">
            Add a package
          </PillButton>
        ) : null}
      </Block>
    );
  }

  const isPopular = popular?.id === selected.id;

  return (
    <Block tone="paper" pad="md" id={id} className="flex scroll-mt-24 flex-col gap-4" aria-label={`Order from ${creator.firstName}`}>
      {packages.length > 1 ? (
        <SegmentedToggle
          label="Package"
          size="md"
          className="w-full [&>button]:flex-1"
          value={selected.id}
          onChange={onSelect}
          options={packages.map((p) => ({ value: p.id, label: tierName[p.tier] }))}
        />
      ) : (
        <h2 className="y-eyebrow">Package</h2>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <h3 className="y-head">{selected.name}</h3>
          {isPopular ? (
            <Badge tone="ink" icon={<Check size={12} aria-hidden strokeWidth={3} />}>
              Most popular
            </Badge>
          ) : null}
        </div>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="y-display y-num text-[34px] leading-none tracking-[-0.03em]">{money(selected.price)}</span>
          {own ? (
            <span className="y-small y-fg-2">
              you earn <span className="y-num font-medium text-(--b-fg)">{moneyExact(creatorNet(selected.price))}</span>
            </span>
          ) : null}
        </p>
        <p className="y-small y-fg-2">{selected.summary}</p>
      </div>

      <KeyValues
        rows={[
          { label: "Delivery", value: plural(selected.deliveryDays, "day") },
          { label: "Revisions", value: `${selected.revisions} included` },
          {
            label: "Videos",
            value: `${selected.videos} · up to ${lengthLabel(selected.maxSeconds)}`,
          },
        ]}
      />

      {packageExtras(selected).length ? (
        <ul className="flex flex-col gap-1.5 border-t border-(--b-line) pt-4">
          {packageExtras(selected).map((item) => (
            <li key={item} className="y-small flex items-start gap-2">
              <Check size={15} strokeWidth={2.5} aria-hidden className="mt-0.5 flex-none" />
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      {own ? (
        <PillButton
          href={paths.studioProfile("packages")}
          variant="outline"
          icon={<PencilLine size={16} aria-hidden />}
          className="w-full"
        >
          Edit packages
        </PillButton>
      ) : (
        <div className={`flex flex-col gap-2 ${hideOrderOnPhones ? "max-lg:hidden" : ""}`}>
          <PillButton href={orderHref(creator, selected, signedIn)} variant="neon" size="lg" arrow className="w-full">
            Order from {creator.firstName}
          </PillButton>
          <p className="y-micro y-fg-2 flex items-center justify-center gap-1.5 text-center">
            <ShieldCheck size={14} aria-hidden className="flex-none" />
            Payment is held until you approve the video
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-(--b-line) pt-3">
        <div className="y-small y-fg-2 flex items-start gap-2">
          <ShieldCheck size={16} aria-hidden className="mt-0.5 flex-none" />
          <div className="flex min-w-0 flex-col items-start">
            <p>
              <span className="font-medium text-(--b-fg)">Usage rights included:</span>{" "}
              {own
                ? "the brand chooses how they'll use the videos when they order."
                : "you choose how you'll use the videos at checkout."}
            </p>
            <button
              type="button"
              className="y-link y-small inline-flex min-h-9 items-center gap-1 font-medium text-(--b-fg)"
              aria-expanded={usageOpen}
              aria-controls={`${key}-usage`}
              onClick={() => setUsageOpen((v) => !v)}
            >
              {usageOpen ? "Hide the options" : `See the ${usageOptions.length} options`}
              <ChevronDown
                size={15}
                aria-hidden
                className={`flex-none transition-transform duration-(--y-dur-2) ${usageOpen ? "rotate-180" : ""}`}
              />
            </button>
            {usageOpen ? (
              <div id={`${key}-usage`} className="flex flex-col gap-1.5 pb-1">
                <ul className="flex flex-col gap-1">
                  {usageOptions.map((option) => (
                    <li key={option.id} className="flex items-start gap-2 text-(--b-fg)">
                      <Check size={14} strokeWidth={2.5} aria-hidden className="mt-1 flex-none" />
                      {option.name}
                    </li>
                  ))}
                </ul>
                <p className="y-micro">Every option includes posting on {own ? "the brand's" : "your"} own accounts.</p>
              </div>
            ) : null}
          </div>
        </div>
        <p className="y-small y-fg-2 flex items-start gap-2">
          <Film size={16} aria-hidden className="mt-0.5 flex-none" />
          <span>{RAW_FOOTAGE_INCLUDED}</span>
        </p>
      </div>

      {addons.length ? (
        <div className="flex flex-col border-t border-(--b-line) pt-1">
          <button
            type="button"
            className="y-small flex min-h-11 items-center justify-between gap-3 rounded-(--y-r-sm) font-medium"
            aria-expanded={addonsOpen}
            aria-controls={`${key}-addons`}
            onClick={() => setAddonsOpen((v) => !v)}
          >
            <span>
              Add-ons <span className="y-fg-2 font-normal">· {addons.length} available</span>
            </span>
            <ChevronDown
              size={18}
              aria-hidden
              className={`flex-none transition-transform duration-(--y-dur-2) ${addonsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {addonsOpen ? (
            <ul id={`${key}-addons`} className="flex flex-col divide-y divide-(--b-line)">
              {addons.map((addon) => {
                const info = addonById[addon.id];
                const days = extraDaysLabel(addon.extraDays);
                return (
                  <li key={addon.id} className="flex items-baseline gap-3 py-2">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="y-small font-medium">{info.name}</span>
                      {days ? <span className="y-micro y-fg-2">{days}</span> : null}
                    </span>
                    <span className="y-small y-num flex-none text-end font-medium">
                      +{own ? priceWithNet(addon.price) : money(addon.price)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {repeat ? (
        <p className="y-small flex flex-wrap items-center gap-x-1.5 border-t border-(--b-line) pt-3">
          <Repeat2 size={16} aria-hidden className="flex-none" />
          <span className="y-fg-2">Worked with {creator.firstName} before?</span>
          <Link href={repeat} className="y-link font-medium">
            Order again
          </Link>
        </p>
      ) : null}
    </Block>
  );
}
