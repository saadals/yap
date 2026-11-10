"use client";

import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  Check,
  Globe,
  Link2,
  MailOpen,
  Minus,
  Pencil,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { BriefSummary } from "@/components/domain/brief-summary";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { AvatarStack, FaceAvatar } from "@/components/ui/face-avatar";
import { TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useToast } from "@/components/ui/toast";
import { lengthLabel, money, moneyRange, plural, weekdayDate } from "@/lib/format";
import { cityById, me } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import {
  SERVICE_FEE_RATE,
  addonById,
  aspects,
  formatById,
  formats,
  includedRights,
  languages,
  platforms,
} from "@/lib/taxonomy";
import type { AddonId, Aspect, FormatId, Product } from "@/lib/types";

import { ChoiceTile, Disclosure, GroupError, ListEditor, Question, Stepper, SubLabel, MoneyInput } from "./parts";
import {
  DEADLINE_PRESETS,
  MAX_DEADLINE_DAYS,
  MIN_DEADLINE_DAYS,
  WANTED_ADDONS,
  applyProduct,
  autoTitle,
  daysForIsoDay,
  deliverableLabel,
  draftCopy,
  dueDateFor,
  effectiveTitle,
  formToBrief,
  inviteCandidates,
  isoDay,
  lengthOptions,
  median,
  recommendedDays,
  totalBudget,
  typicalLength,
  unitWord,
  unitsFor,
  type FieldKey,
  type Market,
  type PitchesForm,
} from "./pitches-model";
import { ProductPicker } from "./product-picker";

export type FormPatch = Partial<PitchesForm> | ((form: PitchesForm) => Partial<PitchesForm>);

export type StepProps = {
  s: DemoState;
  form: PitchesForm;
  set: (patch: FormPatch) => void;
  product?: Product;
  products: Product[];
  market: Market;
  error: (field: FieldKey) => string | undefined;
  goTo: (step: number) => void;
  /** Creators invited before this screen (from a profile or an earlier order): always listed. */
  pinnedInvites?: string[];
};

/** Stable id for a typed reference (labels are unique in the list). */
export const referenceId = (label: string) =>
  `ref-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "link"}`;

const toggle = <T,>(items: T[], value: T) =>
  items.includes(value) ? items.filter((v) => v !== value) : [...items, value];

/* -------------------------------------------------------------------------- */
/* 1 · Product                                                                 */
/* -------------------------------------------------------------------------- */

export function ProductStep({ form, set, product, products, error }: StepProps) {
  return (
    <>
      <Block tone="paper" pad="md">
        <ProductPicker
          products={products}
          value={form.productId}
          labelledBy="flow-title"
          error={error("product")}
          onSelect={(next) => set((f) => applyProduct(f, next, products.find((p) => p.id === f.productId)))}
          learnings={{ ids: form.learningIds, onChange: (learningIds) => set({ learningIds }) }}
        />
      </Block>
      {product ? <ContextLine product={product} /> : null}
    </>
  );
}

