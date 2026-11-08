"use client";

import { Clapperboard, Compass, House, Package, Search, ShoppingBag, UserRound, Video } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { cities } from "@/lib/data";
import { formatById, nicheById } from "@/lib/taxonomy";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { actions, useDemo } from "@/lib/store";
import type { PackageTier } from "@/lib/types";
import { useToast } from "@/components/ui/toast";

import { GroupError, RadioCards } from "./choice";
import {
  GetPaid,
  KeepAll,
  MakeLite,
  NEW_FACE,
  PortfolioTips,
  ProfileBasics,
  ProfilePreview,
  TikTokStep,
  WhatYouMake,
  initialMakeData,
  suggestedPrices,
  useHandleCheck,
  validateMakeLite,
  validatePaid,
  validatePortfolio,
  validateProfile,
  validateTikTok,
  validateWork,
  type MakeData,
} from "./make-steps";
import { marketGuide } from "./market";
import { OnboardingDone } from "./onboarding-done";
import {
  CompanyStep,
  ProductStep,
  VoiceStep,
  initialOrderData,
  saveOrderProduct,
  validateCompany,
  validateProduct,
  validateVoice,
  type Errors,
  type OrderData,
} from "./order-steps";
import { MAX_SAMPLES, PortfolioUploader, makeSample } from "./portfolio-uploader";
import { ProductPreview } from "./product-preview";
import { WizardLayout, focusFirstError, useAutosave, useWizardData, type WizardStep } from "./wizard";

/* -------------------------------------------------------------------------- */
/* One onboarding for one account type                                         */
/* -------------------------------------------------------------------------- */

/**
 * Step 1 asks what you want to do first and tailors the rest:
 * - order: you and your company, your first product (saved with `actions.saveProduct`), its tone
 * - make: profile, what you make, portfolio, TikTok (read-only, visual), prices + payouts + ID
 * - both: the order steps, then one short "make videos too" step (creates a creator profile)
 *
 * Prototype limitation: the demo continues in a seeded account. Order and Both sign in as Nour
 * (Daftar); Make signs in as Layla, and the new creator profile from that path isn't saved.
 */

type Start = "order" | "make" | "both";
type StepId =
  | "start"
  | "company"
  | "product"
  | "voice"
  | "profile"
  | "work"
  | "portfolio"
  | "tiktok"
  | "paid"
  | "lite";

type Data = { start: Start | ""; name: string } & OrderData & MakeData;

const stepLabels: Record<StepId, string> = {
  start: "Get started",
  company: "You and your company",
  product: "Your first product",
  voice: "Tone and message",
  profile: "Your profile",
  work: "What you make",
  portfolio: "Portfolio",
  tiktok: "TikTok",
  paid: "Get paid",
  lite: "Make videos too",
};

const flows: Record<Start, StepId[]> = {
  order: ["start", "company", "product", "voice"],
  make: ["start", "profile", "work", "portfolio", "tiktok", "paid"],
  both: ["start", "company", "product", "voice", "lite"],
};

const isProductStep = (id: StepId) => id === "product" || id === "voice";

const parseStart = (value: string | null): Start | "" =>
  value === "order" || value === "make" || value === "both" ? value : "";

const titles: Record<StepId, { title: string; description: string }> = {
  start: { title: "What do you want to do first?", description: "One account does both. This only shapes the next few steps." },
  company: { title: "You and your company", description: "Shown on your orders." },
  product: { title: "Your first product", description: "Write it once. It fills in every order." },
  voice: { title: "How should it sound?", description: "Creators turn this into the hook and the ending." },
  profile: { title: "Set up your creator profile", description: "What people see first when you pitch or take a campaign." },
  work: { title: "What you make", description: "We match you with orders for these." },
  portfolio: { title: "Show your best work", description: `Add 1 to ${MAX_SAMPLES} videos. This is how people decide.` },
  tiktok: { title: "Connect your TikTok", description: "Read-only. It unlocks UGC campaigns that fit your audience." },
  paid: { title: "How you get paid", description: "Your prices, where earnings go, and a quick ID check." },
  lite: { title: "Make videos too", description: "A creator profile on the same account. Add the rest later." },
};

