"use client";

import { BadgeCheck, Check, Link2, Minus, X } from "lucide-react";

import { PaymentMethodPicker } from "@/components/domain/money";
import { VideoThumb } from "@/components/domain/video-thumb";
import { extraDaysLabel, tierName } from "@/components/new-order/helpers";
import { ChoiceTile, Disclosure, GroupError, ListEditor, Question, SubLabel } from "@/components/new-order/parts";
import { ProductPicker } from "@/components/new-order/product-picker";
import { referenceId } from "@/components/new-order/pitches-steps";
import { FilterChip } from "@/components/ui/chip";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { lengthLabel, money, plural, weekdayDate } from "@/lib/format";
import { at } from "@/lib/clock";
import type { DemoState } from "@/lib/store";
import { RAW_FOOTAGE_INCLUDED, addonById, aspects, formatById, languageById, platforms, usageOptions } from "@/lib/taxonomy";
import type { Aspect, Commission, Creator, Video } from "@/lib/types";

import { SLACK_OPTIONS, businessProducts, fromProduct, lengthOptions, withPackage, type Derived, type Draft, type FieldId } from "./model";

export type SectionProps = {
  s: DemoState;
  creator: Creator;
  d: Draft;
  x: Derived;
  set: (patch: Partial<Draft>) => void;
  replace: (next: Draft) => void;
  errorFor: (field: FieldId) => string | null;
  repeat: Commission | null;
};

const toggle = <T,>(items: T[], value: T) => (items.includes(value) ? items.filter((v) => v !== value) : [...items, value]);

/* -------------------------------------------------------------------------- */
/* Package and timing                                                          */
/* -------------------------------------------------------------------------- */

export function PackageSection({ creator, d, x, set, replace }: SectionProps) {
  return (
    <Question id="s-package" title="Package and timing">
      <div role="radiogroup" aria-labelledby="s-package" className={`grid gap-2 ${creator.packages.length > 1 ? "sm:grid-cols-3" : ""}`}>
        {creator.packages.map((pkg) => {
          const on = pkg.id === d.packageId;
          return (
            <label
              key={pkg.id}
              className={`y-tile relative flex cursor-pointer flex-col gap-1 p-4 sm:gap-2 ${on ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : "y-hoverable"}`}
            >
              <input
                type="radio"
                name="package"
                className="y-check absolute end-4 top-4 !rounded-full"
                checked={on}
                onChange={() => replace(withPackage(d, pkg))}
                aria-label={`${tierName[pkg.tier]}: ${pkg.name}, ${money(pkg.price)}`}
              />
              <span className="y-micro y-fg-2 pe-10 font-semibold tracking-wide uppercase">{tierName[pkg.tier]}</span>
              <span className="y-small pe-24 font-semibold sm:pe-0">{pkg.name}</span>
              <span className="y-display y-num absolute end-4 bottom-4 text-[22px] leading-none sm:static sm:text-[26px]">
                {money(pkg.price)}
              </span>
              <span className="y-micro y-fg-2 pe-24 sm:pe-0">
                {plural(pkg.videos, "video")} up to {lengthLabel(pkg.maxSeconds)} · {pkg.deliveryDays}-day delivery ·{" "}
                {plural(pkg.revisions, "revision")}
              </span>
            </label>
          );
        })}
      </div>
      <div className="flex flex-col gap-2">
        <SubLabel
          id="s-due"
          hint={`${tierName[x.pkg.tier]} takes ${plural(x.workDays, "day")}${x.startOffset ? `, starting when ${creator.firstName} is free in ${plural(x.startOffset, "day")}` : ""}. Due by 6:00 PM Eastern.`}
        >
          When you need it
        </SubLabel>
        <div role="radiogroup" aria-labelledby="s-due" className="flex flex-wrap gap-2">
          {SLACK_OPTIONS.map((option) => {
            const days = x.earliest + option.value;
            return (
              <FilterChip key={option.value} pressed={d.slack === option.value} onClick={() => set({ slack: option.value })}>
                {weekdayDate(at(days, "18:00"))}
                <span className="font-normal opacity-75"> · {option.label}</span>
              </FilterChip>
            );
          })}
        </div>
      </div>
    </Question>
  );
}

/* -------------------------------------------------------------------------- */
/* Product                                                                     */
/* -------------------------------------------------------------------------- */

