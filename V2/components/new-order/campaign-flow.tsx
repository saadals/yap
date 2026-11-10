"use client";

import { Check, CircleCheck, History, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { brandHandleFor, platformList } from "@/lib/campaigns";
import { money, plural, shortDate, timeOf } from "@/lib/format";
import { paths } from "@/lib/paths";
import { campaignMoney, me } from "@/lib/selectors";
import { actions, useDemo, useHydrated, type DemoState } from "@/lib/store";
import { CAMPAIGN_KEEP_LIVE_DAYS, CAMPAIGN_RELEASE_DAYS, tierById } from "@/lib/taxonomy";

import {
  LAST_STEP,
  STEPS,
  atHandle,
  deriveCampaign,
  firstInvalidStep,
  initialCampaign,
  normalizeForm,
  stepOfField,
  toCampaignInput,
  validateStep,
  type CampaignBanner,
  type CampaignForm,
  type CampaignInit,
  type FieldKey,
} from "./campaign-model";
import { CampaignPreview, CreatorsStep, HoldNote, PayStep, RulesStep, SayStep, type CampaignPatch, type CampaignStepProps } from "./campaign-steps";
import { FlowActions, FlowFrame, FlowSkeleton } from "./flow-frame";
import { Spinner } from "./parts";
import { SuccessScreen } from "./success";

const LAST = LAST_STEP;

const savedDraft = (s: DemoState) => me.orderDraft<Partial<CampaignForm>>(s, "campaign");

/**
 * Run a UGC campaign: what to say → creators and price → rules → review and pay. The brand sets
 * the price per Yapp; Yapps × price is charged and held when it publishes (`actions.publishCampaign`),
 * nothing on top. The form autosaves as a draft (`actions.saveOrderDraft("campaign", …)`).
 * `?product=` preselects; `?again=` (a campaign or one of its slots) starts from an earlier one.
 */
export function CampaignFlow({ params }: { params: URLSearchParams }) {
  const hydrated = useHydrated();
  if (!hydrated) return <FlowSkeleton label="Loading the campaign" />;
  return <Loader productParam={params.get("product") ?? ""} againParam={params.get("again") ?? ""} />;
}

function Loader({ productParam, againParam }: { productParam: string; againParam: string }) {
  const s = useDemo();
  // Decide once: publishing clears the draft, which must not reset this screen.
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
  const [banner, setBanner] = useState<CampaignBanner>(init.banner);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(init.banner?.kind === "restored" ? "saved" : "idle");
  const [phase, setPhase] = useState<"edit" | "holding" | "done">("edit");
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const timer = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const products = s.products.filter((p) => p.businessId === me.ids(s).businessId);
  const product = products.find((p) => p.id === form.productId);
  const methodIds = me.paymentMethods(s).map((m) => m.id);
  const d = deriveCampaign(s, form, product);
  const stepErrors = validateStep(step, form, d, Boolean(product), methodIds);
  const stepValid = Object.keys(stepErrors).length === 0;
  const busy = phase !== "edit";

  /* ------------------------------------------------------------ autosave */
  useEffect(() => {
    if (!dirty || phase !== "edit") return;
    const id = window.setTimeout(() => {
      actions.saveOrderDraft("campaign", { data: form, title: form.title.trim() || undefined, step });
      setSaveState("saved");
    }, 700);
    return () => window.clearTimeout(id);
  }, [form, step, dirty, phase]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const set = (patch: CampaignPatch) => {
    setForm((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
    setDirty(true);
    setSaveState("saving");
  };
  const error = (field: FieldKey) =>
    attempted.includes(stepOfField(field)) ? validateStep(stepOfField(field), form, d, Boolean(product), methodIds)[field] : undefined;

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(LAST, target));
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
    setDirty(true);
    setBanner(null);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  };

  const publish = () => {
    const bad = firstInvalidStep(form, d, Boolean(product), methodIds);
    if (bad >= 0 || !product) {
      const target = bad >= 0 ? bad : 0;
      setAttempted((a) => (a.includes(target) ? a : [...a, target]));
      goTo(target);
      toast({ message: `One thing to fix in "${STEPS[target].label}" before publishing`, tone: "info" });
      return;
    }
    setPhase("holding");
    const input = toCampaignInput(form, d, product);
    timer.current = window.setTimeout(() => {
      // The handles go back on the brand, so the next campaign starts with them filled in.
      for (const platform of form.platforms) {
        const handle = atHandle(form.handles[platform] ?? "");
        if (handle) actions.saveBrandHandle(platform, handle);
      }
      const id = actions.publishCampaign(input);
      actions.saveOrderDraft("campaign", null);
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
    if (step === LAST) {
      publish();
      return;
    }
    // Fix the price the brand saw, so a later change of product or tier doesn't move it.
    if (step === 1 && form.price === null) set({ price: d.price });
    goTo(step + 1);
  };

  const startOver = () => {
    const previous = savedDraft(s);
    const snapshot = { form, step, maxStep };
    actions.saveOrderDraft("campaign", null);
    setForm(init.fresh);
    setStep(0);
    setMaxStep(0);
    setBanner(null);
    setDirty(false);
    setSaveState("idle");
    setAttempted([]);
    toast({
      message: "Started over",
      action: {
        label: "Undo",
        onClick: () => {
          if (previous) actions.saveOrderDraft("campaign", { data: previous.data, title: previous.title, step: previous.step });
          setForm(snapshot.form);
          setStep(snapshot.step);
          setMaxStep(snapshot.maxStep);
          setSaveState("saved");
        },
      },
    });
  };

  const resume = () => {
    const draft = savedDraft(s);
    if (!draft) return;
    const restoredStep = Math.min(Math.max(0, draft.step ?? 0), LAST);
    setForm(normalizeForm(init.fresh, draft.data));
    setStep(restoredStep);
    setMaxStep(restoredStep);
    setBanner({ kind: "restored", at: draft.savedAt });
    setDirty(false);
    setSaveState("saved");
  };

  if (phase === "done" && publishedId) return <Published requestId={publishedId} />;

  const props: CampaignStepProps = { s, form, d, set, products, product, error, goTo };
  const firstError = Object.values(stepErrors)[0];
  const hint =
    !stepValid && attempted.includes(step) && firstError
      ? `To continue: ${firstError.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())}`
      : null;
  const draftNow = savedDraft(s);
  const savedLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" && draftNow ? `Draft saved ${timeOf(draftNow.savedAt)}` : "Saves as you go";

  const bannerNode = banner ? (
    <div className="y-tile flex flex-wrap items-center gap-3 p-3 ps-4" role="status">
      {banner.kind === "again" ? <RotateCcw size={16} aria-hidden className="flex-none" /> : <History size={16} aria-hidden className="flex-none" />}
      <p className="y-small min-w-0 flex-1">
        {banner.kind === "restored" ? (
          `Picked up your campaign draft from ${timeOf(banner.at)}.`
        ) : banner.kind === "available" ? (
          `You have an unfinished UGC campaign from ${timeOf(banner.at)}. Carrying on here replaces it.`
        ) : (
          <>
            Starting from <span className="font-semibold">{banner.title}</span>. Change anything before you publish.
          </>
        )}
      </p>
      {banner.kind === "restored" ? (
        <PillButton size="sm" variant="ghost" onClick={startOver}>
          Start over
        </PillButton>
      ) : banner.kind === "available" ? (
        <>
          <PillButton size="sm" variant="soft" onClick={resume}>
            Resume it
          </PillButton>
          <PillButton size="sm" variant="ghost" onClick={() => setBanner(null)}>
            Not now
          </PillButton>
        </>
      ) : null}
    </div>
  ) : null;

  return (
    <FlowFrame
      flowName="UGC campaign"
      closeHref={paths.newOrder()}
      closeLabel="Close. Your progress is saved."
      steps={STEPS}
      step={step}
      maxStep={maxStep}
      onStep={goTo}
      title={STEPS[step].title}
      lead={STEPS[step].lead}
      headingRef={headingRef}
      status={
        <span className="y-micro y-fg-2 hidden flex-none items-center gap-1.5 sm:inline-flex" role="status" aria-live="polite">
          {saveState === "saving" ? <Spinner size={12} /> : saveState === "saved" ? <Check size={14} aria-hidden /> : null}
          {savedLabel}
        </span>
      }
      banner={bannerNode}
      previewLabel={step === LAST ? "How the money works" : "What creators see"}
      preview={step === LAST ? <HoldNote /> : <CampaignPreview s={s} form={form} d={d} product={product} />}
      bar={
        <FlowActions
          backLabel={step > 0 ? STEPS[step - 1].label : undefined}
          onBack={step > 0 ? () => goTo(step - 1) : undefined}
          hint={hint}
          continueLabel={
            phase === "holding"
              ? `Holding ${money(d.budget.total)}…`
              : step === LAST
                ? `Hold ${money(d.budget.total)} and publish`
                : "Continue"
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
  const tags = terms ? terms.platforms.map((p) => brandHandleFor(terms, p)) : [];
  const steps = terms
    ? [
        {
          title: "Creators pick slots",
          body: `First come, first served, among creators with ${tierById[terms.tierId].label} real followers on ${platformList(terms.platforms)}. We let you know as they join.`,
        },
        {
          title: "Review copies arrive",
          body: `Each creator uploads within ${plural(terms.deadlineDays, "day")} of picking. Approve it, request changes or reject it.`,
        },
        {
          title: "They post, then get paid",
          body: `Each post tags ${[...new Set(tags)].join(" or ")}, carries the paid-partnership label and stays up ${CAMPAIGN_KEEP_LIVE_DAYS} days. Pay is released ${CAMPAIGN_RELEASE_DAYS} days after the post is verified.`,
        },
      ]
    : [];
  return (
    <SuccessScreen
      icon={<CircleCheck size={28} aria-hidden />}
      title="Your campaign is live"
      lead={
        terms
          ? `${money(held)} is held. ${plural(request?.slots ?? 0, "slot")} open until ${shortDate(terms.closesAt)}.`
          : "Eligible creators can pick a slot now."
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
