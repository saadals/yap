"use client";

import {
  AtSign,
  CircleCheck,
  CircleX,
  Compass,
  Landmark,
  LayoutDashboard,
  LoaderCircle,
  Pencil,
  UserRound,
  Wallet,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { FormatChip } from "@/components/domain/chips";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { Chip, FilterChip } from "@/components/ui/chip";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { FieldShell, SelectField, TextField } from "@/components/ui/field";
import { Ar } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useToast } from "@/components/ui/toast";
import { cities } from "@/lib/data";
import { compact, money, priceBreakdown } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { useDemo } from "@/lib/store";
import {
  countries,
  creatorKindById,
  creatorKinds,
  formatById,
  formats,
  languageById,
  languages,
  nicheById,
  niches,
  platformById,
  platforms,
} from "@/lib/taxonomy";
import type {
  CreatorKind,
  FormatId,
  LanguageId,
  NicheId,
  PackageTier,
  PlatformId,
} from "@/lib/types";

import { ChipRadioGroup, CheckCards, GroupError, GroupLabel, RadioCards, toggleIn } from "./choice";
import { IdVerification, type IdStatus } from "./id-verify";
import { marketGuide, tiers, type MarketGuide } from "./market";
import { OnboardingDone } from "./onboarding-done";
import { MAX_SAMPLES, PortfolioUploader, makeSample, sampleVideo, type Sample } from "./portfolio-uploader";
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

type English = "none" | "basic" | "conversational" | "fluent" | "native";
type Camera = "on-camera" | "voiceover" | "both";
type PackageDraft = { price: string; deliveryDays: number; revisions: number };

type Data = {
  displayName: string;
  handle: string;
  cityId: string;
  kind: CreatorKind | "";
  followers: string;
  platforms: PlatformId[];
  dialects: LanguageId[];
  native: LanguageId | "";
  english: English | "";
  formats: FormatId[];
  niches: NicheId[];
  camera: Camera;
  samples: Sample[];
  packages: Record<PackageTier, PackageDraft>;
  pricesSet: boolean;
  payout: "bank" | "wallet";
  holder: string;
  iban: string;
  walletProvider: string;
  walletAccount: string;
  idStatus: IdStatus;
};

type Errors = Partial<Record<string, string | null>>;

const steps: WizardStep[] = [
  { id: "profile", label: "Profile basics" },
  { id: "languages", label: "Languages" },
  { id: "work", label: "What you make" },
  { id: "portfolio", label: "Portfolio" },
  { id: "pricing", label: "Pricing" },
  { id: "payouts", label: "Payouts" },
  { id: "review", label: "Review" },
];

const arabicDialects = languages.filter((lang) => lang.id !== "en");
const englishLevels: { value: English; label: string }[] = [
  { value: "none", label: "None" },
  { value: "basic", label: "Basic" },
  { value: "conversational", label: "Conversational" },
  { value: "fluent", label: "Fluent" },
  { value: "native", label: "Native" },
];
const presentsEnglish = (level: English | "") =>
  level === "conversational" || level === "fluent" || level === "native";

const tierInfo: Record<PackageTier, { label: string; name: string; summary: string }> = {
  basic: { label: "Basic", name: "One video", summary: "One video up to 45 seconds." },
  standard: {
    label: "Standard",
    name: "Video + 3 hooks",
    summary: "One video up to 60 seconds plus three alternate openings to test.",
  },
  premium: {
    label: "Premium",
    name: "Three-video pack",
    summary: "Three videos, different angles or dialects.",
  },
};

const walletProviders = ["STC Pay", "Payoneer", "Wise", "PayPal"];
const handlePattern = /^[a-z0-9_.]{3,20}$/;
/** Stable generated face for the new creator (doesn't change as the handle is typed). */
const NEW_FACE = "cr-new-profile";
const reservedHandles = ["yapp", "admin", "support", "help", "team", "creators"];
const ibanPattern = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;
const compactIban = (value: string) => value.replace(/\s+/g, "").toUpperCase();
const groupIban = (value: string) => compactIban(value).replace(/(.{4})/g, "$1 ").trim();

const cityOptions = [
  { value: "", label: "Choose a city" },
  ...cities.map((city) => ({
    value: city.id,
    label: `${city.name}, ${countries[city.countryId].name}`,
  })),
];

function suggestHandle(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
}

/* -------------------------------------------------------------------------- */
/* Handle availability (simulated lookup)                                      */
/* -------------------------------------------------------------------------- */

type HandleStatus = "empty" | "invalid" | "checking" | "available" | "taken";

