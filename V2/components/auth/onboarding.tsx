"use client";

import { Clapperboard, Package, Search, ShoppingBag, UserRound, Video } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { cities } from "@/lib/data";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { rememberMode } from "@/lib/mode";
import { actions, useDemo } from "@/lib/store";
import { FEE_PCT, formatById, nicheById } from "@/lib/taxonomy";
import type { PackageTier } from "@/lib/types";

import { GroupError, RadioCards } from "./choice";
import {
  GetPaid,
  KeepAll,
  MakeLite,
  NEW_FACE,
  PortfolioTips,
  Prices,
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
  validatePrices,
  validateProfile,
  validateTikTok,
  validateWork,
  type MakeData,
} from "./make-steps";
import { marketGuide } from "./market";
import { OnboardingDone } from "./onboarding-done";
import {
  AudienceStep,
  CompanyStep,
  ProductStep,
  VoiceStep,
  initialOrderData,
  saveOrderProduct,
  validateAudience,
  validateCompany,
  validateProduct,
  validateVoice,
  type Errors,
  type OrderData,
} from "./order-steps";
import { MAX_SAMPLES, PortfolioUploader, makeSample } from "./portfolio-uploader";
import { ProductPreview } from "./product-preview";
import { FlowLayout, focusFirstError, useAutosave, useWizardData, type WizardStep } from "./wizard";