type Finished = { start: Start; productId: string | null; creatorHandle?: string };

export function Onboarding() {
  const params = useSearchParams();
  const { signIn } = usePrefs();
  const toast = useToast();
  const s = useDemo();
  const startId = useId();
  const initialName = params.get("name") ?? "";
  const prefilledDomain = params.get("domain") ?? "";

  const { data, update, version } = useWizardData<Data>(() => ({
    start: parseStart(params.get("start")),
    name: initialName,
    ...initialOrderData(prefilledDomain),
    ...initialMakeData(initialName),
  }));
  const saved = useAutosave(version);
  const [index, setIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState<Finished | null>(null);

  const flow = flows[data.start || "order"];
  const stepId = flow[index] ?? "start";
  const last = index === flow.length - 1 && Boolean(data.start);

  const takenHandles = s.creators.map((creator) => creator.handle);
  const handleStatus = useHandleCheck(data.handle, takenHandles);
  const guide = marketGuide(s.creators, data.formats, data.languages);

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

  const validate = (id: StepId): Errors => {
    switch (id) {
      case "start":
        return data.start ? {} : { start: "Choose one to continue. You can do the others later." };
      case "company":
        return validateCompany(data);
      case "product":
        return validateProduct(data);
      case "voice":
        return validateVoice(data);
      case "profile":
        return validateProfile(data, handleStatus);
      case "work":
        return validateWork(data);
      case "portfolio":
        return validatePortfolio(data);
      case "tiktok":
        return validateTikTok(data);
      case "paid":
        return validatePaid(data);
      case "lite":
        return validateMakeLite(data);
    }
  };

  const stepValid = () => {
    const found = validate(stepId);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      focusFirstError();
      return false;
    }
    return true;
  };

  /** Entering "Get paid" for the first time fills in suggested prices. */
  const arrive = (target: number) => {
    if (flow[target] === "paid" && !data.pricesSet) update({ prices: suggestedPrices(guide), pricesSet: true });
    setIndex(target);
    setFurthest((f) => Math.max(f, target));
  };

  /** `final` carries changes made in the same click (state updates land after this runs). */
  const finish = (final: Data = data) => {
    if (!final.start) return;
    const start = final.start;
    setBusy(true);
    window.setTimeout(() => {
      if (start === "make") {
        // Prototype: the demo continues as Layla; the profile from this path isn't saved.
        signIn("layla");
        const layla = s.accounts.find((a) => a.id === "layla");
        const handle = s.creators.find((c) => c.id === layla?.creatorId)?.handle;
        setFinished({ start, productId: null, creatorHandle: handle });
      } else {
        // Sign in first so the product (and creator profile) land on the right account.
        signIn("nour");
        const productId = saveOrderProduct(final);
        let creatorHandle: string | undefined;
        if (start === "both") {
          const creatorId = actions.createCreatorProfile({
            name: "",
            headline: "",
            languages: final.languages,
            formats: final.formats,
          });
          if (final.tiktok.trim()) actions.connectSocial(creatorId, "tiktok", final.tiktok.trim());
          const nour = s.accounts.find((a) => a.id === "nour");
          creatorHandle = s.creators.find((c) => c.id === creatorId)?.handle ?? nour?.reserved.handle;
        }
        setFinished({ start, productId, creatorHandle });
      }
      setBusy(false);
    }, 700);
  };

  const next = () => {
    if (!stepValid()) return;
    const unskip = isProductStep(stepId) && data.skipProduct;
    if (unskip) update({ skipProduct: false });
    if (last) {
      finish(unskip ? { ...data, skipProduct: false } : data);
      return;
    }
    arrive(index + 1);
  };

  /** Rail links: going forward still validates the step you're on (a skipped product can stay skipped). */
  const jump = (target: number) => {
    if (target > index) {
      if (isProductStep(stepId)) {
        const complete = !Object.values(validate(stepId)).some(Boolean);
        if (complete) update({ skipProduct: false });
        else if (!data.skipProduct && !stepValid()) return;
      } else if (!stepValid()) return;
    }
    setErrors({});
    arrive(target);
  };

  const back = () => {
    setErrors({});
    setIndex(Math.max(0, index - 1));
  };

  const skip = () => {
    setErrors({});
    if (isProductStep(stepId)) {
      update({ skipProduct: true });
      toast({ message: "Skipped. Add your product any time from Products.", tone: "info" });
      const after = flow.findIndex((id, i) => i > index && !isProductStep(id));
      if (after === -1) finish({ ...data, skipProduct: true });
      else arrive(after);
    } else if (stepId === "tiktok") {
      update({ tiktok: "", tiktokPhase: "idle" });
      arrive(index + 1);
    }
  };

  const connectTikTok = () => {
    set({ tiktokPhase: "connecting" });
    window.setTimeout(() => update({ tiktokPhase: "checking" }), 1200);
    window.setTimeout(() => update({ tiktokPhase: "done" }), 2400);
  };

  if (finished) return <Done data={data} finished={finished} />;

  const steps: WizardStep[] = flow.map((id) => ({ id, label: stepLabels[id] }));
  const canSkip = isProductStep(stepId) || stepId === "tiktok";
  const aside = isProductStep(stepId) ? (
    <ProductPreview draft={data} skipped={data.skipProduct} />
  ) : stepId === "profile" || stepId === "work" ? (
    <ProfilePreview data={data} />
  ) : stepId === "portfolio" ? (
    <PortfolioTips />
  ) : stepId === "paid" ? (
    <KeepAll standardPrice={Number(data.prices.standard) || guide.tiers.standard.price} />
  ) : undefined;

  return (
    <WizardLayout
      eyebrow="Set up your account"
      steps={steps}
      current={index}
      furthest={furthest}
      title={titles[stepId].title}
      description={titles[stepId].description}
      saved={index > 0 ? saved : undefined}
      onJump={jump}
      onBack={index > 0 ? back : undefined}
      onNext={next}
      nextLabel={last ? (busy ? "Setting up…" : stepId === "paid" ? "Publish my profile" : "Finish setup") : "Continue"}
      busy={busy}
      onSkip={canSkip ? skip : undefined}
      aside={aside}
    >
      {stepId === "start" ? (
        <div className="flex flex-col gap-3">
          <span id={startId} className="sr-only">
            What do you want to do first?
          </span>
          <RadioCards<Start>
            labelledBy={startId}
            size="lg"
            value={data.start}
            invalid={Boolean(errors.start)}
            onChange={(start) => {
              set({ start });
              setFurthest(0);
            }}
            options={[
              {
                value: "order",
                title: "Order videos",
                body: "Get videos made for your product: a custom order or a UGC campaign.",
                icon: <ShoppingBag size={24} />,
                tone: "night",
              },
              {
                value: "make",
                title: "Make videos",
                body: "Film demos and reviews for apps, and get paid.",
                icon: <Video size={24} />,
                tone: "butter",
              },
              {
                value: "both",
                title: "Both",
                body: "Order for your product and make videos too, from one account.",
                icon: <Clapperboard size={24} />,
                tone: "mist",
              },
            ]}
          />
          <GroupError>{errors.start}</GroupError>
        </div>
      ) : null}
      {stepId === "company" ? (
        <CompanyStep data={data} set={set} errors={errors} prefilled={prefilledDomain} />
      ) : null}
      {stepId === "product" ? <ProductStep data={data} set={set} errors={errors} /> : null}
      {stepId === "voice" ? <VoiceStep data={data} set={set} errors={errors} /> : null}
      {stepId === "profile" ? (
        <ProfileBasics data={data} set={set} errors={errors} handleStatus={handleStatus} taken={takenHandles} />
      ) : null}
      {stepId === "work" ? <WhatYouMake data={data} set={set} errors={errors} /> : null}
      {stepId === "portfolio" ? (
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
                    makeSample(file, current.samples.length + i, current.formats.length === 1 ? current.formats[0] : ""),
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
                      update((current) => ({ samples: [...current.samples, removed].slice(0, MAX_SAMPLES) })),
                  },
                });
              }
            }}
          />
          <GroupError>{errors.samples}</GroupError>
        </>
      ) : null}
      {stepId === "tiktok" ? (
        <TikTokStep data={data} set={set} errors={errors} onConnect={connectTikTok} />
      ) : null}
      {stepId === "paid" ? (
        <GetPaid
          data={data}
          set={set}
          errors={errors}
          guide={guide}
          onPrice={(tier: PackageTier, value: string) => {
            update((current) => ({ prices: { ...current.prices, [tier]: value } }));
            clearError(`price-${tier}`);
          }}
          onVerify={() => {
            set({ idStatus: "pending" });
            window.setTimeout(() => {
              update({ idStatus: "verified" });
              toast({ message: "Your ID is verified" });
            }, 3200);
          }}
        />
      ) : null}
      {stepId === "lite" ? <MakeLite data={data} set={set} errors={errors} /> : null}
    </WizardLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* Done                                                                        */