export function ProductSection({ s, d, set, errorFor }: SectionProps) {
  const products = businessProducts(s);
  return (
    <Question
      id="s-product"
      title="What it's for"
      hint={
        products.length
          ? "Its audience, tone, dos and don'ts fill the brief below."
          : "No saved products yet. Describe it in the brief, or save a product so the next order starts from it."
      }
    >
      <div data-field="product">
        <ProductPicker
          products={products}
          value={d.productId}
          name="checkout-product"
          labelledBy="s-product"
          defaultAdding={false}
          error={errorFor("product")}
          onSelect={(product) => set({ ...fromProduct(product), title: null })}
          learnings={{ ids: d.learningIds, onChange: (learningIds) => set({ learningIds }) }}
        />
      </div>
    </Question>
  );
}

/* -------------------------------------------------------------------------- */
/* Brief essentials                                                            */
/* -------------------------------------------------------------------------- */

export function BriefSection({ creator, d, x, set, errorFor, video }: SectionProps & { video: Video | null }) {
  const inspired = video ? d.references.find((r) => r.id === `rf-video-${video.id}`) : undefined;
  return (
    <Question id="s-brief" title="The brief" hint={x.product ? `Filled in from ${x.product.name}. Change anything.` : undefined}>
      {video && inspired ? (
        <div className="y-tile flex items-center gap-3 p-2 pe-3">
          <span className="w-10 flex-none overflow-hidden rounded-(--y-r-sm)">
            <VideoThumb video={video} frame="9:16" showHook={false} showMeta={false} decorative />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="y-micro y-fg-2">Inspired by</span>
            <span className="y-small truncate font-semibold">{video.title}</span>
          </span>
          <button
            type="button"
            className="y-round"
            data-tone-btn="ghost"
            data-size="sm"
            aria-label="Don't reference this video"
            title="Remove"
            onClick={() => set({ references: d.references.filter((r) => r.id !== inspired.id) })}
          >
            <X size={16} aria-hidden />
          </button>
        </div>
      ) : null}

      <div data-field="title">
        <TextField
          label="Title"
          required
          value={x.title}
          onChange={(event) => set({ title: event.target.value })}
          error={errorFor("title")}
          hint={`Only you and ${creator.firstName} see it.`}
        />
      </div>

      <div className="flex flex-col gap-2" data-field="format">
        <SubLabel id="s-format" hint={formatById[d.format].description}>
          Format
        </SubLabel>
        <div role="group" aria-labelledby="s-format" className="flex flex-wrap gap-2">
          {creator.formats.map((id) => {
            const format = formatById[id];
            const Icon = format.icon;
            return (
              <FilterChip
                key={id}
                pressed={d.format === id}
                icon={<Icon size={16} aria-hidden />}
                onClick={() =>
                  set({ format: id, onCamera: format.voiceOnly ? false : formatById[d.format].voiceOnly ? true : d.onCamera })
                }
              >
                {format.name}
              </FilterChip>
            );
          })}
        </div>
        <GroupError message={errorFor("format")} />
      </div>

      <div className="flex flex-col gap-2" data-field="languages">
        <SubLabel id="s-lang">Language</SubLabel>
        <div role="group" aria-labelledby="s-lang" className="flex flex-wrap gap-2">
          {creator.languages.map((id) => (
            <FilterChip key={id} pressed={d.languages.includes(id)} onClick={() => set({ languages: toggle(d.languages, id) })}>
              {languageById[id].name}
            </FilterChip>
          ))}
        </div>
        <GroupError message={errorFor("languages")} />
      </div>

      <div data-field="goal" className="flex flex-col gap-1.5">
        <TextArea
          label="Goal"
          required
          rows={2}
          placeholder="e.g. Shop owners see an invoice go out on WhatsApp and download Daftar"
          value={x.goal}
          onChange={(event) => set({ goal: event.target.value })}
          error={errorFor("goal")}
          hint="What should viewers do or feel after watching?"
        />
        {d.goal !== null && x.product ? (
          <PillButton size="sm" variant="ghost" className="w-fit" onClick={() => set({ goal: null })}>
            Use the suggested goal
          </PillButton>
        ) : null}
      </div>

      <div data-field="keyMessage">
        <TextField
          label="Key message"
          required
          value={d.keyMessage}
          onChange={(event) => set({ keyMessage: event.target.value })}
          error={errorFor("keyMessage")}
          hint="The one line viewers should remember."
        />
      </div>
    </Question>
  );
}

