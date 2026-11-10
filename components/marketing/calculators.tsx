"use client";

import { Info, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import { useId, useState } from "react";

import { PriceSummary } from "@/components/domain/money";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/field";
import { money, plural, priceBreakdown } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { addonById, SERVICE_FEE_RATE } from "@/lib/taxonomy";
import type { AddonId } from "@/lib/types";

import { platformStats, typicalAddonPrices } from "./platform";

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  hint?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="y-label">
          {label}
        </label>
        <span
          aria-hidden
          className="y-display y-num text-[28px] leading-none font-semibold tracking-[-0.02em]"
        >
          {format(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        className="y-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={format(value)}
        aria-describedby={hint ? hintId : undefined}
      />
      <div className="y-micro y-fg-3 flex justify-between" aria-hidden>
        <span className="y-num">{format(min)}</span>
        <span className="y-num">{format(max)}</span>
      </div>
      {hint ? (
        <p id={hintId} className="y-micro y-fg-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** For creators: videos per month × average price → monthly estimate (the wallet icon marks money). */
export function EarningsEstimator() {
  const s = useDemo();
  const stats = platformStats(s);
  const [videos, setVideos] = useState(4);
  const [price, setPrice] = useState(() => Math.round((stats.startingPrice || 200) / 10) * 10);
  const monthly = videos * price;
  const clientFee = priceBreakdown(monthly).fee;

  return (
    <div className="grid gap-2 lg:grid-cols-12">
      <Block tone="paper" pad="lg" className="flex flex-col gap-8 lg:col-span-7">
        <h3 className="y-display y-title">Estimate your month</h3>
        <RangeField
          label="Videos per month"
          value={videos}
          min={1}
          max={20}
          step={1}
          onChange={setVideos}
          format={(value) => plural(value, "video")}
        />
        <RangeField
          label="Average price per video"
          value={price}
          min={80}
          max={1500}
          step={10}
          onChange={setPrice}
          format={(value) => money(value)}
          hint={
            stats.startingPrice
              ? `The median starting price on Yapp today is ${money(stats.startingPrice)}.`
              : undefined
          }
        />
      </Block>
      <Block
        tone="paper"
        pad="lg"
        className="flex flex-col justify-between gap-8 lg:col-span-5"
        aria-labelledby="estimate-label"
      >
        <div className="flex flex-col gap-2">
          <p id="estimate-label" className="y-small flex items-center gap-2 font-semibold">
            <Wallet size={16} aria-hidden className="flex-none" />
            You could earn each month
          </p>
          <output
            aria-live="polite"
            className="y-display y-num block text-[52px] leading-[0.95] tracking-[-0.04em] md:text-[64px]"
          >
            {money(monthly)}
          </output>
          <p className="y-small y-fg-2">
            That&apos;s <span className="y-num font-semibold text-(--b-fg)">{money(monthly * 12)}</span>{" "}
            a year at this pace.
          </p>
        </div>
        <dl className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-4 border-t border-(--b-line) pt-2.5">
            <dt className="y-small">You keep</dt>
            <dd className="y-small y-num font-semibold">100% · {money(monthly)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-(--b-line) pt-2.5">
            <dt className="y-small y-fg-2">
              Yapp&apos;s {Math.round(SERVICE_FEE_RATE * 100)}% fee
              <span className="y-micro y-fg-3 block">Paid by the buyer on custom orders, on top of your price</span>
            </dt>
            <dd className="y-small y-num y-fg-2">{money(clientFee)}</dd>
          </div>
        </dl>
        <p className="y-micro y-fg-2 flex items-start gap-1.5">
          <Info size={14} aria-hidden className="mt-px flex-none" />
          An estimate, not a promise. Add-ons add to what you earn.
        </p>
      </Block>
    </div>
  );
}

const calculatorAddons: AddonId[] = [
  "subtitles",
  "extra-revision",
  "extra-hooks",
  "rush",
  "raw-footage",
  "ad-rights-90",
  "ad-rights-365",
];

const presets = [150, 260, 480, 900];

/** For buyers: creator price + add-ons → service fee and total (priceBreakdown). Custom and direct orders. */
export function FeeCalculator() {
  const s = useDemo();
  const typical = typicalAddonPrices(s);
  const [price, setPrice] = useState(260);
  const [raw, setRaw] = useState("260");
  const [touched, setTouched] = useState(false);
  const [selected, setSelected] = useState<AddonId[]>(["subtitles"]);

  const parsed = Number(raw.replace(/[^\d]/g, ""));
  const invalid = !raw.trim() || !Number.isFinite(parsed) || parsed < 20 || parsed > 10000;
  const error = touched && invalid ? "Enter a price between $20 and $10,000." : null;

  const chosen = selected.map((id) => ({ id, price: typical[id] }));
  const totals = priceBreakdown(price, chosen);

  const toggle = (id: AddonId) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      // the two paid-ads licences are alternatives
      const rival: AddonId | null =
        id === "ad-rights-90" ? "ad-rights-365" : id === "ad-rights-365" ? "ad-rights-90" : null;
      return [...current.filter((item) => item !== rival), id];
    });
  };

  const setFromInput = (value: string) => {
    setRaw(value);
    const next = Number(value.replace(/[^\d]/g, ""));
    if (value.trim() && next >= 20 && next <= 10000) setPrice(next);
  };

  return (
    <div className="grid gap-2 lg:grid-cols-12">
      <Block tone="paper" pad="lg" className="flex flex-col gap-7 lg:col-span-7">
        <div className="flex flex-col gap-1.5">
          <h3 className="y-display y-title">Fee calculator</h3>
          <p className="y-small y-fg-2 max-w-[52ch]">
            Add-on prices are typical rates. Each creator sets their own.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <TextField
            label="Creator's price (USD)"
            optionalLabel={false}
            inputMode="numeric"
            autoComplete="off"
            value={raw}
            onChange={(event) => setFromInput(event.target.value)}
            onBlur={() => setTouched(true)}
            error={error}
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Example prices">
            {presets.map((value) => (
              <FilterChip
                key={value}
                pressed={!invalid && price === value}
                onClick={() => {
                  setRaw(String(value));
                  setPrice(value);
                  setTouched(false);
                }}
              >
                {money(value)}
              </FilterChip>
            ))}
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="y-label mb-3">Add-ons</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {calculatorAddons.map((id) => {
              const addon = addonById[id];
              const Icon = addon.icon;
              const checked = selected.includes(id);
              return (
                <label
                  key={id}
                  className={`y-tile flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 ${checked ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="y-check"
                    checked={checked}
                    onChange={() => toggle(id)}
                  />
                  <Icon size={18} aria-hidden className="flex-none" />
                  <span className="min-w-0 flex-1">
                    <span className="y-small block font-semibold">{addon.name}</span>
                  </span>
                  <span className="y-small y-num y-fg-2 flex-none">+{money(typical[id])}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Block>

      <Block tone="paper" pad="lg" className="flex flex-col gap-6 lg:col-span-5">
        <h3 className="y-head flex items-center gap-2">
          <ReceiptText size={18} aria-hidden className="flex-none" />
          What you&apos;d pay
        </h3>
        <div aria-live="polite">
          <PriceSummary price={price} addons={chosen} />
        </div>
        <div className="y-tile flex flex-col gap-1 p-4">
          <span className="y-micro y-fg-2">The creator receives</span>
          <span className="y-display y-num text-[32px] leading-none font-semibold tracking-[-0.02em]">
            {money(totals.creatorEarns)}
          </span>
          <span className="y-micro y-fg-2">100% of their price and add-ons. No cut taken.</span>
        </div>
        <p className="y-micro y-fg-2 mt-auto flex items-start gap-1.5">
          <ShieldCheck size={14} aria-hidden className="mt-px flex-none" />
          Held when work starts, released when you approve. A cancelled or refunded order costs
          you nothing.
        </p>
      </Block>
    </div>
  );
}
