"use client";

import { Check, CircleAlert, Link2, Lightbulb, Minus, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { PaymentMethodPicker } from "@/components/domain/money";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { lengthLabel, money, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import type { DemoState } from "@/lib/store";
import { addonById, aspects, formatById, languageById, platforms } from "@/lib/taxonomy";
import type { Aspect, Creator, FormatId } from "@/lib/types";

import { extraDaysLabel, tierName } from "../profile-utils";
import {
  type Derived,
  type Draft,
  type FieldId,
  SLACK_OPTIONS,
  briefStrength,
  businessProducts,
  dueOption,
  fromProduct,
  lengthOptions,
  withPackage,
} from "./draft";
import { ListField } from "./list-field";

export type EditorProps = {
  s: DemoState;
  creator: Creator;
  d: Draft;
  x: Derived;
  set: (patch: Partial<Draft>) => void;
  replace: (next: Draft) => void;
  errorFor: (field: FieldId) => string | null;
  touch: (field: FieldId) => void;
};

function moreVideosHint(creator: Creator): string {
  const bigger = [...creator.packages].sort((a, b) => b.videos - a.videos)[0];
  return bigger && bigger.videos > 1
    ? `Need more? ${tierName[bigger.tier]} includes ${plural(bigger.videos, "video")}.`
    : "Each package is one video. Send another offer for more.";
}

function toggle<T>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((v) => v !== value) : [...items, value];
}

function GroupLabel({ id, label, required, hint }: { id: string; label: string; required?: boolean; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span id={id} className="y-label">
        <span>{label}</span>
        <span className="y-micro y-fg-3 font-medium">{required ? "Required" : "Optional"}</span>
      </span>
      {hint ? <span className="y-micro y-fg-3 px-1">{hint}</span> : null}
    </div>
  );
}

function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
      <CircleAlert size={16} aria-hidden className="flex-none" />
      {message}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* Section frame                                                               */
/* -------------------------------------------------------------------------- */

export function Section({
  id,
  step,
  title,
  hint,
  summary,
  open,
  collapsible,
  onToggle,
  error,
  children,
}: {
  id: string;
  step: number;
  title: string;
  hint?: React.ReactNode;
  summary: React.ReactNode;
  open: boolean;
  collapsible: boolean;
  onToggle: () => void;
  error?: string | null;
  children: React.ReactNode;
}) {
  const headingId = `${id}-heading`;
  const bodyId = `${id}-body`;
  const frame = "flex scroll-mt-24 flex-col gap-5";
  const content = (
    <>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`y-num grid size-8 flex-none place-items-center rounded-full text-sm font-semibold ${
            collapsible && !open && !error
              ? "bg-(--b-fg) text-(--b-bg)"
              : "shadow-[inset_0_0_0_1.5px_var(--b-fg)]"
          }`}
        >
          {collapsible && !open && !error ? <Check size={16} strokeWidth={3} /> : step}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
          <h2 id={headingId} className="y-head">
            <span className="sr-only">Step {step}: </span>
            {title}
          </h2>
          {open ? (
            hint ? <div className="y-small y-fg-2">{hint}</div> : null
          ) : (
            <div className="y-small y-fg-2">{summary}</div>
          )}
          {!open && error ? <InlineError message={error} /> : null}
        </div>
        {collapsible ? (
          <PillButton
            size="sm"
            variant="ghost"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={bodyId}
            className="flex-none"
          >
            {open ? "Done" : "Edit"}
          </PillButton>
        ) : null}
      </div>
      {open ? (
        <div id={bodyId} className="flex flex-col gap-6">
          {children}
        </div>
      ) : null}
    </>
  );
  // Collapsible (repeat) sections are rows inside one shared block; the rest are their own block.
  return collapsible ? (
    <section id={id} aria-labelledby={headingId} className={`${frame} py-5`}>
      {content}
    </section>
  ) : (
    <Block as="section" tone="paper" pad="md" id={id} aria-labelledby={headingId} className={frame}>
      {content}
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* 1 Package                                                                   */
/* -------------------------------------------------------------------------- */

export function PackageEditor({ creator, d, replace }: EditorProps) {
  return (
    <div role="radiogroup" aria-label="Package" className="grid gap-2 md:grid-cols-3">
      {creator.packages.map((pkg) => {
        const on = pkg.id === d.packageId;
        return (
          <label
            key={pkg.id}
            className={`y-tile flex cursor-pointer flex-col gap-3 p-4 ${on ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : "y-hoverable"}`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="y-small font-semibold">{tierName[pkg.tier]}</span>
              <input
                type="radio"
                name="package"
                className="y-check !rounded-full"
                checked={on}
                onChange={() => replace(withPackage(d, pkg))}
              />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="y-head">{pkg.name}</span>
              <span className="y-micro y-fg-2">{pkg.summary}</span>
            </span>
            <span className="y-display y-num text-[30px] leading-none font-semibold tracking-[-0.03em]">
              {money(pkg.price)}
            </span>
            <span className="y-micro y-fg-2">
              {pkg.deliveryDays}-day delivery · {plural(pkg.revisions, "revision")} ·{" "}
              {plural(pkg.videos, "video")} up to {lengthLabel(pkg.maxSeconds)}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2 Product + learnings                                                       */
/* -------------------------------------------------------------------------- */

export function ProductEditor({ s, creator, d, x, set, errorFor }: EditorProps) {
  const products = businessProducts(s);
  const error = errorFor("product");
  // Adding a product comes straight back here with it selected (`?product=`).
  const addHref = `${paths.newProduct}?return=${encodeURIComponent(
    paths.orderCreator(creator.handle, { package: d.packageId }),
  )}`;
  if (!products.length) {
    return (
      <div className="y-tile flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
        <p className="y-small y-fg-2 min-w-0 flex-1">
          No saved products yet. Describe what it&apos;s for in the brief, or save a product so its
          audience, tone and learnings fill in every order.
        </p>
        <PillButton href={addHref} variant="soft" size="sm" icon={<Plus size={16} aria-hidden />} className="flex-none">
          Add a product
        </PillButton>
      </div>
    );
  }
  return (
    <>
      <div role="radiogroup" aria-label="Product" className="grid gap-2 md:grid-cols-2" data-field="product" tabIndex={-1}>
        {products.map((product) => {
          const on = product.id === d.productId;
          return (
            <label
              key={product.id}
              className={`y-tile flex cursor-pointer items-start gap-3 p-4 ${on ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : "y-hoverable"}`}
            >
              <span
                aria-hidden
                className="y-display grid size-11 flex-none place-items-center rounded-[14px] text-lg font-semibold text-white"
                style={{ background: product.brandColor }}
              >
                {product.name.slice(0, 1)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="y-small font-semibold">{product.name}</span>
                <span className="y-micro y-fg-2">{product.oneLiner}</span>
                <span className="y-micro y-fg-3">
                  {product.learnings.length
                    ? `${plural(product.learnings.length, "learning")} from past commissions`
                    : "No learnings yet"}
                </span>
              </span>
              <input
                type="radio"
                name="product"
                className="y-check !rounded-full mt-1"
                checked={on}
                onChange={() => set({ ...fromProduct(product) })}
              />
            </label>
          );
        })}
        <Link
          href={addHref}
          className="y-tile y-hoverable flex min-h-20 items-center gap-3 p-4 font-semibold"
        >
          <Plus size={20} aria-hidden /> Add another product
        </Link>
      </div>
      <InlineError message={error} />

      {x.product ? (
        <p className="y-small y-fg-2 max-w-[62ch]">
          <span className="font-semibold text-(--b-fg)">{x.product.name}</span> fills your brief with its
          audience, tone, {plural(x.product.dos.length, "do")} and{" "}
          {plural(x.product.donts.length, "don't", "don'ts")}. Edit any of it in the brief below.
        </p>
      ) : null}

      {x.product && x.product.learnings.length ? (
        <Block tone="lavender" pad="sm" className="flex flex-col gap-3 !rounded-(--y-r-tile) !p-4">
          <div className="flex items-start gap-2.5">
            <Sparkles size={18} aria-hidden className="mt-0.5 flex-none" />
            <div className="flex flex-col gap-0.5">
              <h3 className="y-small font-semibold">Carried forward from your last commissions</h3>
              <p className="y-micro y-fg-2">
                Checked notes are added to the brief&apos;s must-include list, so nobody repeats a
                lesson you already paid for.
              </p>
            </div>
          </div>
          <ul className="flex flex-col gap-1.5">
            {x.product.learnings.map((learning) => {
              const by = learning.creatorId ? s.creators.find((c) => c.id === learning.creatorId) : undefined;
              return (
                <li key={learning.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-(--y-r-sm) p-2 hover:bg-(--b-chip)">
                    <input
                      type="checkbox"
                      className="y-check mt-0.5 flex-none"
                      checked={d.learningIds.includes(learning.id)}
                      onChange={() => set({ learningIds: toggle(d.learningIds, learning.id) })}
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="y-small">{learning.text}</span>
                      <span className="y-micro y-fg-2">
                        {by ? `From working with ${by.firstName}` : "Saved by your team"} ·{" "}
                        {shortDate(learning.createdAt)}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Block>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 3 Brief                                                                     */
/* -------------------------------------------------------------------------- */

export function BriefEditor({ creator, d, x, set, errorFor, touch }: EditorProps) {
  const ids = {
    format: useId(),
    lang: useId(),
    platform: useId(),
    aspect: useId(),
  };
  const lengths = lengthOptions(x.pkg);
  const strength = briefStrength(d, x);

  return (
    <>
      <TextField
        label="Title"
        required
        name="title"
        data-field="title"
        value={x.title}
        onChange={(event) => set({ title: event.target.value })}
        onBlur={() => touch("title")}
        error={errorFor("title")}
        hint="Only you and the creator see this."
      />

      <div className="flex flex-col gap-2">
        <GroupLabel id={ids.format} label="Format" required hint={`${creator.firstName} offers ${plural(creator.formats.length, "format")}.`} />
        <div role="group" aria-labelledby={ids.format} className="flex flex-wrap gap-2" data-field="format" tabIndex={-1}>
          {creator.formats.map((id: FormatId) => {
            const format = formatById[id];
            const Icon = format.icon;
            return (
              <FilterChip
                key={id}
                pressed={d.format === id}
                icon={<Icon size={16} aria-hidden />}
                onClick={() =>
                  set({
                    format: id,
                    onCamera: id === "screen-walkthrough" ? false : d.format === "screen-walkthrough" ? true : d.onCamera,
                  })
                }
              >
                {format.name}
              </FilterChip>
            );
          })}
        </div>
        <p className="y-micro y-fg-2 px-1">{formatById[d.format].description}</p>
        <InlineError message={errorFor("format")} />
      </div>

      <div className="flex flex-col gap-2">
        <GroupLabel
          id={ids.lang}
          label="Dialect"
          required
          hint={d.languages.length > 1 && d.videoCount === 1 ? "One video in several dialects? The creator will mix them, or pick a multi-video package for one each." : undefined}
        />
        <div role="group" aria-labelledby={ids.lang} className="flex flex-wrap gap-2" data-field="languages" tabIndex={-1}>
          {creator.languages.map((id) => (
            <FilterChip
              key={id}
              pressed={d.languages.includes(id)}
              onClick={() => {
                set({ languages: toggle(d.languages, id) });
                touch("languages");
              }}
            >
              {languageById[id].short}
              {id !== "en" ? (
                <span dir="rtl" lang="ar" className="ms-1.5 font-normal opacity-75">
                  {languageById[id].native}
                </span>
              ) : null}
            </FilterChip>
          ))}
        </div>
        <InlineError message={errorFor("languages")} />
      </div>

      <div className="flex flex-col gap-2">
        <GroupLabel id={ids.platform} label="Where you'll post it" required />
        <div role="group" aria-labelledby={ids.platform} className="flex flex-wrap gap-2" data-field="platforms" tabIndex={-1}>
          {platforms.map((platform) => (
            <FilterChip
              key={platform.id}
              pressed={d.platforms.includes(platform.id)}
              onClick={() => {
                set({ platforms: toggle(d.platforms, platform.id) });
                touch("platforms");
              }}
            >
              {platform.name}
            </FilterChip>
          ))}
        </div>
        <InlineError message={errorFor("platforms")} />
      </div>

      <div className="flex flex-col gap-2">
        <GroupLabel id={ids.aspect} label="Aspect ratio" required />
        <SegmentedToggle<Aspect>
          label="Aspect ratio"
          size="md"
          className="w-fit max-w-full flex-wrap"
          value={d.aspect}
          onChange={(aspect) => set({ aspect })}
          options={aspects.map((a) => ({ value: a.id, label: a.id }))}
        />
        <p className="y-micro y-fg-2 px-1">
          {aspects.find((a) => a.id === d.aspect)?.name}: {aspects.find((a) => a.id === d.aspect)?.use}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {x.pkg.videos > 1 ? (
          <SelectField
            label="Videos"
            optionalLabel={false}
            value={String(d.videoCount)}
            onChange={(event) => set({ videoCount: Number(event.target.value) })}
            options={Array.from({ length: x.pkg.videos }, (_, i) => ({
              value: String(i + 1),
              label: plural(i + 1, "video"),
            }))}
            hint={`${tierName[x.pkg.tier]} includes up to ${plural(x.pkg.videos, "video")}.`}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <span className="y-label">Videos</span>
            <span className="y-tile y-small flex min-h-13 items-center px-5 font-semibold">1 video</span>
            <span className="y-micro y-fg-3 px-1">{moreVideosHint(creator)}</span>
          </div>
        )}
        <SelectField
          label="Length"
          optionalLabel={false}
          value={String(d.durationSec)}
          onChange={(event) => set({ durationSec: Number(event.target.value) })}
          options={lengths.map((sec) => ({ value: String(sec), label: `Up to ${lengthLabel(sec)}` }))}
          hint={`Typical ${formatById[d.format].name.toLowerCase()}: ${formatById[d.format].typical[0]}–${formatById[d.format].typical[1]}s.`}
        />
      </div>

      <TextArea
        label="Who it's for"
        required
        rows={3}
        name="audience"
        data-field="audience"
        value={d.audience}
        onChange={(event) => set({ audience: event.target.value })}
        onBlur={() => touch("audience")}
        error={errorFor("audience")}
        hint="Filled from your product. Be specific: age, job, what they use today."
      />
      <TextArea
        label="Goal"
        required
        rows={2}
        name="goal"
        data-field="goal"
        placeholder="e.g. Shop owners see an invoice go out on WhatsApp and download Daftar"
        value={d.goal}
        onChange={(event) => set({ goal: event.target.value })}
        onBlur={() => touch("goal")}
        error={errorFor("goal")}
        hint="What should viewers do or feel after watching?"
      />
      <TextField
        label="Key message"
        required
        name="keyMessage"
        data-field="keyMessage"
        value={d.keyMessage}
        onChange={(event) => set({ keyMessage: event.target.value })}
        onBlur={() => touch("keyMessage")}
        error={errorFor("keyMessage")}
        hint="The one line they should remember."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <ListField
          label="Must include"
          items={d.mustInclude}
          onChange={(mustInclude) => set({ mustInclude })}
          placeholder="e.g. The WhatsApp send moment"
          noun="must-include"
          icon={<Check size={16} strokeWidth={2.5} />}
          hint={x.learnings.length ? `Plus ${plural(x.learnings.length, "carried-forward learning")}.` : undefined}
        />
        <ListField
          label="Please avoid"
          items={d.avoid}
          onChange={(avoid) => set({ avoid })}
          placeholder="e.g. Sped-up screen recordings"
          noun="thing to avoid"
          icon={<Minus size={16} strokeWidth={2.5} />}
        />
      </div>

      <ListField
        label="References"
        items={d.references.map((r) => r.label)}
        onChange={(labels) =>
          set({
            references: labels.map(
              (label) =>
                d.references.find((r) => r.label === label) ?? {
                  id: `rf-${Date.now().toString(36)}-${labels.length}`,
                  label,
                },
            ),
          })
        }
        placeholder="Paste a link or describe a video you like"
        noun="reference"
        max={5}
        icon={<Link2 size={16} />}
        hint="A video whose tone or pacing you'd like to match."
      />

      <label className="flex min-h-11 cursor-pointer items-center gap-4">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="y-small font-semibold">{creator.firstName} appears on camera</span>
          <span className="y-micro y-fg-2">Turn off for voiceover-only videos.</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="y-switch flex-none"
          checked={d.onCamera}
          onChange={(event) => set({ onCamera: event.target.checked })}
        />
      </label>

      <TextArea
        label="Notes"
        rows={3}
        value={d.notes}
        onChange={(event) => set({ notes: event.target.value })}
        hint="Tone, setting, props, anything else. Your product's tone is filled in for you."
      />

      <Block tone="lavender" pad="sm" className="flex flex-col gap-3 !rounded-(--y-r-tile) !p-4" aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <span className="y-small inline-flex items-center gap-2 font-semibold">
            <Lightbulb size={18} aria-hidden /> Brief strength: {strength.label}
          </span>
          <span className="y-micro y-num y-fg-2">
            {strength.score} of {strength.total}
          </span>
        </div>
        <span className="flex gap-1" aria-hidden>
          {Array.from({ length: strength.total }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < strength.score ? "bg-(--b-fg)" : "bg-(--b-line)"}`}
            />
          ))}
        </span>
        {strength.tips.length ? (
          <ul className="flex flex-col gap-1">
            {strength.tips.map((tip) => (
              <li key={tip} className="y-micro y-fg-2">
                {tip}
              </li>
            ))}
          </ul>
        ) : (
          <p className="y-micro y-fg-2">
            Clear briefs like this one get accepted faster and need fewer revisions.
          </p>
        )}
      </Block>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 4 Add-ons                                                                   */
/* -------------------------------------------------------------------------- */

export function AddonsEditor({ creator, d, x, set }: EditorProps) {
  if (!creator.addons.length)
    return <p className="y-small y-fg-2">{creator.firstName} doesn&apos;t offer add-ons yet.</p>;
  return (
    <>
      <ul className="flex flex-col gap-2">
        {creator.addons.map((addon) => {
          const info = addonById[addon.id];
          const Icon = info.icon;
          const on = d.addons.includes(addon.id);
          const days = extraDaysLabel(addon.extraDays);
          return (
            <li key={addon.id}>
              <label
                className={`y-tile flex min-h-16 cursor-pointer items-center gap-3 px-4 py-3 ${on ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
              >
                <Icon size={20} aria-hidden className="flex-none" />
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
                  className="y-switch flex-none"
                  checked={on}
                  onChange={() => set({ addons: toggle(d.addons, addon.id) })}
                />
              </label>
            </li>
          );
        })}
      </ul>
      <p className="y-small y-fg-2">
        Revisions included: <span className="font-semibold text-(--b-fg)">{x.revisions}</span>
        {d.addons.includes("extra-revision") ? ` (${x.pkg.revisions} in the package + 1 extra)` : ` with ${tierName[x.pkg.tier]}`}.
        Organic use on your own accounts is always included.
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 5 Timing                                                                    */
/* -------------------------------------------------------------------------- */

export function TimingEditor({ creator, d, x, set }: EditorProps) {
  return (
    <>
      <div role="radiogroup" aria-label="Due date" className="flex flex-wrap gap-2">
        {SLACK_OPTIONS.map((option, index) => {
          const due = dueOption(x.earliest, option.value);
          const on = d.slack === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              className="y-filter !h-auto !min-h-14 flex-col !items-start !gap-0 !py-2"
              onClick={() => set({ slack: option.value })}
              onKeyDown={(event) => {
                const step =
                  event.key === "ArrowRight" || event.key === "ArrowDown"
                    ? 1
                    : event.key === "ArrowLeft" || event.key === "ArrowUp"
                      ? -1
                      : 0;
                if (!step) return;
                event.preventDefault();
                const nextIndex = (index + step + SLACK_OPTIONS.length) % SLACK_OPTIONS.length;
                set({ slack: SLACK_OPTIONS[nextIndex].value });
                const group = event.currentTarget.parentElement;
                group?.querySelectorAll<HTMLButtonElement>("[role=radio]")[nextIndex]?.focus();
              }}
            >
              <span>{due.date}</span>
              <span className="y-micro font-medium opacity-75">
                {option.label} · {plural(due.days, "day")}
              </span>
            </button>
          );
        })}
      </div>
      <p className="y-small y-fg-2 max-w-[62ch]">
        Due by 18:00 Riyadh time. {tierName[x.pkg.tier]} takes {plural(x.pkg.deliveryDays, "day")}
        {x.addonDays < 0 ? `, ${-x.addonDays} faster with rush delivery` : ""}
        {x.startOffset ? `, starting when ${creator.firstName} is free in ${plural(x.startOffset, "day")}` : ""}.
        A little slack usually means a calmer first version.
      </p>
      {!d.addons.includes("rush") && creator.addons.some((a) => a.id === "rush") ? (
        <p className="y-micro y-fg-3">Need it sooner? Add rush delivery in the add-ons.</p>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 6 Message                                                                   */
/* -------------------------------------------------------------------------- */

export function MessageEditor({ creator, d, x, set }: EditorProps) {
  return (
    <div className="flex flex-col gap-2">
      <TextArea
        label={`Message to ${creator.firstName}`}
        rows={4}
        value={x.message}
        onChange={(event) => set({ message: event.target.value })}
        hint="Sent with the offer and kept in your conversation."
      />
      {d.message !== null ? (
        <PillButton variant="ghost" size="sm" className="w-fit" onClick={() => set({ message: null })}>
          Use the suggested message
        </PillButton>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 7 Payment                                                                   */
/* -------------------------------------------------------------------------- */

export function PaymentEditor({ d, set, errorFor }: EditorProps) {
  return (
    <div className="flex flex-col gap-3" data-field="payment" tabIndex={-1}>
      <PaymentMethodPicker value={d.paymentMethodId} onChange={(paymentMethodId) => set({ paymentMethodId })} />
      <InlineError message={errorFor("payment")} />
    </div>
  );
}
