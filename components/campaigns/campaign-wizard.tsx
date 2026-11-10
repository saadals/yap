"use client";

import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { Celebrate } from "@/components/ui/celebrate";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { money, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { campaignMoney, isCampaign, me } from "@/lib/selectors";
import { actions, useDemo, useHydrated, type DemoState } from "@/lib/store";
import { CAMPAIGN_MIN_VIDEOS, campaignPlatformById, tierById } from "@/lib/taxonomy";

import { Spinner } from "./parts";
import {
  STEPS,
  applyProduct,
  atHandle,
  deadlineOrDefault,
  firstInvalidStep,
  handleFromWebsite,
  suggestedTitle,
  totalFor,
  validateStep,
  type CampaignForm,
  type FieldKey,
} from "./shared";
import {
  CampaignPreview,
  HoldNote,
  PayStep,
  ProductStep,
  SayStep,
  TierStep,
  VideosStep,
  type FormPatch,
  type StepProps,
} from "./wizard-steps";

/**
 * Create a UGC campaign: product → what to say → videos (and the upload deadline) → follower tier →
 * review and pay. The budget and its 10% service fee are charged and held when it publishes. Reads
 * `?product=` to prefill, or `?again=<campaign id>` to
 * start from an earlier campaign. Full page (own AppShell).
 */
export function CampaignWizard() {
  return (
    <AppShell focus>
      <Suspense fallback={<WizardSkeleton />}>
        <WizardGate />
      </Suspense>
    </AppShell>
  );
}

function WizardGate() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const productParam = params.get("product") ?? "";
  const againParam = params.get("again") ?? "";
  if (!hydrated) return <WizardSkeleton />;
  return (
    <WizardLoader key={`${productParam}|${againParam}`} productParam={productParam} againParam={againParam} />
  );
}

function WizardSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading the campaign wizard">
        <div className="y-block y-pad-md flex flex-col gap-4" data-tone="paper">
          <Skeleton className="h-11 w-11" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-3/5" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="grid gap-2 lg:grid-cols-12">
          <div className="y-block y-pad-md flex flex-col gap-4 lg:col-span-7" data-tone="paper">
            <Skeleton className="h-7 w-2/5" />
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-32 !rounded-(--y-r-tile)" />
              <Skeleton className="h-32 !rounded-(--y-r-tile)" />
            </div>
          </div>
          <div className="y-block y-pad-md hidden flex-col gap-3 lg:col-span-5 lg:flex" data-tone="paper">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full !rounded-(--y-r-tile)" />
          </div>
        </div>
      </div>
    </Page>
  );
}

type Init = { form: CampaignForm; step: number; maxStep: number; again?: string };

function initialState(s: DemoState, productParam: string, againParam: string): Init {
  const business = me.business(s);
  const products = s.products.filter((p) => p.businessId === business.id);
  const methods = me.paymentMethods(s);
  const defaultMethod = (methods.find((m) => m.isDefault) ?? methods[0])?.id ?? "";

  // "Run again": start from one of this account's earlier campaigns.
  const again = s.requests.find((r) => r.id === againParam && r.businessId === business.id && r.campaign);
  if (again?.campaign) {
    const terms = again.campaign;
    const form: CampaignForm = {
      productId: products.some((p) => p.id === again.brief.productId) ? again.brief.productId : "",
      quickName: "",
      quickLine: "",
      title: again.title,
      keyMessage: again.brief.keyMessage,
      explainer: terms.explainer
        ? { name: terms.explainer.name, durationSec: terms.explainer.durationSec, source: "upload" }
        : undefined,
      brandHandle: terms.brandHandle,
      platform: terms.platform,
      mustInclude: [...again.brief.mustInclude],
      avoid: [...again.brief.avoid],
      languages: [...again.brief.languages],
      videos: again.slots,
      deadlineDays: deadlineOrDefault(terms.deadlineDays),
      tierId: terms.tierId,
      paymentMethodId: methods.some((m) => m.id === terms.paymentMethodId) ? terms.paymentMethodId : defaultMethod,
    };
    const step = form.productId || !products.length ? 1 : 0;
    return { form, step, maxStep: STEPS.length - 1, again: again.title };
  }

  const fromParam = products.find((p) => p.id === productParam);
  const product = fromParam ?? (products.length === 1 ? products[0] : undefined);
  // Carry the brand account and languages over from this account's last campaign.
  const previous = s.requests
    .filter((r) => r.businessId === business.id && isCampaign(r) && r.campaign)
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))[0];
  const base: CampaignForm = {
    productId: "",
    quickName: "",
    quickLine: "",
    title: "",
    keyMessage: "",
    explainer: undefined,
    brandHandle: previous?.campaign?.brandHandle ?? handleFromWebsite(business.website),
    platform: previous?.campaign?.platform ?? "tiktok",
    mustInclude: [],
    avoid: [],
    languages: previous?.brief.languages ?? [],
    videos: CAMPAIGN_MIN_VIDEOS,
    deadlineDays: deadlineOrDefault(previous?.campaign?.deadlineDays),
    tierId: "t10",
    paymentMethodId: defaultMethod,
  };
  const step = fromParam ? 1 : 0;
  return { form: product ? applyProduct(base, product) : base, step, maxStep: step };
}

