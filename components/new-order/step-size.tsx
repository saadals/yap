"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useRef } from "react";

import { deliverableLabel } from "@/components/requests/shared";
import { creatorNet, money, moneyExact, moneyRange, netRange, plural } from "@/lib/format";
import { GUIDANCE_NOTE, round5 } from "@/lib/pricing";
import {
  BUDGET_MIN,
  CAMPAIGN_MAX_VIDEOS,
  CAMPAIGN_MIN_VIDEOS,
  CAMPAIGN_STEP,
  FEE_PCT,
  PRICE_MAX_PER_YAPP,
  PRICE_MIN_PER_YAPP,
  followerTiers,
  tierById,
} from "@/lib/taxonomy";
import type { FollowerTierId } from "@/lib/types";

import {
  CAMPAIGN_QUICK,
  VIDEO_COUNT_MAX,
  budgetMax,
  categoryLabel,
  errorId,
  fieldId,
} from "./model";
import { FieldError, StepCard } from "./parts";
import type { StepProps } from "./step-props";

/** Step 2: campaign size and price, or a custom order's videos and budget. */
export function SizeStep(props: StepProps) {
  const { form, headingRef } = props;
  if (form.kind === "campaign") {
    return (
      <StepCard
        title="Size and price"
        hint="Pick who can take your slots, how many Yapps you need, and what you pay for each."
        headingRef={headingRef}
      >
        <CampaignSize {...props} />
      </StepCard>
    );
  }
  return (
    <StepCard
      title="Your budget"
      hint={
        props.d.adCopy
          ? "One writer delivers the copy to your brief. Writers pitch their own price around this."
          : "One creator makes your videos to the brief. Creators pitch their own price around this."
      }
      headingRef={headingRef}
    >
      <CustomSize {...props} />
    </StepCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                               */
/* -------------------------------------------------------------------------- */

/** The small pill stepper "− 5 +" under a big number. */
function PillStepper({
  label,
  unit,
  onLess,
  onMore,
  lessDisabled,
  moreDisabled,
  lessLabel,
  moreLabel,
}: {
  label: string;
  unit: string;
  onLess: () => void;
  onMore: () => void;
  lessDisabled: boolean;
  moreDisabled: boolean;
  lessLabel: string;
  moreLabel: string;
}) {
  return (
    <div className="y-nw-pz-step" role="group" aria-label={label}>
      <button type="button" aria-label={lessLabel} disabled={lessDisabled} onClick={onLess}>
        <Minus size={18} strokeWidth={2} aria-hidden />
      </button>
      <span aria-hidden>{unit}</span>
      <button type="button" aria-label={moreLabel} disabled={moreDisabled} onClick={onMore}>
        <Plus size={18} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

/** The big editable dollar figure with a small superscript "$". */
function BigMoneyInput({
  id,
  value,
  onChange,
  label,
  invalid,
  describedBy,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  label: string;
  invalid: boolean;
  describedBy?: string;
}) {
  const text = value ? String(value) : "";
  return (
    <label className="y-nw-pz-n y-nw-pz-price y-num" data-invalid={invalid ? "true" : undefined}>
      <sup aria-hidden>$</sup>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={5}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        value={text}
        style={{ width: `${Math.max(2, text.length) + 0.3}ch` }}
        onChange={(event) => {
          const raw = event.target.value.trim();
          onChange(raw === "" ? 0 : Math.max(0, Math.round(Number(raw))) || 0);
        }}
      />
    </label>
  );
}

/** Follower tiers as a radio row: labels only (tiers carry no price; answers, item 29). */
function TierPicker({ value, onChange }: { value: FollowerTierId; onChange: (id: FollowerTierId) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = followerTiers.findIndex((t) => t.id === value);
  const move = (event: React.KeyboardEvent, from: number) => {
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (from + 1) % followerTiers.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (from - 1 + followerTiers.length) % followerTiers.length;
    if (next < 0) return;
    event.preventDefault();
    onChange(followerTiers[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div id={fieldId("tier")} className="y-nw-seg2" role="radiogroup" aria-labelledby="nw-tier-label">
      {followerTiers.map((tier, i) => {
        const checked = tier.id === value;
        return (
          <button
            key={tier.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (index < 0 && i === 0) ? 0 : -1}
            className="y-nw-tier"
            onClick={() => onChange(tier.id)}
            onKeyDown={(event) => move(event, i)}
          >
            <b>{tier.label}</b>
            <small>followers</small>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Campaign                                                                    */
/* -------------------------------------------------------------------------- */

function CampaignSize({ form, d, set, err }: StepProps) {
  const videosErr = err("videos");
  const priceErr = err("price");
  const { low, high } = d.guidance;
  const chips = [...new Set([low, round5((low + high) / 2), high])];
  const what = `${categoryLabel(d.niche)} at ${tierById[form.tierId].label}`;
  const outOfLimits = d.price < PRICE_MIN_PER_YAPP || d.price > PRICE_MAX_PER_YAPP;
  const setVideos = (videos: number) =>
    set({ videos: Math.max(CAMPAIGN_MIN_VIDEOS, Math.min(CAMPAIGN_MAX_VIDEOS, videos)) });

  let note: React.ReactNode;
  if (outOfLimits) {
    note = priceErr ? null : (
      <span className="y-nw-warn">
        {d.price > PRICE_MAX_PER_YAPP
          ? `That looks too high. Max ${money(PRICE_MAX_PER_YAPP)} per Yapp.`
          : `Minimum is ${money(PRICE_MIN_PER_YAPP)} per Yapp.`}
      </span>
    );
  } else if (d.price < low) {
    note = (
      <span className="y-nw-warn">
        Below the usual {money(low)}–{money(high)} for {what}. Raise it so more creators pick your slots.
      </span>
    );
  } else if (d.price > high) {
    note = (
      <>
        Above the usual {money(low)}–{money(high)} for {what}. Your slots should fill fast.
      </>
    );
  } else {
    note = (
      <>
        <Check size={14} strokeWidth={2.5} aria-hidden className="y-nw-ok" /> In line with the usual {money(low)}–
        {money(high)} for {what}.
      </>
    );
  }

  return (
    <div className="y-nw-pz">
      <div className="y-nw-pz-sec">
        <div className="y-nw-pz-t">
          <span id="nw-tier-label">Follower tier</span>
          <small>Creators qualify by verified real followers on the platform they post to</small>
        </div>
        <TierPicker value={form.tierId} onChange={(tierId) => set({ tierId })} />
      </div>

      <div className="y-nw-pz-vals">
        <div className="y-nw-pz-v">
          <div className="y-nw-pz-l" id="nw-videos-label">
            Yapps
          </div>
          <output
            id={fieldId("videos")}
            tabIndex={-1}
            className="y-nw-pz-n y-num"
            aria-labelledby="nw-videos-label"
            aria-live="polite"
            aria-describedby={videosErr ? errorId("videos") : undefined}
          >
            {form.videos}
          </output>
          <PillStepper
            label="Number of Yapps"
            unit={String(CAMPAIGN_STEP)}
            lessLabel={`${CAMPAIGN_STEP} fewer`}
            moreLabel={`${CAMPAIGN_STEP} more`}
            lessDisabled={form.videos <= CAMPAIGN_MIN_VIDEOS}
            moreDisabled={form.videos >= CAMPAIGN_MAX_VIDEOS}
            onLess={() => setVideos(form.videos - CAMPAIGN_STEP)}
            onMore={() => setVideos(form.videos + CAMPAIGN_STEP)}
          />
          <FieldError field="videos" message={videosErr} />
          <div className="y-nw-pz-chips" role="group" aria-label="Quick picks">
            {CAMPAIGN_QUICK.map((n) => (
              <button key={n} type="button" aria-pressed={form.videos === n} onClick={() => setVideos(n)}>
                {n}
              </button>
            ))}
          </div>
          <p className="y-nw-pz-note">
            Minimum {CAMPAIGN_MIN_VIDEOS}, in steps of {CAMPAIGN_STEP} · up to {CAMPAIGN_MAX_VIDEOS} in this demo
          </p>
        </div>

        <div className="y-nw-pz-x" aria-hidden>
          ×
        </div>

        <div className="y-nw-pz-v">
          <div className="y-nw-pz-l">Price per Yapp</div>
          <BigMoneyInput
            id={fieldId("price")}
            value={d.price}
            label="Price per Yapp in dollars"
            invalid={Boolean(priceErr) || outOfLimits}
            describedBy={priceErr ? errorId("price") : "nw-price-note"}
            onChange={(price) => set({ price })}
          />
          <PillStepper
            label="Price per Yapp"
            unit="$5"
            lessLabel="$5 less"
            moreLabel="$5 more"
            lessDisabled={d.price <= PRICE_MIN_PER_YAPP}
            moreDisabled={d.price >= PRICE_MAX_PER_YAPP}
            onLess={() => set({ price: Math.max(PRICE_MIN_PER_YAPP, d.price - 5) })}
            onMore={() => set({ price: Math.min(PRICE_MAX_PER_YAPP, Math.max(PRICE_MIN_PER_YAPP, d.price + 5)) })}
          />
          <div className="y-nw-pz-chips" role="group" aria-label="Usual prices">
            {chips.map((n) => (
              <button key={n} type="button" aria-pressed={d.price === n} onClick={() => set({ price: n })}>
                {money(n)}
              </button>
            ))}
          </div>
          <FieldError field="price" message={priceErr} />
          {note ? (
            <p id="nw-price-note" className="y-nw-pz-note" aria-live="polite">
              {note}
            </p>
          ) : null}
          {d.belowRange && !outOfLimits ? (
            <button type="button" className="y-nw-usechip" onClick={() => set({ price: low })}>
              Use {money(low)}
            </button>
          ) : null}
          <details className="y-nw-srcs">
            <summary>This range is an estimate</summary>
            <p>{GUIDANCE_NOTE}</p>
          </details>
        </div>
      </div>

      <div className="y-nw-pz-tot" aria-live="polite">
        <p className="y-nw-tot-line y-num">
          Total · {plural(form.videos, "Yapp")} × {money(d.price)} = <b>{money(d.campaign.total)}</b>
        </p>
        {!outOfLimits ? (
          <p className="y-nw-tot-sub y-num">
            Each creator receives {moneyExact(d.campaign.perCreator)} after the {FEE_PCT}% Yapp fee
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Custom order                                                                */
/* -------------------------------------------------------------------------- */

function CustomSize({ form, d, set, err }: StepProps) {
  const countErr = err("videoCount");
  const budgetErr = err("budget");
  const { market, budget } = d;
  const max = budgetMax(form, d.adCopy);
  const hooks = form.format === "hook-pack";
  const units = d.adCopy ? "the copy" : deliverableLabel(form.format, form.videoCount);
  const chips = market.count
    ? [...new Set([Math.max(BUDGET_MIN, market.low), Math.max(BUDGET_MIN, market.median), Math.max(BUDGET_MIN, market.high)])]
    : [];

  const setTop = (value: number) =>
    set({ budget: { min: form.budgetRange ? budget.min : value, max: value } });
  const setLow = (value: number) => set({ budget: { min: value, max: budget.max } });
  const toggleRange = () =>
    set((f) =>
      f.budgetRange
        ? { budgetRange: false, budget: { min: budget.max, max: budget.max } }
        : {
            budgetRange: true,
            budget: {
              min: Math.max(BUDGET_MIN, Math.min(budget.max, market.count >= 3 ? market.low : Math.round((budget.max * 0.6) / 10) * 10)),
              max: budget.max,
            },
          },
    );

  let marketLine: React.ReactNode;
  if (market.count >= 3) {
    marketLine = (
      <>
        Creators who fit usually quote {moneyRange(market.low, market.high)} for {units}.{" "}
        <b>
          {d.inBudget} of {plural(market.count, "creator")}
        </b>{" "}
        quote within your budget.
      </>
    );
  } else if (market.count) {
    marketLine = `${plural(market.count, "creator")} ${market.count === 1 ? "fits" : "fit"} so far, from ${money(market.prices[0])} for ${units}.`;
  } else {
    marketLine = d.adCopy
      ? "Ad copy is new on Yapp, so there are no quotes to compare yet. Writers pitch their own price around your budget."
      : "No creator quotes to compare yet. Creators pitch their own price around your budget.";
  }

  return (
    <div className="y-nw-pz">
      {!d.adCopy ? (
        <div className="y-nw-pz-sec y-nw-pz-row">
          <div className="y-nw-pz-t">
            <span id="nw-count-label">{hooks ? "How many hooks?" : "How many videos?"}</span>
            <small>
              {hooks
                ? "Short openings for one ad body. Most packs have 3–5, priced as one pack."
                : "Each video is reviewed and approved on its own."}
            </small>
          </div>
          <div className="y-nw-count">
            <PillStepper
              label={hooks ? "Number of hooks" : "Number of videos"}
              unit={String(form.videoCount)}
              lessLabel={hooks ? "One fewer hook" : "One fewer video"}
              moreLabel={hooks ? "One more hook" : "One more video"}
              lessDisabled={form.videoCount <= 1}
              moreDisabled={form.videoCount >= VIDEO_COUNT_MAX}
              onLess={() => set({ videoCount: Math.max(1, form.videoCount - 1) })}
              onMore={() => set({ videoCount: Math.min(VIDEO_COUNT_MAX, form.videoCount + 1) })}
            />
            <output id={fieldId("videoCount")} tabIndex={-1} className="sr-only" aria-live="polite">
              {deliverableLabel(form.format, form.videoCount)}
            </output>
          </div>
          <FieldError field="videoCount" message={countErr} />
        </div>
      ) : null}

      <div className="y-nw-pz-vals" data-single="true">
        <div className="y-nw-pz-v">
          <div className="y-nw-pz-l">{form.budgetRange ? "Budget, up to" : "Budget"}</div>
          <BigMoneyInput
            id={fieldId("budget")}
            value={budget.max}
            label={form.budgetRange ? "Budget, up to, in dollars" : "Budget in dollars"}
            invalid={Boolean(budgetErr)}
            describedBy={budgetErr ? errorId("budget") : "nw-budget-note"}
            onChange={setTop}
          />
          <PillStepper
            label="Budget"
            unit="$50"
            lessLabel="$50 less"
            moreLabel="$50 more"
            lessDisabled={budget.max <= BUDGET_MIN}
            moreDisabled={budget.max >= max}
            onLess={() => setTop(Math.max(BUDGET_MIN, budget.max - 50))}
            onMore={() => setTop(Math.min(max, budget.max + 50))}
          />
          {chips.length ? (
            <div className="y-nw-pz-chips" role="group" aria-label="Usual quotes">
              {chips.map((n) => (
                <button key={n} type="button" aria-pressed={budget.max === n} onClick={() => setTop(n)}>
                  {money(n)}
                </button>
              ))}
            </div>
          ) : null}
          {form.budgetRange ? (
            <label className="y-nw-from">
              <span>Lowest pitch you&apos;d consider</span>
              <span className="y-nw-from-in">
                <span aria-hidden>$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={BUDGET_MIN}
                  step={10}
                  value={budget.min ? String(budget.min) : ""}
                  aria-invalid={budgetErr ? true : undefined}
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    setLow(raw === "" ? 0 : Math.max(0, Math.round(Number(raw))) || 0);
                  }}
                />
              </span>
            </label>
          ) : null}
          <FieldError field="budget" message={budgetErr} />
          <p id="nw-budget-note" className="y-nw-pz-note y-nw-pz-note-wide" aria-live="polite">
            {marketLine}
          </p>
          <button type="button" className="y-nw-link" onClick={toggleRange} aria-pressed={form.budgetRange}>
            {form.budgetRange ? "Use one budget instead" : "Give a range instead"}
          </button>
        </div>
      </div>

      <div className="y-nw-pz-tot">
        <p className="y-nw-tot-line y-num">
          Budget · <b>{form.budgetRange ? moneyRange(budget.min, budget.max) : money(budget.max)}</b>
        </p>
        <p className="y-nw-tot-sub y-num">
          The {d.adCopy ? "writer" : "creator"} you hire receives{" "}
          {form.budgetRange ? netRange(budget.min, budget.max) : moneyExact(creatorNet(budget.max))} after the{" "}
          {FEE_PCT}% Yapp fee. Nothing is charged until you hire.
        </p>
      </div>
    </div>
  );
}
