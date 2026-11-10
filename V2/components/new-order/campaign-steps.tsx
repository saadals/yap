"use client";

import { AtSign, Ban, Banknote, CalendarDays, Check, Clock, RotateCcw, ShieldCheck, Users } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { PaymentMethodPicker } from "@/components/domain/money";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { TextArea, TextField } from "@/components/ui/field";
import { KeyValues } from "@/components/ui/progress";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { money, moneyExact, plural, shortDate } from "@/lib/format";
import { me } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import {
  CAMPAIGN_DEADLINE_OPTIONS,
  CAMPAIGN_FEE_RATE,
  CAMPAIGN_KEEP_LIVE_DAYS,
  CAMPAIGN_MAX_VIDEOS,
  CAMPAIGN_MIN_VIDEOS,
  CAMPAIGN_OPEN_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  CAMPAIGN_STEP,
  campaignPlatformById,
  campaignPlatforms,
  followerTiers,
  languages,
  tierById,
} from "@/lib/taxonomy";
import type { Product } from "@/lib/types";

import {
  applyProduct,
  atHandle,
  budgetFor,
  closesAtIfNow,
  disclosureName,
  type CampaignForm,
  type FieldKey,
} from "./campaign-model";
import { ExplainerField } from "./explainer";
import { ChoiceTile, Disclosure, GroupError, ListEditor, Question, Stepper, SubLabel } from "./parts";
import { ProductPicker } from "./product-picker";

export type CampaignPatch = Partial<CampaignForm> | ((form: CampaignForm) => Partial<CampaignForm>);

export type CampaignStepProps = {
  s: DemoState;
  form: CampaignForm;
  set: (patch: CampaignPatch) => void;
  products: Product[];
  product?: Product;
  error: (field: FieldKey) => string | undefined;
};

const toggle = <T,>(items: T[], value: T) =>
  items.includes(value) ? items.filter((v) => v !== value) : [...items, value];

/* -------------------------------------------------------------------------- */
/* 1 · What to say                                                             */
/* -------------------------------------------------------------------------- */

