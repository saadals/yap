"use client";

import { AtSign, Ban, Check, Clock, History, Minus, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { PaymentMethodPicker } from "@/components/domain/money";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { TextArea, TextField } from "@/components/ui/field";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { money, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  CAMPAIGN_DEADLINE_DAYS,
  CAMPAIGN_MAX_VIDEOS,
  CAMPAIGN_MIN_VIDEOS,
  CAMPAIGN_STEP,
  campaignPlatformById,
  campaignPlatforms,
  followerTiers,
  languages,
  tierById,
} from "@/lib/taxonomy";
import type { Product } from "@/lib/types";

import { ExplainerField } from "./explainer";
import { ChoiceTile, GroupError, ListEditor, Question } from "./parts";
import { applyProduct, type CampaignForm, type FieldKey, totalFor } from "./shared";

export type FormPatch = Partial<CampaignForm> | ((form: CampaignForm) => Partial<CampaignForm>);

export type StepProps = {
  form: CampaignForm;
  set: (patch: FormPatch) => void;
  products: Product[];
  product?: Product;
  error: (field: FieldKey) => string | undefined;
};

const surfaceLabel = { ios: "iOS", android: "Android", web: "Web" } as const;

function ProductMark({ product }: { product: Pick<Product, "name" | "brandColor"> }) {
  return (
    <span
      aria-hidden
      className="y-display grid size-11 flex-none place-items-center rounded-[14px] text-lg font-semibold text-white"
      style={{ background: product.brandColor }}
    >
      {product.name.slice(0, 1)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 1 · Product                                                                 */
/* -------------------------------------------------------------------------- */

export function ProductStep({ form, set, products, error }: StepProps) {
  const err = error("product");
  if (!products.length) {
    return (
      <Question
        id="q-product"
        title="What are creators talking about?"
        hint="A name and one line is enough to start. We'll save it as a product so you can reuse it."
      >
        <TextField
          label="Product or service name"
          required
          placeholder="e.g. Daftar Invoices"
          value={form.quickName}
          error={error("quickName")}
          onChange={(event) => set({ quickName: event.target.value })}
        />
        <TextField
          label="One line about it"
          required
          placeholder="e.g. Send an invoice on WhatsApp in 10 seconds"
          value={form.quickLine}
          error={error("quickLine")}
          onChange={(event) => set({ quickLine: event.target.value })}
        />
        <Link href={paths.newProduct} className="y-small y-fg-2 w-fit px-1 font-medium underline underline-offset-4">
          Or add a full product with audience, tone and files
        </Link>
      </Question>
    );
  }
  return (
    <Question
      id="q-product"
      title="Which product is this for?"
      hint="Creators get its context with the brief, so you won't have to repeat it."
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
            name="campaign-product"
            label={`${p.name}. ${p.oneLiner}`}
            checked={form.productId === p.id}
            onChange={() => set((f) => applyProduct(f, p, products.find((x) => x.id === f.productId)))}
          >
            <span className="flex items-center gap-3">
              <ProductMark product={p} />
              <span className="min-w-0">
                <span className="y-head block">{p.name}</span>
                <span className="y-micro y-fg-2 block">
                  {p.surfaces.length ? p.surfaces.map((x) => surfaceLabel[x]).join(" · ") : "Product"}
                </span>
              </span>
            </span>
            <span className="y-small y-fg-2 mt-1">{p.oneLiner}</span>
            {p.learnings.length ? (
              <span className="y-micro y-fg-2 mt-1 inline-flex items-center gap-1.5">
                <History size={14} aria-hidden />
                {plural(p.learnings.length, "learning")} carried forward
              </span>
            ) : null}
          </ChoiceTile>
        ))}
      </div>
      <GroupError id="q-product-error" message={err} />
      <Link href={paths.newProduct} className="y-dropzone flex items-center gap-3 p-4 font-semibold">
        <span className="y-round" data-tone-btn="contrast" data-size="sm" aria-hidden>
          <Plus size={20} />
        </span>
        Add another product
      </Link>
    </Question>
  );
}

/* -------------------------------------------------------------------------- */
/* 2 · What to say                                                             */
/* -------------------------------------------------------------------------- */

export function SayStep({ form, set, product, error }: StepProps) {
  const platform = campaignPlatformById[form.platform];
  const pointsErr = error("mustInclude");
  const footage = product?.assets.filter((a) => a.kind === "footage") ?? [];
  const productName = product?.name ?? (form.quickName.trim() || "product");
  const sampleName = `${productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product"}-explainer.mp4`;
  return (
    <>
      <Question id="q-basics" title="What's the campaign?">
        <TextField
          label="Title"
          required
          placeholder="e.g. Show us your first invoice on WhatsApp"
          value={form.title}
          error={error("title")}
          maxLength={80}
          onChange={(event) => set({ title: event.target.value })}
        />
        <TextArea
          label="What it is and the key message"
          required
          rows={3}
          placeholder="e.g. Daftar sends invoices on WhatsApp in 10 seconds and chases payment for you."
          value={form.keyMessage}
          error={error("keyMessage")}
          onChange={(event) => set({ keyMessage: event.target.value })}
        />
        <div className="flex flex-col gap-2">
          <p className="y-label">
            <span>Languages</span>
            <span className="y-micro y-fg-3 font-medium">Optional</span>
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Languages">
            {languages.map((language) => {
              const on = form.languages.includes(language.id);
              return (
                <FilterChip
                  key={language.id}
                  pressed={on}
                  onClick={() =>
                    set((f) => ({
                      languages: on ? f.languages.filter((id) => id !== language.id) : [...f.languages, language.id],
                    }))
                  }
                >
                  {language.short}
                </FilterChip>
              );
            })}
          </div>
          <p className="y-micro y-fg-3 px-1">Skip this and creators speak Saudi or Khaleeji Arabic.</p>
        </div>
      </Question>

      <Question
        id="q-explainer"
        title="Explainer video"
        optional
        hint="Creators watch it before filming. It's the fastest way to get the details right."
      >
        <ExplainerField
          value={form.explainer}
          onChange={(explainer) => set({ explainer })}
          footage={footage}
          sampleName={sampleName}
        />
      </Question>

      <Question
        id="q-tag"
        title="The account to tag"
        hint={`Creators post on their own ${platform.name} and tag this account. It's the only handle that gets through our contact filter.`}
      >
        <SegmentedToggle
          label="Platform"
          size="md"
          className="w-fit"
          value={form.platform}
          onChange={(platformId) => set({ platform: platformId })}
          options={campaignPlatforms.map((p) => ({ value: p.id, label: p.name }))}
        />
        <TextField
          label={`Your ${platform.name} account`}
          required
          placeholder="@yourbrand"
          autoComplete="off"
          spellCheck={false}
          value={form.brandHandle}
          error={error("brandHandle")}
          onChange={(event) => set({ brandHandle: event.target.value })}
          onBlur={() => set((f) => ({ brandHandle: f.brandHandle.trim() && !f.brandHandle.trim().startsWith("@") ? `@${f.brandHandle.trim()}` : f.brandHandle.trim() }))}
        />
      </Question>

      <Question
        id="q-points"
        title="Talking points"
        hint={product ? `Filled in from ${product.name}. Edit freely.` : "What every video must get across."}
      >
        <ListEditor
          label="Talking points"
          items={form.mustInclude}
          onChange={(mustInclude) => set({ mustInclude })}
          placeholder="e.g. Show the invoice landing in WhatsApp"
          marker={<Check size={16} strokeWidth={2.75} />}
          invalid={Boolean(pointsErr)}
          describedBy={pointsErr ? "q-points-error" : undefined}
        />
        <GroupError id="q-points-error" message={pointsErr} />
        <div className="flex flex-col gap-3 border-t border-(--b-line) pt-4">
          <h3 className="y-head">
            Restrictions <span className="y-small y-fg-3 ms-1 font-medium">Optional</span>
          </h3>
          <ListEditor
            label="Restrictions"
            items={form.avoid}
            onChange={(avoid) => set({ avoid })}
            placeholder="e.g. Don't mention other apps"
            marker={<Ban size={16} strokeWidth={2.5} />}
          />
        </div>
      </Question>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 3 · Videos                                                                  */
/* -------------------------------------------------------------------------- */

export function VideosStep({ form, set, error }: StepProps) {
  const tier = tierById[form.tierId];
  const change = (delta: number) =>
    set((f) => ({ videos: Math.max(CAMPAIGN_MIN_VIDEOS, Math.min(CAMPAIGN_MAX_VIDEOS, f.videos + delta)) }));
  return (
    <Question id="q-videos" title="How many videos?" hint="Each video comes from a different creator.">
      <div className="flex flex-wrap items-center gap-4" role="group" aria-label="Number of videos">
        <RoundIconButton
          label={`${CAMPAIGN_STEP} fewer videos`}
          size="lg"
          disabled={form.videos <= CAMPAIGN_MIN_VIDEOS}
          onClick={() => change(-CAMPAIGN_STEP)}
          className="disabled:opacity-40"
        >
          <Minus size={22} aria-hidden />
        </RoundIconButton>
        <output
          aria-live="polite"
          className="y-display y-num w-24 text-center text-[56px] leading-none font-semibold tracking-[-0.04em]"
        >
          {form.videos}
        </output>
        <RoundIconButton
          label={`${CAMPAIGN_STEP} more videos`}
          size="lg"
          disabled={form.videos >= CAMPAIGN_MAX_VIDEOS}
          onClick={() => change(CAMPAIGN_STEP)}
          className="disabled:opacity-40"
        >
          <Plus size={22} aria-hidden />
        </RoundIconButton>
        <span className="y-small y-fg-2">videos · {plural(form.videos, "creator")}</span>
      </div>
      <GroupError message={error("videos")} />
      <p className="y-micro y-fg-3 px-1">
        At least {CAMPAIGN_MIN_VIDEOS}, in steps of {CAMPAIGN_STEP}. At {tier.label} followers that&apos;s{" "}
        {money(totalFor(form))}.
      </p>
    </Question>
  );
}

/* -------------------------------------------------------------------------- */
/* 4 · Follower tier                                                           */
/* -------------------------------------------------------------------------- */

export function TierStep({ form, set, error }: StepProps) {
  const platform = campaignPlatformById[form.platform];
  const err = error("tierId");
  return (
    <Question
      id="q-tier"
      title="Which follower tier?"
      hint={`Creators qualify by their verified real followers on ${platform.name}. The tier sets the price per video.`}
    >
      <div
        role="radiogroup"
        aria-labelledby="q-tier"
        data-invalid={err ? "true" : undefined}
        tabIndex={-1}
        className="grid gap-2 sm:grid-cols-2"
      >
        {followerTiers.map((tier) => (
          <ChoiceTile
            key={tier.id}
            name="campaign-tier"
            label={`${tier.label} verified real followers, ${money(tier.pricePerVideo)} per video${tier.placeholder ? ", price to be confirmed" : ""}`}
            checked={form.tierId === tier.id}
            onChange={() => set({ tierId: tier.id })}
          >
            <span className="y-head">{tier.label}</span>
            <span className="y-micro y-fg-2 inline-flex items-center gap-1.5">
              <ShieldCheck size={14} aria-hidden />
              verified real followers
            </span>
            <span className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="y-display y-num text-[28px] leading-none font-semibold tracking-[-0.02em]">
                {money(tier.pricePerVideo)}
              </span>
              <span className="y-small y-fg-2">per video</span>
            </span>
            {tier.placeholder ? <span className="y-chip mt-2 w-fit !bg-(--b-bg)">Price to be confirmed</span> : null}
          </ChoiceTile>
        ))}
      </div>
      <GroupError message={err} />
    </Question>
  );
}

/* -------------------------------------------------------------------------- */
/* 5 · Review and pay                                                          */
/* -------------------------------------------------------------------------- */

export function PayStep({ form, set, product, error }: StepProps) {
  const tier = tierById[form.tierId];
  const total = totalFor(form);
  const platform = campaignPlatformById[form.platform];
  const handle = form.brandHandle.trim().startsWith("@") ? form.brandHandle.trim() : `@${form.brandHandle.trim()}`;
  return (
    <>
      <Block as="section" aria-labelledby="q-total" tone="butter" pad="md" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="q-total" className="y-micro y-fg-2">
            Total budget
          </h2>
          <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">{money(total)}</p>
          <p className="y-small y-num">
            {form.videos} × {money(tier.pricePerVideo)} = {money(total)}
          </p>
          <p className="y-small y-fg-2">No service fee on campaigns</p>
        </div>
        <dl className="flex flex-col border-t border-(--b-line)">
          <Row label="Product">{product?.name ?? form.quickName.trim()}</Row>
          <Row label="Campaign">{form.title.trim()}</Row>
          <Row label="Post on">
            {platform.name} · tag {handle}
          </Row>
          <Row label="Creators">
            {tier.label} verified real followers{tier.placeholder ? " (price to be confirmed)" : ""}
          </Row>
          <Row label="Delivery deadline">
            <span className="y-fg-2 inline-flex items-center gap-1.5 font-normal">
              <Clock size={14} aria-hidden />
              {CAMPAIGN_DEADLINE_DAYS ? `${CAMPAIGN_DEADLINE_DAYS} days after taking a slot` : "Not set yet"}
            </span>
          </Row>
        </dl>
      </Block>
      <Block as="section" tone="paper" pad="md" className="flex flex-col gap-3">
        <div data-invalid={error("paymentMethodId") ? "true" : undefined} tabIndex={-1}>
          <PaymentMethodPicker value={form.paymentMethodId} onChange={(paymentMethodId) => set({ paymentMethodId })} />
        </div>
        <GroupError message={error("paymentMethodId")} />
      </Block>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-(--b-line) py-2.5 last:border-b-0">
      <dt className="y-small y-fg-2">{label}</dt>
      <dd className="y-small min-w-0 text-end font-semibold">{children}</dd>
    </div>
  );
}

/** Sky trust note: how the hold works. */
export function HoldNote() {
  return (
    <Block tone="sky" pad="md" className="flex items-start gap-3">
      <ShieldCheck size={20} aria-hidden className="mt-0.5 flex-none" />
      <div className="flex flex-col gap-1">
        <h2 className="y-head">How it works</h2>
        <p className="y-small">
          The full budget is held now. Creators are paid from it only when you approve their video. Unfilled slots
          are refunded if you close the campaign.
        </p>
      </div>
    </Block>
  );
}

/** Desktop aside: the campaign so far. */
export function CampaignPreview({ form, product }: { form: CampaignForm; product?: Product }) {
  const tier = tierById[form.tierId];
  const platform = campaignPlatformById[form.platform];
  const name = product?.name ?? form.quickName.trim();
  const handle = form.brandHandle.trim();
  return (
    <Block tone="paper" pad="md" className="flex flex-col gap-4">
      <p className="y-micro y-fg-2">Your campaign</p>
      <div className="flex items-start gap-3">
        {product ? <ProductMark product={product} /> : null}
        <div className="min-w-0">
          <p className="y-head">{form.title.trim() || "Untitled campaign"}</p>
          <p className="y-small y-fg-2">{name || "Pick a product"}</p>
        </div>
      </div>
      <p className="y-small inline-flex items-center gap-1.5">
        <AtSign size={16} aria-hidden className="flex-none" />
        {platform.name}
        {handle ? ` · ${handle.startsWith("@") ? handle : `@${handle}`}` : ""}
      </p>
      {form.mustInclude.length ? (
        <p className="y-small y-fg-2">{plural(form.mustInclude.length, "talking point")}</p>
      ) : null}
      <div className="flex items-baseline justify-between gap-3 border-t border-(--b-line) pt-3">
        <span className="y-small y-num">
          {form.videos} × {money(tier.pricePerVideo)}
        </span>
        <span className="y-display y-num text-[28px] leading-none font-semibold tracking-[-0.02em]">
          {money(totalFor(form))}
        </span>
      </div>
    </Block>
  );
}