/**
 * One onboarding for one account type (V1's), as a V2 focused flow: one question per step.
 * Step 1 asks what you want to do first and tailors the rest:
 * - order: you and your company, your first product, who it's for, how it should sound
 *   (the product is saved with `actions.saveProduct`)
 * - make: profile, what you make, portfolio, TikTok (read-only, visual), prices, payouts and ID
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
  | "audience"
  | "voice"
  | "profile"
  | "work"
  | "portfolio"
  | "tiktok"
  | "prices"
  | "paid"
  | "lite";

type Data = { start: Start | ""; name: string } & OrderData & MakeData;

const stepLabels: Record<StepId, string> = {
  start: "Get started",
  company: "You and your company",
  product: "Your first product",
  audience: "Who it's for",
  voice: "Tone and message",
  profile: "Your profile",
  work: "What you make",
  portfolio: "Portfolio",
  tiktok: "TikTok",
  prices: "Your prices",
  paid: "Get paid",
  lite: "Make videos too",
};

const flows: Record<Start, StepId[]> = {
  order: ["start", "company", "product", "audience", "voice"],
  make: ["start", "profile", "work", "portfolio", "tiktok", "prices", "paid"],
  both: ["start", "company", "product", "audience", "voice", "lite"],
};

const isProductStep = (id: StepId) => id === "product" || id === "audience" || id === "voice";

const parseStart = (value: string | null): Start | "" =>
  value === "order" || value === "make" || value === "both" ? value : "";

const titles: Record<StepId, { title: string; description: string }> = {
  start: { title: "What do you want to do first?", description: "One account does both. This only shapes the next few steps." },
  company: { title: "You and your company", description: "Creators see this on your orders." },
  product: { title: "What are the videos about?", description: "Write it once. It fills in every order you place." },
  audience: { title: "Who should the videos reach?", description: "Creators shape the hook around the problem and the people who have it." },
  voice: { title: "How should it sound?", description: "Creators turn this into the hook and the ending." },
  profile: { title: "Set up your creator profile", description: "What brands see first when you pitch or pick a campaign Yapp." },
  work: { title: "What do you make?", description: "We match you with orders for these." },
  portfolio: { title: "Show your best work", description: `Add 1 to ${MAX_SAMPLES} videos. This is how brands decide.` },
  tiktok: { title: "Connect your TikTok", description: "Read-only. It unlocks UGC campaigns that fit your audience." },
  prices: {
    title: "Set your prices",
    description: `Three packages, priced as the brand pays them. You earn ${100 - FEE_PCT}% of each, after Yapp's ${FEE_PCT}% fee.`,
  },
  paid: { title: "Where should we pay you?", description: "Earnings go here when a brand approves your video. A quick ID check comes first." },
  lite: { title: "Make videos too", description: "A creator profile on the same account. Add the rest later in Studio." },
};

type Finished = { start: Start; productId: string | null; creatorHandle?: string };

export function Onboarding() {
  const params = useSearchParams();
  const { signIn } = usePrefs();
  const toast = useToast();
  const s = useDemo();
  const startId = useId();
  const initialName = params.get("name") ?? "";

  const { data, update, version } = useWizardData<Data>(() => ({
    start: parseStart(params.get("start")),
    name: initialName,
    ...initialOrderData(""),
    ...initialMakeData(initialName),
  }));
  const saved = useAutosave(version);
  const [index, setIndex] = useState(0);
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
      case "audience":
        return validateAudience(data);
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
      case "prices":
        return validatePrices(data);
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

  /** Entering "Your prices" for the first time fills in suggested prices. */
  const arrive = (target: number) => {
    if (flow[target] === "prices" && !data.pricesSet) update({ prices: suggestedPrices(guide), pricesSet: true });
    setIndex(target);
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
        rememberMode("layla", "studio");
        const layla = s.accounts.find((a) => a.id === "layla");
        const handle = s.creators.find((c) => c.id === layla?.creatorId)?.handle;
        setFinished({ start, productId: null, creatorHandle: handle });
      } else {
        // Sign in first so the product (and creator profile) land on the right account.
        signIn("nour");
        rememberMode("nour", "order");
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
  ) : stepId === "prices" ? (
    <KeepAll standardPrice={Number(data.prices.standard) || guide.tiers.standard.price} />
  ) : undefined;

  return (
    <FlowLayout
      steps={steps}
      current={index}
      title={titles[stepId].title}
      description={titles[stepId].description}
      saved={index > 0 ? saved : undefined}
      onBack={index > 0 ? back : undefined}
      onNext={next}
      nextLabel={last ? (busy ? "Setting up…" : stepId === "paid" ? "Publish my profile" : "Finish setup") : "Continue"}
      busy={busy}
      onSkip={canSkip ? skip : undefined}
      aside={aside}
      countKnown={Boolean(data.start)}
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
            onChange={(start) => set({ start })}
            options={[
              {
                value: "order",
                title: "Order videos",
                body: "Get videos made for your product: from one creator, from pitches, or as a UGC campaign.",
                icon: <ShoppingBag size={22} />,
              },
              {
                value: "make",
                title: "Make videos",
                body: "Film demos and reviews for apps, and get paid when the brand approves.",
                icon: <Video size={22} />,
              },
              {
                value: "both",
                title: "Both",
                body: "Order for your product and make videos too, from one account.",
                icon: <Clapperboard size={22} />,
              },
            ]}
          />
          <GroupError>{errors.start}</GroupError>
        </div>
      ) : null}
      {stepId === "company" ? <CompanyStep data={data} set={set} errors={errors} prefilled="" /> : null}
      {stepId === "product" ? <ProductStep data={data} set={set} errors={errors} /> : null}
      {stepId === "audience" ? <AudienceStep data={data} set={set} errors={errors} /> : null}
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
      {stepId === "tiktok" ? <TikTokStep data={data} set={set} errors={errors} onConnect={connectTikTok} /> : null}
      {stepId === "prices" ? (
        <Prices
          data={data}
          errors={errors}
          guide={guide}
          onPrice={(tier: PackageTier, value: string) => {
            update((current) => ({ prices: { ...current.prices, [tier]: value } }));
            clearError(`price-${tier}`);
          }}
        />
      ) : null}
      {stepId === "paid" ? (
        <GetPaid
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
      {stepId === "lite" ? <MakeLite data={data} set={set} errors={errors} /> : null}
    </FlowLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* Done                                                                        */
/* -------------------------------------------------------------------------- */

function Done({ data, finished }: { data: Data; finished: Finished }) {
  const city = cities.find((c) => c.id === data.cityId);
  const productName = data.productName.trim();

  if (finished.start === "make") {
    return (
      <OnboardingDone
        title="Your creator profile is ready"
        lead="Studio is where you find work, pitch, deliver and get paid. Lead each pitch with a sharp hook and your closest sample."
        primary={{ href: paths.studio, label: "Go to Studio" }}
        others={[
          {
            href: paths.findWork(),
            label: "Find work",
            meta: "Open custom orders and campaigns that fit what you make",
            icon: <Search size={18} />,
          },
          ...(finished.creatorHandle
            ? [
                {
                  href: paths.creator(finished.creatorHandle),
                  label: "See your public profile",
                  meta: "What brands see",
                  icon: <UserRound size={18} />,
                },
              ]
            : []),
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
        finished.productId
          ? `${productName} is saved and fills in your first order.`
          : "Add your product from Products whenever you're ready.",
        both ? "Your creator profile is ready too: switch to Studio any time." : null,
      ]
        .filter(Boolean)
        .join(" ")}
      primary={{ href: paths.home, label: "Go to Home" }}
      others={[
        {
          href: paths.newOrder(finished.productId ? { product: finished.productId } : {}),
          label: "Place your first order",
          meta: "Order from a creator, post a custom order, or run a UGC campaign",
          icon: <ShoppingBag size={18} />,
        },
        both
          ? { href: paths.findWork(), label: "Find work in Studio", meta: "Custom orders to pitch on and campaigns to pick", icon: <Search size={18} /> }
          : { href: paths.discover(), label: "Browse creators", meta: "Watch their videos first", icon: <Search size={18} /> },
        ...(finished.productId
          ? [
              {
                href: paths.product(finished.productId),
                label: `Add assets to ${productName}`,
                meta: "Logo, screenshots and links creators can use",
                icon: <Package size={18} />,
              },
            ]
          : [{ href: paths.products, label: "Add your product", meta: "It fills in every order", icon: <Package size={18} /> }]),
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
