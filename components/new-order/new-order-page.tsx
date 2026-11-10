"use client";

import { Check, History, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { BackPill, WidePage } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { StageBars } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { at } from "@/lib/clock";
import { timeOf } from "@/lib/format";
import { paths } from "@/lib/paths";
import { isCampaign, me } from "@/lib/selectors";
import { actions, readDemo, useDemo, useHydrated, type DemoState } from "@/lib/store";
import { campaignPlatforms, ORDER_OPEN_DAYS } from "@/lib/taxonomy";
import type { CampaignPlatformId } from "@/lib/types";

import {
  FIELD_ORDER,
  HANDLE_RE,
  LAST_STEP,
  NEW_PRODUCT,
  STEP_LABELS,
  applyProduct,
  briefFrom,
  defaultForm,
  derive,
  draftData,
  fieldId,
  firstInvalidStep,
  formFromRequest,
  kindPhrase,
  landingStep,
  normalizeForm,
  postedBudget,
  untitled,
  validateStep,
  type Errors,
  type FieldKey,
  type FormPatch,
  type NewOrderForm,
  type OrderKind,
} from "./model";
import { BasicsStep, inviteFromParam } from "./step-basics";
import { BriefStep } from "./step-brief";
import { PostStep } from "./step-post";
import type { StepProps } from "./step-props";
import { SizeStep } from "./step-size";
import { TermsStep } from "./step-terms";
import { TypeStep } from "./step-type";
import { SummaryCard } from "./summary";

/**
 * /orders/new: one wizard for both kinds of order (Work spec 6.11). Ways in: `?type=campaign|custom`
 * (restores that kind's draft if there is one), `?draft=campaign|custom` (the same), `?draft=<id>`
 * (a draft order saved earlier, e.g. r-104), `?product=`, `?creator=` (a custom order for one invited
 * creator), `?again=<order id>` (run it again with every field carried over), `?service=` (from a
 * service page; `hook-lab` starts on the ad hook pack) and `?step=N` (1–6; lands on the first step
 * that isn't valid if that comes first).
 */
export function NewOrderPage() {
  return (
    <AppShell>
      <Suspense fallback={<WizardSkeleton />}>
        <Gate />
      </Suspense>
    </AppShell>
  );
}

function Gate() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  if (!hydrated) return <WizardSkeleton />;
  return <Loader key={params.toString()} params={new URLSearchParams(params.toString())} />;
}

function WizardSkeleton() {
  return (
    <WidePage className="y-nw">
      <div aria-busy="true" aria-label="Loading the new order form">
        <Skeleton className="mb-[18px] h-9 w-24 !rounded-full" />
        <div className="y-nw-grid">
          <div className="y-nw-main">
            <div className="y-nw-head flex flex-col gap-4" data-tone="paper">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-12 w-2/5" />
              <Skeleton className="h-2 w-full" />
            </div>
            <div className="y-nw-card" data-tone="paper">
              <Skeleton className="h-6 w-1/3" />
              <div className="y-nw-types">
                <Skeleton className="h-48 !rounded-[22px]" />
                <Skeleton className="h-48 !rounded-[22px]" />
              </div>
            </div>
          </div>
          <div className="y-nw-side">
            <div className="y-nw-sum flex flex-col gap-3" data-tone="paper">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    </WidePage>
  );
}

/* -------------------------------------------------------------------------- */
/* Where the wizard starts                                                     */
/* -------------------------------------------------------------------------- */

type Banner =
  | { kind: "restored"; draftKind: OrderKind; at: string }
  | { kind: "available"; drafts: { kind: OrderKind; title: string; at: string }[] }
  | { kind: "again"; title: string }
  | { kind: "editing" }
  | null;

type Init =
  | {
      kind: "ok";
      mode: "new" | "draft-request";
      draftId?: string;
      form: NewOrderForm;
      step: number;
      banner: Banner;
      lockKind?: OrderKind;
      /** What a discarded draft goes back to. */
      fresh: NewOrderForm;
      /** Steps whose errors show from the start (a `?step=` link that landed earlier). */
      attempted?: number[];
    }
  | { kind: "missing" }
  | { kind: "live"; requestId: string };

const isKind = (value: string | null): value is OrderKind => value === "campaign" || value === "custom";

