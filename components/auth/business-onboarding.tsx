"use client";

import { Ban, Check, FilePlus2, LayoutDashboard, Package, Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { FilterChip } from "@/components/ui/chip";
import { SelectField, TextArea, TextField } from "@/components/ui/field";
import { Ar } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { cities } from "@/lib/data";
import { money } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { actions, useDemo } from "@/lib/store";
import { countries, formatById, formats, languages, nicheById, niches } from "@/lib/taxonomy";
import type { Creator, FormatId, LanguageId, NicheId } from "@/lib/types";

import { ChipRadioGroup, CheckCards, GroupError, GroupLabel, toggleIn } from "./choice";
import { ListInput } from "./list-input";
import { marketGuide } from "./market";
import { OnboardingDone } from "./onboarding-done";
import { PRODUCT_COLOUR, ProductPreview, surfaceLabels, type ProductDraft } from "./product-preview";
import {
  WizardLayout,
  focusFirstError,
  useAutosave,
  useWizardData,
  type WizardStep,
} from "./wizard";

/* -------------------------------------------------------------------------- */
/* Data                                                                        */
/* -------------------------------------------------------------------------- */

type Data = ProductDraft & {
  name: string;
  title: string;
  teamSize: string;
  company: string;
  website: string;
  cityId: string;
  industry: NicheId | "";
  skipProduct: boolean;
  formats: FormatId[];
  dialects: LanguageId[];
  volume: string;
  budget: number;
};

type Errors = Partial<Record<string, string | null>>;

const steps: WizardStep[] = [
  { id: "you", label: "About you" },
  { id: "company", label: "Your company" },
  { id: "product", label: "Your first product" },
  { id: "voice", label: "Tone and message" },
  { id: "wants", label: "What you need" },
  { id: "done", label: "Ready" },
];
/** Step indexes: the product is split over two steps (what it is, how it should sound). */
const PRODUCT = 2;
const VOICE = 3;
const WANTS = 4;
const DONE = 5;
const isProductStep = (step: number) => step === PRODUCT || step === VOICE;

const teamSizes = ["Just me", "2–10 people", "11–50 people", "51–200 people", "200+ people"];
const volumes = ["1–2 videos", "3–5 videos", "6–10 videos", "More than 10"];
const toneWords = [
  "Casual",
  "Warm",
  "Funny",
  "Straight-talking",
  "Energetic",
  "Calm",
  "Premium",
  "Playful",
];
const titleSuggestions = ["Founder", "Growth lead", "Marketing", "Product"];

const cityOptions = [
  { value: "", label: "Choose a city" },
  ...cities.map((city) => ({
    value: city.id,
    label: `${city.name}, ${countries[city.countryId].name}`,
  })),
];

const websitePattern = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i;
const cleanWebsite = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

function validate(step: number, d: Data): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (d.name.trim().length < 2) e.name = "Enter your name.";
    if (!d.teamSize) e.teamSize = "Choose your team size.";
  }
  if (step === 1) {
    if (d.company.trim().length < 2) e.company = "Enter your company's name.";
    if (d.website.trim() && !websitePattern.test(d.website.trim()))
      e.website = "That doesn't look like a web address. Try something like daftar.app.";
    if (!d.cityId) e.cityId = "Choose where your team is based.";
    if (!d.industry) e.industry = "Choose the closest industry.";
  }
  if (step === PRODUCT) {
    if (d.productName.trim().length < 2) e.productName = "Name the product the videos are about.";
    if (d.oneLiner.trim().length < 8) e.oneLiner = "Describe what it does in one line.";
    if (d.oneLiner.length > 90) e.oneLiner = "Keep it under 90 characters.";
    if (d.surfaces.length === 0) e.surfaces = "Choose at least one place people use it.";
    if (d.problem.trim().length < 10) e.problem = "Describe the problem in a sentence or two.";
    if (d.audience.trim().length < 6) e.audience = "Describe who you want to reach.";
  }
  if (step === VOICE) {
    if (d.tone.length === 0) e.tone = "Pick at least one word for the tone.";
    if (d.cta.trim().length < 4) e.cta = "Tell viewers what to do next.";
  }
  if (step === WANTS) {
    if (d.formats.length === 0) e.formats = "Pick at least one format.";
    if (d.dialects.length === 0) e.dialects = "Pick at least one language or dialect.";
    if (!d.volume) e.volume = "Choose roughly how many videos a month.";
  }
  return e;
}