/** One line on what else travels with the brief. */
function ContextLine({ product }: { product: Product }) {
  const parts = [
    product.audience ? "who it's for" : null,
    product.tone.length ? `tone (${product.tone.slice(0, 2).join(", ").toLowerCase()})` : null,
    product.dos.length ? plural(product.dos.length, "do") : null,
    product.donts.length ? plural(product.donts.length, "don't", "don'ts") : null,
    product.assets.length
      ? `${plural(product.assets.length, "file")}${product.assets.some((a) => a.kind === "demo-account") ? " with a demo login" : ""}`
      : null,
  ].filter(Boolean);
  if (!parts.length) return null;
  return (
    <p className="y-small y-fg-2 flex items-start gap-2 px-1">
      <ShieldCheck size={16} aria-hidden className="mt-0.5 flex-none" />
      <span>
        Also sent with the brief: {parts.join(", ")}.
      </span>
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* 2 · The video                                                               */
/* -------------------------------------------------------------------------- */

export function VideoStep({ s, form, set, product, error }: StepProps) {
  const toast = useToast();
  const formatErr = error("format");
  const platformErr = error("platforms");
  const langErr = error("languages");
  const [direction, setDirection] = useState(false);

  const choose = (id: FormatId) => {
    const [, hi] = formatById[id].typical;
    set((f) => {
      if (f.format === id) return {};
      // Hook packs count hooks (usually five); switching back resets that count.
      const videoCount = id === "hook-pack" && f.videoCount === 1 ? 5 : f.format === "hook-pack" && f.videoCount === 5 ? 1 : f.videoCount;
      return { format: id, durationSec: hi, onCamera: !formatById[id].voiceOnly, videoCount };
    });
  };

  const suggestion = autoTitle(form, product);
  const title = effectiveTitle(form, product);

  const writeIt = () => {
    if (!product) return;
    const before = { goal: form.goal, keyMessage: form.keyMessage };
    set(draftCopy(form.format, product));
    if (before.goal.trim()) {
      toast({ message: "Wrote a new goal and key message", action: { label: "Undo", onClick: () => set(before) } });
    }
  };

  const directionSummary = [
    form.audience.trim() ? "audience" : null,
    form.keyMessage.trim() ? "key message" : null,
    form.mustInclude.length ? plural(form.mustInclude.length, "must-include") : null,
    form.avoid.length ? `${form.avoid.length} to avoid` : null,
  ].filter(Boolean);

  return (
    <>
      <Question id="q-format" title="Format" hint="Creators plan, price and film around it.">
        <div
          role="radiogroup"
          aria-labelledby="q-format"
          data-invalid={formatErr ? "true" : undefined}
          tabIndex={-1}
          className="grid gap-2 outline-none sm:grid-cols-2"
        >
          {formats.map((format) => {
            const Icon = format.icon;
            const checked = form.format === format.id;
            return (
              <ChoiceTile
                key={format.id}
                name="format"
                checked={checked}
                onChange={() => choose(format.id)}
                label={`${format.name}. ${format.short}`}
                className="!p-3.5"
              >
                <span className="flex items-start gap-3">
                  <span className="y-round flex-none" data-tone-btn={checked ? "contrast" : "soft"} data-size="sm" aria-hidden>
                    <Icon size={18} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="y-small font-semibold">{format.name}</span>
                    <span className="y-micro y-fg-2">{format.short}</span>
                  </span>
                </span>
              </ChoiceTile>
            );
          })}
        </div>
        <GroupError message={formatErr} />
      </Question>

      <Question id="q-size" title={form.format === "hook-pack" ? "How many hooks, how long" : "How many, how long"}>
        <div className="flex flex-col gap-5">
          <Stepper
            label={form.format === "hook-pack" ? "Hooks" : "Videos"}
            value={form.videoCount}
            min={1}
            max={10}
            onChange={(videoCount) => set({ videoCount })}
            unit={(n) => (form.format === "hook-pack" ? (n === 1 ? "hook" : "hooks") : n === 1 ? "video" : "videos")}
          />
          <div className="flex flex-col gap-2">
            <SubLabel
              id="q-length"
              hint={form.format ? `Most ${formatById[form.format].noun[1]} run ${typicalLength(form.format)}.` : undefined}
            >
              Length of each
            </SubLabel>
            <div role="group" aria-labelledby="q-length" className="flex flex-wrap gap-2">
              {lengthOptions(form.format).map((option) => (
                <FilterChip
                  key={option.value}
                  pressed={form.durationSec === option.value}
                  onClick={() => set({ durationSec: option.value })}
                >
                  Up to {lengthLabel(option.value)}
                  {option.longer ? <span className="font-normal opacity-75"> · longer than usual</span> : null}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
      </Question>

      <Question id="q-where" title="Language and where it goes">
        <div className="flex flex-col gap-2">
          <SubLabel id="q-lang" hint="Numbers show creators who make videos in it.">
            Language
          </SubLabel>
          <div role="group" aria-labelledby="q-lang" data-invalid={langErr ? "true" : undefined} tabIndex={-1} className="flex flex-wrap gap-2 outline-none">
            {languages.map((lang) => {
              const count = s.creators.filter(
                (c) => c.languages.includes(lang.id) && (!form.format || c.formats.includes(form.format)),
              ).length;
              return (
                <FilterChip
                  key={lang.id}
                  pressed={form.languages.includes(lang.id)}
                  count={count}
                  onClick={() => set((f) => ({ languages: toggle(f.languages, lang.id) }))}
                >
                  {lang.name}
                </FilterChip>
              );
            })}
          </div>
          <GroupError message={langErr} />
        </div>
        <div className="flex flex-col gap-2">
          <SubLabel id="q-platforms">Where you&apos;ll post it</SubLabel>
          <div role="group" aria-labelledby="q-platforms" data-invalid={platformErr ? "true" : undefined} tabIndex={-1} className="flex flex-wrap gap-2 outline-none">
            {platforms.map((p) => (
              <FilterChip
                key={p.id}
                pressed={form.platforms.includes(p.id)}
                onClick={() => set((f) => ({ platforms: toggle(f.platforms, p.id) }))}
              >
                {p.name}
              </FilterChip>
            ))}
          </div>
          <GroupError message={platformErr} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <SubLabel>Who&apos;s in it</SubLabel>
            <SegmentedToggle<"on" | "off">
              label="On camera or voice only"
              size="md"
              className="w-fit"
              value={form.onCamera ? "on" : "off"}
              onChange={(value) => set({ onCamera: value === "on" })}
              options={[
                { value: "on", label: "On camera" },
                { value: "off", label: "Voice only" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <SubLabel>Shape</SubLabel>
            <SegmentedToggle<Aspect>
              label="Shape"
              size="md"
              className="w-fit"
              value={form.aspect}
              onChange={(aspect) => set({ aspect })}
              options={aspects.map((a) => ({ value: a.id, label: a.id }))}
            />
          </div>
        </div>
      </Question>

      {form.format ? (
        <Question id="q-title" title="Title" hint="Creators see it first. We suggested one from your answers.">
          <TextField
            label="Order title"
            required
            value={title}
            maxLength={90}
            error={error("title")}
            onChange={(event) => set({ title: event.target.value, titleTouched: true })}
          />
          {form.titleTouched && title !== suggestion ? (
            <PillButton size="sm" variant="ghost" className="w-fit" onClick={() => set({ titleTouched: false, title: "" })}>
              Use &ldquo;{suggestion}&rdquo;
            </PillButton>
          ) : null}
        </Question>
      ) : null}

      <Disclosure
        title="Creative direction (optional)"
        summary={
          directionSummary.length
            ? `${product ? `From ${product.name}: ` : ""}${directionSummary.join(", ")}`
            : "Key message, must include, avoid, references, notes"
        }
        open={direction}
        onToggle={setDirection}
      >
        {product ? (
          <div className="y-tile flex flex-wrap items-center gap-3 p-3 ps-4">
            <Sparkles size={18} aria-hidden className="flex-none" />
            <p className="y-small min-w-0 flex-1">Not sure how to put it? Get a first goal and key message.</p>
            <PillButton size="sm" variant="soft" onClick={writeIt}>
              Write it for me
            </PillButton>
          </div>
        ) : null}
        <TextArea
          label="Who it's for"
          rows={2}
          value={form.audience}
          hint={product ? `From ${product.name}. Narrow it for this video if you like.` : undefined}
          onChange={(event) => set({ audience: event.target.value })}
        />
        <TextArea
          label="Goal"
          rows={2}
          value={form.goal}
          placeholder="What should viewers do or feel after watching?"
          onChange={(event) => set({ goal: event.target.value })}
        />
        <TextField
          label="Key message"
          value={form.keyMessage}
          placeholder="The one line viewers should remember"
          onChange={(event) => set({ keyMessage: event.target.value })}
        />
        <div className="flex flex-col gap-2">
          <SubLabel hint={product?.dos.length ? `Started from ${product.name}'s dos.` : "Shots, lines or moments it needs."}>
            Must include
          </SubLabel>
          <ListEditor
            label="Must include"
            items={form.mustInclude}
            onChange={(mustInclude) => set({ mustInclude })}
            placeholder="e.g. Show the invoice landing in WhatsApp"
            marker={<Check size={15} strokeWidth={2.75} />}
          />
        </div>
        <div className="flex flex-col gap-2">
          <SubLabel hint={product?.donts.length ? `Started from ${product.name}'s don'ts.` : undefined}>Please avoid</SubLabel>
          <ListEditor
            label="Please avoid"
            items={form.avoid}
            onChange={(avoid) => set({ avoid })}
            placeholder="e.g. Don't mention other apps"
            marker={<Minus size={15} strokeWidth={2.75} />}
          />
        </div>
        <div className="flex flex-col gap-2">
          <SubLabel hint="A video or account you like, and why. One good reference saves a round of changes.">
            References
          </SubLabel>
          <ListEditor
            label="References"
            items={form.references.map((r) => r.label)}
            max={5}
            onChange={(labels) =>
              set((f) => ({
                references: labels.map((label) => f.references.find((r) => r.label === label) ?? { id: referenceId(label), label }),
              }))
            }
            placeholder="e.g. The pace of the first 3 seconds in @shopowner's videos"
            marker={<Link2 size={15} />}
          />
        </div>
        <TextArea
          label="Notes"
          rows={3}
          value={form.notes}
          placeholder="Setting, wardrobe, what worked before, how you'll use it"
          onChange={(event) => set({ notes: event.target.value })}
        />
      </Disclosure>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 3 · Budget, timing and who can pitch                                        */
/* -------------------------------------------------------------------------- */

function PriceStrip({ prices, budget }: { prices: number[]; budget: { min: number; max: number } }) {
  const scaleMax = Math.max(budget.max, prices[prices.length - 1] ?? 0, 100) * 1.1;
  const pct = (n: number) => `${Math.min(100, Math.max(0, (n / scaleMax) * 100))}%`;
  return (
    <div aria-hidden className="relative h-8">
      <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-(--y-line)" />
      {budget.max >= budget.min && budget.min > 0 ? (
        <span
          className="absolute top-1/2 h-3.5 -translate-y-1/2 rounded-full bg-(--y-ink) opacity-15"
          style={{ insetInlineStart: pct(budget.min), width: `calc(${pct(budget.max)} - ${pct(budget.min)})` }}
        />
      ) : null}
      {prices.map((price, index) => (
        <span
          key={`${price}-${index}`}
          className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--y-ink) ring-2 ring-(--y-paper) ${
            price >= budget.min && price <= budget.max ? "" : "opacity-35"
          }`}
          style={{ insetInlineStart: pct(price) }}
        />
      ))}
    </div>
  );
}

export function TermsStep({ s, form, set, product, market, error, pinnedInvites = [] }: StepProps) {
  const [customDate, setCustomDate] = useState(!DEADLINE_PRESETS.includes(form.dueInDays));
  const budgetErr = error("budget");
  const deadlineErr = error("deadline");
  const invitesErr = error("invites");
  const unit = unitWord(form.format);
  const units = unitsFor(form.format, form.videoCount);
  const total = totalBudget(form);
  const recommended = recommendedDays(market, form);
  const suggested = market.count >= 3 && form.perVideo.min === market.low && form.perVideo.max === market.high;
  const candidates = inviteCandidates(s, form, product, pinnedInvites);

  const addonStats = (id: AddonId) => {
    const offers = market.pool.flatMap((q) => q.creator.addons.filter((a) => a.id === id));
    return { count: offers.length, price: Math.round(median(offers.map((a) => a.price)) / 5) * 5 };
  };

  return (
    <>
      <Question id="q-budget" title={`Budget per ${unit}`}>
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-3">
            <MoneyInput
              label="Minimum"
              name="budget-min"
              value={form.perVideo.min}
              invalid={Boolean(budgetErr)}
              describedBy={budgetErr ? "q-budget-error" : undefined}
              onChange={(min) => set((f) => ({ budgetTouched: true, perVideo: { ...f.perVideo, min } }))}
            />
            <span aria-hidden className="y-fg-2 pb-3">
              to
            </span>
            <MoneyInput
              label="Maximum"
              name="budget-max"
              value={form.perVideo.max}
              invalid={Boolean(budgetErr)}
              describedBy={budgetErr ? "q-budget-error" : undefined}
              onChange={(max) => set((f) => ({ budgetTouched: true, perVideo: { ...f.perVideo, max } }))}
            />
          </div>
          <GroupError id="q-budget-error" message={budgetErr} />
          {units > 1 && !budgetErr ? (
            <p className="y-small y-fg-2 px-1">
              {moneyRange(total.min, total.max)} for {plural(units, unit)}.
            </p>
          ) : null}
        </div>

        <div className="y-tile flex flex-col gap-3 p-4" aria-live="polite">
          {market.count ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="y-small min-w-0">
                  <span className="font-semibold">
                    {market.count >= 3
                      ? `Creators usually charge ${moneyRange(market.low, market.high)} a ${unit} for this`
                      : `${plural(market.count, "creator")} ${market.count === 1 ? "makes" : "make"} this, from ${money(market.perUnitPrices[0])}`}
                  </span>
                </p>
                {market.count >= 3 && !suggested ? (
                  <PillButton
                    size="sm"
                    variant="soft"
                    onClick={() => set({ budgetTouched: true, perVideo: { min: market.low, max: market.high } })}
                  >
                    Use {moneyRange(market.low, market.high)}
                  </PillButton>
                ) : null}
              </div>
              <PriceStrip prices={market.perUnitPrices} budget={form.perVideo} />
              <p className="y-micro y-fg-2">
                Each dot is a creator who makes {form.format ? formatById[form.format].noun[1] : "this format"} in your
                language, priced from their own packages. {market.inBudget} of {market.count} usually charge within your
                maximum.
              </p>
            </>
          ) : (
            <p className="y-small">
              No creators make this format in your language yet, so there&apos;s no usual price to show. Try another
              language in the previous step.
            </p>
          )}
        </div>
      </Question>

      <Question id="q-deadline" title="When do you need it?" hint="The day the final video should be approved by.">
        <div role="group" aria-labelledby="q-deadline" data-invalid={deadlineErr ? "true" : undefined} tabIndex={-1} className="flex flex-wrap gap-2 outline-none">
          {DEADLINE_PRESETS.map((days) => (
            <FilterChip
              key={days}
              pressed={!customDate && form.dueInDays === days}
              onClick={() => {
                setCustomDate(false);
                set({ dueInDays: days });
              }}
            >
              {weekdayDate(dueDateFor(days))}
            </FilterChip>
          ))}
          <FilterChip pressed={customDate} icon={<CalendarDays size={16} aria-hidden />} onClick={() => setCustomDate(true)}>
            Pick a date
          </FilterChip>
        </div>
        {customDate ? (
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
          form.dueInDays < market.typicalDays ? (
            <p className="y-small flex items-start gap-2">
              <Badge tone="danger" icon={<AlertTriangle size={14} aria-hidden />}>
                Very tight
              </Badge>
              <span>
                First versions usually take {plural(market.typicalDays, "day")}. Expect fewer pitches, or allow at least{" "}
                {recommended} days.
              </span>
            </p>
          ) : form.dueInDays < recommended ? (
            <p className="y-small flex items-start gap-2">
              <Badge tone="warning" icon={<AlertTriangle size={14} aria-hidden />}>
                Tight
              </Badge>
              <span>{recommended} days leaves room for a round of changes.</span>
            </p>
          ) : (
            <p className="y-small y-fg-2 flex items-center gap-2">
              <Check size={16} aria-hidden className="flex-none" />
              {plural(form.dueInDays, "day")} from today: time for a first version and a round of changes.
            </p>
          )
        ) : null}
      </Question>

      <Question id="q-addons" title="Extras to include in quotes" optional>
        <ul className="-mx-1 flex flex-col" aria-labelledby="q-addons">
          {WANTED_ADDONS.map((id) => {
            const addon = addonById[id];
            const Icon = addon.icon;
            const on = form.addons.includes(id);
            const stats = addonStats(id);
            return (
              <li key={id}>
                <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-(--y-r-sm) px-1 py-2 hover:bg-(--y-mist)">
                  <Icon size={18} aria-hidden className="flex-none" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="y-small font-semibold">{addon.name}</span>
                    <span className="y-micro y-fg-2">
                      {stats.count ? `Usually +${money(stats.price)} · ${stats.count} of ${market.count} offer it` : addon.description}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    className="y-switch"
                    checked={on}
                    onChange={() =>
                      set((f) => {
                        if (on) return { addons: f.addons.filter((a) => a !== id) };
                        const exclusive: AddonId[] = id === "ad-rights-90" ? ["ad-rights-365"] : id === "ad-rights-365" ? ["ad-rights-90"] : [];
                        return { addons: [...f.addons.filter((a) => !exclusive.includes(a)), id] };
                      })
                    }
                  />
                </label>
              </li>
            );
          })}
        </ul>
        <p className="y-micro y-fg-2 flex items-start gap-2">
          <BadgeCheck size={15} aria-hidden className="mt-px flex-none" />
          Always included: {includedRights}
        </p>
      </Question>

      <Question id="q-who" title="Who can pitch?">
        <SegmentedToggle<"public" | "invite">
          label="Who can pitch"
          size="md"
          className="w-fit max-w-full"
          value={form.visibility}
          onChange={(visibility) => set({ visibility })}
          options={[
            { value: "public", label: `Everyone who matches (${market.count})` },
            { value: "invite", label: "Invite only" },
          ]}
        />
        <p className="y-small y-fg-2 flex items-start gap-2">
          {form.visibility === "public" ? (
            <Globe size={16} aria-hidden className="mt-0.5 flex-none" />
          ) : (
            <MailOpen size={16} aria-hidden className="mt-0.5 flex-none" />
          )}
          {form.visibility === "public"
            ? "Creators who make this format in your language see it. Anyone you invite hears about it first."
            : "Only the creators you pick can see it and pitch."}
        </p>
        <div className="flex flex-col gap-2" data-invalid={invitesErr ? "true" : undefined} tabIndex={-1}>
          <SubLabel>{form.visibility === "invite" ? "Who to invite" : "Invite anyone in particular"}</SubLabel>
          <ul className="flex flex-col gap-1.5">
            {candidates.map(({ creator, fit, why }) => {
              const on = form.invitedCreatorIds.includes(creator.id);
              return (
                <li key={creator.id}>
                  <label
                    className={`y-tile flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2 ${on ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : "y-hoverable"}`}
                  >
                    <FaceAvatar id={creator.id} name="" size={36} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="y-small truncate font-semibold">{creator.name}</span>
                      <span className="y-micro y-fg-2 truncate">
                        {why} · {cityById(creator.cityId)?.name} · {fit.score}% fit
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      className="y-check"
                      checked={on}
                      aria-label={`Invite ${creator.name}`}
                      onChange={() => set((f) => ({ invitedCreatorIds: toggle(f.invitedCreatorIds, creator.id) }))}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
          <GroupError message={invitesErr} />
        </div>
      </Question>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 4 · Review                                                                  */
/* -------------------------------------------------------------------------- */

export function ReviewStep({ s, form, product, market, goTo }: StepProps) {
  const business = me.business(s);
  const brief = formToBrief(form, product);
  const total = totalBudget(form);
  const invited = form.invitedCreatorIds
    .map((id) => s.creators.find((c) => c.id === id))
    .filter((c) => c !== undefined);
  const audience = form.visibility === "invite" ? invited : market.pool.map((q) => q.creator);
  const edit = (step: number, label: string) => (
    <PillButton size="sm" variant="ghost" icon={<Pencil size={14} aria-hidden />} onClick={() => goTo(step)} aria-label={`Edit ${label}`}>
      {label}
    </PillButton>
  );
  return (
    <>
      <Block as="section" aria-labelledby="r-brief" tone="paper" pad="md" className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <BusinessLogo business={business} size={44} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="y-micro y-fg-2">
              {business.name}
              {product && product.name !== business.name ? ` · ${product.name}` : ""}
            </p>
            <h2 id="r-brief" className="y-head">
              {effectiveTitle(form, product)}
            </h2>
            <p className="y-small y-fg-2">
              {moneyRange(total.min, total.max)}
              {unitsFor(form.format, form.videoCount) > 1 ? ` for ${deliverableLabel(form.format, form.videoCount)}` : ""} · Due{" "}
              {weekdayDate(dueDateFor(form.dueInDays))}
            </p>
          </div>
        </div>
        <BriefSummary brief={brief} product={product} showProduct={false} />
        <div className="flex flex-wrap items-center gap-1 border-t border-(--b-line) pt-3">
          <span className="y-micro y-fg-2 me-1">Change</span>
          {edit(0, "Product")}
          {edit(1, "The video")}
          {edit(2, "Budget and timing")}
        </div>
      </Block>

      <Block as="section" tone="paper" pad="md" className="flex items-center gap-4" aria-label="Who sees it">
        {audience.length ? <AvatarStack size={32} max={5} people={audience.map((c) => ({ id: c.id, name: c.name }))} /> : null}
        <p className="y-small min-w-0 flex-1">
          <span className="font-semibold">
            {form.visibility === "invite"
              ? `Invite only: ${plural(invited.length, "creator")}`
              : `${plural(market.count, "creator")} ${market.count === 1 ? "matches" : "match"}`}
          </span>
          <span className="y-fg-2">
            {form.visibility === "invite"
              ? ` · ${invited.map((c) => c.firstName).join(", ")}`
              : invited.length
                ? ` · ${invited.map((c) => c.firstName).join(", ")} invited first`
                : " · they see it as soon as you post"}
          </span>
        </p>
      </Block>

      <MoneyNote />
    </>
  );
}

export function MoneyNote() {
  return (
    <Block tone="paper" pad="md" className="flex items-start gap-3">
      <ShieldCheck size={20} aria-hidden className="mt-0.5 flex-none" />
      <p className="y-small">
        <span className="font-semibold">You pay nothing until you hire.</span>{" "}
        <span className="y-fg-2">
          Then the price plus a {Math.round(SERVICE_FEE_RATE * 100)}% service fee is held until you approve. Full refund if
          it isn&apos;t delivered.
        </span>
      </p>
    </Block>
  );
}
