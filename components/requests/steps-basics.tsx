"use client";

import { Check, History, Mic, Package, Plus, Video as VideoIcon } from "lucide-react";
import Link from "next/link";

import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { AvatarStack } from "@/components/ui/face-avatar";
import { Ar } from "@/components/ui/page";
import { lengthLabel, plural, timeAgo } from "@/lib/format";
import { aspects, creatorKinds, formats, languages, platforms } from "@/lib/taxonomy";
import type { Aspect, FormatId } from "@/lib/types";

import { applyProduct, exampleVideo, lengthOptions, typicalLength } from "./shared";
import type { StepProps } from "./step-props";
import { ChoiceTile, GroupError, Question, Stepper } from "./wizard-parts";

const surfaceLabel = { ios: "iOS", android: "Android", web: "Web" } as const;

/* -------------------------------------------------------------------------- */
/* 1 · Product                                                                 */
/* -------------------------------------------------------------------------- */

export function ProductStep({ form, set, product, products, error }: StepProps) {
  const err = error("product");
  return (
    <>
      <Question
        id="q-product"
        title="Which product is this for?"
        hint="Creators get your saved product context with the brief: audience, tone, dos and don'ts, screens and demo login. You won't have to repeat it."
      >
        <div
          role="radiogroup"
          aria-labelledby="q-product"
          aria-describedby={err ? "q-product-error" : undefined}
          data-invalid={err ? "true" : undefined}
          tabIndex={-1}
          className="grid gap-2 sm:grid-cols-2"
        >
          {products.map((p) => (
            <ChoiceTile
              key={p.id}
              name="product"
              label={`${p.name}. ${p.oneLiner}${p.learnings.length ? ` ${plural(p.learnings.length, "learning")} carried forward.` : ""}`}
              checked={form.productId === p.id}
              onChange={() =>
                set((f) => applyProduct(f, p, products.find((x) => x.id === f.productId)))
              }
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="y-display grid size-11 flex-none place-items-center rounded-[14px] text-lg font-semibold text-white"
                  style={{ background: p.brandColor }}
                >
                  {p.name.slice(0, 1)}
                </span>
                <span className="min-w-0">
                  <span className="y-head block">{p.name}</span>
                  <span className="y-micro y-fg-2 block">
                    {p.surfaces.map((x) => surfaceLabel[x]).join(" · ")} · Updated {timeAgo(p.updatedAt)}
                  </span>
                </span>
              </span>
              <span className="y-small y-fg-2 mt-1">{p.oneLiner}</span>
              {p.learnings.length ? (
                <span className="mt-2">
                  <span className="y-badge" data-tone-badge="ink">
                    <History size={14} aria-hidden />
                    {plural(p.learnings.length, "learning")} carried forward
                  </span>
                </span>
              ) : null}
            </ChoiceTile>
          ))}
        </div>
        <GroupError id="q-product-error" message={err} />
        <Link
          href="/business/products/new?return=/business/requests/new"
          className="y-dropzone flex items-center gap-3 p-4 font-semibold"
        >
          <span className="y-round" data-tone-btn="contrast" data-size="sm" aria-hidden>
            <Plus size={20} />
          </span>
          <span>
            <span className="block">{products.length ? "Add another product" : "Add your first product"}</span>
            <span className="y-micro y-fg-2 block font-medium">
              Takes two minutes. Reused in every request after that.
            </span>
          </span>
        </Link>
      </Question>

      {product ? (
        <Block as="section" aria-labelledby="q-context" tone="paper" pad="md" className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="q-context" className="y-head">
                What creators will know about {product.name}
              </h2>
              <p className="y-small y-fg-2">Sent with every request for this product.</p>
            </div>
            <Link href={`/business/products/${product.id}`} className="y-pill flex-none" data-variant="ghost" data-size="sm">
              Edit product
            </Link>
          </div>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div className="y-tile flex flex-col gap-1 p-4 sm:col-span-2">
              <dt className="y-micro y-fg-2">The problem it solves</dt>
              <dd className="y-small">{product.problem}</dd>
            </div>
            <div className="y-tile flex flex-col gap-1.5 p-4">
              <dt className="y-micro y-fg-2">Tone</dt>
              <dd className="flex flex-wrap gap-1.5">
                {product.tone.map((t) => (
                  <span key={t} className="y-chip !bg-(--b-bg)">
                    {t}
                  </span>
                ))}
              </dd>
            </div>
            <div className="y-tile flex flex-col gap-1 p-4">
              <dt className="y-micro y-fg-2">Files and access</dt>
              <dd className="y-small flex items-center gap-1.5 font-semibold">
                <Package size={16} aria-hidden />
                {product.assets.length
                  ? plural(product.assets.length, "file")
                  : "No files yet"}
                {product.assets.some((a) => a.kind === "demo-account") ? " · demo login" : ""}
              </dd>
            </div>
          </dl>
        </Block>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 2 · Format                                                                  */
/* -------------------------------------------------------------------------- */

export function FormatStep({ s, form, set, error, onHoverFormat }: StepProps) {
  const err = error("format");
  const choose = (id: FormatId) => {
    const [, hi] = formats.find((f) => f.id === id)!.typical;
    set((f) => {
      if (f.format === id) return { format: id };
      // Hook packs count hooks (usually five); switching back resets that count.
      const videoCount =
        id === "hook-pack" && f.videoCount === 1
          ? 5
          : f.format === "hook-pack" && f.videoCount === 5
            ? 1
            : f.videoCount;
      return { format: id, durationSec: hi, onCamera: id !== "screen-walkthrough", videoCount };
    });
  };
  return (
    <Question
      id="q-format"
      title="What kind of video?"
      hint="Pick the closest format. Creators plan, price and film around it, so you get what you pictured."
    >
      <div
        role="radiogroup"
        aria-labelledby="q-format"
        aria-describedby={err ? "q-format-error" : undefined}
        data-invalid={err ? "true" : undefined}
        tabIndex={-1}
        className="grid gap-2 md:grid-cols-2"
      >
        {formats.map((format) => {
          const Icon = format.icon;
          const checked = form.format === format.id;
          const offering = s.creators.filter(
            (c) => c.formats.includes(format.id) && form.languages.some((l) => c.languages.includes(l)),
          ).length;
          const example = checked ? exampleVideo(s, format.id, form.languages) : undefined;
          return (
            <ChoiceTile
              key={format.id}
              name="format"
              checked={checked}
              onChange={() => choose(format.id)}
              onHover={(on) => onHoverFormat(on ? format.id : null)}
              label={format.name}
            >
              <span className="flex items-center gap-3">
                <span className="y-round flex-none" data-tone-btn={checked ? "contrast" : "soft"} data-size="sm" aria-hidden>
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="y-head block">{format.name}</span>
                  <span className="y-micro y-fg-2 block">
                    Usually {typicalLength(format.id)}
                    {form.languages.length
                      ? ` · ${plural(offering, "creator")} ${offering === 1 ? "offers" : "offer"} this`
                      : ""}
                  </span>
                </span>
              </span>
              <span className="y-small y-fg-2 mt-1">{format.description}</span>
              <span className="mt-2 flex flex-wrap gap-1" aria-label={`Typical structure: ${format.beats.join(", ")}`}>
                {format.beats.map((beat, index) => (
                  <span key={beat} className="y-chip !min-h-7 !bg-(--b-bg) !px-2.5 !text-xs" aria-hidden>
                    <span className="y-num font-semibold">{index + 1}</span> {beat}
                  </span>
                ))}
              </span>
              {example ? (
                <span className="mt-3 flex items-center gap-3 lg:hidden">
                  <span className="w-20 flex-none">
                    <VideoThumb video={example} showMeta={false} showHook={false} decorative />
                  </span>
                  <span className="y-micro y-fg-2">
                    Example from the marketplace:
                    <span className="block font-semibold text-(--b-fg)">{example.title}</span>
                  </span>
                </span>
              ) : null}
            </ChoiceTile>
          );
        })}
      </div>
      <GroupError id="q-format-error" message={err} />
    </Question>
  );
}

/* -------------------------------------------------------------------------- */
/* 3 · Deliverables                                                            */
/* -------------------------------------------------------------------------- */

function AspectShape({ aspect }: { aspect: Aspect }) {
  const size: Record<Aspect, string> = {
    "9:16": "h-12 w-[27px]",
    "4:5": "h-12 w-[38px]",
    "1:1": "h-11 w-11",
    "16:9": "h-[27px] w-12",
  };
  return (
    <span className="grid size-12 flex-none place-items-center" aria-hidden>
      <span className={`rounded-[6px] border-2 border-current ${size[aspect]}`} />
    </span>
  );
}

export function DeliverablesStep({ form, set, error, touch }: StepProps) {
  const options = lengthOptions(form.format);
  const platformErr = error("platforms");
  return (
    <>
      <Question
        id="q-count"
        title={form.format === "hook-pack" ? "How many hooks?" : "How many videos?"}
        hint={
          form.format === "hook-pack"
            ? "Short alternative openings for one ad body. Most packs have 3–5, priced as one pack."
            : "Each video is its own deliverable, reviewed and approved on its own."
        }
      >
        <Stepper
          label={form.format === "hook-pack" ? "Hooks" : "Videos"}
          value={form.videoCount}
          min={1}
          max={10}
          onChange={(videoCount) => set({ videoCount })}
          unit={(n) =>
            form.format === "hook-pack" ? (n === 1 ? "hook" : "hooks") : n === 1 ? "video" : "videos"
          }
        />
      </Question>

      <Question
        id="q-length"
        title="How long can each one be?"
        hint={
          form.format
            ? `Most ${formats.find((f) => f.id === form.format)!.name.toLowerCase()}s run ${typicalLength(form.format)}. Shorter keeps people watching.`
            : undefined
        }
      >
        <div role="group" aria-labelledby="q-length" className="flex flex-wrap gap-2">
          {options.map((option) => (
            <FilterChip
              key={option.value}
              pressed={form.durationSec === option.value}
              onClick={() => set({ durationSec: option.value })}
              icon={form.durationSec === option.value ? <Check size={16} aria-hidden /> : null}
            >
              Up to {lengthLabel(option.value)}
              {option.longer ? <span className="y-fg-3 font-medium"> · longer than usual</span> : null}
            </FilterChip>
          ))}
        </div>
      </Question>

      <Question id="q-aspect" title="Which shape?" hint="You can ask for other cuts as an extra later.">
        <div role="radiogroup" aria-labelledby="q-aspect" className="grid gap-2 sm:grid-cols-2">
          {aspects.map((a) => (
            <ChoiceTile
              key={a.id}
              name="aspect"
              checked={form.aspect === a.id}
              onChange={() => set({ aspect: a.id })}
            >
              <span className="flex items-center gap-3">
                <AspectShape aspect={a.id} />
                <span>
                  <span className="y-small block font-semibold">{a.name}</span>
                  <span className="y-micro y-fg-2 block">{a.use}</span>
                </span>
              </span>
            </ChoiceTile>
          ))}
        </div>
      </Question>

      <Question id="q-platforms" title="Where will you post it?" hint="Creators frame captions, safe zones and pacing for these.">
        <div
          role="group"
          aria-labelledby="q-platforms"
          aria-describedby={platformErr ? "q-platforms-error" : undefined}
          data-invalid={platformErr ? "true" : undefined}
          tabIndex={-1}
          className="flex flex-wrap gap-2"
        >
          {platforms.map((p) => {
            const on = form.platforms.includes(p.id);
            return (
              <FilterChip
                key={p.id}
                pressed={on}
                icon={on ? <Check size={16} aria-hidden /> : null}
                onClick={() => {
                  touch("platforms");
                  set((f) => ({
                    platforms: on ? f.platforms.filter((x) => x !== p.id) : [...f.platforms, p.id],
                  }));
                }}
              >
                {p.name}
              </FilterChip>
            );
          })}
        </div>
        <GroupError id="q-platforms-error" message={platformErr} />
      </Question>

      <Question id="q-camera" title="On camera, or voice only?">
        <div role="radiogroup" aria-labelledby="q-camera" className="grid gap-2 sm:grid-cols-2">
          <ChoiceTile name="camera" checked={form.onCamera} onChange={() => set({ onCamera: true })}>
            <span className="flex items-center gap-2 font-semibold">
              <VideoIcon size={18} aria-hidden /> Creator on camera
            </span>
            <span className="y-small y-fg-2">A real face builds trust. Best for selfie demos, reviews and skits.</span>
          </ChoiceTile>
          <ChoiceTile name="camera" checked={!form.onCamera} onChange={() => set({ onCamera: false })}>
            <span className="flex items-center gap-2 font-semibold">
              <Mic size={18} aria-hidden /> Voiceover only
            </span>
            <span className="y-small y-fg-2">
              Your screen and a natural voice. Opens it up to faceless creators too.
            </span>
          </ChoiceTile>
        </div>
      </Question>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 4 · Language and creators                                                   */
/* -------------------------------------------------------------------------- */

export function LanguageStep({ s, form, set, error, touch, market }: StepProps) {
  const err = error("languages");
  return (
    <>
      <Question
        id="q-lang"
        title="Which language or dialect?"
        hint="Pick the way your audience actually talks. Add every dialect you'd be happy with; creators who speak all of them rank highest. Numbers show how many creators speak each one and make this format."
      >
        <div
          role="group"
          aria-labelledby="q-lang"
          aria-describedby={err ? "q-lang-error" : undefined}
          data-invalid={err ? "true" : undefined}
          tabIndex={-1}
          className="flex flex-wrap gap-2"
        >
          {languages.map((lang) => {
            const on = form.languages.includes(lang.id);
            const count = s.creators.filter(
              (c) => c.languages.includes(lang.id) && (!form.format || c.formats.includes(form.format)),
            ).length;
            return (
              <FilterChip
                key={lang.id}
                pressed={on}
                count={count}
                icon={on ? <Check size={16} aria-hidden /> : null}
                onClick={() => {
                  touch("languages");
                  set((f) => ({
                    languages: on ? f.languages.filter((x) => x !== lang.id) : [...f.languages, lang.id],
                  }));
                }}
              >
                {lang.short}
                {lang.id !== "en" ? <Ar className="y-fg-3 font-medium">{lang.native}</Ar> : null}
              </FilterChip>
            );
          })}
        </div>
        <GroupError id="q-lang-error" message={err} />
        <div
          data-tone="lavender"
          className="y-block flex flex-wrap items-center gap-3 !rounded-(--y-r-tile) p-4"
          aria-live="polite"
        >
          {market.count ? (
            <AvatarStack
              size={32}
              max={5}
              people={market.pool.map((q) => ({ id: q.creator.id, name: q.creator.name }))}
            />
          ) : null}
          <p className="y-small flex-1 font-semibold">
            {market.count
              ? `${plural(market.count, "creator")} ${market.count === 1 ? "matches" : "match"} so far`
              : "No creators match this combination yet. Try another dialect."}
            <span className="y-micro y-fg-2 block font-medium">
              They speak your pick{form.languages.length > 1 ? "s" : ""} and make{" "}
              {form.format ? formats.find((f) => f.id === form.format)!.name.toLowerCase() + "s" : "this format"}.
            </span>
          </p>
        </div>
      </Question>

      <Question
        id="q-kind"
        title="Any preference on who makes it?"
        optional
        hint="Leave it empty to hear from everyone who fits. It only nudges the ranking, it doesn't exclude anyone."
      >
        <div role="group" aria-labelledby="q-kind" className="grid gap-2 md:grid-cols-3">
          {creatorKinds.map((kind) => {
            const Icon = kind.icon;
            const on = form.preferredKinds.includes(kind.id);
            return (
              <ChoiceTile
                key={kind.id}
                type="checkbox"
                checked={on}
                onChange={() =>
                  set((f) => ({
                    preferredKinds: on
                      ? f.preferredKinds.filter((k) => k !== kind.id)
                      : [...f.preferredKinds, kind.id],
                  }))
                }
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Icon size={18} aria-hidden /> {kind.name}
                </span>
                <span className="y-small y-fg-2">{kind.description}</span>
                <span className="y-micro y-fg-3">
                  {plural(market.pool.filter((q) => q.creator.kind === kind.id).length, "match", "matches")}
                </span>
              </ChoiceTile>
            );
          })}
        </div>
      </Question>
    </>
  );
}
