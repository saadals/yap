"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { moneyExact, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { campaignMoney, me } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { CAMPAIGN_KEEP_LIVE_DAYS, CAMPAIGN_RELEASE_DAYS, campaignPlatformById, tierById } from "@/lib/taxonomy";

import {
  STEPS,
  budgetFor,
  firstInvalidStep,
  initialCampaign,
  stepOfField,
  toCampaignInput,
  validateStep,
  type CampaignForm,
  type CampaignInit,
  type FieldKey,
} from "./campaign-model";
import { CampaignPreview, CreatorsStep, HoldNote, PayStep, RulesStep, SayStep, type CampaignPatch, type CampaignStepProps } from "./campaign-steps";
import { FlowActions, FlowFrame, FlowSkeleton } from "./flow-frame";
import { SuccessScreen } from "./success";

const LAST = STEPS.length - 1;

/**
 * Run a UGC campaign: what to say → creators and price → rules → review and pay. The budget and
 * its 10% service fee are charged and held when it publishes (`actions.publishCampaign`).
 * `?product=` preselects; `?again=` (a campaign or one of its slots) starts from an earlier one.
 */
export function CampaignFlow({ params }: { params: URLSearchParams }) {
  const hydrated = useHydrated();
  if (!hydrated) return <FlowSkeleton label="Loading the campaign" />;
  return <Loader productParam={params.get("product") ?? ""} againParam={params.get("again") ?? ""} />;
}

function Loader({ productParam, againParam }: { productParam: string; againParam: string }) {
  const s = useDemo();
  const [init] = useState(() => initialCampaign(s, productParam, againParam));
  return <Flow init={init} />;
}

function Flow({ init }: { init: CampaignInit }) {
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

  const products = s.products.filter((p) => p.businessId === me.ids(s).businessId);
  const product = products.find((p) => p.id === form.productId);
  const methodIds = me.paymentMethods(s).map((m) => m.id);
  const stepErrors = validateStep(step, form, Boolean(product), methodIds);
  const stepValid = Object.keys(stepErrors).length === 0;
  const total = budgetFor(form).total;
  const busy = phase !== "edit";

  const set = (patch: CampaignPatch) =>
    setForm((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
  const error = (field: FieldKey) =>
    attempted.includes(stepOfField[field]) ? validateStep(stepOfField[field], form, Boolean(product), methodIds)[field] : undefined;

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(LAST, target));
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  };

  const publish = () => {
    const bad = firstInvalidStep(form, Boolean(product), methodIds);
    if (bad >= 0 || !product) {
      const target = bad >= 0 ? bad : 0;
      setAttempted((a) => (a.includes(target) ? a : [...a, target]));
      goTo(target);
      toast({ message: `One thing to fix in "${STEPS[target].label}" before publishing`, tone: "info" });
      return;
    }
    setPhase("holding");
    const input = toCampaignInput(form, product);
    timer.current = window.setTimeout(() => {
      const id = actions.publishCampaign(input);
      setPublishedId(id);
      setPhase("done");
      window.scrollTo({ top: 0 });
    }, 900);
  };

  const onContinue = () => {
    if (busy) return;
    if (!stepValid) {
      setAttempted((a) => (a.includes(step) ? a : [...a, step]));
      window.setTimeout(() => document.querySelector<HTMLElement>("[data-invalid='true'], [aria-invalid='true']")?.focus(), 0);
      return;
    }
    if (step === LAST) publish();
    else goTo(step + 1);
  };

  if (phase === "done" && publishedId) return <Published requestId={publishedId} />;

  const props: CampaignStepProps = { s, form, set, products, product, error };
  const firstError = Object.values(stepErrors)[0];
  const hint =
    !stepValid && attempted.includes(step) && firstError
      ? `To continue: ${firstError.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())}`
      : null;

  return (
    <FlowFrame
      flowName="UGC campaign"
      closeHref={paths.newOrder()}
      closeLabel="Close the campaign"
      steps={STEPS}
      step={step}
      maxStep={maxStep}
      onStep={goTo}
      title={STEPS[step].title}
      lead={STEPS[step].lead}
      headingRef={headingRef}
      banner={
        init.again && step === init.step ? (
          <p className="y-tile y-small flex items-center gap-2 p-3 ps-4" role="status">
            <RotateCcw size={16} aria-hidden className="flex-none" />
            <span className="min-w-0">
              Starting from <span className="font-semibold">{init.again}</span>. Change anything before you publish.
            </span>
          </p>
        ) : null
      }
      previewLabel={step === LAST ? "How the money works" : "What creators see"}
      preview={step === LAST ? <HoldNote /> : <CampaignPreview s={s} form={form} product={product} />}
      bar={
        <FlowActions
          backLabel={step > 0 ? STEPS[step - 1].label : undefined}
          onBack={step > 0 ? () => goTo(step - 1) : undefined}
          hint={hint}
          continueLabel={
            phase === "holding" ? `Holding ${moneyExact(total)}…` : step === LAST ? `Hold ${moneyExact(total)} and publish` : "Continue"
          }
          nextLabel={step < LAST && phase === "edit" ? STEPS[step + 1].label : undefined}
          onContinue={onContinue}
          busy={phase === "holding"}
          blocked={!stepValid}
          final={step === LAST}
        />
      }
    >
      {step === 0 ? <SayStep {...props} /> : null}
      {step === 1 ? <CreatorsStep {...props} /> : null}
      {step === 2 ? <RulesStep {...props} /> : null}
      {step === 3 ? <PayStep {...props} /> : null}
    </FlowFrame>
  );
}

function Published({ requestId }: { requestId: string }) {
  const s = useDemo();
  const request = s.requests.find((r) => r.id === requestId);
  const terms = request?.campaign;
  const held = request ? campaignMoney(s, request).held : 0;
  const platform = terms ? campaignPlatformById[terms.platform].name : "";
  const steps = terms
    ? [
        {
          title: "Creators take slots",
          body: `First come, first served, among creators with ${tierById[terms.tierId].label} real followers on ${platform}. We let you know as they join.`,
        },
        {
          title: "Review copies arrive",
          body: `Each creator uploads within ${plural(terms.deadlineDays, "day")} of taking a slot. Approve it, ask for changes or reject it.`,
        },
        {
          title: "They post, then get paid",
          body: `Tagged ${terms.brandHandle}, labelled, up for ${CAMPAIGN_KEEP_LIVE_DAYS} days. Each creator is paid ${CAMPAIGN_RELEASE_DAYS} days after their post is verified.`,
        },
      ]
    : [];
  return (
    <SuccessScreen
      title="Your campaign is live"
      lead={
        terms
          ? `${moneyExact(held)} is held, fee included. ${plural(request?.slots ?? 0, "slot")} open until ${shortDate(terms.closesAt)}.`
          : "Eligible creators can take a slot now."
      }
      primary={
        <PillButton href={paths.order(requestId)} variant="neon" size="lg" arrow className="justify-between ps-6">
          See your campaign
        </PillButton>
      }
      secondary={
        <PillButton href={paths.orders()} variant="outline" size="lg">
          Back to orders
        </PillButton>
      }
    >
      <div className="flex flex-col gap-4 text-start">
        <h2 className="y-head">What happens next</h2>
        <ol className="flex flex-col gap-4">
          {steps.map((item, index) => (
            <li key={item.title} className="flex items-start gap-3">
              <span className="y-num y-small grid size-7 flex-none place-items-center rounded-full bg-(--y-mist) font-semibold">
                {index + 1}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="y-small font-semibold">{item.title}</span>
                <span className="y-small y-fg-2">{item.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </SuccessScreen>
  );
}