function initialState(s: DemoState, params: URLSearchParams): Init {
  const { businessId, creatorId: selfId } = me.ids(s);
  const products = s.products.filter((p) => p.businessId === businessId);
  const draftParam = params.get("draft");
  const typeParam = params.get("type");
  const stepParam = Number(params.get("step"));
  const finish = (init: Extract<Init, { kind: "ok" }>): Init => {
    if (Number.isFinite(stepParam) && stepParam >= 1) {
      const wanted = Math.min(LAST_STEP, Math.round(stepParam) - 1);
      init.step = landingStep(init.form, derive(s, init.form), wanted);
      // Landed earlier than asked: say what's missing right away.
      if (init.step < wanted) init.attempted = [init.step];
    }
    return init;
  };

  // A draft order saved earlier (a ContentRequest with status "draft").
  if (draftParam && !isKind(draftParam)) {
    const request = s.requests.find((r) => r.id === draftParam);
    if (!request || request.businessId !== businessId || isCampaign(request)) return { kind: "missing" };
    if (request.status !== "draft") return { kind: "live", requestId: request.id };
    const form = formFromRequest(s, request);
    const bad = firstInvalidStep(form, derive(s, form));
    return finish({
      kind: "ok",
      mode: "draft-request",
      draftId: request.id,
      form,
      step: bad >= 0 ? bad : LAST_STEP,
      banner: { kind: "editing" },
      lockKind: "custom",
      fresh: form,
    });
  }

  const kindParam = isKind(draftParam) ? draftParam : isKind(typeParam) ? typeParam : null;
  const paramProduct = products.find((p) => p.id === params.get("product"));
  const creatorParam = params.get("creator");
  const paramCreator = creatorParam
    ? s.creators.find((c) => (c.id === creatorParam || c.handle === creatorParam) && c.id !== selfId)
    : undefined;
  const fallbackProduct = paramProduct ?? (products.length === 1 ? products[0] : undefined);

  let form: NewOrderForm | undefined;
  let banner: Banner = null;
  let step = 0;

  // Run an earlier order again.
  const again = s.requests.find((r) => r.id === params.get("again") && r.businessId === businessId);
  if (again) {
    form = formFromRequest(s, again);
    banner = { kind: "again", title: again.title };
    step = landingStep(form, derive(s, form), 1);
  }

  // The saved draft of this kind (a creator link always starts fresh for that creator).
  if (!form && kindParam && !paramCreator) {
    const saved = me.orderDraft<Partial<NewOrderForm>>(s, kindParam);
    if (saved) {
      form = { ...normalizeForm(s, saved.data), kind: kindParam };
      banner = { kind: "restored", draftKind: kindParam, at: saved.savedAt };
      step = landingStep(form, derive(s, form), saved.step ?? 0);
    }
  }

  if (!form) {
    form = { ...defaultForm(s, fallbackProduct), kind: kindParam ?? (paramCreator ? "custom" : null) };
    // From a service page (`?service=`): a starting choice only. Hook Lab starts on the ad hook
    // pack; the others only set the kind (`?type=`), and a campaign starts at 10 Yapps as usual.
    if (params.get("service") === "hook-lab") {
      form = { ...form, format: "hook-pack", durationSec: 12, onCamera: true, videoCount: form.kind === "custom" ? 5 : 1 };
    }
    const drafts = me
      .orderDrafts(s)
      .map((draft) => ({ kind: draft.kind, title: draft.title ?? untitled(draft.kind), at: draft.savedAt }));
    if (drafts.length) banner = { kind: "available", drafts };
    step = form.kind && form.category ? 1 : 0;
  }

  if (paramProduct && form.productId !== paramProduct.id) {
    form = applyProduct(form, paramProduct, products.find((p) => p.id === form!.productId));
  }
  if (paramCreator) form = inviteFromParam(form, paramCreator.id);

  const fresh = { ...defaultForm(s, fallbackProduct), kind: form.kind };
  return finish({ kind: "ok", mode: "new", form, step, banner, fresh });
}