/* -------------------------------------------------------------------------- */
/* More details                                                                */
/* -------------------------------------------------------------------------- */

export function DetailsSection({
  creator,
  d,
  x,
  set,
  errorFor,
  open,
  onToggle,
}: SectionProps & { open: boolean; onToggle: (open: boolean) => void }) {
  const lengths = lengthOptions(x.pkg);
  const summary = [
    d.platforms.map((p) => platforms.find((x2) => x2.id === p)?.short).join(", ") || "No platform yet",
    `${d.aspect}`,
    `up to ${lengthLabel(d.durationSec)}`,
    d.mustInclude.length + x.learnings.length ? plural(d.mustInclude.length + x.learnings.length, "must-include") : null,
    d.avoid.length ? `${d.avoid.length} to avoid` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const hasError = Boolean(errorFor("platforms") || errorFor("audience"));
  return (
    <Disclosure title="More details" summary={hasError ? "Something here needs an answer" : summary} open={open} onToggle={onToggle}>
      <div data-field="audience">
        <TextArea
          label="Who it's for"
          required
          rows={3}
          value={d.audience}
          onChange={(event) => set({ audience: event.target.value })}
          error={errorFor("audience")}
          hint={x.product ? `From ${x.product.name}. Be specific: age, job, what they use today.` : "Age, job, what they use today."}
        />
      </div>

      <div className="flex flex-col gap-2" data-field="platforms">
        <SubLabel id="s-platforms">Where you&apos;ll post it</SubLabel>
        <div role="group" aria-labelledby="s-platforms" className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <FilterChip key={platform.id} pressed={d.platforms.includes(platform.id)} onClick={() => set({ platforms: toggle(d.platforms, platform.id) })}>
              {platform.name}
            </FilterChip>
          ))}
        </div>
        <GroupError message={errorFor("platforms")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {x.pkg.videos > 1 ? (
          <SelectField
            label="Videos"
            optionalLabel={false}
            value={String(d.videoCount)}
            onChange={(event) => set({ videoCount: Number(event.target.value) })}
            options={Array.from({ length: x.pkg.videos }, (_, i) => ({ value: String(i + 1), label: plural(i + 1, "video") }))}
            hint={`${tierName[x.pkg.tier]} includes up to ${plural(x.pkg.videos, "video")}.`}
          />
        ) : null}
        <SelectField
          label="Length of each"
          optionalLabel={false}
          value={String(d.durationSec)}
          onChange={(event) => set({ durationSec: Number(event.target.value) })}
          options={lengths.map((sec) => ({ value: String(sec), label: `Up to ${lengthLabel(sec)}` }))}
        />
        <div className="flex flex-col gap-2">
          <SubLabel>Shape</SubLabel>
          <SegmentedToggle<Aspect>
            label="Shape"
            size="md"
            className="w-fit"
            value={d.aspect}
            onChange={(aspect) => set({ aspect })}
            options={aspects.map((a) => ({ value: a.id, label: a.id }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <SubLabel>Who&apos;s in it</SubLabel>
          <SegmentedToggle<"on" | "off">
            label={`${creator.firstName} on camera or voice only`}
            size="md"
            className="w-fit"
            value={d.onCamera ? "on" : "off"}
            onChange={(value) => set({ onCamera: value === "on" })}
            options={[
              { value: "on", label: "On camera" },
              { value: "off", label: "Voice only" },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SubLabel hint={x.learnings.length ? `Plus ${plural(x.learnings.length, "attached learning")}.` : undefined}>Must include</SubLabel>
        <ListEditor
          label="Must include"
          items={d.mustInclude}
          onChange={(mustInclude) => set({ mustInclude })}
          placeholder="e.g. The WhatsApp send moment"
          marker={<Check size={15} strokeWidth={2.75} />}
        />
      </div>
      <div className="flex flex-col gap-2">
        <SubLabel>Please avoid</SubLabel>
        <ListEditor
          label="Please avoid"
          items={d.avoid}
          onChange={(avoid) => set({ avoid })}
          placeholder="e.g. Sped-up screen recordings"
          marker={<Minus size={15} strokeWidth={2.75} />}
        />
      </div>
      <div className="flex flex-col gap-2">
        <SubLabel hint="A video whose tone or pacing you'd like to match.">References</SubLabel>
        <ListEditor
          label="References"
          items={d.references.map((r) => r.label)}
          max={5}
          onChange={(labels) =>
            set({ references: labels.map((label) => d.references.find((r) => r.label === label) ?? { id: referenceId(label), label }) })
          }
          placeholder="Paste a link or describe a video you like"
          marker={<Link2 size={15} />}
        />
      </div>
      <TextArea
        label="Notes"
        rows={3}
        value={d.notes}
        onChange={(event) => set({ notes: event.target.value })}
        hint="Tone, setting, props. Your product's tone is filled in for you."
      />
    </Disclosure>
  );
}

/* -------------------------------------------------------------------------- */
/* Usage and extras                                                            */
/* -------------------------------------------------------------------------- */

export function UsageSection({ creator, d, x, set }: SectionProps) {
  return (
    <Question
      id="s-usage"
      title="Usage and extras"
      hint={`How you'll use the videos is part of ${tierName[x.pkg.tier]}'s price, with no separate rights fee. ${creator.firstName} sees it with the offer.`}
    >
      <div role="radiogroup" aria-labelledby="s-usage" className="grid gap-2 sm:grid-cols-2">
        {usageOptions.map((option) => (
          <ChoiceTile
            key={option.id}
            name="usage"
            checked={d.usage === option.id}
            onChange={() => set({ usage: option.id })}
            label={`${option.name}. ${option.description}`}
            className="!p-3.5"
          >
            <span className="y-small font-semibold">{option.name}</span>
            <span className="y-micro y-fg-2">{option.description}</span>
          </ChoiceTile>
        ))}
      </div>
      <p className="y-micro y-fg-2 flex items-start gap-2">
        <BadgeCheck size={15} aria-hidden className="mt-px flex-none" />
        {plural(x.revisions, "revision")} included. {RAW_FOOTAGE_INCLUDED}
      </p>

      <div className="flex flex-col gap-1 border-t border-(--b-line) pt-4">
        <SubLabel id="s-addons">
          Extras <span className="y-fg-2 font-normal">· optional</span>
        </SubLabel>
        {creator.addons.length ? (
          <ul className="-mx-1 flex flex-col" aria-labelledby="s-addons">
            {creator.addons.map((addon) => {
              const info = addonById[addon.id];
              const Icon = info.icon;
              const on = d.addons.includes(addon.id);
              const days = extraDaysLabel(addon.extraDays);
              return (
                <li key={addon.id}>
                  <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-(--y-r-sm) px-1 py-2 hover:bg-(--y-mist)">
                    <Icon size={18} aria-hidden className="flex-none" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="y-small font-semibold">{info.name}</span>
                      <span className="y-micro y-fg-2">
                        {info.description}
                        {days ? ` · ${days}` : ""}
                      </span>
                    </span>
                    <span className="y-small y-num flex-none font-semibold">+{money(addon.price)}</span>
                    <input
                      type="checkbox"
                      role="switch"
                      className="y-switch"
                      checked={on}
                      onChange={() => set({ addons: toggle(d.addons, addon.id) })}
                    />
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="y-small y-fg-2">{creator.firstName} doesn&apos;t offer extras yet.</p>
        )}
      </div>
    </Question>
  );
}

/* -------------------------------------------------------------------------- */
/* Message and payment                                                         */
/* -------------------------------------------------------------------------- */

export function MessageSection({ creator, d, x, set }: SectionProps) {
  return (
    <Question id="s-message" title={`Message to ${creator.firstName}`}>
      <TextArea
        label="Message"
        rows={4}
        value={x.message}
        onChange={(event) => set({ message: event.target.value })}
        hint="Sent with the offer and kept in your conversation. Contact details are hidden: keep it on Yapp so payment protection covers the work."
      />
      {d.message !== null ? (
        <PillButton variant="ghost" size="sm" className="w-fit" onClick={() => set({ message: null })}>
          Use the suggested message
        </PillButton>
      ) : null}
    </Question>
  );
}

export function PaymentSection({ d, set, errorFor }: SectionProps) {
  return (
    <section aria-label="Payment" className="y-block y-pad-md flex flex-col gap-3" data-tone="paper" data-field="payment">
      <PaymentMethodPicker value={d.paymentMethodId} onChange={(paymentMethodId) => set({ paymentMethodId })} />
      <GroupError message={errorFor("payment")} />
    </section>
  );
}
