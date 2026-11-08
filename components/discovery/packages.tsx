"use client";

import { Check, ChevronDown, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { lengthLabel, money, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { addonById } from "@/lib/taxonomy";
import type { Creator, Package } from "@/lib/types";

import { defaultPackage, extraDaysLabel, tierName } from "./profile-utils";

function PackageCard({
  creator,
  pkg,
  popular,
  showCta,
}: {
  creator: Creator;
  pkg: Package;
  popular: boolean;
  showCta: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col gap-4 rounded-(--y-r-tile) p-5 ${
        popular ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : "shadow-[inset_0_0_0_1px_var(--b-line)]"
      }`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex min-h-7 items-center justify-between gap-2">
          <span className="y-small y-fg-2">{tierName[pkg.tier]}</span>
          {popular ? (
            <Badge tone="ink" icon={<Check size={13} aria-hidden strokeWidth={3} />}>
              Most popular
            </Badge>
          ) : null}
        </div>
        <h3 className="y-head">{pkg.name}</h3>
        <p className="y-display y-num text-[32px] leading-none font-semibold tracking-[-0.03em]">
          {money(pkg.price)}
        </p>
        <p className="y-small y-fg-2">
          {plural(pkg.videos, "video")} up to {lengthLabel(pkg.maxSeconds)} · {pkg.deliveryDays}-day
          delivery · {plural(pkg.revisions, "revision")}
        </p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {pkg.includes.map((item) => (
          <li key={item} className="y-small flex items-start gap-2">
            <Check size={16} strokeWidth={2.5} aria-hidden className="mt-0.5 flex-none" />
            {item}
          </li>
        ))}
      </ul>
      {showCta ? (
        <PillButton
          href={paths.orderCreator(creator.handle, { package: pkg.id })}
          variant="outline"
          size="sm"
          className="mt-auto w-full"
        >
          Continue with {tierName[pkg.tier]}
        </PillButton>
      ) : null}
    </div>
  );
}

export function PackagesBlock({ creator, showCta }: { creator: Creator; showCta: boolean }) {
  const popular = defaultPackage(creator);
  const [tier, setTier] = useState<string>(popular?.id ?? creator.packages[0]?.id ?? "");
  const [addonsOpen, setAddonsOpen] = useState(false);
  const selected = creator.packages.find((p) => p.id === tier) ?? creator.packages[0];
  if (!selected) return null;

  return (
    <Block tone="paper" pad="md" className="flex scroll-mt-24 flex-col gap-5" id="packages" aria-labelledby="packages-heading">
      <h2 id="packages-heading" className="y-display y-title">
        Packages
      </h2>

      <div className="flex flex-col gap-3 md:hidden">
        <SegmentedToggle
          label="Package"
          size="md"
          className="w-full [&>button]:flex-1"
          value={selected.id}
          onChange={setTier}
          options={creator.packages.map((p) => ({ value: p.id, label: tierName[p.tier] }))}
        />
        <PackageCard creator={creator} pkg={selected} popular={selected.id === popular?.id} showCta={showCta} />
      </div>

      <div className="hidden gap-2 md:grid md:grid-cols-3">
        {creator.packages.map((pkg) => (
          <PackageCard key={pkg.id} creator={creator} pkg={pkg} popular={pkg.id === popular?.id} showCta={showCta} />
        ))}
      </div>

      <p className="y-small y-fg-2 flex items-start gap-2">
        <ShieldCheck size={18} aria-hidden className="mt-0.5 flex-none" />
        <span>
          <span className="font-semibold text-(--b-fg)">Organic use forever included</span> on your
          own accounts · Paid ads usage available as an add-on
        </span>
      </p>

      {creator.addons.length ? (
        <div className="flex flex-col border-t border-(--b-line) pt-2">
          <button
            type="button"
            className="y-small flex min-h-11 items-center justify-between gap-3 rounded-(--y-r-sm) font-semibold"
            aria-expanded={addonsOpen}
            aria-controls="packages-addons"
            onClick={() => setAddonsOpen((v) => !v)}
          >
            <span>
              Add-ons <span className="y-fg-2 font-normal">· {creator.addons.length} available</span>
            </span>
            <ChevronDown
              size={18}
              aria-hidden
              className={`flex-none transition-transform duration-(--y-dur-2) ${addonsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {addonsOpen ? (
            <ul id="packages-addons" className="flex flex-col divide-y divide-(--b-line)">
              {creator.addons.map((addon) => {
                const info = addonById[addon.id];
                const days = extraDaysLabel(addon.extraDays);
                return (
                  <li key={addon.id} className="flex items-baseline gap-3 py-2.5">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="y-small font-semibold">{info.name}</span>
                      <span className="y-micro y-fg-2">
                        {info.description}
                        {days ? ` · ${days}` : ""}
                      </span>
                    </span>
                    <span className="y-small y-num flex-none font-semibold">+{money(addon.price)}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Block>
  );
}
