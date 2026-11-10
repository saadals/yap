"use client";

import { Check, CircleCheck, History, RotateCcw, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { plural, timeOf } from "@/lib/format";
import { paths } from "@/lib/paths";
import { cityById, me } from "@/lib/selectors";
import { actions, useDemo, useHydrated, type DemoState, type OrderDraft } from "@/lib/store";

import { FlowActions, FlowFrame, FlowSkeleton } from "./flow-frame";
import { Spinner } from "./parts";
import {
  LAST_STEP,
  STEPS,
  applyProduct,
  defaultForm,
  dueDateFor,
  effectiveTitle,
  firstInvalidStep,
  formFromCommission,
  formFromRequest,
  formToDraft,
  formToRequest,
  inviteCandidates,
  isAdCopyForm,
  marketFor,
  median,
  normalizeForm,
  stepOfField,
  validateStep,
  type FieldKey,
  type PitchesForm,
} from "./pitches-model";
import { PitchesPreview } from "./pitches-preview";
import { ProductStep, ReviewStep, TermsStep, WorkStep, type FormPatch, type StepProps } from "./pitches-steps";
import { SuccessScreen } from "./success";

/* -------------------------------------------------------------------------- */
/* Entry: wait for the saved store, then decide what we're editing             */
/* -------------------------------------------------------------------------- */

type Banner =
  | { kind: "restored"; at: string }
  | { kind: "available"; at: string }
  | { kind: "again"; title: string }
  | null;

type Init = {
  mode: "new" | "draft";
  draftId?: string;
  form: PitchesForm;
  step: number;
  maxStep: number;
  banner: Banner;
  /** Product named in the URL (used when the business starts over). */
  paramProductId?: string;
};

type InitResult = ({ kind: "ok" } & Init) | { kind: "missing" } | { kind: "live"; requestId: string };

const LAST = LAST_STEP;

/** The custom order form's saved draft (one per account). */
const savedDraft = (s: DemoState) => me.orderDraft<Partial<PitchesForm>>(s, "custom");

const fromDraft = (draft: OrderDraft<Partial<PitchesForm>>) => ({
  form: normalizeForm(draft.data),
  step: Math.min(Math.max(0, draft.step ?? 0), LAST),
});

function initialState(s: DemoState, params: URLSearchParams): InitResult {
  const { businessId, creatorId: selfId } = me.ids(s);
  const products = s.products.filter((p) => p.businessId === businessId);

  const draftId = params.get("draft");
  if (draftId) {
    const request = s.requests.find((r) => r.id === draftId);
    if (!request || request.businessId !== businessId || request.kind === "campaign") return { kind: "missing" };
    if (request.status !== "draft") return { kind: "live", requestId: request.id };
    const form = formFromRequest(s, request);
    const product = products.find((p) => p.id === form.productId);
    const bad = firstInvalidStep(form, product);
    const step = bad >= 0 ? bad : LAST;
    return { kind: "ok", mode: "draft", draftId, form, step, maxStep: LAST, banner: null };
  }

  const paramProduct = products.find((p) => p.id === params.get("product"));
  // ?creator= takes an id or a handle; never your own creator profile.
  const creatorParam = params.get("creator");
  const paramCreator = creatorParam
    ? s.creators.find((c) => (c.id === creatorParam || c.handle === creatorParam) && c.id !== selfId)
    : undefined;
  const withInvite = (form: PitchesForm) =>
    paramCreator && !form.invitedCreatorIds.includes(paramCreator.id)
      ? { ...form, invitedCreatorIds: [...form.invitedCreatorIds, paramCreator.id] }
      : form;

  // "More like this": an earlier request or an earlier commission of this account.
  const againId = params.get("again");
  if (againId) {
    const request = s.requests.find((r) => r.id === againId && r.businessId === businessId && r.kind !== "campaign");
    const commission = request ? undefined : s.commissions.find((c) => c.id === againId && c.businessId === businessId);
    if (request || commission) {
      let form = request ? formFromRequest(s, request) : formFromCommission(s, commission!, selfId);
      if (!products.some((p) => p.id === form.productId)) form = { ...form, productId: "", learningIds: [] };
      if (paramProduct) form = applyProduct(form, paramProduct);
      return {
        kind: "ok",
        mode: "new",
        form: withInvite(form),
        step: form.productId ? 1 : 0,
        maxStep: form.productId ? LAST : 0,
        banner: { kind: "again", title: request?.title ?? commission!.title },
        paramProductId: paramProduct?.id,
      };
    }
  }

  const draft = savedDraft(s);
  let form: PitchesForm;
  let step = 0;
  let maxStep = 0;
  let banner: Banner = null;
  const draftProduct = draft?.data.productId;
  if (draft && (!paramProduct || !draftProduct || draftProduct === paramProduct.id)) {
    const restored = fromDraft(draft);
    form = restored.form;
    // A product deleted since the draft was saved can't be used.
    if (form.productId && !products.some((p) => p.id === form.productId)) form = { ...form, productId: "", learningIds: [] };
    if (paramProduct && !form.productId) form = applyProduct(form, paramProduct);
    step = form.productId ? restored.step : 0;
    maxStep = step;
    banner = { kind: "restored", at: draft.savedAt };
  } else {
    form = defaultForm(paramProduct ?? (products.length === 1 ? products[0] : undefined));
    // A product chosen before arriving (its page, the Library) skips the product question.
    step = paramProduct ? 1 : 0;
    maxStep = step;
    if (draft) banner = { kind: "available", at: draft.savedAt };
  }
  return { kind: "ok", mode: "new", form: withInvite(form), step, maxStep, banner, paramProductId: paramProduct?.id };
}

export function PitchesFlow({ params }: { params: URLSearchParams }) {
  const hydrated = useHydrated();
  if (!hydrated) return <FlowSkeleton label="Loading your order" />;
  return <Loader params={params} />;
}

function Loader({ params }: { params: URLSearchParams }) {
  const s = useDemo();
  // Decide once: posting a draft must not flip this screen to "already live".
  const [init] = useState(() => initialState(s, params));
  if (init.kind === "missing") {
    return (
      <Page width="narrow">
        <Block tone="paper" pad="lg">
          <EmptyState
            title="We couldn't find that draft"
            body="It may have been posted or deleted. All your orders are in one place."
            action={
              <PillButton href={paths.orders()} variant="contrast">
                See your orders
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
            title="This order is already live"
            body="It's posted, so creators may be pitching. You can change the budget, the deadline and who can pitch from the order."
            action={
              <PillButton href={paths.order(init.requestId)} variant="contrast" arrow>
                Open the order
              </PillButton>
            }
          />
        </Block>
      </Page>
    );
  }
  return <Flow init={init} />;
}

/* -------------------------------------------------------------------------- */
/* The flow                                                                    */
/* -------------------------------------------------------------------------- */

function Flow({ init }: { init: Init }) {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<PitchesForm>(init.form);
  const [step, setStep] = useState(init.step);
  const [maxStep, setMaxStep] = useState(init.maxStep);
  const [attempted, setAttempted] = useState<number[]>([]);
  const [banner, setBanner] = useState<Banner>(init.banner);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    init.mode === "draft" || init.banner?.kind === "restored" ? "saved" : "idle",
  );
  const [phase, setPhase] = useState<"edit" | "posting" | "leaving" | "done">("edit");
  const [postedId, setPostedId] = useState<string | null>(null);
  const postTimer = useRef(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const products = s.products.filter((p) => p.businessId === me.ids(s).businessId);
  const product = products.find((p) => p.id === form.productId);
  const market = marketFor(s, form);
  const stepErrors = validateStep(step, form, product);
  const stepValid = Object.keys(stepErrors).length === 0;
  const busy = phase !== "edit";

  /* ------------------------------------------------------------ autosave */
  useEffect(() => {
    if (!dirty || phase !== "edit") return;
    const timer = window.setTimeout(() => {
      if (init.mode === "draft" && init.draftId) {
        const data = formToRequest(form, product);
        actions.updateRequest(init.draftId, {
          ...data,
          title: data.title || "Untitled custom order",
          dueDate: dueDateFor(form.deadlineDays),
        });
      } else {
        actions.saveOrderDraft("custom", formToDraft(form, step, product));
      }
      setSaveState("saved");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [form, step, dirty, phase, product, init.mode, init.draftId]);

  useEffect(() => () => window.clearTimeout(postTimer.current), []);

  /* ------------------------------------------------------------- helpers */
  const set = (patch: FormPatch) => {
    setForm((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
    setDirty(true);
    setSaveState("saving");
  };
  const error = (field: FieldKey) =>
    attempted.includes(stepOfField[field]) ? validateStep(stepOfField[field], form, product)[field] : undefined;

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(LAST, target));
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
    setDirty(true);
    // Banners say their piece once: moving on is the answer.
    setBanner(null);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  };

  const focusFirstInvalid = () =>
    window.setTimeout(() => document.querySelector<HTMLElement>("[data-invalid='true'], [aria-invalid='true']")?.focus(), 0);

  const post = () => {
    const bad = firstInvalidStep(form, product);
    if (bad >= 0) {
      setAttempted((a) => (a.includes(bad) ? a : [...a, bad]));
      goTo(bad);
      toast({ message: `One thing to fix in "${STEPS[bad].label}" before posting`, tone: "info" });
      return;
    }
    setPhase("posting");
    const data = formToRequest(form, product);
    postTimer.current = window.setTimeout(() => {
      let id: string;
      if (init.mode === "draft" && init.draftId) {
        id = init.draftId;
        // Invite after posting, so invited creators are notified.
        actions.updateRequest(id, { ...data, dueDate: dueDateFor(form.deadlineDays), invitedCreatorIds: [] });
        actions.publishDraft(id);
        data.invitedCreatorIds.forEach((creatorId) => actions.inviteToRequest(id, creatorId));
      } else {
        id = actions.createRequest({ ...data, status: "open" });
        actions.saveOrderDraft("custom", null);
      }
      setPostedId(id);
      setPhase("done");
      window.scrollTo({ top: 0 });
    }, 700);
  };

  const onContinue = () => {
    if (busy) return;
    if (!stepValid) {
      setAttempted((a) => (a.includes(step) ? a : [...a, step]));
      focusFirstInvalid();
      return;
    }
    if (step === LAST) {
      post();
      return;
    }
    // Entering the budget step for the first time: start from what creators usually charge.
    if (step + 1 === 2 && !form.budgetTouched && market.quoted >= 3) {
      setForm((f) => ({ ...f, perVideo: { min: market.low, max: Math.max(market.low, market.high) } }));
    }
    goTo(step + 1);
  };

  const saveAsDraft = () => {
    if (busy) return;
    if (!product || (!isAdCopyForm(form) && !form.format)) {
      toast({
        message: isAdCopyForm(form)
          ? "Pick a product first, then you can save it as a draft."
          : "Pick a product and a format first, then you can save it as a draft.",
        tone: "info",
      });
      return;
    }
    setPhase("leaving");
    const data = formToRequest(form, product);
    if (init.mode === "draft" && init.draftId) actions.updateRequest(init.draftId, { ...data, dueDate: dueDateFor(form.deadlineDays) });
    else {
      actions.createRequest({ ...data, title: data.title || "Untitled custom order", status: "draft" });
      actions.saveOrderDraft("custom", null);
    }
    toast({ message: "Saved to your drafts. Pick it up any time from Orders." });
    router.push(paths.orders());
  };

  const startOver = () => {
    const previous = savedDraft(s);
    const snapshot = { form, step, maxStep, banner };
    actions.saveOrderDraft("custom", null);
    const paramProduct = products.find((p) => p.id === init.paramProductId);
    setForm(defaultForm(paramProduct ?? (products.length === 1 ? products[0] : undefined)));
    setStep(paramProduct ? 1 : 0);
    setMaxStep(paramProduct ? 1 : 0);
    setBanner(null);
    setDirty(false);
    setSaveState("idle");
    setAttempted([]);
    toast({
      message: "Started over",
      action: {
        label: "Undo",
        onClick: () => {
          if (previous) actions.saveOrderDraft("custom", { data: previous.data, title: previous.title, step: previous.step });
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
    const draft = savedDraft(s);
    if (!draft) return;
    const restored = fromDraft(draft);
    setForm(restored.form);
    setStep(restored.step);
    setMaxStep(restored.step);
    setBanner({ kind: "restored", at: draft.savedAt });
    setDirty(false);
    setSaveState("saved");
  };

  /* --------------------------------------------------------------- done */
  if (phase === "done" && postedId) {
    return <Posted requestId={postedId} form={form} typicalHours={Math.max(1, Math.round(median(market.pool.map((q) => q.creator.responseHours))))} />;
  }

  const props: StepProps = { s, form, set, product, products, market, error, goTo, pinnedInvites: init.form.invitedCreatorIds };
  const draftNow = savedDraft(s);
  const savedLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? init.mode === "draft"
          ? "Saved to drafts"
          : draftNow
            ? `Draft saved ${timeOf(draftNow.savedAt)}`
            : "Draft saved"
        : "Saves as you go";
  const firstError = Object.values(stepErrors)[0];
  const hint =
    !stepValid && attempted.includes(step) && firstError
      ? `To continue: ${firstError.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase())}`
      : null;

  const bannerNode = banner ? (
    <div className="y-tile flex flex-wrap items-center gap-3 p-3 ps-4" role="status">
      {banner.kind === "again" ? (
        <RotateCcw size={16} aria-hidden className="flex-none" />
      ) : (
        <History size={16} aria-hidden className="flex-none" />
      )}
      <p className="y-small min-w-0 flex-1">
        {banner.kind === "restored"
          ? `Picked up your draft from ${timeOf(banner.at)}.`
          : banner.kind === "available"
            ? `You have an unfinished custom order from ${timeOf(banner.at)}. Carrying on here replaces it.`
            : `Starting from “${banner.title}”. Change anything before you post.`}
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
      flowName="Custom order"
      closeHref={init.mode === "draft" ? paths.orders() : paths.newOrder()}
      closeLabel="Close. Your progress is saved."
      steps={STEPS}
      step={step}
      maxStep={maxStep}
      onStep={goTo}
      title={STEPS[step].title}
      lead={STEPS[step].lead}
      headingRef={headingRef}
      status={
        <span className="flex flex-none items-center gap-2">
          <span className="y-micro y-fg-2 hidden items-center gap-1.5 sm:inline-flex" role="status" aria-live="polite">
            {saveState === "saving" ? <Spinner size={12} /> : saveState === "saved" ? <Check size={14} aria-hidden /> : null}
            {savedLabel}
          </span>
          <PillButton size="sm" variant="outline" onClick={saveAsDraft} disabled={busy}>
            {init.mode === "draft" ? "Save and exit" : "Save as draft"}
          </PillButton>
        </span>
      }
      banner={bannerNode}
      previewLabel="What creators will see"
      preview={step === LAST ? <ReviewRail form={form} /> : <PitchesPreview s={s} form={form} product={product} market={market} />}
      bar={
        <FlowActions
          backLabel={step > 0 ? STEPS[step - 1].label : undefined}
          onBack={step > 0 ? () => goTo(step - 1) : undefined}
          hint={hint}
          continueLabel={phase === "posting" ? "Posting…" : step === LAST ? "Post order" : "Continue"}
          nextLabel={step < LAST && phase === "edit" ? STEPS[step + 1].label : undefined}
          onContinue={onContinue}
          busy={phase === "posting"}
          blocked={!stepValid}
          final={step === LAST}
        />
      }
    >
      {step === 0 ? <ProductStep {...props} /> : null}
      {step === 1 ? <WorkStep {...props} /> : null}
      {step === 2 ? <TermsStep {...props} /> : null}
      {step === 3 ? <ReviewStep {...props} /> : null}
    </FlowFrame>
  );
}

/** The review step's rail: what happens once it's posted. */
function ReviewRail({ form }: { form: PitchesForm }) {
  return (
    <Block tone="paper" pad="md" className="flex flex-col gap-4">
      <h2 className="y-head">After you post</h2>
      <NextSteps invited={form.invitedCreatorIds.length} />
    </Block>
  );
}

function NextSteps({ invited, typicalHours }: { invited: number; typicalHours?: number }) {
  const items = [
    {
      title: "Pitches arrive",
      body: `Each one has a hook idea, a price and samples${typicalHours ? `. Creators who match usually reply within ${plural(typicalHours, "hour")}` : ""}${invited === 1 ? ". The creator you invited hears first" : invited > 1 ? `. The ${plural(invited, "creator")} you invited hear first` : ""}.`,
    },
    { title: "We let you know", body: "You get a notification for every pitch, so there's nothing to check." },
    { title: "Compare and hire", body: "Shortlist, compare side by side and hire one. You pay the price you agree on, held from the hire until you approve." },
  ];
  return (
    <ol className="flex flex-col gap-4">
      {items.map((item, index) => (
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
  );
}

/* -------------------------------------------------------------------------- */
/* Posted                                                                      */
/* -------------------------------------------------------------------------- */

function Posted({ requestId, form, typicalHours }: { requestId: string; form: PitchesForm; typicalHours: number }) {
  const s = useDemo();
  const [inviting, setInviting] = useState(false);
  const request = s.requests.find((r) => r.id === requestId);
  const product = s.products.find((p) => p.id === form.productId);
  const invitedIds = request?.invitedCreatorIds ?? form.invitedCreatorIds;
  return (
    <SuccessScreen
      icon={<CircleCheck size={28} aria-hidden />}
      title="Your order is live"
      lead={`“${request?.title ?? effectiveTitle(form, product)}” is open for pitches.`}
      primary={
        <PillButton href={paths.order(requestId)} variant="neon" size="lg" arrow className="justify-between ps-6">
          See your order
        </PillButton>
      }
      secondary={
        <PillButton variant="outline" size="lg" icon={<UserPlus size={16} aria-hidden />} onClick={() => setInviting(true)}>
          Invite creators
        </PillButton>
      }
    >
      <div className="flex flex-col gap-4 text-start">
        <h2 className="y-head">What happens next</h2>
        <NextSteps invited={invitedIds.length} typicalHours={typicalHours} />
      </div>
      <InviteSheet open={inviting} onClose={() => setInviting(false)} requestId={requestId} form={{ ...form, invitedCreatorIds: invitedIds }} />
    </SuccessScreen>
  );
}

function InviteSheet({
  open,
  onClose,
  requestId,
  form,
}: {
  open: boolean;
  onClose: () => void;
  requestId: string;
  form: PitchesForm;
}) {
  const s = useDemo();
  const request = s.requests.find((r) => r.id === requestId);
  const product = s.products.find((p) => p.id === form.productId);
  const invited = request?.invitedCreatorIds ?? [];
  const candidates = inviteCandidates(s, form, product, form.invitedCreatorIds);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Invite creators"
      description="Invited creators get a personal note and see your order first."
    >
      <ul className="flex flex-col gap-1.5">
        {candidates.map(({ creator, fit, why }) => {
          const done = invited.includes(creator.id);
          return (
            <li key={creator.id} className="y-tile flex min-h-14 items-center gap-3 px-3 py-2">
              <FaceAvatar id={creator.id} name="" size={36} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="y-small truncate font-semibold">{creator.name}</span>
                <span className="y-micro y-fg-2 truncate">
                  {why} · {cityById(creator.cityId)?.name} · {fit.score}% fit
                </span>
              </span>
              {done ? (
                <span className="y-small inline-flex items-center gap-1 font-semibold">
                  <Check size={16} aria-hidden /> Invited
                </span>
              ) : (
                <PillButton size="sm" variant="soft" onClick={() => actions.inviteToRequest(requestId, creator.id)}>
                  Invite
                </PillButton>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
