"use client";

import { ArrowLeft, ArrowRight, Check, History, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { Celebrate } from "@/components/ui/celebrate";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarStack } from "@/components/ui/face-avatar";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { moneyRange, plural, timeOf, weekdayDate } from "@/lib/format";
import { ME, actions, useDemo, useHydrated, type DemoState, type RequestDraft } from "@/lib/store";
import type { Product } from "@/lib/types";

import {
  BUDGET_FLOOR,
  STEPS,
  applyProduct,
  briefStrength,
  defaultForm,
  draftCopy,
  dueDateFor,
  effectiveTitle,
  firstInvalidStep,
  formFromDraft,
  formFromRequest,
  formToBrief,
  formToDraft,
  marketFor,
  validateStep,
  type FieldKey,
  type WizardForm,
} from "./shared";
import type { FormPatch, StepProps } from "./step-props";
import { DeliverablesStep, FormatStep, LanguageStep, ProductStep } from "./steps-basics";
import { BriefStrengthBlock, DirectionStep } from "./steps-direction";
import { BudgetStep, ReviewStep, WhoStep } from "./steps-terms";
import { RequestPreview } from "./wizard-preview";

/* -------------------------------------------------------------------------- */
/* Entry: wait for the persisted store, then decide what we're editing         */
/* -------------------------------------------------------------------------- */

type Banner = { kind: "restored" | "available"; at: string } | null;

type WizardInit = {
  mode: "new" | "draft";
  draftId?: string;
  form: WizardForm;
  step: number;
  maxStep: number;
  banner: Banner;
  /** Product passed in the URL, used when the business discards a restored draft. */
  paramProductId?: string;
};

type InitResult =
  | ({ kind: "ok" } & WizardInit)
  | { kind: "missing" }
  | { kind: "live"; requestId: string };

function initialState(s: DemoState, params: URLSearchParams): InitResult {
  const products = s.products.filter((p) => p.businessId === ME.businessId);
  const draftId = params.get("draft");
  if (draftId) {
    const request = s.requests.find((r) => r.id === draftId);
    if (!request || request.businessId !== ME.businessId) return { kind: "missing" };
    if (request.status !== "draft") return { kind: "live", requestId: request.id };
    const form = formFromRequest(s, request);
    const product = products.find((p) => p.id === form.productId);
    const bad = firstInvalidStep(form, product);
    const step = bad >= 0 ? bad : STEPS.length - 1;
    return { kind: "ok", mode: "draft", draftId, form, step, maxStep: step, banner: null };
  }

  const paramProduct = products.find((p) => p.id === params.get("product"));
  const paramCreator = s.creators.find((c) => c.id === params.get("creator"));
  const draft = s.requestDraft;
  let form: WizardForm;
  let step = 0;
  let banner: Banner = null;
  if (draft && (!paramProduct || !draft.brief.productId || draft.brief.productId === paramProduct.id)) {
    form = formFromDraft(s, draft);
    if (paramProduct && !form.productId) form = applyProduct(form, paramProduct);
    step = Math.min(draft.step, STEPS.length - 1);
    banner = { kind: "restored", at: draft.savedAt };
  } else {
    form = defaultForm(s, paramProduct ?? (products.length === 1 ? products[0] : undefined));
    step = form.productId ? 1 : 0;
    if (draft) banner = { kind: "available", at: draft.savedAt };
  }
  if (paramCreator && !form.invitedCreatorIds.includes(paramCreator.id)) {
    form = { ...form, invitedCreatorIds: [...form.invitedCreatorIds, paramCreator.id] };
  }
  return {
    kind: "ok",
    mode: "new",
    form,
    step,
    maxStep: step,
    banner,
    paramProductId: paramProduct?.id,
  };
}

export function RequestWizardPage() {
  return (
    <AppShell role="business" focus>
      <Suspense fallback={<WizardSkeleton />}>
        <WizardGate />
      </Suspense>
    </AppShell>
  );
}

function WizardGate() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  if (!hydrated) return <WizardSkeleton />;
  return <WizardLoader key={params.toString()} params={new URLSearchParams(params.toString())} />;
}