function useHandleCheck(handle: string, taken: string[]): HandleStatus {
  const valid = handlePattern.test(handle);
  const isTaken = taken.includes(handle) || reservedHandles.includes(handle);
  const [result, setResult] = useState<{ handle: string; taken: boolean } | null>(null);
  useEffect(() => {
    if (!valid) return;
    const timer = window.setTimeout(() => setResult({ handle, taken: isTaken }), 650);
    return () => window.clearTimeout(timer);
  }, [handle, valid, isTaken]);
  if (!handle) return "empty";
  if (!valid) return "invalid";
  if (result?.handle !== handle) return "checking";
  return result.taken ? "taken" : "available";
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

function validate(step: number, d: Data, handle: HandleStatus): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (d.displayName.trim().length < 2) e.displayName = "Enter the name businesses will see.";
    if (handle === "empty") e.handle = "Choose a handle for your profile link.";
    if (handle === "invalid")
      e.handle = "Use 3–20 lowercase letters, numbers, dots or underscores.";
    if (handle === "taken") e.handle = "That handle is taken. Try one of the suggestions.";
    if (handle === "checking") e.handle = "Still checking that handle. Try again in a second.";
    if (!d.cityId) e.cityId = "Choose the city you film in.";
    if (!d.kind) e.kind = "Choose the option that fits you best.";
    if (d.kind === "influencer") {
      const followers = Number(d.followers);
      if (!followers || followers < 1000)
        e.followers = "Influencer profiles start at 1,000 followers. Choose presenter if you're starting out.";
      if (d.platforms.length === 0) e.platforms = "Choose where your audience follows you.";
    }
  }
  if (step === 1) {
    if (d.dialects.length === 0 && !presentsEnglish(d.english))
      e.dialects = "Pick at least one dialect you can present in.";
    if (!d.native) e.native = "Mark your native language.";
    if (!d.english) e.english = "Choose your English level.";
  }
  if (step === 2) {
    if (d.formats.length === 0) e.formats = "Pick at least one format you make.";
    if (d.niches.length === 0) e.niches = "Pick at least one kind of product.";
  }
  if (step === 3) {
    if (d.samples.length === 0) e.samples = "Add at least one sample. Businesses hire from samples.";
    else if (d.samples.some((s) => s.progress < 100))
      e.samples = "Wait for your uploads to finish.";
    d.samples.forEach((s) => {
      if (s.progress < 100) return;
      if (s.title.trim().length < 3) e[`title-${s.id}`] = "Give this sample a short title.";
      if (!s.format) e[`format-${s.id}`] = "Choose the format.";
    });
  }
  if (step === 4) {
    let previous = 0;
    for (const tier of tiers) {
      const pkg = d.packages[tier];
      const price = Number(pkg.price);
      if (!pkg.price || !Number.isFinite(price) || price < 20)
        e[`price-${tier}`] = "Set a price of at least $20.";
      else if (price > 10000) e[`price-${tier}`] = "Keep it under $10,000.";
      else if (price <= previous)
        e[`price-${tier}`] = `${tierInfo[tier].label} should cost more than the package before it.`;
      if (Number.isFinite(price)) previous = price;
    }
  }
  if (step === 5) {
    if (d.payout === "bank") {
      if (d.holder.trim().length < 3) e.holder = "Enter the name on the account.";
      if (!ibanPattern.test(compactIban(d.iban)))
        e.iban = "That IBAN doesn't look right. It starts with a country code, like AE07 0331…";
    } else {
      if (!d.walletProvider) e.walletProvider = "Choose your wallet.";
      if (d.walletAccount.trim().length < 5)
        e.walletAccount = "Enter the email or phone number on your wallet.";
    }
    if (d.idStatus === "none") e.idStatus = "Verify your ID so you can get paid.";
  }
  return e;
}

/* -------------------------------------------------------------------------- */
/* Flow                                                                        */
/* -------------------------------------------------------------------------- */