function Loader({ params }: { params: URLSearchParams }) {
  const s = useDemo();
  // Decide once: posting must not flip this screen to "already live".
  const [init] = useState(() => initialState(s, params));
  if (init.kind === "missing") {
    return (
      <WidePage className="y-nw">
        <BackPill href={paths.work("ordered")} label="Work" />
        <div className="y-nw-card" data-tone="paper">
          <EmptyState
            title="We couldn't find that draft"
            body="It may have been posted or deleted. Your orders are all in Ordered."
            action={
              <PillButton href={paths.work("ordered")} variant="contrast">
                Go to Ordered
              </PillButton>
            }
          />
        </div>
      </WidePage>
    );
  }
  if (init.kind === "live") {
    return (
      <WidePage className="y-nw">
        <BackPill href={paths.work("ordered")} label="Work" />
        <div className="y-nw-card" data-tone="paper">
          <EmptyState
            title="This order is already posted"
            body="Creators may be pitching. You can still change the budget, deadline and who can pitch from the order."
            action={
              <PillButton href={paths.order(init.requestId)} variant="contrast" arrow>
                Open the order
              </PillButton>
            }
          />
        </div>
      </WidePage>
    );
  }
  return <Wizard init={init} />;
}

/* -------------------------------------------------------------------------- */
/* The wizard                                                                  */
/* -------------------------------------------------------------------------- */

