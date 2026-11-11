"use client";

import {
  AlertCircle,
  AtSign,
  BadgeCheck,
  Ban,
  Banknote,
  CalendarDays,
  Check,
  Clock,
  Info,
  RotateCcw,
  ShieldCheck,
  Users,
} from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { PaymentMethodPicker } from "@/components/domain/money";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { TextArea, TextField } from "@/components/ui/field";
import { KeyValues } from "@/components/ui/progress";
import { PillButton } from "@/components/ui/pill-button";
import { platformList } from "@/lib/campaigns";
import { money, moneyExact, plural, quoted, shortDate } from "@/lib/format";
import { GUIDANCE_NOTE, rangePosition, round5 } from "@/lib/pricing";
import { me } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import {
  CAMPAIGN_DEADLINE_OPTIONS,
  CAMPAIGN_KEEP_LIVE_DAYS,
  CAMPAIGN_MAX_VIDEOS,
  CAMPAIGN_MIN_VIDEOS,
  CAMPAIGN_OPEN_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  CAMPAIGN_STEP,
  FEE_PCT,
  RAW_FOOTAGE_INCLUDED,
  campaignPlatformById,
  campaignPlatforms,
  followerTiers,
  languages,
  nicheById,
  tierById,
  usageById,
  usageOptions,
} from "@/lib/taxonomy";
import type { CampaignPlatformId, Product } from "@/lib/types";

import { AttachmentsField } from "./attachments";
import {
  CAMPAIGN_QUICK,
  HOOK_MAX,
  applyProduct,
  atHandle,
  closesAtIfNow,
  disclosureName,
  handleFromWebsite,
  handleList,
  qualifyingCounts,
  type CampaignDerived,
  type CampaignForm,
  type FieldKey,
} from "./campaign-model";
import { ExplainerField } from "./explainer";
import { ChoiceTile, Disclosure, GroupError, ListEditor, MoneyInput, Question, Stepper, SubLabel } from "./parts";
import { ProductPicker } from "./product-picker";

export type CampaignPatch = Partial<CampaignForm> | ((form: CampaignForm) => Partial<CampaignForm>);

export type CampaignStepProps = {
  s: DemoState;
  form: CampaignForm;
  d: CampaignDerived;
  set: (patch: CampaignPatch) => void;
  products: Product[];
  product?: Product;
  error: (field: FieldKey) => string | undefined;
  goTo: (step: number) => void;
};

const toggle = <T,>(items: T[], value: T) =>
  items.includes(value) ? items.filter((v) => v !== value) : [...items, value];

/** Add or remove a platform, keeping the list in the usual order (TikTok, Instagram, Snapchat). */
const togglePlatform = (current: CampaignPlatformId[], id: CampaignPlatformId) => {
  const next = toggle(current, id);
  return campaignPlatforms.map((p) => p.id).filter((p) => next.includes(p));
};

/* -------------------------------------------------------------------------- */
/* 1 · What to say                                                             */
/* -------------------------------------------------------------------------- */

