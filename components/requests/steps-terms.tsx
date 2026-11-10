"use client";

import { AlertTriangle, BadgeCheck, CalendarDays, Check, Globe, MailOpen, Pencil, Sparkles, Wallet } from "lucide-react";
import { useState } from "react";

import { BriefSummary } from "@/components/domain/brief-summary";
import { ProtectedNote } from "@/components/domain/money";
import { Block } from "@/components/ui/block";
import { Badge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/chip";
import { AvatarStack, FaceAvatar } from "@/components/ui/face-avatar";
import { TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { money, moneyRange, plural, shortDate, weekdayDate } from "@/lib/format";
import { cityById, fit, savedCreatorIds } from "@/lib/selectors";
import { activeIds } from "@/lib/store";
import { addonById, creatorKindById, includedRights } from "@/lib/taxonomy";
import type { AddonId, Creator } from "@/lib/types";

import {
  BUDGET_CEILING,
  BUDGET_FLOOR,
  DEADLINE_PRESETS,
  MAX_DEADLINE_DAYS,
  MIN_DEADLINE_DAYS,
  STEPS,
  autoTitle,
  daysForIsoDay,
  deliverableLabel,
  dueDateFor,
  effectiveTitle,
  formToBrief,
  isoDay,
  median,
  previewRequest,
  recommendedDays,
} from "./shared";
import type { StepProps } from "./step-props";
import { ChoiceTile, GroupError, Question } from "./wizard-parts";

const WANTED_ADDONS: AddonId[] = [
  "subtitles",
  "raw-footage",
  "ad-rights-90",
  "ad-rights-365",
  "extra-hooks",
  "post-to-account",
];

/* -------------------------------------------------------------------------- */
/* 6 · Budget and timing                                                       */
/* -------------------------------------------------------------------------- */

function PriceStrip({
  prices,
  budget,
  scaleMax,
}: {
  prices: number[];
  budget: { min: number; max: number };
  scaleMax: number;
}) {
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / scaleMax) * 100))}%`;
  return (
    <div aria-hidden className="relative h-10">
      <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-(--b-line)" />
      <span
        className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-(--b-fg) opacity-20"
        style={{ insetInlineStart: pct(budget.min), width: `calc(${pct(budget.max)} - ${pct(budget.min)})` }}
      />
      {prices.map((price, index) => (
        <span
          key={`${price}-${index}`}
          className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-(--b-bg) ${
            price >= budget.min && price <= budget.max ? "bg-(--b-fg)" : "bg-(--b-fg) opacity-40"
          }`}
          style={{ insetInlineStart: pct(price) }}
        />
      ))}
    </div>
  );
}