function WizardLoader({ params }: { params: URLSearchParams }) {
  const s = useDemo();
  // Decide once: publishing a draft must not flip this screen to "already live".
  const [init] = useState(() => initialState(s, params));
  if (init.kind === "missing") {
    return (
      <Page width="narrow">
        <Block tone="paper" pad="lg">
          <EmptyState
            title="We couldn't find that draft"
            body="It may have been published or deleted. Your other requests are all in one place."
            shape="dome"
            tint="violet"
            action={
              <PillButton href="/business/requests" variant="contrast">
                Back to requests
              </PillButton>
            }
          />
        </Block>
      </Page>
    );
  }
  if (init.kind === "live") {
    return (
      <Page width="narrow">
        <Block tone="paper" pad="lg">
          <EmptyState
            title="This request is already live"
            body="It's published, so creators may be pitching. You can still change the budget, deadline and who can pitch from the request."
            shape="pill"
            tint="mint"
            face="smile"
            action={
              <PillButton href={`/business/requests/${init.requestId}`} variant="contrast" arrow>
                Open the request
              </PillButton>
            }
          />
        </Block>
      </Page>
    );
  }
  return <Wizard init={init} />;
}

function WizardSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading the request wizard">
        <div className="y-block y-pad-md flex flex-col gap-4" data-tone="paper">
          <Skeleton className="h-11 w-11" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-3/5" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="grid gap-2 lg:grid-cols-12">
          <div className="y-block y-pad-md flex flex-col gap-4 lg:col-span-7" data-tone="paper">
            <Skeleton className="h-7 w-2/5" />
            <Skeleton className="h-4 w-4/5" />
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

/* -------------------------------------------------------------------------- */
/* The wizard                                                                  */
/* -------------------------------------------------------------------------- */

const stepOfField: Record<FieldKey, number> = {
  product: 0,
  format: 1,
  platforms: 2,
  languages: 3,
  audience: 4,
  goal: 4,
  keyMessage: 4,
  budget: 5,
  deadline: 5,
  invites: 6,
  title: 7,
};

const withoutStamp = (draft: RequestDraft): Omit<RequestDraft, "savedAt"> => {
  const copy: Partial<RequestDraft> = { ...draft };
  delete copy.savedAt;
  return copy as Omit<RequestDraft, "savedAt">;
};