export function SayStep({ form, set, products, product, error }: CampaignStepProps) {
  const pointsErr = error("mustInclude");
  const footage = product?.assets.filter((a) => a.kind === "footage") ?? [];
  const slug = (product?.name ?? "product").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
  const optional = [
    form.explainer ? "Explainer added" : "No explainer",
    form.attachments.length ? plural(form.attachments.length, "file") : null,
    form.languages.map((l) => languages.find((x) => x.id === l)?.name).join(", ") || "English",
  ].filter(Boolean);
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
        <TextArea
          label="Hook line"
          name="hook"
          rows={2}
          maxLength={HOOK_MAX + 40}
          placeholder="e.g. Open on the moment a customer says “I'll pay you tomorrow”"
          value={form.hook}
          error={error("hook")}
          hint={`An opening every creator can start from. Up to ${HOOK_MAX} characters.`}
          onChange={(event) => set({ hook: event.target.value })}
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

      <Disclosure title="Explainer, files and language (optional)" summary={optional.join(" · ")}>
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
          <SubLabel hint="Creators see them before they pick a slot.">Files</SubLabel>
          <AttachmentsField files={form.attachments} onChange={(attachments) => set({ attachments })} />
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

export function CreatorsStep({ s, form, d, set, error }: CampaignStepProps) {
  const platformsErr = error("platforms");
  const tierErr = error("tierId");
  const priceErr = error("price");
  const counts = qualifyingCounts(s.creators, me.ids(s).creatorId, form.platforms.length ? form.platforms : ["tiktok"]);
  const where = form.platforms.length ? platformList(form.platforms) : "the platform they post on";
  const { low, high } = d.guidance;
  const chips = [...new Set([low, round5((low + high) / 2), high])];
  const what = `${nicheById[d.niche].name.toLowerCase()} at ${tierById[form.tierId].label} followers`;
  const websiteGuess = handleFromWebsite(me.business(s).website);
  const position = d.outOfLimits ? null : rangePosition(d.price, d.guidance);

  return (
    <>
      <Question id="q-c-where" title="Where creators post" hint="Each creator picks one of these, posts on their own account and tags yours.">
        <div
          role="group"
          aria-labelledby="q-c-where"
          data-invalid={platformsErr ? "true" : undefined}
          tabIndex={-1}
          className="flex flex-wrap gap-2 outline-none"
        >
          {campaignPlatforms.map((p) => (
            <FilterChip key={p.id} pressed={form.platforms.includes(p.id)} onClick={() => set((f) => ({ platforms: togglePlatform(f.platforms, p.id) }))}>
              {p.name}
            </FilterChip>
          ))}
        </div>
        <GroupError message={platformsErr} />
        {form.platforms.map((platform) => {
          const name = campaignPlatformById[platform].name;
          return (
            <TextField
              key={platform}
              label={`Your ${name} account to tag`}
              name={`handle-${platform}`}
              required
              placeholder={websiteGuess || "@yourbrand"}
              autoComplete="off"
              spellCheck={false}
              value={form.handles[platform] ?? ""}
              error={error(`handle-${platform}`)}
              onChange={(event) => set((f) => ({ handles: { ...f.handles, [platform]: event.target.value } }))}
              onBlur={() =>
                set((f) => ({ handles: { ...f.handles, [platform]: atHandle(f.handles[platform] ?? "") || (f.handles[platform] ?? "").trim() } }))
              }
            />
          );
        })}
        {form.platforms.length ? (
          <p className="y-micro y-fg-2 px-1">
            The only handles that get through our contact filter. Saved for your next campaign when you publish.
          </p>
        ) : null}
      </Question>

      <Question
        id="q-c-tier"
        title="Who can pick"
        hint={`Creators qualify by their verified real followers on ${where}. The tier decides who can pick, not the price.`}
      >
        <div role="radiogroup" aria-labelledby="q-c-tier" data-invalid={tierErr ? "true" : undefined} tabIndex={-1} className="grid gap-2 outline-none sm:grid-cols-2">
          {followerTiers.map((t) => (
            <ChoiceTile
              key={t.id}
              name="campaign-tier"
              checked={form.tierId === t.id}
              onChange={() => set({ tierId: t.id })}
              label={`${t.label} real followers, ${plural(counts[t.id] ?? 0, "creator")} on Yapp qualify`}
              className="!p-3.5"
            >
              <span className="y-small font-semibold">{t.label} followers</span>
              <span className="y-micro y-fg-2">{plural(counts[t.id] ?? 0, "creator")} on Yapp qualify</span>
            </ChoiceTile>
          ))}
        </div>
        <GroupError message={tierErr} />
      </Question>

      <Question id="q-c-price" title="How many, and your price per Yapp" hint="Each Yapp comes from a different creator.">
        <div className="flex flex-col gap-2">
          <SubLabel>Yapps</SubLabel>
          <Stepper
            label="Yapps"
            value={form.videos}
            min={CAMPAIGN_MIN_VIDEOS}
            max={CAMPAIGN_MAX_VIDEOS}
            step={CAMPAIGN_STEP}
            onChange={(videos) => set({ videos })}
            unit={(n) => `${n === 1 ? "Yapp" : "Yapps"} · ${plural(n, "creator")}`}
          />
          <div role="group" aria-label="Quick picks" className="flex flex-wrap gap-2">
            {CAMPAIGN_QUICK.map((n) => (
              <FilterChip key={n} size="sm" pressed={form.videos === n} onClick={() => set({ videos: n })}>
                {n}
              </FilterChip>
            ))}
          </div>
          <GroupError message={error("videos")} />
        </div>

        <div className="flex flex-col gap-2 border-t border-(--b-line) pt-4">
          <div className="max-w-[220px]">
            <MoneyInput
              label="Price per Yapp"
              name="campaign-price"
              value={d.price}
              invalid={Boolean(priceErr)}
              describedBy={priceErr ? "q-c-price-error" : "q-c-price-note"}
              onChange={(price) => set({ price })}
            />
          </div>
          <div role="group" aria-label="Usual prices" className="flex flex-wrap gap-2">
            {chips.map((n) => (
              <FilterChip key={n} size="sm" pressed={d.price === n} onClick={() => set({ price: n })}>
                {money(n)}
              </FilterChip>
            ))}
          </div>
          <GroupError id="q-c-price-error" message={priceErr} />
          {position ? (
            <div id="q-c-price-note" aria-live="polite" className="flex flex-col gap-2">
              {position === "below" ? (
                <p className="y-small flex items-start gap-2 font-medium text-(--y-danger)">
                  <AlertCircle size={16} aria-hidden className="mt-0.5 flex-none" />
                  <span>
                    Below the usual {money(low)}–{money(high)} for {what}. You can still publish, but slots may fill slowly.
                  </span>
                </p>
              ) : (
                <p className="y-small y-fg-2 flex items-start gap-2">
                  {position === "within" ? (
                    <Check size={16} aria-hidden className="mt-0.5 flex-none" />
                  ) : (
                    <Info size={16} aria-hidden className="mt-0.5 flex-none" />
                  )}
                  <span>
                    {position === "within" ? "In line with" : "Above"} the usual {money(low)}–{money(high)} for {what}
                    {position === "above" ? ". Your slots should fill fast." : "."}
                  </span>
                </p>
              )}
              {position === "below" ? (
                <PillButton size="sm" variant="soft" className="w-fit" onClick={() => set({ price: low })}>
                  Use {money(low)}
                </PillButton>
              ) : null}
              <details className="y-micro y-fg-2">
                <summary className="w-fit cursor-pointer py-1 underline underline-offset-4">This range is an estimate</summary>
                <p className="pt-1">{GUIDANCE_NOTE}</p>
              </details>
            </div>
          ) : null}
        </div>

        {!d.outOfLimits ? (
          <p className="y-small y-num border-t border-(--b-line) pt-4" aria-live="polite">
            {plural(form.videos, "Yapp")} × {money(d.price)} ={" "}
            <span className="font-semibold">{money(d.budget.total)} held when you publish</span>
            <span className="y-fg-2">. Nothing is added on top.</span>
          </p>
        ) : null}
      </Question>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 3 · Rules                                                                   */
/* -------------------------------------------------------------------------- */

export function RulesStep({ form, d, set, error }: CampaignStepProps) {
  const handles = handleList(form);
  const tags = handles.length
    ? handles.map((h) => `${h.handle || "your account"} on ${h.name}`).join(", ")
    : "your account";
  const labels = form.platforms.length === 1 ? `the ${disclosureName(form.platforms[0])}` : "the platform's paid partnership label";
  const rules = [
    {
      icon: <CalendarDays size={18} aria-hidden />,
      title: `Open for ${CAMPAIGN_OPEN_DAYS} days`,
      body: `Creators can pick a slot until ${shortDate(closesAtIfNow())}, or until you close it. Slots nobody picks are refunded in full.`,
    },
    {
      icon: <AtSign size={18} aria-hidden />,
      title: "Tag you and label it",
      body:
        form.platforms.length === 1
          ? `Each creator posts on their own ${handles[0].name}, tags ${handles[0].handle || "your account"} and turns on ${labels}.`
          : `Each creator posts on one of ${form.platforms.length ? platformList(form.platforms) : "your platforms"}, tags ${tags}, and turns on ${labels}.`,
    },
    {
      icon: <Clock size={18} aria-hidden />,
      title: `Kept up for ${CAMPAIGN_KEEP_LIVE_DAYS} days`,
      body: `The post stays live for ${CAMPAIGN_KEEP_LIVE_DAYS} days from when we verify it.`,
    },
    {
      icon: <Banknote size={18} aria-hidden />,
      title: `Paid ${CAMPAIGN_RELEASE_DAYS} days after the post is verified`,
      body: d.outOfLimits
        ? `You approve each video first. A creator is paid ${CAMPAIGN_RELEASE_DAYS} days after their post is verified, if it's still up, less Yapp's ${FEE_PCT}%.`
        : `You approve each video first. ${CAMPAIGN_RELEASE_DAYS} days after the post is verified, if it's still up, the creator receives ${moneyExact(d.budget.perCreator)} of the ${money(d.price)}: Yapp's ${FEE_PCT}% comes out of their pay, not on top of yours.`,
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
        hint="Days a creator has to upload their first version after picking a slot. It can't change once the campaign is live."
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

      <Question
        id="q-c-usage"
        title="How you'll use the videos"
        hint="Included in the price, with no separate rights fee. Creators see it before they pick."
      >
        <div role="radiogroup" aria-labelledby="q-c-usage" className="grid gap-2 sm:grid-cols-2">
          {usageOptions.map((option) => (
            <ChoiceTile
              key={option.id}
              name="campaign-usage"
              checked={form.usage === option.id}
              onChange={() => set({ usage: option.id })}
              label={`${option.name}. ${option.description}`}
              className="!p-3.5"
            >
              <span className="y-small font-semibold">{option.name}</span>
              <span className="y-micro y-fg-2">{option.description}</span>
            </ChoiceTile>
          ))}
        </div>
        <GroupError message={error("usage")} />
        <p className="y-micro y-fg-2 flex items-start gap-2">
          <BadgeCheck size={15} aria-hidden className="mt-px flex-none" />
          {RAW_FOOTAGE_INCLUDED}
        </p>
      </Question>

      <Block as="section" tone="paper" pad="md" className="flex flex-col gap-4" aria-labelledby="q-c-rules">
        <div className="flex flex-col gap-1">
          <h2 id="q-c-rules" className="y-head">
            What creators agree to
          </h2>
          <p className="y-small y-fg-2">Shown to every creator before they pick a slot. Yapp sets these for every campaign.</p>
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

export function PayStep({ form, d, set, product, error, goTo }: CampaignStepProps) {
  const tier = tierById[form.tierId];
  const payErr = error("payment");
  const handles = handleList(form);
  const change = (step: number, label: string) => (
    <button type="button" className="y-link y-micro font-semibold" onClick={() => goTo(step)} aria-label={`Change ${label}`}>
      Change
    </button>
  );
  return (
    <>
      <Block as="section" aria-labelledby="q-c-total" tone="paper" pad="md" className="flex flex-col gap-2">
        <h2 id="q-c-total" className="y-small y-fg-2">
          Charged and held when you publish
        </h2>
        <p className="y-display y-num text-[40px] leading-none">{money(d.budget.total)}</p>
        <p className="y-small y-fg-2 y-num">
          {plural(form.videos, "Yapp")} × {money(d.price)}. Nothing is added on top.
        </p>
      </Block>

      <Block as="section" aria-labelledby="q-c-summary" tone="paper" pad="md" className="flex flex-col gap-4">
        <h2 id="q-c-summary" className="y-head">
          {form.title.trim()}
        </h2>
        {/* Labels (some with "Change") keep their width; a long value, like two platforms, wraps. */}
        <KeyValues
          className="grid-cols-[auto_minmax(0,1fr)]"
          rows={[
            { label: "Product", value: product?.name ?? "" },
            {
              label: <span className="inline-flex items-center gap-2">Post on {change(1, "where creators post")}</span>,
              value: handles.map((h) => `${h.name} · ${h.handle}`).join(", "),
            },
            {
              label: <span className="inline-flex items-center gap-2">Who can pick {change(1, "who can pick")}</span>,
              value: `${tier.label} real followers`,
            },
            { label: "Talking points", value: plural(form.mustInclude.filter((x) => x.trim()).length, "point") },
            {
              label: <span className="inline-flex items-center gap-2">Usage {change(2, "usage")}</span>,
              value: usageById[form.usage].name,
            },
            { label: "Upload within", value: `${plural(form.deadlineDays, "day")} of picking` },
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
          The full amount is charged now and held for you. Each Yapp&apos;s money is released only
          after you approve the video and the creator&apos;s post is verified. Slots nobody picks are refunded in full when
          the campaign closes.
        </p>
      </div>
    </Block>
  );
}

/** Desktop rail: the campaign as creators will see it. */
export function CampaignPreview({ s, form, d, product }: { s: DemoState; form: CampaignForm; d: CampaignDerived; product?: Product }) {
  const business = me.business(s);
  const tier = tierById[form.tierId];
  const points = form.mustInclude.filter((x) => x.trim());
  const where = form.platforms.length ? platformList(form.platforms) : "Pick a platform";
  return (
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
            UGC campaign · {where} · {tier.label} followers
          </p>
        </div>
      </div>
      {form.hook.trim() ? <p className="y-body leading-snug">{quoted(form.hook.trim())}</p> : null}
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
          {d.outOfLimits ? "Set your price per Yapp" : `${money(d.price)} per Yapp`}
        </p>
        <p className="y-micro y-fg-2 inline-flex items-center gap-1.5">
          <Users size={14} aria-hidden /> {form.videos} slots · {usageById[form.usage].name}
        </p>
      </div>
    </Block>
  );
}