/* -------------------------------------------------------------------------- */
/* Flow                                                                        */
/* -------------------------------------------------------------------------- */

export function BusinessOnboarding() {
  const params = useSearchParams();
  const { setRole } = usePrefs();
  const toast = useToast();
  const s = useDemo();

  const { data, update, version } = useWizardData<Data>(() => ({
    name: params.get("name") ?? "",
    title: "",
    teamSize: "",
    company: "",
    website: params.get("domain") ?? "",
    cityId: "",
    industry: "",
    productName: "",
    oneLiner: "",
    problem: "",
    audience: "",
    surfaces: [],
    features: [],
    tone: [],
    dos: [],
    donts: [],
    cta: "",
    skipProduct: false,
    formats: [],
    dialects: [],
    volume: "",
    budget: 250,
  }));
  const saved = useAutosave(version);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState<{ productId: string | null; productName: string } | null>(
    null,
  );

  const set = (patch: Partial<Data>) => {
    update(patch);
    const keys = Object.keys(patch);
    if (keys.some((key) => errors[key])) {
      setErrors((current) => {
        const next = { ...current };
        keys.forEach((key) => delete next[key]);
        return next;
      });
    }
  };

  const finish = () => {
    setBusy(true);
    window.setTimeout(() => {
      let productId: string | null = null;
      const productName = data.productName.trim();
      if (!data.skipProduct && productName) {
        productId = actions.saveProduct({
          name: productName,
          oneLiner: data.oneLiner.trim(),
          description: [data.oneLiner.trim(), data.problem.trim()].filter(Boolean).join(" "),
          website: cleanWebsite(data.website),
          niche: data.industry || "b2b",
          surfaces: data.surfaces,
          audience: data.audience.trim(),
          problem: data.problem.trim(),
          features: data.features,
          tone: data.tone,
          dos: data.dos,
          donts: data.donts,
          cta: data.cta.trim(),
          brandColor: PRODUCT_COLOUR,
        });
      }
      setRole("business");
      setBusy(false);
      setFinished({ productId, productName });
      setStep(DONE);
    }, 700);
  };

  const stepValid = () => {
    const found = validate(step, data);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      focusFirstError();
      return false;
    }
    return true;
  };

  const next = () => {
    if (!stepValid()) return;
    if (isProductStep(step) && data.skipProduct) update({ skipProduct: false });
    if (step === WANTS) {
      finish();
      return;
    }
    setStep(step + 1);
    setFurthest((f) => Math.max(f, step + 1));
  };

  /** Rail links: going forward still validates the step you're on (a skipped product can stay skipped). */
  const jump = (index: number) => {
    if (index > step) {
      if (isProductStep(step)) {
        const complete = !Object.values(validate(step, data)).some(Boolean);
        if (complete) update({ skipProduct: false });
        else if (!data.skipProduct && !stepValid()) return;
      } else if (!stepValid()) return;
    }
    setErrors({});
    setStep(index);
  };

  const back = () => {
    setErrors({});
    setStep(Math.max(0, step - 1));
  };

  const skip = () => {
    setErrors({});
    if (isProductStep(step)) {
      update({ skipProduct: true });
      toast({ message: "Skipped. Add your product any time from Products.", tone: "info" });
      setStep(WANTS);
      setFurthest((f) => Math.max(f, WANTS));
    } else if (step === WANTS) {
      finish();
    }
  };

  if (finished) {
    return <BusinessDone data={data} productSaved={Boolean(finished.productId)} />;
  }

  const titles: { title: React.ReactNode; description: string }[] = [
    {
      title: "First, a bit about you",
      description: "Creators see your name and role on your requests.",
    },
    {
      title: "Your company",
      description: "Shown on your requests.",
    },
    {
      title: "Your first product",
      description: "Write it once. It fills in every brief.",
    },
    {
      title: "How should it sound?",
      description: "Creators turn this into the hook and the ending.",
    },
    {
      title: "What do you want first?",
      description: "We'll use this to suggest creators. Change it any time.",
    },
  ];

  return (
    <WizardLayout
      eyebrow="Business setup"
      steps={steps}
      current={step}
      title={titles[step].title}
      description={titles[step].description}
      saved={saved}
      furthest={furthest}
      onJump={jump}
      onBack={step > 0 ? back : undefined}
      onNext={next}
      nextLabel={step === WANTS ? (busy ? "Setting up…" : "Finish setup") : "Continue"}
      busy={busy}
      onSkip={isProductStep(step) || step === WANTS ? skip : undefined}
      aside={isProductStep(step) ? <ProductPreview draft={data} skipped={data.skipProduct} /> : undefined}
    >
      {step === 0 ? <AboutYou data={data} set={set} errors={errors} /> : null}
      {step === 1 ? (
        <Company data={data} set={set} errors={errors} prefilled={params.get("domain") ?? ""} />
      ) : null}
      {step === PRODUCT ? <ProductStep data={data} set={set} errors={errors} /> : null}
      {step === VOICE ? <VoiceStep data={data} set={set} errors={errors} /> : null}
      {step === WANTS ? <Wants data={data} set={set} errors={errors} creators={s.creators} /> : null}
    </WizardLayout>
  );
}