export function BudgetStep({ form, set, error, market }: StepProps) {
  const [customOpen, setCustomOpen] = useState(!DEADLINE_PRESETS.includes(form.dueInDays));
  const budgetErr = error("budget");
  const deadlineErr = error("deadline");
  const sliderMax = Math.max(BUDGET_CEILING, Math.ceil((market.high * 2) / 100) * 100);
  const scaleMax = Math.max(form.budget.max, market.prices[market.prices.length - 1] ?? 0, 100) * 1.1;
  const enoughData = market.count >= 3;
  const isSuggested =
    enoughData && form.budget.min === market.low && form.budget.max === market.high;
  const recommended = recommendedDays(market, form.videoCount, form.format);

  const setMin = (value: number) =>
    set((f) => ({ budgetTouched: true, budget: { min: value, max: Math.max(value, f.budget.max) } }));
  const setMax = (value: number) =>
    set((f) => ({ budgetTouched: true, budget: { min: Math.min(value, f.budget.min), max: value } }));

  const pool = market.pool;
  const addonStats = (id: AddonId) => {
    const offers = pool.flatMap((q) => q.creator.addons.filter((a) => a.id === id));
    return { count: offers.length, price: Math.round(median(offers.map((a) => a.price)) / 5) * 5 };
  };

  return (
    <>
      <Question
        id="q-budget"
        icon={<Wallet size={18} aria-hidden className="flex-none" />}
        title="What's your budget?"
        hint={`For all ${deliverableLabel(form.format, form.videoCount)}. Posting is free. When you hire, payment is held until you approve the work.`}
      >
        <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]" aria-live="polite">
          {moneyRange(form.budget.min, form.budget.max)}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="y-label">
              <span>Minimum</span>
              <span className="y-num">{money(form.budget.min)}</span>
            </span>
            <input
              type="range"
              className="y-range"
              min={BUDGET_FLOOR}
              max={sliderMax}
              step={10}
              value={form.budget.min}
              aria-valuetext={money(form.budget.min)}
              aria-invalid={budgetErr ? true : undefined}
              onChange={(event) => setMin(Number(event.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="y-label">
              <span>Maximum</span>
              <span className="y-num">{money(form.budget.max)}</span>
            </span>
            <input
              type="range"
              className="y-range"
              min={BUDGET_FLOOR}
              max={sliderMax}
              step={10}
              value={form.budget.max}
              aria-valuetext={money(form.budget.max)}
              onChange={(event) => setMax(Number(event.target.value))}
            />
          </label>
        </div>
        <GroupError message={budgetErr} />

        <div className="y-tile flex flex-col gap-3 p-4" aria-live="polite">
          {market.count ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="y-micro y-fg-2">Market guidance</p>
                  <p className="y-body font-semibold">
                    {enoughData
                      ? `Most creators who fit charge ${moneyRange(market.low, market.high)}`
                      : `${plural(market.count, "creator")} ${market.count === 1 ? "fits" : "fit"}, from ${money(market.prices[0])}`}
                  </p>
                </div>
                {enoughData && !isSuggested ? (
                  <PillButton
                    size="sm"
                    variant="contrast"
                    onClick={() => set({ budgetTouched: true, budget: { min: market.low, max: market.high } })}
                  >
                    Use {moneyRange(market.low, market.high)}
                  </PillButton>
                ) : null}
              </div>
              <PriceStrip prices={market.prices} budget={form.budget} scaleMax={scaleMax} />
              <p className="y-small">
                <span className="font-semibold">
                  {market.inBudget} of {plural(market.count, "creator")}
                </span>{" "}
                who fit usually quote within your budget for {deliverableLabel(form.format, form.videoCount)}.
                {market.inBudget === 0 ? " Raise the maximum to hear from more of them." : ""}
              </p>
              <p className="y-micro y-fg-2">
                From the packages of creators who make this format in your language. Each dot is one creator.
                {isSuggested && !form.budgetTouched ? " We set your range to the middle of the market." : ""}
              </p>
            </>
          ) : (
            <p className="y-small">
              No creators offer this format in your language yet, so there&apos;s no market price to show.
              Try another language on the language step.
            </p>
          )}
        </div>
      </Question>

      <Question id="q-deadline" title="When do you need it?" hint="The date the final video should be approved by.">
        <div
          role="group"
          aria-labelledby="q-deadline"
          className="flex flex-wrap gap-2"
          data-invalid={deadlineErr ? "true" : undefined}
          tabIndex={-1}
        >
          {DEADLINE_PRESETS.map((days) => (
            <FilterChip
              key={days}
              pressed={!customOpen && form.dueInDays === days}
              onClick={() => {
                setCustomOpen(false);
                set({ dueInDays: days });
              }}
            >
              {days} days
            </FilterChip>
          ))}
          <FilterChip
            pressed={customOpen}
            icon={<CalendarDays size={16} aria-hidden />}
            onClick={() => setCustomOpen(true)}
          >
            Pick a date
          </FilterChip>
        </div>
        {customOpen ? (
          <TextField
            label="Due date"
            type="date"
            required
            min={isoDay(MIN_DEADLINE_DAYS)}
            max={isoDay(MAX_DEADLINE_DAYS)}
            value={Number.isFinite(form.dueInDays) ? isoDay(form.dueInDays) : ""}
            onChange={(event) => set({ dueInDays: daysForIsoDay(event.target.value) })}
            error={deadlineErr}
            className="max-w-xs"
          />
        ) : (
          <GroupError message={deadlineErr} />
        )}
        {Number.isFinite(form.dueInDays) && !deadlineErr ? (
          <div className="y-tile flex flex-col gap-2 p-4" aria-live="polite">
            <p className="y-body font-semibold">
              Due {weekdayDate(dueDateFor(form.dueInDays))}
              <span className="y-small y-fg-2 font-normal"> · {plural(form.dueInDays, "day")} from today</span>
            </p>
            {form.dueInDays < market.typicalDays ? (
              <p className="y-small flex items-start gap-2">
                <Badge tone="danger" icon={<AlertTriangle size={14} aria-hidden />}>
                  Very tight
                </Badge>
                <span>
                  Creators who fit usually need {plural(market.typicalDays, "day")} for a first version. Expect
                  fewer pitches, or pick at least {recommended} days.
                </span>
              </p>
            ) : form.dueInDays < recommended ? (
              <p className="y-small flex items-start gap-2">
                <Badge tone="warning" icon={<AlertTriangle size={14} aria-hidden />}>
                  Tight
                </Badge>
                <span>
                  First versions usually take {plural(market.typicalDays, "day")}. {recommended} days leaves room for a
                  round of changes.
                </span>
              </p>
            ) : (
              <p className="y-small flex items-center gap-2">
                <Check size={16} aria-hidden className="flex-none" />
                Comfortable. Leaves time for a first version and a round of changes.
              </p>
            )}
          </div>
        ) : null}
      </Question>

      <Question
        id="q-addons"
        title="Want any extras quoted?"
        optional
        hint="Creators include these in their pitch price. You can still change them when you hire."
      >
        <div role="group" aria-labelledby="q-addons" className="grid gap-2 md:grid-cols-2">
          {WANTED_ADDONS.map((id) => {
            const addon = addonById[id];
            const Icon = addon.icon;
            const on = form.addons.includes(id);
            const stats = addonStats(id);
            return (
              <ChoiceTile
                key={id}
                type="checkbox"
                checked={on}
                onChange={() =>
                  set((f) => {
                    if (on) return { addons: f.addons.filter((a) => a !== id) };
                    const exclusive: AddonId[] =
                      id === "ad-rights-90" ? ["ad-rights-365"] : id === "ad-rights-365" ? ["ad-rights-90"] : [];
                    return { addons: [...f.addons.filter((a) => !exclusive.includes(a)), id] };
                  })
                }
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Icon size={18} aria-hidden /> {addon.name}
                </span>
                <span className="y-small y-fg-2">{addon.description}</span>
                <span className="y-micro y-fg-3">
                  {stats.count
                    ? `Usually +${money(stats.price)} · ${stats.count} of ${market.count} offer it`
                    : "Few creators who fit offer this"}
                </span>
              </ChoiceTile>
            );
          })}
        </div>
        <p className="y-small flex items-start gap-2 px-1">
          <BadgeCheck size={18} aria-hidden className="mt-0.5 flex-none" />
          <span>
            <span className="font-semibold">Always included: </span>
            {includedRights}
          </span>
        </p>
      </Question>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 7 · Who can pitch                                                           */
/* -------------------------------------------------------------------------- */

export function WhoStep({ s, form, set, product, error, market }: StepProps) {
  const err = error("invites");
  const temp = previewRequest(s, form, product);
  // Never offer the account's own creator profile (no ordering from yourself).
  const self = activeIds(s).creatorId;
  const saved = savedCreatorIds(s)
    .filter((id) => id !== self)
    .map((id) => s.creators.find((c) => c.id === id))
    .filter((c): c is Creator => Boolean(c));
  const savedIds = new Set(saved.map((c) => c.id));
  const ranked = s.creators
    .filter((c) => c.id !== self && !savedIds.has(c.id))
    .map((creator) => ({ creator, fit: fit(s, creator, temp) }))
    .sort((a, b) => b.fit.score - a.fit.score)
    .slice(0, 6);
  // Anyone invited from elsewhere (e.g. ?creator=) who isn't in either list still shows.
  const extra = form.invitedCreatorIds
    .filter((id) => id !== self && !savedIds.has(id) && !ranked.some((r) => r.creator.id === id))
    .map((id) => s.creators.find((c) => c.id === id))
    .filter((c): c is Creator => Boolean(c));

  const toggle = (id: string) =>
    set((f) => ({
      invitedCreatorIds: f.invitedCreatorIds.includes(id)
        ? f.invitedCreatorIds.filter((x) => x !== id)
        : [...f.invitedCreatorIds, id],
    }));

  const row = (creator: Creator) => {
    const f = fit(s, creator, temp);
    const city = cityById(creator.cityId);
    return (
      <li key={creator.id}>
        <ChoiceTile
          type="checkbox"
          checked={form.invitedCreatorIds.includes(creator.id)}
          onChange={() => toggle(creator.id)}
          label={`Invite ${creator.name}`}
          className="!items-center"
        >
          <span className="flex items-center gap-3">
            <FaceAvatar id={creator.id} name="" size={44} />
            <span className="min-w-0 flex-1">
              <span className="y-small flex items-center gap-1 font-semibold">
                <span className="truncate">{creator.name}</span>
                {creator.verified ? <BadgeCheck size={14} aria-label="ID verified" className="flex-none" /> : null}
              </span>
              <span className="y-micro y-fg-2 block truncate">
                {creatorKindById[creator.kind].name} · {city?.name} · ★ {creator.rating.toFixed(1)}
                {creator.available
                  ? ""
                  : ` · Booked${creator.availableFrom ? ` until ${shortDate(creator.availableFrom)}` : ""}`}
              </span>
              {f.reasons[0] ? <span className="y-micro y-fg-3 block truncate">{f.reasons[0]}</span> : null}
            </span>
            <span
              className="flex flex-none items-center rounded-full bg-(--b-bg) px-2.5 py-1"
              aria-label={`${f.score}% fit`}
            >
              <Sparkles size={13} aria-hidden className="me-1 flex-none" />
              <span className="y-display y-num text-[17px] font-semibold" aria-hidden>
                {f.score}
              </span>
              <span className="y-micro" aria-hidden>
                % fit
              </span>
            </span>
          </span>
        </ChoiceTile>
      </li>
    );
  };

  return (
    <>
      <Question id="q-visibility" title="Who can pitch?">
        <div role="radiogroup" aria-labelledby="q-visibility" className="grid gap-2 md:grid-cols-2">
          <ChoiceTile name="visibility" checked={form.visibility === "public"} onChange={() => set({ visibility: "public" })}>
            <span className="flex items-center gap-2 font-semibold">
              <Globe size={18} aria-hidden /> Everyone who fits
            </span>
            <span className="y-small y-fg-2">
              Shown to the {plural(market.count, "creator")} who {market.count === 1 ? "makes" : "make"} this format
              in your language. Anyone you invite below hears about it first.
            </span>
          </ChoiceTile>
          <ChoiceTile name="visibility" checked={form.visibility === "invite"} onChange={() => set({ visibility: "invite" })}>
            <span className="flex items-center gap-2 font-semibold">
              <MailOpen size={18} aria-hidden /> Invite only
            </span>
            <span className="y-small y-fg-2">
              Only the creators you pick can see it and pitch. Fewer pitches, more control.
            </span>
          </ChoiceTile>
        </div>
      </Question>

      <Question
        id="q-invite"
        title={form.visibility === "invite" ? "Who should we invite?" : "Invite anyone in particular?"}
        optional={form.visibility === "public"}
        hint="Invited creators get a personal note and see your request at the top of their feed."
        aside={
          form.invitedCreatorIds.length ? (
            <span className="y-badge flex-none" data-tone-badge="ink">
              {form.invitedCreatorIds.length} invited
            </span>
          ) : null
        }
      >
        <div
          className="flex flex-col gap-4"
          data-invalid={err ? "true" : undefined}
          tabIndex={-1}
          aria-describedby={err ? "q-invite-error" : undefined}
        >
          {extra.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="y-micro y-fg-2 px-1">Already picked</h3>
              <ul className="flex flex-col gap-2">{extra.map(row)}</ul>
            </div>
          ) : null}
          {saved.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="y-micro y-fg-2 px-1">Your saved creators</h3>
              <ul className="flex flex-col gap-2">{saved.map(row)}</ul>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <h3 className="y-micro y-fg-2 px-1">Best fits for this brief</h3>
            <ul className="flex flex-col gap-2">{ranked.map((r) => row(r.creator))}</ul>
          </div>
        </div>
        <GroupError id="q-invite-error" message={err} />
      </Question>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 8 · Review                                                                  */
/* -------------------------------------------------------------------------- */

export function ReviewStep({ s, form, set, product, error, touch, goTo, market }: StepProps) {
  const brief = formToBrief(form);
  const suggestion = autoTitle(form, product);
  const title = effectiveTitle(form, product);
  const invited = form.invitedCreatorIds
    .map((id) => s.creators.find((c) => c.id === id))
    .filter((c): c is Creator => Boolean(c));
  const editButton = (step: number, label: string) => (
    <PillButton
      size="sm"
      variant="ghost"
      icon={<Pencil size={14} aria-hidden />}
      onClick={() => goTo(step)}
      aria-label={`Edit ${label}`}
    >
      Edit
    </PillButton>
  );

  return (
    <>
      <Question id="q-title" title="Give it a title" hint="Creators see this first in their feed. We suggested one from your choices.">
        <TextField
          label="Request title"
          required
          value={title}
          maxLength={90}
          error={error("title")}
          onChange={(event) => set({ title: event.target.value, titleTouched: true })}
          onBlur={() => touch("title")}
        />
        {form.titleTouched && title !== suggestion ? (
          <PillButton size="sm" variant="ghost" className="w-fit" onClick={() => set({ titleTouched: false, title: "" })}>
            Use &ldquo;{suggestion}&rdquo;
          </PillButton>
        ) : null}
      </Question>

      <Block as="section" aria-labelledby="r-brief" tone="paper" pad="md" className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <h2 id="r-brief" className="y-head">
            The brief
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="y-micro y-fg-2 me-1">Jump to</span>
            {STEPS.slice(0, 5).map((step, index) => (
              <PillButton key={step.key} size="sm" variant="soft" onClick={() => goTo(index)}>
                {step.label}
              </PillButton>
            ))}
          </div>
        </div>
        <BriefSummary brief={brief} product={product} />
      </Block>

      <Block as="section" aria-labelledby="r-terms" tone="paper" pad="md" className="flex flex-col gap-3">
        <h2 id="r-terms" className="y-head">
          Budget, timing and who can pitch
        </h2>
        <dl className="flex flex-col gap-2">
          <div className="y-tile flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <dt className="y-micro y-fg-2">Budget</dt>
              <dd className="y-display y-num text-[24px] leading-tight font-semibold">
                {moneyRange(form.budget.min, form.budget.max)}
              </dd>
              {market.count >= 3 ? (
                <dd className="y-micro y-fg-2">
                  {market.inBudget} of {plural(market.count, "creator")} who fit quote within it
                </dd>
              ) : null}
            </div>
            {editButton(5, "budget")}
          </div>
          <div className="y-tile flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <dt className="y-micro y-fg-2">Due</dt>
              <dd className="y-small font-semibold">
                {Number.isFinite(form.dueInDays)
                  ? `${weekdayDate(dueDateFor(form.dueInDays))} · ${plural(form.dueInDays, "day")} from today`
                  : "Not set yet"}
              </dd>
            </div>
            {editButton(5, "due date")}
          </div>
          <div className="y-tile flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <dt className="y-micro y-fg-2">Who can pitch</dt>
              <dd className="y-small flex flex-wrap items-center gap-2 font-semibold">
                {form.visibility === "public"
                  ? `Everyone who fits (${plural(market.count, "creator")})`
                  : "Invite only"}
                {invited.length ? (
                  <span className="inline-flex items-center gap-2 font-normal">
                    <AvatarStack size={24} people={invited.map((c) => ({ id: c.id, name: c.name }))} />
                    <span className="y-fg-2">
                      {invited.length <= 2
                        ? `${invited.map((c) => c.firstName).join(" and ")} invited`
                        : `${invited[0].firstName}, ${invited[1].firstName} and ${invited.length - 2} more invited`}
                    </span>
                  </span>
                ) : null}
              </dd>
            </div>
            {editButton(6, "who can pitch")}
          </div>
        </dl>
      </Block>

      <ProtectedNote />
    </>
  );
}
