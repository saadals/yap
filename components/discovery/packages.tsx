"use client";

import { Check, Clock, Film, Repeat2, ShieldCheck, Timer } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { lengthLabel, money, plural } from "@/lib/format";
import { SERVICE_FEE_RATE, addonById } from "@/lib/taxonomy";
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
  const facts = [
    { icon: Clock, text: `${pkg.deliveryDays}-day delivery` },
    { icon: Repeat2, text: plural(pkg.revisions, "revision") },
    { icon: Film, text: plural(pkg.videos, "video") },
    { icon: Timer, text: `Up to ${lengthLabel(pkg.maxSeconds)}` },
  ];
  return (
    <div
      className={`y-tile flex h-full flex-col gap-5 p-5 ${popular ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex min-h-7 items-center justify-between gap-2">
          <span className="y-small font-semibold">{tierName[pkg.tier]}</span>
          {popular ? (
            <Badge tone="ink" icon={<Check size={13} aria-hidden strokeWidth={3} />}>
              Most popular
            </Badge>
          ) : null}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="y-head">{pkg.name}</h3>
          <p className="y-small y-fg-2">{pkg.summary}</p>
        </div>
        <p className="y-display y-num text-[40px] leading-none font-semibold tracking-[-0.04em]">
          {money(pkg.price)}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
        {facts.map((fact) => (
          <li key={fact.text} className="y-small flex items-center gap-1.5 font-medium">
            <fact.icon size={16} aria-hidden className="flex-none" />
            {fact.text}
          </li>
        ))}
      </ul>
      <ul className="flex flex-col gap-2 border-t border-(--b-line) pt-4">
        {pkg.includes.map((item) => (
          <li key={item} className="y-small flex items-start gap-2.5">
            <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
              <Check size={12} strokeWidth={3} aria-hidden />
            </span>
            {item}
          </li>
        ))}
      </ul>
      {showCta ? (
        <PillButton
          href={`/creators/${creator.handle}/commission?package=${pkg.id}`}
          variant={popular ? "contrast" : "outline"}
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
  const selected = creator.packages.find((p) => p.id === tier) ?? creator.packages[0];
  if (!selected) return null;

  return (
    <Block tone="paper" pad="md" className="flex scroll-mt-24 flex-col gap-6" id="packages" aria-labelledby="packages-heading">
      <div className="flex flex-col gap-1">
        <h2 id="packages-heading" className="y-display y-title">
          Packages
        </h2>
        <p className="y-small y-fg-2 max-w-[62ch]">
          Fixed prices, clear deliverables. {creator.firstName} keeps 100%; you pay a{" "}
          {Math.round(SERVICE_FEE_RATE * 100)}% service fee only when you approve the final video.
        </p>
      </div>

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

      {creator.addons.length ? (
        <div className="flex flex-col gap-3">
          <h3 className="y-head">Add-ons</h3>
          <ul className="flex flex-col divide-y divide-(--b-line)">
            {creator.addons.map((addon) => {
              const info = addonById[addon.id];
              const Icon = info.icon;
              const days = extraDaysLabel(addon.extraDays);
              return (
                <li key={addon.id} className="flex items-start gap-3 py-3">
                  <span className="y-tile grid size-10 flex-none place-items-center !rounded-full">
                    <Icon size={18} aria-hidden />
                  </span>
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
        </div>
      ) : null}

      <p className="y-small y-fg-2 flex items-start gap-2">
        <ShieldCheck size={18} aria-hidden className="mt-0.5 flex-none" />
        <span>
          <span className="font-semibold text-(--b-fg)">Organic use forever included</span> on your
          own accounts · Paid ads usage available as an add-on
        </span>
      </p>
    </Block>
  );
}