type StepProps = { data: Data; set: (patch: Partial<Data>) => void; errors: Errors };

/* -------------------------------------------------------------------------- */
/* Steps                                                                       */
/* -------------------------------------------------------------------------- */

function AboutYou({ data, set, errors }: StepProps) {
  const teamId = useId();
  return (
    <>
      <TextField
        label="Your name"
        required
        autoComplete="name"
        value={data.name}
        error={errors.name}
        onChange={(event) => set({ name: event.target.value })}
      />
      <div className="flex flex-col gap-3">
        <TextField
          label="Your role"
          autoComplete="organization-title"
          placeholder="e.g. Growth lead"
          value={data.title}
          onChange={(event) => set({ title: event.target.value })}
        />
        <div className="flex flex-wrap gap-1.5" aria-label="Suggestions" role="group">
          {titleSuggestions.map((title) => (
            <FilterChip
              key={title}
              pressed={data.title === title}
              onClick={() => set({ title: data.title === title ? "" : title })}
            >
              {title}
            </FilterChip>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <GroupLabel id={teamId} required>
          Team size
        </GroupLabel>
        <ChipRadioGroup
          labelledBy={teamId}
          options={teamSizes.map((size) => ({ value: size, label: size }))}
          value={data.teamSize}
          onChange={(teamSize) => set({ teamSize })}
          invalid={Boolean(errors.teamSize)}
        />
        <GroupError>{errors.teamSize}</GroupError>
      </div>
    </>
  );
}

function Company({ data, set, errors, prefilled }: StepProps & { prefilled: string }) {
  const industryId = useId();
  return (
    <>
      <TextField
        label="Company name"
        required
        autoComplete="organization"
        placeholder="e.g. Daftar"
        value={data.company}
        error={errors.company}
        onChange={(event) => set({ company: event.target.value })}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          label="Website"
          type="url"
          inputMode="url"
          dir="ltr"
          autoComplete="url"
          placeholder="yourcompany.com"
          hint={
            prefilled && data.website === prefilled
              ? "Filled in from your work email. Change it if it's different."
              : undefined
          }
          value={data.website}
          error={errors.website}
          onChange={(event) => set({ website: event.target.value })}
        />
        <SelectField
          label="Where your team is based"
          required
          options={cityOptions}
          value={data.cityId}
          error={errors.cityId}
          onChange={(event) => set({ cityId: event.target.value })}
        />
      </div>
      <div className="flex flex-col gap-3">
        <GroupLabel id={industryId} required>
          Industry
        </GroupLabel>
        <ChipRadioGroup
          labelledBy={industryId}
          options={niches.map((niche) => ({ value: niche.id, label: niche.name }))}
          value={data.industry}
          onChange={(industry) => set({ industry })}
          invalid={Boolean(errors.industry)}
        />
        <GroupError>{errors.industry}</GroupError>
      </div>
    </>
  );
}

function ProductStep({ data, set, errors }: StepProps) {
  const surfacesId = useId();
  return (
    <>
      <TextField
        label="Product name"
        required
        placeholder="e.g. Daftar Invoices"
        value={data.productName}
        error={errors.productName}
        onChange={(event) => set({ productName: event.target.value })}
      />
      <TextField
        label="One-liner"
        required
        maxLength={90}
        placeholder="e.g. Send an invoice over WhatsApp in about 10 seconds."
        hint={`${data.oneLiner.length}/90 · What it does, in words your customers use.`}
        value={data.oneLiner}
        error={errors.oneLiner}
        onChange={(event) => set({ oneLiner: event.target.value })}
      />
      <div className="flex flex-col gap-3">
        <GroupLabel id={surfacesId} required>
          Where people use it
        </GroupLabel>
        <div role="group" aria-labelledby={surfacesId} data-invalid={errors.surfaces ? true : undefined} className="flex flex-wrap gap-2">
          {(["ios", "android", "web"] as const).map((surface) => (
            <FilterChip
              key={surface}
              pressed={data.surfaces.includes(surface)}
              onClick={() => set({ surfaces: toggleIn(data.surfaces, surface) })}
            >
              {surfaceLabels[surface]}
            </FilterChip>
          ))}
        </div>
        <GroupError>{errors.surfaces}</GroupError>
      </div>
      <TextArea
        label="What problem does it solve?"
        required
        rows={3}
        placeholder="e.g. Shop owners lose money chasing customers who 'will pay tomorrow'. Asking feels awkward and the notebook gets messy."
        value={data.problem}
        error={errors.problem}
        onChange={(event) => set({ problem: event.target.value })}
      />
      <TextArea
        label="Who is it for?"
        required
        rows={3}
        placeholder="e.g. Small shop owners in Saudi Arabia, 25–45, who live on WhatsApp and still keep a paper notebook."
        value={data.audience}
        error={errors.audience}
        onChange={(event) => set({ audience: event.target.value })}
      />
    </>
  );
}

function VoiceStep({ data, set, errors }: StepProps) {
  const toneId = useId();
  const [customTone, setCustomTone] = useState("");
  // Open the optional extras on return visits that already have some; never toggled by React after.
  const [extrasOpen] = useState(() => data.features.length + data.dos.length + data.donts.length > 0);
  const addTone = () => {
    const word = customTone.trim();
    if (!word) return;
    const normalised = word.charAt(0).toUpperCase() + word.slice(1);
    if (!data.tone.some((t) => t.toLowerCase() === normalised.toLowerCase()))
      set({ tone: [...data.tone, normalised] });
    setCustomTone("");
  };
  const extraTones = data.tone.filter((word) => !toneWords.includes(word));

  return (
    <>
      <div className="flex flex-col gap-3">
        <GroupLabel id={toneId} required>
          Tone
        </GroupLabel>
        <div role="group" aria-labelledby={toneId} data-invalid={errors.tone ? true : undefined} className="flex flex-wrap gap-2">
          {[...toneWords, ...extraTones].map((word) => (
            <FilterChip
              key={word}
              pressed={data.tone.includes(word)}
              onClick={() => set({ tone: toggleIn(data.tone, word) })}
            >
              {word}
            </FilterChip>
          ))}
        </div>
        <div className="flex gap-2">
          <label htmlFor={`${toneId}-custom`} className="sr-only">
            Add your own tone word
          </label>
          <input
            id={`${toneId}-custom`}
            className="y-input flex-1"
            placeholder="Add your own word"
            maxLength={24}
            value={customTone}
            onChange={(event) => setCustomTone(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTone();
              }
            }}
          />
          <PillButton
            variant="outline"
            onClick={addTone}
            disabled={!customTone.trim()}
            icon={<Plus size={18} aria-hidden />}
            aria-label="Add tone word"
            className="flex-none !px-4"
          >
            Add
          </PillButton>
        </div>
        <GroupError>{errors.tone}</GroupError>
      </div>
      <TextField
        label="Call to action"
        required
        placeholder="e.g. Download Daftar and send your first invoice free"
        hint="The last thing viewers hear."
        value={data.cta}
        error={errors.cta}
        onChange={(event) => set({ cta: event.target.value })}
      />

      <details className="group border-t border-(--b-line) pt-6" open={extrasOpen || undefined}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col">
            <span className="y-head">Features, dos and don&apos;ts</span>
            <span className="y-small y-fg-2">Optional. Add them now or later from Products.</span>
          </span>
          <span
            aria-hidden
            className="y-round transition-transform group-open:rotate-45"
            data-tone-btn="soft"
            data-size="sm"
          >
            <Plus size={18} />
          </span>
        </summary>
        <div className="flex flex-col gap-5 pt-5">
          <ListInput
            label="Features worth showing"
            hint="The two or three things a viewer should see on screen."
            items={data.features}
            onChange={(features) => set({ features })}
            placeholder="e.g. Send an invoice straight to WhatsApp"
            itemNoun="feature"
          />
          <div className="grid gap-5 md:grid-cols-2">
            <ListInput
              label="Dos"
              items={data.dos}
              onChange={(dos) => set({ dos })}
              placeholder="e.g. Show the send moment early"
              icon={<Check size={16} strokeWidth={2.5} />}
              itemNoun="do"
            />
            <ListInput
              label="Don'ts"
              items={data.donts}
              onChange={(donts) => set({ donts })}
              placeholder="e.g. Don't say 'accounting'"
              icon={<Ban size={16} />}
              itemNoun="don't"
            />
          </div>
        </div>
      </details>
    </>
  );
}

function Wants({ data, set, errors, creators }: StepProps & { creators: Creator[] }) {
  const formatsId = useId();
  const dialectsId = useId();
  const volumeId = useId();
  const budgetId = useId();
  const guide = marketGuide(creators, data.formats, data.dialects);
  const low = guide.tiers.basic.price;
  const high = guide.tiers.premium.price;
  const verdict =
    data.budget < low
      ? "Below most basic packages."
      : data.budget > high
        ? "Above most premium packages."
        : "Right in the usual range.";

  return (
    <>
      <div className="flex flex-col gap-3">
        <GroupLabel id={formatsId} required>
          Formats you&apos;re interested in
        </GroupLabel>
        <CheckCards
          labelledBy={formatsId}
          values={data.formats}
          onToggle={(id) => set({ formats: toggleIn(data.formats, id) })}
          options={formats.map((format) => {
            const Icon = format.icon;
            return {
              value: format.id,
              title: format.name,
              body: format.short,
              icon: <Icon size={20} />,
            };
          })}
        />
        <GroupError>{errors.formats}</GroupError>
      </div>

      <div className="flex flex-col gap-3">
        <GroupLabel id={dialectsId} required>
          Languages and dialects
        </GroupLabel>
        <div role="group" aria-labelledby={dialectsId} data-invalid={errors.dialects ? true : undefined} className="flex flex-wrap gap-2">
          {languages.map((lang) => (
            <FilterChip
              key={lang.id}
              pressed={data.dialects.includes(lang.id)}
              onClick={() => set({ dialects: toggleIn(data.dialects, lang.id) })}
            >
              {lang.short}
              {lang.id !== "en" ? (
                <>
                  {" "}
                  <span aria-hidden className="opacity-60">
                    ·
                  </span>{" "}
                  <Ar className="opacity-80">{lang.native}</Ar>
                </>
              ) : null}
            </FilterChip>
          ))}
        </div>
        <GroupError>{errors.dialects}</GroupError>
      </div>

      <div className="flex flex-col gap-3">
        <GroupLabel id={volumeId} required>
          Videos per month
        </GroupLabel>
        <ChipRadioGroup
          labelledBy={volumeId}
          options={volumes.map((v) => ({ value: v, label: v }))}
          value={data.volume}
          onChange={(volume) => set({ volume })}
          invalid={Boolean(errors.volume)}
        />
        <GroupError>{errors.volume}</GroupError>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor={budgetId} className="y-label">
          <span>Budget per video</span>
          <span className="y-micro y-fg-3 font-medium">Optional</span>
        </label>
        <div data-tone="butter" className="y-block flex flex-col gap-4 rounded-(--y-r-tile) p-5">
          <div className="flex items-end justify-between gap-3">
            <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
              {money(data.budget)}
              {data.budget >= 1500 ? "+" : ""}
            </p>
            <p className="y-small y-fg-2 pb-1 text-end">per video</p>
          </div>
          <input
            id={budgetId}
            type="range"
            className="y-range"
            min={50}
            max={1500}
            step={25}
            value={data.budget}
            aria-valuetext={`${money(data.budget)} per video`}
            onChange={(event) => set({ budget: Number(event.target.value) })}
          />
          <div className="y-micro y-fg-2 flex justify-between">
            <span>$50</span>
            <span>$1,500+</span>
          </div>
          <p className="y-small" aria-live="polite">
            <span className="font-semibold">{verdict}</span>{" "}
            <span className="y-fg-2">
              Typical: {money(low)} basic, {money(high)} premium.
            </span>
          </p>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Done                                                                        */
/* -------------------------------------------------------------------------- */

function BusinessDone({ data, productSaved }: { data: Data; productSaved: boolean }) {
  const productName = data.productName.trim();
  const city = cities.find((c) => c.id === data.cityId);
  return (
    <OnboardingDone
      title="Your workspace is ready"
      lead={
        productSaved
          ? `${productName} is saved. It fills in your first brief automatically.`
          : "Add your product from Products whenever you're ready."
      }
      primary={{
        href: "/business/requests/new",
        label: "Post your first request",
        body: "Describe the video you want. Creators pitch with an angle, a price and samples.",
        icon: <FilePlus2 size={20} aria-hidden />,
      }}
      others={[
        {
          href: "/creators",
          label: "Browse creators",
          icon: <Search size={20} aria-hidden />,
        },
        {
          href: "/business",
          label: "Go to dashboard",
          icon: <LayoutDashboard size={20} aria-hidden />,
        },
        ...(productSaved
          ? [
              {
                href: "/business/products",
                label: `Add assets to ${productName}`,
                icon: <Package size={20} aria-hidden />,
              },
            ]
          : []),
      ]}
      note="This demo continues in Daftar's workspace, where Nour already has requests, deliveries and payments in motion."
    >
      <p className="y-small y-fg-2">
        {[
          data.company.trim(),
          city?.name,
          data.industry ? nicheById[data.industry].name : null,
          ...data.formats.slice(0, 3).map((id) => formatById[id].name),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </OnboardingDone>
  );
}