type Posted = { id: string; name: string; kind: OrderKind; invite: boolean };

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Wizard({ init }: { init: Extract<Init, { kind: "ok" }> }) {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<NewOrderForm>(init.form);
  const [step, setStep] = useState(init.step);
  const [attempted, setAttempted] = useState<number[]>(init.attempted ?? []);
  const [banner, setBanner] = useState<Banner>(init.banner);
  const [dirty, setDirty] = useState(false);
  const [phase, setPhase] = useState<"edit" | "posting" | "done">("edit");
  const [posted, setPosted] = useState<Posted | null>(null);
  const [modal, setModal] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const postTimer = useRef(0);
  /** Kinds this visit has saved a draft under (switching kind moves the draft). */
  const savedKinds = useRef<OrderKind[]>(init.banner?.kind === "restored" ? [init.banner.draftKind] : []);

  const d = derive(s, form);
  const campaign = form.kind === "campaign";
  const stepErrors: Errors[] = STEP_LABELS.map((_, index) => validateStep(index, form, d));

  /* ------------------------------------------------------------ autosave */
  useEffect(() => {
    if (!dirty || phase !== "edit") return;
    const timer = window.setTimeout(() => {
      const state = readDemo();
      const fresh = derive(state, form);
      if (init.mode === "draft-request" && init.draftId) {
        actions.updateRequest(init.draftId, {
          title: fresh.title.trim() || untitled("custom"),
          brief: briefFrom(form, fresh, form.productId === NEW_PRODUCT ? "" : form.productId),
          budget: postedBudget(form, fresh),
          deadlineDays: form.deadlineDays,
          visibility: form.visibility,
          invitedCreatorIds: form.invitedCreatorIds,
          preferredKinds: form.preferredKinds,
        });
        return;
      }
      if (!form.kind) return;
      actions.saveOrderDraft(form.kind, {
        data: draftData(form),
        title: fresh.title.trim() || untitled(form.kind),
        step,
      });
      for (const other of savedKinds.current) if (other !== form.kind) actions.saveOrderDraft(other, null);
      savedKinds.current = [form.kind];
    }, 500);
    return () => window.clearTimeout(timer);
  }, [form, step, dirty, phase, init.mode, init.draftId]);

  useEffect(() => () => window.clearTimeout(postTimer.current), []);

  /* ------------------------------------------------------------- helpers */
  const set = (patch: FormPatch) => {
    setForm((current) => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
    setDirty(true);
  };

  const err = (key: FieldKey) => {
    for (let index = 0; index <= LAST_STEP; index++) {
      const message = stepErrors[index][key];
      if (message) return attempted.includes(index) ? message : undefined;
    }
    return undefined;
  };

  const focusHeading = () =>
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(LAST_STEP, target));
    setStep(next);
    setDirty(true);
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
    focusHeading();
  };

  const focusField = (key: FieldKey) =>
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(() => {
        const el = document.getElementById(fieldId(key));
        if (!el) return;
        el.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
        el.focus({ preventScroll: true });
      }),
    );

  /** Save the accounts to tag that are valid and not saved yet (on Continue and on post). */
  const saveHandles = () => {
    const saved: Partial<Record<CampaignPlatformId, string>> = {};
    for (const platform of form.campaignPlatforms) {
      const value = d.handles[platform];
      if (value && HANDLE_RE.test(value) && d.savedHandles[platform] !== value) {
        const result = actions.saveBrandHandle(platform, value);
        if (result) saved[platform] = result;
      }
    }
    if (Object.keys(saved).length) {
      set((f) => {
        const handles = { ...f.handles };
        for (const platform of Object.keys(saved) as CampaignPlatformId[]) delete handles[platform];
        return { handles };
      });
    }
  };

  /* ---------------------------------------------------------------- post */
  const post = () => {
    const bad = firstInvalidStep(form, d);
    if (bad >= 0 && bad < LAST_STEP) {
      setAttempted((list) => (list.includes(bad) ? list : [...list, bad]));
      goTo(bad);
      toast({ message: `Something to fix on ${STEP_LABELS[bad]} before you post`, tone: "info" });
      return;
    }
    setPhase("posting");
    postTimer.current = window.setTimeout(() => {
      const business = me.business(readDemo());
      let productId = form.productId;
      if (productId === NEW_PRODUCT) {
        const line = form.newProduct.oneLiner.trim();
        productId = actions.saveProduct({
          name: form.newProduct.name.trim(),
          oneLiner: line,
          description: line,
          website: business.website,
          niche: form.category || business.industry,
          surfaces: [],
          audience: form.audience.trim(),
          problem: "",
          features: [],
          tone: [],
          dos: [],
          donts: [],
          cta: "",
          brandColor: business.brandColor,
        });
      }
      const final = { ...form, productId };
      const fresh = derive(readDemo(), final);
      const brief = briefFrom(final, fresh, productId);
      const title = fresh.title.trim();
      let id: string;
      if (final.kind === "campaign") {
        const brandHandles: Partial<Record<CampaignPlatformId, string>> = {};
        for (const platform of campaignPlatforms.map((p) => p.id)) {
          if (final.campaignPlatforms.includes(platform) && fresh.handles[platform]) {
            brandHandles[platform] = `@${fresh.handles[platform]}`;
          }
        }
        id = actions.publishCampaign({
          title,
          productId,
          brief,
          videos: final.videos,
          tierId: final.tierId,
          pricePerVideo: fresh.price,
          usage: final.usage,
          deadlineDays: final.deadlineDays,
          platforms: final.campaignPlatforms,
          brandHandles,
          explainer: final.explainer
            ? { name: final.explainer.name, durationSec: final.explainer.durationSec }
            : undefined,
          paymentMethodId: final.paymentMethodId,
        });
      } else if (init.mode === "draft-request" && init.draftId) {
        id = init.draftId;
        actions.updateRequest(id, {
          title,
          brief,
          budget: postedBudget(final, fresh),
          deadlineDays: final.deadlineDays,
          dueDate: at(ORDER_OPEN_DAYS + final.deadlineDays, "18:00"),
          visibility: final.visibility,
          invitedCreatorIds: [],
          preferredKinds: final.preferredKinds,
        });
        actions.publishDraft(id);
        // Invite after publishing so invited creators hear about it.
        final.invitedCreatorIds.forEach((creatorId) => actions.inviteToRequest(id, creatorId));
      } else {
        id = actions.createRequest({
          title,
          brief,
          budget: postedBudget(final, fresh),
          deadlineDays: final.deadlineDays,
          visibility: final.visibility,
          invitedCreatorIds: final.invitedCreatorIds,
          preferredKinds: final.preferredKinds,
          slots: 1,
          status: "open",
        });
      }
      if (final.kind) actions.saveOrderDraft(final.kind, null);
      for (const other of savedKinds.current) actions.saveOrderDraft(other, null);
      savedKinds.current = [];
      setPosted({
        id,
        name: fresh.productName || title,
        kind: final.kind ?? "custom",
        invite: final.kind === "custom" && final.visibility === "invite",
      });
      setPhase("done");
      setModal(true);
      window.scrollTo({ top: 0 });
    }, 700);
  };

  const onContinue = () => {
    if (phase !== "edit") return;
    const errors = stepErrors[step];
    const keys = FIELD_ORDER.filter((key) => errors[key]);
    if (keys.length) {
      setAttempted((list) => (list.includes(step) ? list : [...list, step]));
      toast({
        message: keys.length === 1 ? errors[keys[0]]! : `${keys.length} things to fix before you continue`,
        tone: "info",
      });
      focusField(keys[0]);
      return;
    }
    if (step === 1) {
      // Fix the price or budget the brand saw, so a later change of product doesn't move it.
      set((f) => (f.kind === "campaign" ? { price: d.price } : { budget: f.budget ?? d.budget }));
    }
    if (step === 2 && campaign) saveHandles();
    if (step === LAST_STEP) {
      post();
      return;
    }
    goTo(step + 1);
  };

  /* -------------------------------------------------------------- drafts */
  const discard = () => {
    if (banner?.kind !== "restored") return;
    const kind = banner.draftKind;
    const previous = me.orderDraft<Partial<NewOrderForm>>(s, kind);
    const snapshot = { form, step, banner };
    actions.saveOrderDraft(kind, null);
    savedKinds.current = [];
    setForm({ ...init.fresh, kind });
    setStep(init.fresh.category ? 1 : 0);
    setAttempted([]);
    setBanner(null);
    setDirty(false);
    focusHeading();
    toast({
      message: "Draft discarded",
      action: {
        label: "Undo",
        onClick: () => {
          if (previous) actions.saveOrderDraft(kind, { data: previous.data, title: previous.title, step: previous.step });
          savedKinds.current = [kind];
          setForm(snapshot.form);
          setStep(snapshot.step);
          setBanner(snapshot.banner);
        },
      },
    });
  };

  const resume = (kind: OrderKind) => {
    const saved = me.orderDraft<Partial<NewOrderForm>>(s, kind);
    if (!saved) return;
    const next = { ...normalizeForm(s, saved.data), kind };
    savedKinds.current = [kind];
    setForm(next);
    setStep(landingStep(next, derive(s, next), saved.step ?? 0));
    setAttempted([]);
    setBanner({ kind: "restored", draftKind: kind, at: saved.savedAt });
    setDirty(false);
    focusHeading();
  };

  /* -------------------------------------------------------------- render */
  const props: StepProps = { s, form, d, set, err, goTo, headingRef };
  const savedDraft = form.kind ? me.orderDraft(s, form.kind) : null;
  const savedLabel =
    phase === "done"
      ? null
      : init.mode === "draft-request"
        ? dirty
          ? "Saved to your draft"
          : null
        : savedDraft && (dirty || banner?.kind === "restored")
          ? `Draft saved · ${timeOf(savedDraft.savedAt)}`
          : null;

  const body =
    phase === "done" && posted ? (
      <PostedCard posted={posted} />
    ) : step === 0 ? (
      <TypeStep {...props} lockKind={init.lockKind} />
    ) : step === 1 ? (
      <SizeStep {...props} />
    ) : step === 2 ? (
      <BasicsStep {...props} />
    ) : step === 3 ? (
      <BriefStep {...props} />
    ) : step === 4 ? (
      <TermsStep {...props} />
    ) : (
      <PostStep {...props} />
    );

  const last = step === LAST_STEP;

  return (
    <WidePage className="y-nw">
      <BackPill href={paths.work("ordered")} label="Work" />
      <div className="y-nw-grid">
        <div className="y-nw-main">
          <header className="y-nw-head" data-tone="paper">
            <div className="y-nw-head-top">
              <span className="y-eyebrow">As a brand</span>
              {savedLabel ? (
                <span className="y-nw-saved" role="status">
                  <Check size={14} aria-hidden />
                  {savedLabel}
                </span>
              ) : null}
            </div>
            <h1 className="y-nw-h1">New order</h1>
            <StageBars
              stages={[...STEP_LABELS]}
              current={phase === "done" ? STEP_LABELS.length : step}
              label="New order steps"
            />
            <BannerRow banner={banner} onDiscard={discard} onResume={resume} />
          </header>

          <div key={phase === "done" ? "done" : step} className="y-enter">
            {body}
          </div>

          {phase !== "done" ? (
            <div className="y-nw-nav">
              <PillButton
                variant="soft"
                className="y-nw-back"
                style={{ visibility: step === 0 ? "hidden" : undefined }}
                aria-hidden={step === 0 ? true : undefined}
                tabIndex={step === 0 ? -1 : undefined}
                disabled={phase !== "edit"}
                onClick={() => goTo(step - 1)}
              >
                Back
              </PillButton>
              <PillButton
                variant={last ? "neon" : "contrast"}
                className="y-nw-next"
                onClick={onContinue}
                aria-disabled={phase !== "edit" ? true : undefined}
              >
                {phase === "posting" ? "Posting…" : last ? "Post order" : "Continue"}
              </PillButton>
            </div>
          ) : null}
        </div>

        <aside className="y-nw-side" aria-label="Order summary">
          <SummaryCard form={form} d={d} />
        </aside>
      </div>

      {posted ? (
        <ConfirmModal
          open={modal}
          onClose={() => setModal(false)}
          title={`${posted.name} is live`}
          primary={{ label: "Go to Ordered", onClick: () => router.push(paths.work("ordered")) }}
          link={{ label: "Open the order", href: paths.order(posted.id) }}
        >
          {posted.kind === "campaign" ? (
            <p>
              Creators can pick a slot now in Find work. You&apos;ll see each review copy in <b>Ordered</b>.
            </p>
          ) : posted.invite ? (
            <p>
              The creators you invited can pitch now. New pitches show up in <b>Ordered</b>.
            </p>
          ) : (
            <p>
              Creators can pitch now. New pitches show up in <b>Ordered</b>.
            </p>
          )}
        </ConfirmModal>
      ) : null}
    </WidePage>
  );
}