export function SayStep({ form, set, products, product, error }: CampaignStepProps) {
  const pointsErr = error("mustInclude");
  const footage = product?.assets.filter((a) => a.kind === "footage") ?? [];
  const slug = (product?.name ?? "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
  const optional = [form.explainer ? "Explainer added" : "No explainer", form.languages.map((l) => languages.find((x) => x.id === l)?.name).join(", ") || "English"];
  return (
    <>
      <Question id="q-c-product" title="Product" hint="Creators get its name, one line and who it's for with the brief.">
        <ProductPicker
          products={products}
          value={form.productId}
          name="campaign-product"
          labelledBy="q-c-product"
          error={error("product")}
          onSelect={(next) => set((f) => applyProduct(f, next, products.find((p) => p.id === f.productId)))}
        />
      </Question>

      <Question id="q-c-say" title="What every video should get across">
        <TextField
          label="Campaign title"
          required
          placeholder="e.g. Show us your first invoice on WhatsApp"
          value={form.title}
          maxLength={80}
          error={error("title")}
          onChange={(event) => set({ title: event.target.value })}
        />
        <TextArea
          label="What it is and the key message"
          required
          rows={2}
          placeholder="e.g. Daftar sends invoices on WhatsApp in 10 seconds and chases payment for you."
          value={form.keyMessage}
          error={error("keyMessage")}
          onChange={(event) => set({ keyMessage: event.target.value })}
        />
        <div className="flex flex-col gap-2">
          <SubLabel id="q-c-points" hint={product ? `Started from ${product.name}. Edit freely.` : "What every video must say or show."}>
            Talking points
          </SubLabel>
          <ListEditor
            label="Talking points"
            items={form.mustInclude}
            onChange={(mustInclude) => set({ mustInclude })}
            placeholder="e.g. Show the invoice landing in WhatsApp"
            marker={<Check size={15} strokeWidth={2.75} />}
            invalid={Boolean(pointsErr)}
            describedBy={pointsErr ? "q-c-points-error" : undefined}
          />
          <GroupError id="q-c-points-error" message={pointsErr} />
        </div>
        <div className="flex flex-col gap-2">
          <SubLabel hint="Optional. Claims, words or visuals to stay away from.">Restrictions</SubLabel>
          <ListEditor
            label="Restrictions"
            items={form.avoid}
            onChange={(avoid) => set({ avoid })}
            placeholder="e.g. Don't mention other apps"
            marker={<Ban size={15} strokeWidth={2.5} />}
          />
        </div>
      </Question>

      <Disclosure title="Explainer video and language (optional)" summary={optional.join(" · ")}>
        <div className="flex flex-col gap-2">
          <SubLabel hint="Creators watch it before filming. It's the fastest way to get the details right.">Explainer video</SubLabel>
          <ExplainerField
            value={form.explainer}
            onChange={(explainer) => set({ explainer })}
            footage={footage}
            sampleName={`${slug}-explainer.mp4`}
          />
        </div>
        <div className="flex flex-col gap-2">
          <SubLabel id="q-c-lang" hint="Leave it on English unless your audience watches in another language.">
            Language
          </SubLabel>
          <div role="group" aria-labelledby="q-c-lang" className="flex flex-wrap gap-2">
            {languages.map((language) => (
              <FilterChip
                key={language.id}
                pressed={form.languages.includes(language.id)}
                onClick={() => set((f) => ({ languages: toggle(f.languages, language.id) }))}
              >
                {language.name}
              </FilterChip>
            ))}
          </div>
        </div>
      </Disclosure>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 2 · Creators and price                                                      */
/* -------------------------------------------------------------------------- */

/** Creators on Yapp whose verified followers on `platform` fall inside each tier. */
function qualifying(s: DemoState, platform: CampaignForm["platform"]) {
  const self = me.ids(s).creatorId;
  const counts: Record<string, number> = {};
  for (const tier of followerTiers) {
    counts[tier.id] = s.creators.filter((c) => {
      if (c.id === self) return false;
      const social = c.socials?.find((a) => a.platform === platform && a.verified);
      return social ? social.followers >= tier.min && social.followers < tier.max : false;
    }).length;
  }
  return counts;
}

export function CreatorsStep({ s, form, set, error }: CampaignStepProps) {
  const platform = campaignPlatformById[form.platform];
  const tierErr = error("tierId");
  const tier = tierById[form.tierId];
  const budget = budgetFor(form);
  const counts = qualifying(s, form.platform);
  return (
    <>
      <Question id="q-c-where" title="Where creators post" hint="Each creator posts the video on their own account and tags yours.">
        <SegmentedToggle
          label="Platform"
          size="md"
          className="w-fit max-w-full"
          value={form.platform}
          onChange={(platformId) => set({ platform: platformId })}
          options={campaignPlatforms.map((p) => ({ value: p.id, label: p.name }))}
        />
        <TextField
          label={`Your ${platform.name} account to tag`}
          required
          placeholder="@yourbrand"
          autoComplete="off"
          spellCheck={false}
          value={form.brandHandle}
          error={error("brandHandle")}
          hint="The only handle that gets through our contact filter."
          onChange={(event) => set({ brandHandle: event.target.value })}
          onBlur={() => set((f) => ({ brandHandle: atHandle(f.brandHandle) || f.brandHandle.trim() }))}
        />
      </Question>

      <Question
        id="q-c-tier"
        title="Follower tier"
        hint={`Creators qualify by their verified real followers on ${platform.name}. The tier sets the price per video.`}
      >
        <div role="radiogroup" aria-labelledby="q-c-tier" data-invalid={tierErr ? "true" : undefined} tabIndex={-1} className="flex flex-col gap-2 outline-none">
          {followerTiers.map((t) => (
            <ChoiceTile
              key={t.id}
              name="campaign-tier"
              checked={form.tierId === t.id}
              disabled={t.placeholder}
              onChange={() => set({ tierId: t.id })}
              label={
                t.placeholder
                  ? `${t.label} real followers, price coming soon`
                  : `${t.label} real followers, ${money(t.pricePerVideo)} per video`
              }
            >
              <span className="flex items-center gap-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="y-small font-semibold">{t.label} followers</span>
                  <span className="y-micro y-fg-2">
                    {t.placeholder ? "Not open yet" : `${plural(counts[t.id] ?? 0, "creator")} on Yapp qualify on ${platform.name}`}
                  </span>
                </span>
                {t.placeholder ? (
                  <Badge tone="neutral" icon={<Clock size={13} aria-hidden />}>
                    Price coming soon
                  </Badge>
                ) : (
                  <span className="flex flex-none items-baseline gap-1">
                    <span className="y-display y-num text-[22px] leading-none">{money(t.pricePerVideo)}</span>
                    <span className="y-micro y-fg-2">a video</span>
                  </span>
                )}
              </span>
            </ChoiceTile>
          ))}
        </div>
        <GroupError message={tierErr} />
      </Question>

      <Question id="q-c-videos" title="How many videos?" hint="Each one comes from a different creator.">
        <Stepper
          label="Videos"
          value={form.videos}
          min={CAMPAIGN_MIN_VIDEOS}
          max={CAMPAIGN_MAX_VIDEOS}
          step={CAMPAIGN_STEP}
          onChange={(videos) => set({ videos })}
          unit={(n) => `videos · ${plural(n, "creator")}`}
        />
        <GroupError message={error("videos")} />
        {!tier.placeholder ? (
          <p className="y-small y-fg-2">
            {form.videos} × {money(tier.pricePerVideo)} = {money(budget.subtotal)}, plus the {Math.round(CAMPAIGN_FEE_RATE * 100)}% fee:{" "}
            <span className="font-semibold text-(--y-ink)">{moneyExact(budget.total)} held when you publish</span>.
          </p>
        ) : null}
      </Question>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 3 · Rules                                                                   */
/* -------------------------------------------------------------------------- */

export function RulesStep({ form, set, error }: CampaignStepProps) {
  const platform = campaignPlatformById[form.platform];
  const handle = atHandle(form.brandHandle) || "your account";
  const rules = [
    {
      icon: <CalendarDays size={18} aria-hidden />,
      title: `Open for ${CAMPAIGN_OPEN_DAYS} days`,
      body: `Creators can take a slot until ${shortDate(closesAtIfNow())}, or until you close it. Slots nobody takes are refunded with their fee.`,
    },
    {
      icon: <AtSign size={18} aria-hidden />,
      title: `Tag ${handle} and label it`,
      body: `Each creator posts on their own ${platform.name}, tags ${handle} and turns on the ${disclosureName(form.platform)}.`,
    },
    {
      icon: <Clock size={18} aria-hidden />,
      title: `Kept up for ${CAMPAIGN_KEEP_LIVE_DAYS} days`,
      body: `The post stays live for ${CAMPAIGN_KEEP_LIVE_DAYS} days from when we verify it.`,
    },
    {
      icon: <Banknote size={18} aria-hidden />,
      title: `Paid ${CAMPAIGN_RELEASE_DAYS} days after the post is verified`,
      body: "You approve each video first. A creator's money is released once their post has been live and verified for a week.",
    },
    {
      icon: <RotateCcw size={18} aria-hidden />,
      title: "A rejected slot reopens",
      body: "Reject a video or remove a creator who doesn't upload, and the slot goes to the next eligible creator.",
    },
  ];
  return (
    <>
      <Question
        id="q-c-deadline"
        title="Time to upload"
        hint="Days a creator has to upload their first version after taking a slot. It can't change once the campaign is live."
      >
        <div role="group" aria-labelledby="q-c-deadline" className="flex flex-wrap gap-2">
          {CAMPAIGN_DEADLINE_OPTIONS.map((days) => (
            <FilterChip key={days} pressed={form.deadlineDays === days} onClick={() => set({ deadlineDays: days })}>
              {plural(days, "day")}
            </FilterChip>
          ))}
        </div>
        <GroupError message={error("deadline")} />
      </Question>

      <Block as="section" tone="paper" pad="md" className="flex flex-col gap-4" aria-labelledby="q-c-rules">
        <div className="flex flex-col gap-1">
          <h2 id="q-c-rules" className="y-head">
            What creators agree to
          </h2>
          <p className="y-small y-fg-2">Shown to every creator before they take a slot. These are set by Yapp for every campaign.</p>
        </div>
        <ul className="flex flex-col gap-4">
          {rules.map((rule) => (
            <li key={rule.title} className="flex items-start gap-3">
              <span className="y-round flex-none" data-tone-btn="soft" data-size="sm" aria-hidden>
                {rule.icon}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                <span className="y-small font-semibold">{rule.title}</span>
                <span className="y-small y-fg-2">{rule.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Block>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 4 · Review and pay                                                          */
/* -------------------------------------------------------------------------- */

export function PayStep({ form, set, product, error }: CampaignStepProps) {
  const tier = tierById[form.tierId];
  const budget = budgetFor(form);
  const platform = campaignPlatformById[form.platform];
  const payErr = error("payment");
  return (
    <>
      <Block as="section" aria-labelledby="q-c-total" tone="paper" pad="md" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="q-c-total" className="y-small y-fg-2">
            Charged and held when you publish
          </h2>
          <p className="y-display y-num text-[40px] leading-none">{moneyExact(budget.total)}</p>
        </div>
        <KeyValues
          className="border-t border-(--b-line) pt-4"
          rows={[
            { label: `${form.videos} videos × ${money(tier.pricePerVideo)}`, value: money(budget.subtotal) },
            { label: `Service fee (${Math.round(CAMPAIGN_FEE_RATE * 100)}%)`, value: moneyExact(budget.fee) },
          ]}
        />
      </Block>

      <Block as="section" aria-labelledby="q-c-summary" tone="paper" pad="md" className="flex flex-col gap-4">
        <h2 id="q-c-summary" className="y-head">
          {form.title.trim()}
        </h2>
        <KeyValues
          rows={[
            { label: "Product", value: product?.name ?? "" },
            { label: "Post on", value: `${platform.name} · tag ${atHandle(form.brandHandle)}` },
            { label: "Creators", value: `${tier.label} real followers` },
            { label: "Talking points", value: plural(form.mustInclude.filter((x) => x.trim()).length, "point") },
            { label: "Upload within", value: `${plural(form.deadlineDays, "day")} of a slot` },
            { label: "Open until", value: shortDate(closesAtIfNow()) },
          ]}
        />
      </Block>

      <Block as="section" tone="paper" pad="md" className="flex flex-col gap-3">
        <div data-invalid={payErr ? "true" : undefined} tabIndex={-1} className="outline-none">
          <PaymentMethodPicker value={form.paymentMethodId} onChange={(paymentMethodId) => set({ paymentMethodId })} />
        </div>
        <GroupError message={payErr} />
      </Block>
      <div className="lg:hidden">
        <HoldNote />
      </div>
    </>
  );
}

/** How the hold works (the review step). */
export function HoldNote() {
  return (
    <Block tone="paper" pad="md" className="flex items-start gap-3">
      <ShieldCheck size={20} aria-hidden className="mt-0.5 flex-none" />
      <div className="flex flex-col gap-1">
        <h2 className="y-head">How the money works</h2>
        <p className="y-small y-fg-2">
          The budget and the service fee are charged now and held for you. Each creator is paid {CAMPAIGN_RELEASE_DAYS} days
          after their post of the video you approved is verified. Slots nobody takes are refunded with their fee when the
          campaign closes.
        </p>
      </div>
    </Block>
  );
}

/** Desktop rail: the campaign as creators will see it. */
export function CampaignPreview({ s, form, product }: { s: DemoState; form: CampaignForm; product?: Product }) {
  const business = me.business(s);
  const tier = tierById[form.tierId];
  const platform = campaignPlatformById[form.platform];
  const points = form.mustInclude.filter((x) => x.trim());
  return (
    <>
      <Block tone="paper" pad="md" className="flex flex-col gap-4">
        <p className="y-micro y-fg-2">What creators see</p>
        <div className="flex items-start gap-3">
          <BusinessLogo business={business} size={40} />
          <div className="min-w-0 flex-1">
            <p className="y-micro y-fg-2">
              {business.name}
              {product && product.name !== business.name ? ` · ${product.name}` : ""}
            </p>
            <p className={`y-head ${form.title.trim() ? "" : "y-fg-2"}`}>{form.title.trim() || "Your campaign title"}</p>
            <p className="y-small y-fg-2 mt-1">
              UGC campaign · {platform.name} · {tier.label} followers
            </p>
          </div>
        </div>
        {points.length ? (
          <ul className="flex flex-col gap-1.5">
            {points.slice(0, 3).map((point) => (
              <li key={point} className="y-small flex items-start gap-2">
                <Check size={15} aria-hidden className="mt-0.5 flex-none" />
                <span className="min-w-0">{point}</span>
              </li>
            ))}
            {points.length > 3 ? <li className="y-micro y-fg-2 ps-6">+{points.length - 3} more</li> : null}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-(--b-line) pt-4">
          <p className="y-display y-num text-[20px]">
            {tier.placeholder ? "Price coming soon" : `${money(tier.pricePerVideo)} per Yapp`}
          </p>
          <p className="y-micro y-fg-2 inline-flex items-center gap-1.5">
            <Users size={14} aria-hidden /> {form.videos} slots
          </p>
        </div>
      </Block>
      {!tier.placeholder ? (
        <Block tone="paper" pad="md" className="flex items-baseline justify-between gap-3">
          <span className="y-small y-fg-2">
            {form.videos} × {money(tier.pricePerVideo)} + {Math.round(CAMPAIGN_FEE_RATE * 100)}% fee
          </span>
          <span className="y-display y-num text-[22px]">{moneyExact(budgetFor(form).total)}</span>
        </Block>
      ) : null}
    </>
  );
}