function WizardLoader({ productParam, againParam }: { productParam: string; againParam: string }) {
  const s = useDemo();
  // Decide once: the form owns its state from here on.
  const [init] = useState(() => initialState(s, productParam, againParam));
  return <Wizard init={init} />;
}

const stepOfField: Record<FieldKey, number> = {
  product: 0,
  quickName: 0,
  quickLine: 0,
  title: 1,
  keyMessage: 1,
  brandHandle: 1,
  mustInclude: 1,
  videos: 2,
  tierId: 3,
  paymentMethodId: 4,
};

function Wizard({ init }: { init: Init }) {
  const s = useDemo();
  const toast = useToast();
  const [form, setForm] = useState<CampaignForm>(init.form);
  const [step, setStep] = useState(init.step);
  const [maxStep, setMaxStep] = useState(init.maxStep);
  const [attempted, setAttempted] = useState<number[]>([]);
  const [phase, setPhase] = useState<"edit" | "holding" | "done">("edit");
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const timer = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const business = me.business(s);
  const products = s.products.filter((p) => p.businessId === business.id);
  const hasProducts = products.length > 0;
  const product = products.find((p) => p.id === form.productId);
  const last = STEPS.length - 1;
  const stepErrors = validateStep(step, form, hasProducts);
  const stepValid = Object.keys(stepErrors).length === 0;
  const total = totalFor(form);
  const busy = phase !== "edit";

  const set = (patch: FormPatch) =>
    setForm((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
  const error = (field: FieldKey) => {
    const fieldStep = stepOfField[field];
    if (!attempted.includes(fieldStep)) return undefined;
    return validateStep(fieldStep, form, hasProducts)[field];
  };

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(last, target));
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  };

  const focusFirstInvalid = () =>
    window.setTimeout(
      () => document.querySelector<HTMLElement>("[data-invalid='true'], [aria-invalid='true']")?.focus(),
      0,
    );

  const publish = () => {
    const bad = firstInvalidStep(form, hasProducts);
    if (bad >= 0) {
      setAttempted((a) => (a.includes(bad) ? a : [...a, bad]));
      goTo(bad);
      toast({ message: `One thing to fix on "${STEPS[bad].label}" before publishing`, tone: "info" });
      return;
    }
    setPhase("holding");
    timer.current = window.setTimeout(() => {
      let productId = form.productId;
      if (!hasProducts) {
        const line = form.quickLine.trim();
        productId = actions.saveProduct({
          name: form.quickName.trim(),
          oneLiner: line,
          description: line,
          website: business.website,
          niche: business.industry,
          surfaces: [],
          audience: "",
          problem: "",
          features: [],
          tone: [],
          dos: [],
          donts: form.avoid,
          cta: "",
          brandColor: business.brandColor,
        });
      }
      const id = actions.publishCampaign({
        title: form.title.trim(),
        productId,
        brief: {
          keyMessage: form.keyMessage.trim(),
          mustInclude: form.mustInclude.map((x) => x.trim()).filter(Boolean),
          avoid: form.avoid.map((x) => x.trim()).filter(Boolean),
          languages: form.languages.length ? form.languages : undefined,
        },
        videos: form.videos,
        tierId: form.tierId,
        deadlineDays: form.deadlineDays,
        platform: form.platform,
        brandHandle: atHandle(form.brandHandle),
        explainer: form.explainer ? { name: form.explainer.name, durationSec: form.explainer.durationSec } : undefined,
        paymentMethodId: form.paymentMethodId,
      });
      setPublishedId(id);
      setPhase("done");
      window.scrollTo({ top: 0 });
    }, 900);
  };

  const onContinue = () => {
    if (busy) return;
    if (!stepValid) {
      setAttempted((a) => (a.includes(step) ? a : [...a, step]));
      focusFirstInvalid();
      return;
    }
    if (step === last) {
      publish();
      return;
    }
    if (step === 0 && !hasProducts) {
      // Carry the quick product into the brief.
      set((f) => ({
        title: f.title.trim() ? f.title : suggestedTitle({ name: f.quickName.trim() }),
        keyMessage: f.keyMessage.trim() ? f.keyMessage : f.quickLine.trim(),
      }));
    }
    goTo(step + 1);
  };

  if (phase === "done" && publishedId) {
    return <Published s={s} requestId={publishedId} videos={form.videos} />;
  }

  const props: StepProps = { form, set, products, product, error };
  const current = STEPS[step];
  const missing = Object.values(stepErrors)[0];
  const continueLabel =
    phase === "holding" ? `Holding ${money(total)}…` : step === last ? `Hold ${money(total)} and publish` : "Continue";

  const actionsRow = (where: "bar" | "inline") => (
    <>
      {step > 0 ? (
        where === "bar" ? (
          <button
            type="button"
            className="y-round"
            data-tone-btn="soft"
            aria-label={`Back to ${STEPS[step - 1].label}`}
            onClick={() => goTo(step - 1)}
            disabled={busy}
          >
            <ArrowLeft size={20} aria-hidden className="y-flip" />
          </button>
        ) : (
          <PillButton
            variant="ghost"
            icon={<ArrowLeft size={18} aria-hidden className="y-flip" />}
            onClick={() => goTo(step - 1)}
            disabled={busy}
          >
            Back
          </PillButton>
        )
      ) : null}
      <button
        type="button"
        className={`y-pill ${where === "bar" ? "min-w-0 flex-1 justify-between ps-6" : "ms-auto min-w-56 justify-between ps-6"}`}
        data-variant="neon"
        data-arrow="true"
        data-size="lg"
        aria-disabled={!stepValid || busy ? "true" : undefined}
        onClick={onContinue}
      >
        <span className="min-w-0 truncate" aria-live="polite">
          {continueLabel}
          {where === "inline" && step < last && phase === "edit" ? (
            <span className="font-medium"> · {STEPS[step + 1].label}</span>
          ) : null}
        </span>
        <span aria-hidden className="y-arrow">
          {phase === "holding" ? (
            <Spinner />
          ) : step === last ? (
            <Check size={20} />
          ) : (
            <ArrowRight size={20} className="y-flip" />
          )}
        </span>
      </button>
    </>
  );

  return (
    <Page>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        {/* Progress header */}
        <Block tone="paper" pad="md" className="flex flex-col gap-5 lg:col-span-12">
          <div className="flex items-center justify-between gap-3">
            <Link
              href={paths.newOrder()}
              className="y-round"
              data-tone-btn="soft"
              data-size="sm"
              aria-label="Close the campaign wizard"
              title="Close"
            >
              <X size={18} aria-hidden />
            </Link>
            <span className="y-chip">UGC campaign</span>
          </div>
          {init.again ? (
            <p className="y-tile y-small flex items-center gap-2 p-3 ps-4" role="status">
              <RotateCcw size={16} aria-hidden className="flex-none" />
              <span className="min-w-0">
                Starting from <span className="font-semibold">{init.again}</span>. Change anything before you publish.
              </span>
            </p>
          ) : null}
          <div className="flex flex-col gap-1">
            <p className="y-small y-fg-2">
              Step {step + 1} of {STEPS.length}
            </p>
            <h1 ref={headingRef} tabIndex={-1} className="y-display y-t-display outline-none">
              New campaign <span className="y-strong">· {current.label}</span>
            </h1>
          </div>
          <ol className="grid grid-cols-5 gap-1.5" aria-label="Steps">
            {STEPS.map((item, index) => {
              const reachable = index <= maxStep;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    disabled={!reachable || busy}
                    onClick={() => goTo(index)}
                    aria-current={index === step ? "step" : undefined}
                    aria-label={`${item.label}${index < step ? ", done" : index === step ? ", current step" : reachable ? "" : ", not reached yet"}`}
                    className="group flex w-full flex-col gap-2 py-1 text-start disabled:cursor-default"
                  >
                    <span
                      aria-hidden
                      className={`h-2 rounded-full transition-colors ${
                        index <= step ? "bg-(--b-fg)" : reachable ? "bg-(--b-line) group-hover:bg-(--b-fg-3)" : "bg-(--b-chip)"
                      }`}
                    />
                    <span
                      aria-hidden
                      className={`y-micro hidden truncate lg:block ${index === step ? "font-semibold" : "y-fg-3"}`}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Block>

        {/* One step at a time */}
        <div key={step} className="y-enter flex flex-col gap-2 lg:col-span-7">
          {step === 0 ? <ProductStep {...props} /> : null}
          {step === 1 ? <SayStep {...props} /> : null}
          {step === 2 ? <VideosStep {...props} /> : null}
          {step === 3 ? <TierStep {...props} /> : null}
          {step === 4 ? <PayStep {...props} /> : null}
          {step === 4 ? (
            <div className="lg:hidden">
              <HoldNote />
            </div>
          ) : null}

          {/* Desktop actions */}
          <Block tone="paper" pad="none" className="hidden flex-col gap-2 p-3 lg:flex">
            <div className="flex items-center gap-2">{actionsRow("inline")}</div>
            {!stepValid && phase === "edit" && attempted.includes(step) ? (
              <p className="y-micro y-fg-2 px-3 pb-1 text-end" aria-live="polite">
                To continue: {missing?.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())}
              </p>
            ) : null}
          </Block>
        </div>

        {/* Desktop aside */}
        <aside className="hidden lg:col-span-5 lg:block" aria-label={step === last ? "How the hold works" : "Campaign summary"}>
          <div className="sticky top-20 flex flex-col gap-2">
            {step === last ? <HoldNote /> : <CampaignPreview form={form} product={product} />}
          </div>
        </aside>
      </div>

      {/* Mobile actions: at the thumb */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:hidden">
        <div className="y-bar mx-auto flex max-w-md items-center gap-2 rounded-full p-2">{actionsRow("bar")}</div>
      </div>
    </Page>
  );
}

/* -------------------------------------------------------------------------- */
/* Success                                                                     */
/* -------------------------------------------------------------------------- */

function Published({ s, requestId, videos }: { s: DemoState; requestId: string; videos: number }) {
  const request = s.requests.find((r) => r.id === requestId);
  const terms = request?.campaign;
  const slots = request?.slots ?? videos;
  const held = request ? campaignMoney(s, request).held : 0;
  return (
    <Page width="narrow">
      <Block tone="paper" pad="lg" className="flex flex-col items-center gap-6 text-center">
        <Celebrate className="h-40 w-64" />
        <div className="flex flex-col gap-3">
          <h1 className="y-display y-t-display" aria-live="polite">
            Live: {plural(slots, "slot")} open
          </h1>
          <p className="y-lead y-fg-2 mx-auto max-w-[44ch]">
            {terms
              ? `${money(held)} is held, fee included. Creators with ${tierById[terms.tierId].label} real followers on ${campaignPlatformById[terms.platform].name} can take a slot until ${shortDate(terms.closesAt)}. We'll let you know as they join.`
              : "Eligible creators can take a slot now. We'll let you know as they join."}
          </p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-2">
          <PillButton href={paths.order(requestId)} variant="neon" size="lg" arrow className="justify-between ps-6">
            View campaign
          </PillButton>
          <div className="grid grid-cols-2 gap-2">
            <PillButton href={paths.reel(requestId)} variant="outline">
              See it in the feed
            </PillButton>
            <PillButton href={paths.work("ordered")} variant="ghost">
              Back to Work
            </PillButton>
          </div>
        </div>
      </Block>
    </Page>
  );
}