function Wizard({ init }: { init: WizardInit }) {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<WizardForm>(init.form);
  const [step, setStep] = useState(init.step);
  const [maxStep, setMaxStep] = useState(init.maxStep);
  const [touched, setTouched] = useState<FieldKey[]>([]);
  const [attempted, setAttempted] = useState<number[]>([]);
  const [banner, setBanner] = useState<Banner>(init.banner);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    init.mode === "draft" || init.banner?.kind === "restored" ? "saved" : "idle",
  );
  const [phase, setPhase] = useState<"edit" | "publishing" | "leaving" | "done">("edit");
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [helping, setHelping] = useState(false);
  const [helped, setHelped] = useState(false);
  const timers = useRef({ stream: 0, publish: 0 });
  const headingRef = useRef<HTMLHeadingElement>(null);

  const products = s.products.filter((p) => p.businessId === ME.businessId);
  const product = products.find((p) => p.id === form.productId);
  const market = marketFor(s, form.format, form.languages, form.videoCount, form.budget, form.durationSec);
  const strength = briefStrength(form, product);
  const stepErrors = validateStep(step, form, product);
  const stepValid = Object.keys(stepErrors).length === 0;
  const last = STEPS.length - 1;
  const busy = phase !== "edit" || helping;

  /* ------------------------------------------------------------ autosave */
  useEffect(() => {
    if (!dirty || phase !== "edit") return;
    const timer = window.setTimeout(() => {
      if (init.mode === "draft" && init.draftId) {
        actions.updateRequest(init.draftId, {
          title: effectiveTitle(form, product),
          brief: formToBrief(form),
          budget: form.budget,
          dueDate: dueDateFor(Number.isFinite(form.dueInDays) ? form.dueInDays : 14),
          visibility: form.visibility,
          invitedCreatorIds: form.invitedCreatorIds,
          preferredKinds: form.preferredKinds,
        });
      } else {
        actions.saveRequestDraft(formToDraft(form, step, product));
      }
      setSaveState("saved");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [form, step, dirty, phase, product, init.mode, init.draftId]);

  useEffect(() => {
    const t = timers.current;
    return () => {
      window.clearInterval(t.stream);
      window.clearTimeout(t.publish);
    };
  }, []);

  /* ------------------------------------------------------------- helpers */
  const set = (patch: FormPatch) => {
    setForm((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
    setDirty(true);
    setSaveState("saving");
  };
  const touch = (field: FieldKey) =>
    setTouched((current) => (current.includes(field) ? current : [...current, field]));
  const error = (field: FieldKey) => {
    const fieldStep = stepOfField[field];
    const message = validateStep(fieldStep, form, product)[field];
    if (!message) return undefined;
    return touched.includes(field) || attempted.includes(fieldStep) ? message : undefined;
  };

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(last, target));
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
    setDirty(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  };

  const payload = () => ({
    title: effectiveTitle(form, product).trim(),
    brief: formToBrief(form),
    budget: form.budget,
    dueDate: dueDateFor(Number.isFinite(form.dueInDays) ? form.dueInDays : 14),
    visibility: form.visibility,
    invitedCreatorIds: form.invitedCreatorIds,
    preferredKinds: form.preferredKinds,
  });

  const publish = () => {
    const bad = firstInvalidStep(form, product);
    if (bad >= 0) {
      setAttempted((a) => (a.includes(bad) ? a : [...a, bad]));
      goTo(bad);
      toast({ message: `One thing to fix on "${STEPS[bad].label}" before publishing`, tone: "info" });
      return;
    }
    setPhase("publishing");
    const data = payload();
    timers.current.publish = window.setTimeout(() => {
      let id: string;
      if (init.mode === "draft" && init.draftId) {
        id = init.draftId;
        // Re-send invites after publishing so invited creators are notified.
        actions.updateRequest(id, { ...data, invitedCreatorIds: [] });
        actions.publishDraft(id);
        data.invitedCreatorIds.forEach((creatorId) => actions.inviteToRequest(id, creatorId));
      } else {
        id = actions.createRequest({ ...data, status: "open" });
      }
      setPublishedId(id);
      setPhase("done");
      window.scrollTo({ top: 0 });
    }, 700);
  };

  const onContinue = () => {
    if (busy) return;
    if (!stepValid) {
      setAttempted((a) => (a.includes(step) ? a : [...a, step]));
      window.setTimeout(
        () => document.querySelector<HTMLElement>("[data-invalid='true'], [aria-invalid='true']")?.focus(),
        0,
      );
      return;
    }
    if (step === last) {
      publish();
      return;
    }
    const next = step + 1;
    if (next === 5 && !form.budgetTouched && market.count >= 3) {
      const min = Math.max(BUDGET_FLOOR, market.low);
      setForm((f) => ({ ...f, budget: { min, max: Math.max(min, market.high) } }));
    }
    goTo(next);
  };

  const saveAsDraft = () => {
    if (busy) return;
    if (!product || !form.format) {
      toast({ message: "Pick a product and a format first, then you can save it as a draft.", tone: "info" });
      return;
    }
    setPhase("leaving");
    const data = payload();
    if (init.mode === "draft" && init.draftId) actions.updateRequest(init.draftId, data);
    else actions.createRequest({ ...data, title: data.title || "Untitled request", status: "draft" });
    toast({ message: "Saved to your drafts. Pick it up any time." });
    router.push("/business/requests?tab=drafts");
  };

  const discard = () => {
    const previous = s.requestDraft;
    const snapshot = { form, step, maxStep, banner };
    actions.saveRequestDraft(null);
    const paramProduct = products.find((p) => p.id === init.paramProductId);
    setForm(defaultForm(s, paramProduct ?? (products.length === 1 ? products[0] : undefined)));
    setStep(paramProduct ? 1 : 0);
    setMaxStep(paramProduct ? 1 : 0);
    setBanner(null);
    setDirty(false);
    setSaveState("idle");
    setTouched([]);
    setAttempted([]);
    toast({
      message: "Draft discarded",
      action: {
        label: "Undo",
        onClick: () => {
          if (previous) actions.saveRequestDraft(withoutStamp(previous));
          setForm(snapshot.form);
          setStep(snapshot.step);
          setMaxStep(snapshot.maxStep);
          setBanner(snapshot.banner);
          setSaveState("saved");
        },
      },
    });
  };

  const resume = () => {
    const draft = s.requestDraft;
    if (!draft) return;
    setForm(formFromDraft(s, draft));
    setStep(Math.min(draft.step, last));
    setMaxStep(Math.min(draft.step, last));
    setBanner({ kind: "restored", at: draft.savedAt });
    setDirty(false);
    setSaveState("saved");
  };

  /* --------------------------------------------- "Help me write this" */
  const stopHelp = () => {
    window.clearInterval(timers.current.stream);
    setHelping(false);
  };
  const startHelp = () => {
    if (!product || helping) return;
    const target = draftCopy(form, product);
    const before = { goal: form.goal, keyMessage: form.keyMessage };
    const goalWords = target.goal.split(" ");
    const keyWords = target.keyMessage.split(" ");
    const ticks = 20;
    let tick = 0;
    setHelping(true);
    set({ audience: form.audience.trim() ? form.audience : product.audience, goal: "", keyMessage: "" });
    window.clearInterval(timers.current.stream);
    timers.current.stream = window.setInterval(() => {
      tick += 1;
      const share = tick / ticks;
      setForm((f) => ({
        ...f,
        goal: goalWords.slice(0, Math.ceil(goalWords.length * share)).join(" "),
        keyMessage: keyWords.slice(0, Math.ceil(keyWords.length * share)).join(" "),
      }));
      if (tick >= ticks) {
        window.clearInterval(timers.current.stream);
        setHelping(false);
        setHelped(true);
        setDirty(true);
        setSaveState("saving");
        if (before.goal.trim() || before.keyMessage.trim()) {
          toast({
            message: "Wrote a new goal and key message",
            action: { label: "Undo", onClick: () => set(before) },
          });
        }
      }
    }, 50);
  };

  /* --------------------------------------------------------- done */
  if (phase === "done" && publishedId) {
    return <PublishedScreen s={s} requestId={publishedId} form={form} product={product} marketCount={market.count} />;
  }

  const props: StepProps = {
    s,
    form,
    set,
    product,
    products,
    market,
    error,
    touch,
    goTo,
  };
  const current = STEPS[step];
  const missing = Object.values(stepErrors)[0];
  const savedLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? init.mode === "draft"
          ? "Saved to drafts"
          : s.requestDraft
            ? `Draft saved ${timeOf(s.requestDraft.savedAt)}`
            : "Draft saved"
        : "Saves as you go";
  const continueLabel =
    phase === "publishing"
      ? "Publishing…"
      : step === last
        ? "Publish request"
        : `Continue`;

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
        className={`y-pill ${where === "bar" ? "flex-1 justify-between ps-6" : "ms-auto min-w-56 justify-between ps-6"}`}
        data-variant="neon"
        data-arrow="true"
        data-size="lg"
        aria-disabled={!stepValid || busy ? "true" : undefined}
        onClick={onContinue}
      >
        <span>
          {continueLabel}
          {where === "inline" && step < last && phase === "edit" ? (
            <span className="font-medium"> · {STEPS[step + 1].label}</span>
          ) : null}
        </span>
        <span aria-hidden className="y-arrow">
          {phase === "publishing" ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
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
              href="/business/requests"
              className="y-round"
              data-tone-btn="soft"
              data-size="sm"
              aria-label="Close. Your progress is saved."
              title="Close"
            >
              <X size={18} aria-hidden />
            </Link>
            <div className="flex items-center gap-2">
              <span className="y-chip hidden sm:inline-flex" role="status" aria-live="polite">
                {saveState === "saving" ? (
                  <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                ) : (
                  <Check size={14} aria-hidden />
                )}
                {savedLabel}
              </span>
              <PillButton size="sm" variant="outline" onClick={saveAsDraft} disabled={busy}>
                {init.mode === "draft" ? "Save and exit" : "Save as draft"}
              </PillButton>
            </div>
          </div>

          {banner ? (
            <div className="y-tile flex flex-wrap items-center gap-3 p-3 ps-4" role="status">
              <History size={18} aria-hidden className="flex-none" />
              <p className="y-small min-w-0 flex-1">
                {banner.kind === "restored"
                  ? `Restored your draft from ${timeOf(banner.at)}. Pick up where you left off.`
                  : `You have an unfinished request from ${timeOf(banner.at)}. Carrying on here replaces it.`}
              </p>
              {banner.kind === "restored" ? (
                <PillButton size="sm" variant="ghost" onClick={discard}>
                  Discard
                </PillButton>
              ) : (
                <>
                  <PillButton size="sm" variant="contrast" onClick={resume}>
                    Resume it
                  </PillButton>
                  <PillButton size="sm" variant="ghost" onClick={() => setBanner(null)}>
                    Not now
                  </PillButton>
                </>
              )}
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <p className="y-small y-fg-2">
              {init.mode === "draft" ? "Editing a draft · " : ""}Step {step + 1} of {STEPS.length}
            </p>
            <h1 ref={headingRef} tabIndex={-1} className="y-display y-t-display outline-none">
              {init.mode === "draft" ? "Your request" : "New request"} <span className="y-strong">· {current.label}</span>
            </h1>
          </div>
          <ol className="grid grid-cols-8 gap-1.5" aria-label="Steps">
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

        {/* Questions: one per block */}
        <div key={step} className="y-enter flex flex-col gap-2 lg:col-span-7">
          {step === 0 ? <ProductStep {...props} /> : null}
          {step === 1 ? <FormatStep {...props} /> : null}
          {step === 2 ? <DeliverablesStep {...props} /> : null}
          {step === 3 ? <LanguageStep {...props} /> : null}
          {step === 4 ? (
            <DirectionStep
              {...props}
              strength={strength}
              helper={{ running: helping, used: helped, start: startHelp, stop: stopHelp }}
            />
          ) : null}
          {step === 5 ? <BudgetStep {...props} /> : null}
          {step === 6 ? <WhoStep {...props} /> : null}
          {step === 7 ? <ReviewStep {...props} /> : null}

          {/* Desktop actions */}
          <Block tone="paper" pad="none" className="hidden flex-col gap-2 p-3 lg:flex">
            <div className="flex items-center gap-2">{actionsRow("inline")}</div>
            {!stepValid && phase === "edit" ? (
              <p className="y-micro y-fg-2 px-3 pb-1 text-end" aria-live="polite">
                To continue: {missing?.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())}
              </p>
            ) : null}
          </Block>
          {!stepValid && phase === "edit" ? (
            <p className="y-small y-fg-2 px-2 pt-1 lg:hidden" aria-live="polite">
              To continue: {missing?.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())}
            </p>
          ) : null}
        </div>

        {/* Live preview (desktop) */}
        <aside className="hidden lg:col-span-5 lg:block" aria-label="Live preview">
          <div className="sticky top-20 flex flex-col gap-2">
            {step === 4 ? <BriefStrengthBlock strength={strength} /> : null}
            <RequestPreview s={s} form={form} product={product} market={market} />
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

function PublishedScreen({
  s,
  requestId,
  form,
  product,
  marketCount,
}: {
  s: DemoState;
  requestId: string;
  form: WizardForm;
  product?: Product;
  marketCount: number;
}) {
  const request = s.requests.find((r) => r.id === requestId);
  const invited = (request?.invitedCreatorIds ?? form.invitedCreatorIds)
    .map((id) => s.creators.find((c) => c.id === id))
    .filter((c) => c !== undefined);
  const title = request?.title ?? effectiveTitle(form, product);
  return (
    <Page width="narrow">
      <Block tone="paper" pad="lg" className="flex flex-col items-center gap-6 text-center">
        <Celebrate className="h-40 w-64" />
        <div className="flex flex-col gap-3">
          <h1 className="y-display y-t-display" aria-live="polite">
            Your request is live
          </h1>
          <p className="y-lead y-fg-2 mx-auto max-w-[44ch]">
            Creators who fit will start pitching. Most requests get their first pitch within 3 hours.
          </p>
        </div>
        <div className="y-tile flex w-full max-w-md flex-col gap-3 p-4 text-start">
          <p className="y-head">{title}</p>
          <p className="y-small y-fg-2">
            {moneyRange(form.budget.min, form.budget.max)} · Due {weekdayDate(dueDateFor(form.dueInDays))}
          </p>
          <p className="y-small flex flex-wrap items-center gap-2">
            {invited.length ? (
              <AvatarStack size={24} people={invited.map((c) => ({ id: c.id, name: c.name }))} />
            ) : null}
            {form.visibility === "invite"
              ? `We've invited ${plural(invited.length, "creator")}.`
              : `Showing it to ${plural(marketCount, "creator")} who fit${invited.length ? `, with ${invited.length} personal invite${invited.length === 1 ? "" : "s"}` : ""}.`}
          </p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-2">
          <PillButton href={`/business/requests/${requestId}`} variant="neon" size="lg" arrow className="justify-between ps-6">
            View your request
          </PillButton>
          <div className="grid grid-cols-2 gap-2">
            <PillButton href={`/business/requests/${requestId}?invite=1`} variant="outline">
              Invite more creators
            </PillButton>
            <PillButton href="/business" variant="ghost">
              Back to dashboard
            </PillButton>
          </div>
        </div>
      </Block>
    </Page>
  );
}