export function CreatorOnboarding() {
  const params = useSearchParams();
  const { setRole } = usePrefs();
  const toast = useToast();
  const s = useDemo();
  const initialName = params.get("name") ?? "";

  const { data, update, version } = useWizardData<Data>(() => ({
    displayName: initialName,
    handle: suggestHandle(initialName),
    cityId: "",
    kind: "",
    followers: "",
    platforms: [],
    dialects: [],
    native: "",
    english: "",
    formats: [],
    niches: [],
    camera: "on-camera",
    samples: [],
    packages: {
      basic: { price: "", deliveryDays: 5, revisions: 1 },
      standard: { price: "", deliveryDays: 6, revisions: 2 },
      premium: { price: "", deliveryDays: 8, revisions: 2 },
    },
    pricesSet: false,
    payout: "bank",
    holder: initialName,
    iban: "",
    walletProvider: "",
    walletAccount: "",
    idStatus: "none",
  }));
  const saved = useAutosave(version);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);

  const takenHandles = s.creators.map((creator) => creator.handle);
  const handleStatus = useHandleCheck(data.handle, takenHandles);

  const languagesChosen: LanguageId[] = [
    ...data.dialects,
    ...(presentsEnglish(data.english) ? (["en"] as LanguageId[]) : []),
  ];
  const guide = marketGuide(s.creators, data.formats, languagesChosen);

  // Simulated uploads: advance every in-flight sample until it reaches 100%.
  const uploading = data.samples.some((sample) => sample.progress < 100);
  useEffect(() => {
    if (!uploading) return;
    const timer = window.setInterval(() => {
      update((current) => ({
        samples: current.samples.map((sample) =>
          sample.progress < 100
            ? { ...sample, progress: Math.min(100, sample.progress + 9 + Math.round(Math.random() * 16)) }
            : sample,
        ),
      }));
    }, 240);
    return () => window.clearInterval(timer);
  }, [uploading, update]);

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
  const clearError = (key: string) => {
    if (errors[key]) setErrors((current) => ({ ...current, [key]: null }));
  };

  const applySuggested = (g: MarketGuide) => {
    update({
      pricesSet: true,
      packages: {
        basic: { price: String(g.tiers.basic.price), deliveryDays: g.tiers.basic.deliveryDays, revisions: g.tiers.basic.revisions },
        standard: { price: String(g.tiers.standard.price), deliveryDays: g.tiers.standard.deliveryDays, revisions: g.tiers.standard.revisions },
        premium: { price: String(g.tiers.premium.price), deliveryDays: g.tiers.premium.deliveryDays, revisions: g.tiers.premium.revisions },
      },
    });
  };

  const stepValid = () => {
    const found = validate(step, data, handleStatus);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      focusFirstError();
      return false;
    }
    return true;
  };

  const next = () => {
    if (!stepValid()) return;
    if (step === 3 && !data.pricesSet) applySuggested(guide);
    if (step === 6) {
      setBusy(true);
      window.setTimeout(() => {
        setRole("creator");
        setBusy(false);
        setFinished(true);
      }, 900);
      return;
    }
    setStep(step + 1);
    setFurthest((f) => Math.max(f, step + 1));
  };

  const back = () => {
    setErrors({});
    setStep(Math.max(0, step - 1));
  };

  /** Rail and review "Edit" links: going forward still validates the step you're on. */
  const jump = (index: number) => {
    if (index > step && !stepValid()) return;
    if (index > step && step === 3 && !data.pricesSet) applySuggested(guide);
    setErrors({});
    setStep(index);
  };

  if (finished) return <CreatorDone data={data} />;

  const titles: { title: React.ReactNode; description: string }[] = [
    {
      title: "Set up your creator profile",
      description: "What businesses see first when you pitch.",
    },
    {
      title: "Languages and dialects",
      description: "Only pick dialects you'd present a whole video in.",
    },
    {
      title: "What you make",
      description: "We match you with requests for these.",
    },
    {
      title: "Show your best work",
      description: `Add 1 to ${MAX_SAMPLES} videos. This is how businesses decide.`,
    },
    {
      title: "Set your packages",
      description: "Three clear packages. Change them any time.",
    },
    {
      title: "How you get paid",
      description: "Where your earnings go when a client approves.",
    },
    {
      title: "Review and publish",
      description: "You can edit any of it later.",
    },
  ];

  const aside =
    step <= 2 ? (
      <ProfilePreview data={data} languages={languagesChosen} />
    ) : step === 3 ? (
      <PortfolioTips />
    ) : step === 4 || step === 5 ? (
      <KeepAll standardPrice={Number(data.packages.standard.price) || guide.tiers.standard.price} />
    ) : undefined;

  return (
    <WizardLayout
      eyebrow="Creator setup"
      steps={steps}
      current={step}
      furthest={furthest}
      title={titles[step].title}
      description={titles[step].description}
      saved={saved}
      onJump={jump}
      onBack={step > 0 ? back : undefined}
      onNext={next}
      nextLabel={step === 6 ? (busy ? "Publishing…" : "Publish my profile") : "Continue"}
      busy={busy}
      aside={aside}
    >
      {step === 0 ? (
        <ProfileBasics
          data={data}
          set={set}
          errors={errors}
          handleStatus={handleStatus}
          taken={takenHandles}
        />
      ) : null}
      {step === 1 ? <Languages data={data} set={set} errors={errors} /> : null}
      {step === 2 ? <Work data={data} set={set} errors={errors} /> : null}
      {step === 3 ? (
        <>
          <PortfolioUploader
            samples={data.samples}
            faceId={NEW_FACE}
            niche={data.niches[0] ?? "consumer"}
            formatOptions={data.formats}
            errors={errors}
            onAdd={(files) => {
              update((current) => ({
                samples: [
                  ...current.samples,
                  ...files.map((file, i) =>
                    makeSample(
                      file,
                      current.samples.length + i,
                      current.formats.length === 1 ? current.formats[0] : "",
                    ),
                  ),
                ].slice(0, MAX_SAMPLES),
              }));
              clearError("samples");
            }}
            onChange={(id, patch) => {
              update((current) => ({
                samples: current.samples.map((sample) => (sample.id === id ? { ...sample, ...patch } : sample)),
              }));
              if (patch.title !== undefined) clearError(`title-${id}`);
              if (patch.format !== undefined) clearError(`format-${id}`);
            }}
            onRemove={(id) => {
              const removed = data.samples.find((sample) => sample.id === id);
              update((current) => ({ samples: current.samples.filter((sample) => sample.id !== id) }));
              if (removed && removed.progress >= 100) {
                toast({
                  message: `Removed ${removed.title || removed.fileName}`,
                  tone: "info",
                  action: {
                    label: "Undo",
                    onClick: () =>
                      update((current) => ({
                        samples: [...current.samples, removed].slice(0, MAX_SAMPLES),
                      })),
                  },
                });
              }
            }}
          />
          <GroupError>{errors.samples}</GroupError>
        </>
      ) : null}
      {step === 4 ? (
        <Pricing
          data={data}
          errors={errors}
          guide={guide}
          languages={languagesChosen}
          onPackage={(tier, patch) => {
            update((current) => ({
              pricesSet: true,
              packages: { ...current.packages, [tier]: { ...current.packages[tier], ...patch } },
            }));
            if (patch.price !== undefined) clearError(`price-${tier}`);
          }}
          onSuggested={() => {
            applySuggested(guide);
            setErrors({});
            toast({ message: "Suggested prices applied", tone: "info" });
          }}
        />
      ) : null}
      {step === 5 ? (
        <Payouts
          data={data}
          set={set}
          errors={errors}
          onVerify={() => {
            set({ idStatus: "pending" });
            window.setTimeout(() => {
              update({ idStatus: "verified" });
              toast({ message: "Your ID is verified" });
            }, 3200);
          }}
        />
      ) : null}
      {step === 6 ? <Review data={data} languages={languagesChosen} onEdit={jump} /> : null}
    </WizardLayout>
  );
}