function BannerRow({
  banner,
  onDiscard,
  onResume,
}: {
  banner: Banner;
  onDiscard: () => void;
  onResume: (kind: OrderKind) => void;
}) {
  if (!banner) return null;
  if (banner.kind === "restored") {
    return (
      <div className="y-nw-banner" role="status">
        <History size={16} aria-hidden />
        <p>
          Restored your unfinished {kindPhrase(banner.draftKind)} from{" "}
          {timeOf(banner.at)}.
        </p>
        <button type="button" className="y-nw-link" onClick={onDiscard}>
          Discard draft
        </button>
      </div>
    );
  }
  if (banner.kind === "again") {
    return (
      <div className="y-nw-banner" role="status">
        <RotateCcw size={16} aria-hidden />
        <p>
          Starting from <b>{banner.title}</b>. Change anything before you post.
        </p>
      </div>
    );
  }
  if (banner.kind === "editing") {
    return (
      <div className="y-nw-banner" role="status">
        <History size={16} aria-hidden />
        <p>Editing a draft order. Changes are saved to it as you go.</p>
      </div>
    );
  }
  return (
    <div className="y-nw-banner y-nw-banner-list" role="status">
      {banner.drafts.map((draft) => (
        <div key={draft.kind} className="y-nw-banner-row">
          <History size={16} aria-hidden />
          <p>
            Unfinished {kindPhrase(draft.kind)}: <b>{draft.title}</b>, saved{" "}
            {timeOf(draft.at)}. Starting a new one of this kind replaces it.
          </p>
          <button type="button" className="y-nw-link" onClick={() => onResume(draft.kind)}>
            Resume it
          </button>
        </div>
      ))}
    </div>
  );
}

/** After posting: the step card becomes a plain confirmation (the modal says the same on top). */
function PostedCard({ posted }: { posted: Posted }) {
  return (
    <section className="y-nw-card" data-tone="paper" aria-labelledby="nw-posted-title">
      <div className="y-nw-card-h">
        <h2 id="nw-posted-title" className="y-nw-h2">
          {posted.name} is live
        </h2>
        <p className="y-nw-hint">
          {posted.kind === "campaign"
            ? "Creators can pick a slot now in Find work. You'll see each review copy in Ordered."
            : posted.invite
              ? "The creators you invited can pitch now. New pitches show up in Ordered."
              : "Creators can pitch now. New pitches show up in Ordered."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <PillButton href={paths.work("ordered")} variant="contrast">
          Go to Ordered
        </PillButton>
        <PillButton href={paths.order(posted.id)} variant="soft">
          Open the order
        </PillButton>
      </div>
    </section>
  );
}