/* -------------------------------------------------------------------------- */

function Done({ data, finished }: { data: Data; finished: Finished }) {
  const city = cities.find((c) => c.id === data.cityId);
  const productName = data.productName.trim();
  const productSaved = Boolean(finished.productId);

  if (finished.start === "make") {
    return (
      <OnboardingDone
        title="Your profile is live"
        lead="Accept orders that match your dialects and formats. Lead with a sharp hook and your closest sample."
        primary={{
          href: paths.explore("orders"),
          label: "Find orders to accept",
          body: "Custom orders to pitch on and UGC campaigns to take a slot in, newest first.",
          icon: <Compass size={20} aria-hidden />,
        }}
        others={[
          ...(finished.creatorHandle
            ? [{ href: paths.creator(finished.creatorHandle), label: "View your profile", icon: <UserRound size={20} aria-hidden /> }]
            : []),
          { href: paths.home, label: "Go to Home", icon: <House size={20} aria-hidden /> },
        ]}
        note="This demo continues as Layla (@laylatalks), whose pitches, videos and payouts are already in motion. The profile you just set up isn't saved in the prototype."
      >
        <p className="y-small y-fg-2">
          {[
            `@${data.handle}`,
            city?.name,
            ...data.formats.slice(0, 3).map((id) => formatById[id].name),
            data.prices.basic ? `from $${data.prices.basic}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </OnboardingDone>
    );
  }

  const both = finished.start === "both";
  return (
    <OnboardingDone
      title={both ? "You're set to order and make" : "You're ready to order"}
      lead={[
        productSaved ? `${productName} is saved and fills in your first order.` : "Add your product from Products whenever you're ready.",
        both ? "Your creator profile is ready too." : null,
      ]
        .filter(Boolean)
        .join(" ")}
      primary={{
        href: paths.newOrder(finished.productId ? { product: finished.productId } : {}),
        label: "Place your first order",
        body: "A custom order that creators pitch on, or a UGC campaign for 10 or more videos at a fixed price.",
        icon: <ShoppingBag size={20} aria-hidden />,
      }}
      others={[
        both
          ? { href: paths.explore("orders"), label: "Find orders to accept", icon: <Compass size={20} aria-hidden /> }
          : { href: paths.explore("creators"), label: "Browse creators", icon: <Search size={20} aria-hidden /> },
        { href: paths.home, label: "Go to Home", icon: <House size={20} aria-hidden /> },
        ...(finished.productId
          ? [{ href: paths.product(finished.productId), label: `Add assets to ${productName}`, icon: <Package size={20} aria-hidden /> }]
          : []),
      ]}
      note={
        both && finished.creatorHandle
          ? `This demo continues as Nour at Daftar, where orders, deliveries and payments are already in motion. Her new creator profile is @${finished.creatorHandle}.`
          : "This demo continues as Nour at Daftar, where orders, deliveries and payments are already in motion."
      }
    >
      <p className="y-small y-fg-2">
        {[data.company.trim(), city?.name, data.industry ? nicheById[data.industry].name : null]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </OnboardingDone>
  );
}