type StepProps = { data: Data; set: (patch: Partial<Data>) => void; errors: Errors };

/* -------------------------------------------------------------------------- */
/* Step 1 · Profile basics                                                     */
/* -------------------------------------------------------------------------- */

function ProfileBasics({
  data,
  set,
  errors,
  handleStatus,
  taken,
}: StepProps & { handleStatus: HandleStatus; taken: string[] }) {
  const kindId = useId();
  const platformsId = useId();
  const statusId = useId();
  const city = cities.find((c) => c.id === data.cityId);
  const suggestions =
    handleStatus === "taken"
      ? [`${data.handle}_`, `${data.handle}.${city ? city.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 6) : "creates"}`, `the.${data.handle}`]
          .map((h) => h.slice(0, 20))
          .filter((h) => handlePattern.test(h) && !taken.includes(h) && h !== data.handle)
      : [];

  return (
    <>
      <TextField
        label="Display name"
        required
        autoComplete="name"
        placeholder="e.g. Layla Mansour"
        hint="Your real name works best."
        value={data.displayName}
        error={errors.displayName}
        onChange={(event) => {
          const displayName = event.target.value;
          const autoHandle = suggestHandle(data.displayName) === data.handle;
          set(autoHandle ? { displayName, handle: suggestHandle(displayName) } : { displayName });
        }}
      />

      <FieldShell
        label="Handle"
        required
        hint={handleStatus === "empty" || handleStatus === "invalid" ? "3–20 characters: lowercase letters, numbers, dots and underscores." : undefined}
        error={errors.handle}
      >
        {({ id, describedBy }) => (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <AtSign
                size={18}
                aria-hidden
                className="y-fg-3 pointer-events-none absolute start-5 top-1/2 -translate-y-1/2"
              />
              <input
                id={id}
                dir="ltr"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={20}
                aria-describedby={[describedBy, statusId].filter(Boolean).join(" ")}
                aria-invalid={errors.handle || handleStatus === "taken" ? true : undefined}
                value={data.handle}
                onChange={(event) =>
                  set({ handle: event.target.value.toLowerCase().replace(/^@/, "").replace(/\s+/g, "") })
                }
                className="y-input ps-12 pe-12"
              />
              <span aria-hidden className="absolute end-4 top-1/2 -translate-y-1/2">
                {handleStatus === "checking" ? (
                  <LoaderCircle size={18} className="y-fg-3 animate-spin" />
                ) : handleStatus === "available" ? (
                  <CircleCheck size={18} className="text-(--y-success)" />
                ) : handleStatus === "taken" ? (
                  <CircleX size={18} className="text-(--y-danger)" />
                ) : null}
              </span>
            </div>
            <p id={statusId} className="y-micro y-fg-2 min-h-5 px-1" aria-live="polite">
              {handleStatus === "checking" ? "Checking availability…" : null}
              {handleStatus === "available" ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-(--y-success)">
                  Handle available · yapp.co/{data.handle}
                </span>
              ) : null}
              {handleStatus === "taken" && !errors.handle ? (
                <span className="font-semibold text-(--y-danger)">That handle is taken.</span>
              ) : null}
            </p>
            {suggestions.length ? (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Available alternatives">
                <span className="y-micro y-fg-2">Try:</span>
                {suggestions.map((suggestion) => (
                  <PillButton
                    key={suggestion}
                    variant="soft"
                    size="sm"
                    onClick={() => set({ handle: suggestion })}
                  >
                    @{suggestion}
                  </PillButton>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </FieldShell>

      <SelectField
        label="City you film in"
        required
        options={cityOptions}
        value={data.cityId}
        error={errors.cityId}
        onChange={(event) => set({ cityId: event.target.value })}
      />

      <div className="flex flex-col gap-3">
        <GroupLabel id={kindId} required>
          What kind of creator are you?
        </GroupLabel>
        <RadioCards<CreatorKind>
          labelledBy={kindId}
          value={data.kind}
          invalid={Boolean(errors.kind)}
          onChange={(kind) => set({ kind })}
          options={creatorKinds.map((kind) => {
            const Icon = kind.icon;
            return { value: kind.id, title: kind.name, body: kind.description, icon: <Icon size={20} /> };
          })}
        />
        <GroupError>{errors.kind}</GroupError>
      </div>

      {data.kind === "influencer" ? (
        <div className="y-enter flex flex-col gap-5 rounded-(--y-r-tile) border border-(--b-line) p-4 md:p-5">
          <TextField
            label="Followers"
            required
            inputMode="numeric"
            placeholder="e.g. 48000"
            hint={
              Number(data.followers) >= 1000
                ? `Shown as ${compact(Number(data.followers))} on your profile.`
                : "Your largest audience on one platform."
            }
            value={data.followers}
            error={errors.followers}
            onChange={(event) => set({ followers: event.target.value.replace(/\D/g, "").slice(0, 9) })}
          />
          <div className="flex flex-col gap-3">
            <GroupLabel id={platformsId} required>
              Where they follow you
            </GroupLabel>
            <div
              role="group"
              aria-labelledby={platformsId}
              data-invalid={errors.platforms ? true : undefined}
              className="flex flex-wrap gap-2"
            >
              {platforms.map((platform) => (
                <FilterChip
                  key={platform.id}
                  pressed={data.platforms.includes(platform.id)}
                  onClick={() => set({ platforms: toggleIn(data.platforms, platform.id) })}
                >
                  {platform.name}
                </FilterChip>
              ))}
            </div>
            <GroupError>{errors.platforms}</GroupError>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2 · Languages                                                          */
/* -------------------------------------------------------------------------- */

function Languages({ data, set, errors }: StepProps) {
  const dialectsId = useId();
  const nativeId = useId();
  const englishId = useId();
  const nativeOptions: LanguageId[] = [...data.dialects, "en"];
  return (
    <>
      <div className="flex flex-col gap-3">
        <GroupLabel id={dialectsId} required>
          Arabic dialects you present in
        </GroupLabel>
        <div
          role="group"
          aria-labelledby={dialectsId}
          data-invalid={errors.dialects ? true : undefined}
          className="flex flex-wrap gap-2"
        >
          {arabicDialects.map((lang) => (
            <FilterChip
              key={lang.id}
              pressed={data.dialects.includes(lang.id)}
              onClick={() => {
                const dialects = toggleIn(data.dialects, lang.id);
                set({
                  dialects,
                  ...(data.native === lang.id && !dialects.includes(lang.id) ? { native: "" } : {}),
                });
              }}
            >
              {lang.short} <span aria-hidden className="opacity-60">·</span>{" "}
              <Ar className="opacity-80">{lang.native}</Ar>
            </FilterChip>
          ))}
        </div>
        <GroupError>{errors.dialects}</GroupError>
      </div>

      <div className="flex flex-col gap-3">
        <GroupLabel id={nativeId} required>
          Your native language
        </GroupLabel>
        <ChipRadioGroup<LanguageId>
          labelledBy={nativeId}
          value={data.native}
          invalid={Boolean(errors.native)}
          onChange={(native) =>
            set(native === "en" ? { native, english: "native" } : { native })
          }
          options={nativeOptions.map((id) => ({
            value: id,
            label:
              id === "en" ? (
                "English"
              ) : (
                <>
                  {languageById[id].short} <Ar className="opacity-80">{languageById[id].native}</Ar>
                </>
              ),
          }))}
        />
        {data.dialects.length === 0 ? (
          <p className="y-micro y-fg-3 px-1">Pick your dialects above to choose one as native.</p>
        ) : null}
        <GroupError>{errors.native}</GroupError>
      </div>

      <div className="flex flex-col gap-3">
        <GroupLabel id={englishId} required>
          English level
        </GroupLabel>
        <ChipRadioGroup<English>
          labelledBy={englishId}
          value={data.english}
          invalid={Boolean(errors.english)}
          onChange={(english) => set({ english })}
          options={englishLevels}
        />
        <p className="y-micro y-fg-3 px-1">
          {presentsEnglish(data.english)
            ? "You'll also see requests for English videos."
            : "Conversational or above adds English requests to your feed."}
        </p>
        <GroupError>{errors.english}</GroupError>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 3 · What you make                                                      */
/* -------------------------------------------------------------------------- */

function Work({ data, set, errors }: StepProps) {
  const formatsId = useId();
  const nichesId = useId();
  const cameraId = useId();
  const faceFormats: FormatId[] = ["selfie-demo", "ugc-review", "problem-skit"];
  const mismatch = data.camera === "voiceover" && data.formats.some((f) => faceFormats.includes(f));
  return (
    <>
      <div className="flex flex-col gap-3">
        <GroupLabel id={formatsId} required>
          Formats you make
        </GroupLabel>
        <CheckCards
          labelledBy={formatsId}
          values={data.formats}
          onToggle={(id) => set({ formats: toggleIn(data.formats, id) })}
          options={formats.map((format) => {
            const Icon = format.icon;
            return { value: format.id, title: format.name, body: format.short, icon: <Icon size={20} /> };
          })}
        />
        <GroupError>{errors.formats}</GroupError>
      </div>

      <div className="flex flex-col gap-3">
        <GroupLabel id={nichesId} required>
          Products you know well
        </GroupLabel>
        <div
          role="group"
          aria-labelledby={nichesId}
          data-invalid={errors.niches ? true : undefined}
          className="flex flex-wrap gap-2"
        >
          {niches.map((niche) => {
            const pressed = data.niches.includes(niche.id);
            return (
              <FilterChip
                key={niche.id}
                pressed={pressed}
                onClick={() => {
                  if (!pressed && data.niches.length >= 4) return;
                  set({ niches: toggleIn(data.niches, niche.id) });
                }}
                className={!pressed && data.niches.length >= 4 ? "opacity-50" : ""}
              >
                {niche.name}
              </FilterChip>
            );
          })}
        </div>
        <p className="y-micro y-fg-3 px-1" aria-live="polite">
          {data.niches.length >= 4 ? "That's 4, the most you can pick. Remove one to swap." : "Pick up to 4."}
        </p>
        <GroupError>{errors.niches}</GroupError>
      </div>

      <div className="flex flex-col gap-3">
        <p id={cameraId} className="y-label">
          On camera or voice only?
        </p>
        <SegmentedToggle<Camera>
          label="On camera or voice only"
          size="md"
          value={data.camera}
          onChange={(camera) => set({ camera })}
          options={[
            { value: "on-camera", label: "On camera" },
            { value: "voiceover", label: "Voice only" },
            { value: "both", label: "Both" },
          ]}
          className="w-fit max-w-full"
        />
        <p className="y-micro y-fg-3 px-1" aria-live="polite">
          {mismatch
            ? "Selfie demos, reviews and skits are usually on camera. Pick “Both” if you're open to it."
            : null}
        </p>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 5 · Pricing                                                            */
/* -------------------------------------------------------------------------- */

function PriceField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
}) {
  return (
    <FieldShell label={label} required hint={hint} error={error} optionalLabel={false}>
      {({ id, describedBy }) => (
        <div className="relative">
          <span aria-hidden className="y-fg-2 pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 font-semibold">
            $
          </span>
          <input
            id={id}
            inputMode="numeric"
            dir="ltr"
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            value={value}
            onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 5))}
            className="y-input y-num ps-9 text-lg font-semibold"
          />
        </div>
      )}
    </FieldShell>
  );
}

function Pricing({
  data,
  errors,
  guide,
  languages: chosen,
  onPackage,
  onSuggested,
}: {
  data: Data;
  errors: Errors;
  guide: MarketGuide;
  languages: LanguageId[];
  onPackage: (tier: PackageTier, patch: Partial<PackageDraft>) => void;
  onSuggested: () => void;
}) {
  const formatNames = data.formats.map((f) => formatById[f].name.toLowerCase());
  const dialectNames = chosen.map((l) => languageById[l].short);
  const basis = guide.matched
    ? `Medians from ${guide.sample} creators who make ${formatNames.slice(0, 2).join(" or ")}${formatNames.length > 2 ? " and more" : ""} in ${dialectNames.slice(0, 2).join(" or ")}${dialectNames.length > 2 ? " and more" : ""}.`
    : `Medians from all ${guide.sample} creators on Yapp (not enough with your exact mix yet).`;

  return (
    <>
      <div className="y-tile flex flex-col gap-4 p-4 md:p-5">
        <div className="flex flex-col gap-1">
          <p className="y-head">Market guide</p>
          <p className="y-small y-fg-2">{basis}</p>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {tiers.map((tier) => (
            <div key={tier} className="flex flex-col gap-0.5 rounded-(--y-r-sm) bg-(--b-bg) p-3">
              <dt className="y-micro y-fg-2">{tierInfo[tier].label}</dt>
              <dd className="y-display y-num text-2xl font-semibold tracking-[-0.03em]">
                {money(guide.tiers[tier].price)}
              </dd>
              <dd className="y-micro y-fg-3">{guide.tiers[tier].deliveryDays} days</dd>
            </div>
          ))}
        </dl>
        <PillButton variant="outline" size="sm" onClick={onSuggested} className="w-fit">
          Use suggested prices
        </PillButton>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {tiers.map((tier) => {
          const pkg = data.packages[tier];
          return (
            <fieldset
              key={tier}
              className="flex flex-col gap-4 rounded-(--y-r-tile) border border-(--b-line) p-4"
            >
              <legend className="sr-only">{tierInfo[tier].label} package</legend>
              <div className="flex flex-col gap-1">
                <p className="y-micro y-fg-2">{tierInfo[tier].label}</p>
                <p className="y-head">{tierInfo[tier].name}</p>
                <p className="y-small y-fg-2">{tierInfo[tier].summary}</p>
              </div>
              <PriceField
                label="Price"
                value={pkg.price}
                error={errors[`price-${tier}`]}
                hint={`Suggested ${money(guide.tiers[tier].price)}`}
                onChange={(price) => onPackage(tier, { price })}
              />
              <SelectField
                label="Delivery"
                required
                value={String(pkg.deliveryDays)}
                onChange={(event) => onPackage(tier, { deliveryDays: Number(event.target.value) })}
                options={Array.from({ length: 14 }, (_, i) => i + 1).map((d) => ({
                  value: String(d),
                  label: `${d} ${d === 1 ? "day" : "days"}`,
                }))}
              />
              <SelectField
                label="Revisions"
                required
                value={String(pkg.revisions)}
                onChange={(event) => onPackage(tier, { revisions: Number(event.target.value) })}
                options={[0, 1, 2, 3, 4].map((r) => ({
                  value: String(r),
                  label: r === 0 ? "No revisions" : `${r} ${r === 1 ? "revision" : "revisions"}`,
                }))}
              />
            </fieldset>
          );
        })}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 6 · Payouts                                                            */
/* -------------------------------------------------------------------------- */

function Payouts({ data, set, errors, onVerify }: StepProps & { onVerify: () => void }) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="y-label">Payout method</p>
        <SegmentedToggle<"bank" | "wallet">
          label="Payout method"
          size="md"
          value={data.payout}
          onChange={(payout) => set({ payout })}
          options={[
            { value: "bank", label: "Bank account" },
            { value: "wallet", label: "Wallet" },
          ]}
          className="w-fit"
        />
      </div>

      {data.payout === "bank" ? (
        <div className="flex flex-col gap-5">
          <TextField
            label="Account holder"
            required
            autoComplete="name"
            value={data.holder}
            error={errors.holder}
            onChange={(event) => set({ holder: event.target.value })}
          />
          <TextField
            label="IBAN"
            required
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            placeholder="AE07 0331 2345 6789 0123 456"
            hint="Starts with your country code. Payouts arrive in 1–3 business days."
            value={data.iban}
            error={errors.iban}
            onChange={(event) => set({ iban: event.target.value.toUpperCase().slice(0, 42) })}
            onBlur={() => data.iban && set({ iban: groupIban(data.iban) })}
          />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
            label="Wallet"
            required
            value={data.walletProvider}
            error={errors.walletProvider}
            onChange={(event) => set({ walletProvider: event.target.value })}
            options={[
              { value: "", label: "Choose a wallet" },
              ...walletProviders.map((w) => ({ value: w, label: w })),
            ]}
          />
          <TextField
            label="Email or phone on the wallet"
            required
            dir="ltr"
            autoComplete="email"
            value={data.walletAccount}
            error={errors.walletAccount}
            hint="Payouts arrive within a day."
            onChange={(event) => set({ walletAccount: event.target.value })}
          />
        </div>
      )}

      <IdVerification status={data.idStatus} onSubmit={onVerify} error={errors.idStatus} />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 7 · Review                                                             */
/* -------------------------------------------------------------------------- */

function ReviewSection({
  title,
  step,
  onEdit,
  children,
}: {
  title: string;
  step: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="y-tile flex flex-col gap-3 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="y-head">{title}</h2>
        <PillButton
          variant="ghost"
          size="sm"
          icon={<Pencil size={15} aria-hidden />}
          onClick={() => onEdit(step)}
          aria-label={`Edit ${title.toLowerCase()}`}
          className="-me-2"
        >
          Edit
        </PillButton>
      </div>
      {children}
    </section>
  );
}

function Review({
  data,
  languages: chosen,
  onEdit,
}: {
  data: Data;
  languages: LanguageId[];
  onEdit: (step: number) => void;
}) {
  const city = cities.find((c) => c.id === data.cityId);
  const faceId = NEW_FACE;
  return (
    <div className="flex flex-col gap-2">
      <ReviewSection title="Profile" step={0} onEdit={onEdit}>
        <div className="flex items-center gap-3">
          <FaceAvatar id={faceId} name="" size={56} />
          <div className="flex min-w-0 flex-col">
            <p className="y-head truncate">{data.displayName}</p>
            <p className="y-small y-fg-2 truncate">
              @{data.handle}
              {city ? ` · ${city.name}` : ""}
              {data.kind ? ` · ${creatorKindById[data.kind].name}` : ""}
            </p>
            {data.kind === "influencer" && data.followers ? (
              <p className="y-micro y-fg-3">
                {compact(Number(data.followers))} followers on {data.platforms.map((p) => platformById[p].short).join(", ")}
              </p>
            ) : null}
          </div>
        </div>
      </ReviewSection>

      <ReviewSection title="Languages" step={1} onEdit={onEdit}>
        <div className="flex flex-wrap gap-1.5">
          {chosen.map((id) => (
            <Chip key={id}>
              {languageById[id].short}
              {id !== "en" ? <Ar className="y-fg-2">{languageById[id].native}</Ar> : null}
              {data.native === id ? <span className="y-fg-2">· native</span> : null}
            </Chip>
          ))}
        </div>
        <p className="y-micro y-fg-3">
          English: {englishLevels.find((l) => l.value === data.english)?.label.toLowerCase() ?? "not set"}
        </p>
      </ReviewSection>

      <ReviewSection title="What you make" step={2} onEdit={onEdit}>
        <div className="flex flex-wrap gap-1.5">
          {data.formats.map((id) => (
            <FormatChip key={id} id={id} />
          ))}
        </div>
        <p className="y-small y-fg-2">
          {data.niches.map((id) => nicheById[id].name).join(", ")} ·{" "}
          {data.camera === "on-camera" ? "On camera" : data.camera === "voiceover" ? "Voice only" : "On camera or voice only"}
        </p>
      </ReviewSection>

      <ReviewSection title="Portfolio" step={3} onEdit={onEdit}>
        <ul className="grid grid-cols-3 gap-2 sm:max-w-sm">
          {data.samples.map((sample) => (
            <li key={sample.id} className="flex flex-col gap-1.5">
              <VideoThumb video={sampleVideo(sample, faceId, data.niches[0] ?? "consumer")} showHook={false} decorative />
              <span className="y-micro y-clamp-2">{sample.title}</span>
            </li>
          ))}
        </ul>
      </ReviewSection>

      <ReviewSection title="Packages" step={4} onEdit={onEdit}>
        <dl className="grid grid-cols-3 gap-2">
          {tiers.map((tier) => {
            const pkg = data.packages[tier];
            return (
              <div key={tier} className="flex flex-col gap-0.5 rounded-(--y-r-sm) bg-(--b-bg) p-3">
                <dt className="y-micro y-fg-2">{tierInfo[tier].label}</dt>
                <dd className="y-display y-num text-2xl font-semibold tracking-[-0.03em]">
                  {money(Number(pkg.price) || 0)}
                </dd>
                <dd className="y-micro y-fg-3">
                  {pkg.deliveryDays}d · {pkg.revisions} rev.
                </dd>
              </div>
            );
          })}
        </dl>
      </ReviewSection>

      <ReviewSection title="Payouts" step={5} onEdit={onEdit}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="y-small inline-flex items-center gap-2">
            {data.payout === "bank" ? <Landmark size={16} aria-hidden /> : <Wallet size={16} aria-hidden />}
            {data.payout === "bank"
              ? `Bank · IBAN ending ${compactIban(data.iban).slice(-4)}`
              : `${data.walletProvider} · ${data.walletAccount}`}
          </span>
          {data.idStatus === "verified" ? (
            <Badge tone="success" icon={<CircleCheck size={14} aria-hidden />}>
              ID verified
            </Badge>
          ) : (
            <Badge tone="info" icon={<LoaderCircle size={14} aria-hidden className="animate-spin" />}>
              ID in review
            </Badge>
          )}
        </div>
      </ReviewSection>

      <p className="y-micro y-fg-3 px-1 pt-2">
        By publishing, you agree to deliver what your packages promise. You can pause your profile
        any time from settings.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Asides                                                                      */
/* -------------------------------------------------------------------------- */

function ProfilePreview({ data, languages: chosen }: { data: Data; languages: LanguageId[] }) {
  const city = cities.find((c) => c.id === data.cityId);
  const meta = [
    data.kind ? creatorKindById[data.kind].name : null,
    chosen.map((id) => languageById[id].short).join(", ") || null,
    data.formats.map((id) => formatById[id].name).join(", ") || null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Block as="section" tone="lavender" pad="md" className="flex flex-col gap-3" aria-label="Profile preview">
      <p className="y-micro y-fg-2">How businesses will see you</p>
      <div className="flex items-center gap-3">
        <FaceAvatar id={NEW_FACE} name="" size={52} />
        <div className="flex min-w-0 flex-col">
          <p className="y-head truncate">{data.displayName.trim() || "Your name"}</p>
          <p className="y-small y-fg-2 truncate">
            @{data.handle || "handle"}
            {city ? ` · ${city.name}` : ""}
          </p>
        </div>
      </div>
      {meta ? <p className="y-small y-fg-2">{meta}</p> : null}
    </Block>
  );
}

function PortfolioTips() {
  const titleId = useId();
  const tips = [
    "Hook in the first 2 seconds",
    "Film the real app on your own phone",
    "Captions on, and one clear ask at the end",
  ];
  return (
    <Block as="section" tone="sky" pad="md" className="flex flex-col gap-3" aria-labelledby={titleId}>
      <h2 id={titleId} className="y-head">
        What converts
      </h2>
      <ol className="flex flex-col gap-2">
        {tips.map((tip, index) => (
          <li key={tip} className="y-small flex items-center gap-3">
            <span aria-hidden className="y-num grid size-6 flex-none place-items-center rounded-full bg-(--b-chip) text-xs font-semibold">
              {index + 1}
            </span>
            {tip}
          </li>
        ))}
      </ol>
    </Block>
  );
}

function KeepAll({ standardPrice }: { standardPrice: number }) {
  const titleId = useId();
  const breakdown = priceBreakdown(standardPrice);
  return (
    <Block as="section" tone="butter" pad="md" className="flex flex-col gap-3" aria-labelledby={titleId}>
      <h2 id={titleId} className="y-head">
        You keep 100%
      </h2>
      <dl className="flex flex-col gap-2">
        <div className="flex justify-between gap-3">
          <dt className="y-small">You earn</dt>
          <dd className="y-num y-head">{money(breakdown.creatorEarns)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="y-small y-fg-2">Business pays, with the 10% fee</dt>
          <dd className="y-num y-small y-fg-2">{money(breakdown.total)}</dd>
        </div>
      </dl>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Done                                                                        */
/* -------------------------------------------------------------------------- */

function CreatorDone({ data }: { data: Data }) {
  const city = cities.find((c) => c.id === data.cityId);
  return (
    <OnboardingDone
      title="Your profile is live"
      lead="Pitch on open requests that match your dialects and formats. Lead with a sharp hook and your closest sample."
      primary={{
        href: "/creator/opportunities",
        label: "Browse open requests",
        body: "Requests matched to your dialects and formats, newest first.",
        icon: <Compass size={20} aria-hidden />,
      }}
      others={[
        {
          href: "/creators/laylatalks",
          label: "View profile",
          icon: <UserRound size={20} aria-hidden />,
        },
        {
          href: "/creator",
          label: "Go to dashboard",
          icon: <LayoutDashboard size={20} aria-hidden />,
        },
      ]}
      note="This demo continues in Layla's creator workspace, where her pitches, commissions and payouts are already in motion."
    >
      <p className="y-small y-fg-2">
        {[
          `@${data.handle}`,
          city?.name,
          ...data.formats.slice(0, 3).map((id) => formatById[id].name),
          `from ${money(Number(data.packages.basic.price) || 0)}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </OnboardingDone>
  );
}
