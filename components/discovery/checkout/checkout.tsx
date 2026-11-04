"use client";

import { ArrowLeft, Lock, Repeat2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Rating } from "@/components/domain/stars";
import { PriceSummary, ProtectedNote, paymentLabel } from "@/components/domain/money";
import { Block } from "@/components/ui/block";
import { Celebrate } from "@/components/ui/celebrate";
import { Chip } from "@/components/ui/chip";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { lengthLabel, money, plural, shortDate, weekdayDate } from "@/lib/format";
import { usePrefs } from "@/lib/prefs";
import { commissionById, creatorByHandle, me } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { ME, actions, useDemo, useHydrated } from "@/lib/store";
import { addonById, formatById, languageById, platformById } from "@/lib/taxonomy";
import type { Commission, Creator } from "@/lib/types";

import { CreatorNotFound } from "../profile";
import { availabilityLabel, responseLabel, tierName } from "../profile-utils";
import { CheckoutSkeleton } from "../skeletons";
import {
  type Derived,
  type Draft,
  type FieldId,
  type SectionId,
  derive,
  deliverablesLabel,
  fieldSection,
  fieldTodo,
  initDraft,
  toOffer,
  validate,
} from "./draft";
import {
  AddonsEditor,
  BriefEditor,
  type EditorProps,
  MessageEditor,
  PackageEditor,
  PaymentEditor,
  ProductEditor,
  Section,
  TimingEditor,
} from "./sections";

/* -------------------------------------------------------------------------- */
/* Route: hydration, not-found, role gate                                      */
/* -------------------------------------------------------------------------- */

export function CommissionRoute({ handle }: { handle: string }) {
  const s = useDemo();
  const hydrated = useHydrated();
  const { role } = usePrefs();
  const params = useSearchParams();
  const creator = creatorByHandle(s, handle);
  const search = params.toString();
  const here = `/creators/${handle}/commission${search ? `?${search}` : ""}`;

  if (!hydrated) return <CheckoutSkeleton />;
  if (!creator) return <CreatorNotFound handle={handle} />;
  if (role !== "business") return <SignInGate s={s} creator={creator} next={here} />;

  const repeatId = params.get("repeat");
  const packageId = params.get("package");
  const candidate = repeatId ? commissionById(s, repeatId) : undefined;
  const repeat =
    candidate && candidate.businessId === ME.businessId && candidate.creatorId === creator.id ? candidate : null;

  return (
    <Checkout
      key={`${creator.id}|${repeat?.id ?? ""}|${packageId ?? ""}`}
      creator={creator}
      repeat={repeat}
      repeatMissing={Boolean(repeatId) && !repeat}
      packageId={packageId}
    />
  );
}

function SignInGate({ s, creator, next }: { s: DemoState; creator: Creator; next: string }) {
  const { role, setRole } = usePrefs();
  const business = me.business(s);
  return (
    <Block tone="paper" pad="lg" className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5 text-center">
      <FaceAvatar id={creator.id} name="" size={80} />
      <div className="flex flex-col gap-2">
        <h1 className="y-display y-title">Sign in as a business to commission {creator.firstName}</h1>
        <p className="y-body y-fg-2 mx-auto max-w-[52ch]">
          Direct offers come from business accounts. Your payment is held safely and only released
          when you approve the video.
        </p>
        {role === "creator" ? (
          <p className="y-small y-fg-2">
            You&apos;re in the creator view right now. Switch to the business demo to try commissioning.
          </p>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-2 sm:flex-row">
        <PillButton variant="neon" size="lg" arrow onClick={() => setRole("business")}>
          Continue as {business.name} (demo)
        </PillButton>
        <PillButton variant="outline" size="lg" href={`/signin?next=${encodeURIComponent(next)}`}>
          Sign in
        </PillButton>
      </div>
      <Link href={`/creators/${creator.handle}`} className="y-small y-link font-semibold">
        Back to {creator.firstName}&apos;s profile
      </Link>
    </Block>
  );
}

/* -------------------------------------------------------------------------- */
/* Checkout                                                                    */
/* -------------------------------------------------------------------------- */

const ORDER: SectionId[] = ["package", "product", "brief", "addons", "timing", "message", "payment"];

export function Checkout({
  creator,
  repeat,
  repeatMissing,
  packageId,
}: {
  creator: Creator;
  repeat: Commission | null;
  repeatMissing: boolean;
  packageId: string | null;
}) {
  const s = useDemo();
  const [d, setD] = useState<Draft>(() => initDraft(s, creator, { packageId, repeat }));
  const x = derive(s, creator, d, repeat);
  const errors = validate(s, creator, d, x);
  const missing = (Object.keys(errors) as FieldId[]).filter((f) => errors[f]);
  const valid = missing.length === 0;

  const [touched, setTouched] = useState<FieldId[]>([]);
  // Repeat: one-screen review; sections open only when asked (or when something needs fixing).
  const [open, setOpen] = useState<SectionId[]>(() =>
    repeat ? ORDER.filter((id) => missing.some((f) => fieldSection[f] === id)) : ORDER,
  );
  const [sent, setSent] = useState<string | null>(null);
  const collapsible = Boolean(repeat);

  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const touch = (field: FieldId) => setTouched((prev) => (prev.includes(field) ? prev : [...prev, field]));
  const errorFor = (field: FieldId) => (touched.includes(field) ? errors[field] ?? null : null);
  const isOpen = (id: SectionId) => !collapsible || open.includes(id);
  const toggleSection = (id: SectionId) =>
    setOpen((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  const sectionError = (id: SectionId) => {
    const first = missing.find((f) => fieldSection[f] === id);
    return first ? errors[first] ?? null : null;
  };

  const jumpTo = (field: FieldId) => {
    touch(field);
    const section = fieldSection[field];
    if (!isOpen(section)) setOpen((prev) => [...prev, section]);
    window.setTimeout(() => {
      const target =
        document.querySelector<HTMLElement>(`[data-field="${field}"]`) ?? document.getElementById(`s-${section}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus({ preventScroll: true });
    }, 60);
  };

  const submit = () => {
    if (!valid) {
      missing.forEach(touch);
      if (missing[0]) jumpTo(missing[0]);
      return;
    }
    const id = actions.sendOffer(toOffer(creator, d, x, repeat));
    setSent(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (sent) return <Success s={s} creator={creator} x={x} commissionId={sent} repeat={repeat} />;

  const editor: EditorProps = { s, creator, d, x, set, replace: setD, errorFor, touch };
  const totalLabel = money(x.totals.total);

  const summaries: Record<SectionId, React.ReactNode> = {
    package: `${tierName[x.pkg.tier]} · ${x.pkg.name} · ${money(x.pkg.price)}`,
    product: x.product
      ? `${x.product.name}${x.learnings.length ? ` · ${plural(x.learnings.length, "learning")} carried forward` : ""}`
      : "No product chosen",
    brief: (
      <span className="flex flex-col gap-1">
        <span className="font-semibold text-(--b-fg)">{x.title}</span>
        <span>
          {formatById[d.format].name} · {d.languages.map((l) => languageById[l].short).join(", ")} ·{" "}
          {deliverablesLabel(d)} · {d.aspect} · {d.platforms.map((p) => platformById[p].short).join(", ")}
        </span>
        {d.goal ? <span className="y-clamp-2">Goal: {d.goal}</span> : null}
      </span>
    ),
    addons: x.chosen.length
      ? x.chosen.map((a) => `${addonById[a.id].name} (+${money(a.price)})`).join(" · ")
      : "No add-ons",
    timing: `Due ${weekdayDate(x.dueDate)} · ${plural(x.dueDays, "day")} from today`,
    message: <span className="y-clamp-2">{x.message}</span>,
    payment: (() => {
      const method = s.paymentMethods.find((m) => m.id === d.paymentMethodId);
      return method ? `${paymentLabel(method)} · authorised now, charged only if accepted` : "Choose a card";
    })(),
  };

  const sections: { id: SectionId; title: string; hint?: React.ReactNode; body: React.ReactNode }[] = [
    {
      id: "package",
      title: "Package",
      hint: "Fixed price and deliverables. You can add extras below.",
      body: <PackageEditor {...editor} />,
    },
    {
      id: "product",
      title: "Product",
      hint: "Your saved product context fills the brief, so you don't explain your app twice.",
      body: <ProductEditor {...editor} />,
    },
    {
      id: "brief",
      title: "Brief",
      hint: `What ${creator.firstName} will make. Clear briefs get accepted faster.`,
      body: <BriefEditor {...editor} />,
    },
    { id: "addons", title: "Add-ons", body: <AddonsEditor {...editor} /> },
    { id: "timing", title: "Timing", body: <TimingEditor {...editor} /> },
    { id: "message", title: "Message", body: <MessageEditor {...editor} /> },
    { id: "payment", title: "Payment", body: <PaymentEditor {...editor} /> },
  ];

  const todo = missing.length ? (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <span className="y-micro y-fg-2">To send the offer:</span>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {missing.map((field) => (
          <li key={field}>
            <button type="button" className="y-link y-small font-semibold" onClick={() => jumpTo(field)}>
              {fieldTodo[field]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <div className="flex flex-col pb-32 lg:pb-0">
      <div className="flex flex-col gap-4 px-1 pt-2 pb-5 md:pb-6">
        <Link
          href={`/creators/${creator.handle}`}
          className="y-small y-fg-2 -ms-1 inline-flex w-fit items-center gap-1.5 rounded-full py-1 pe-2 font-medium hover:text-(--y-ink)"
        >
          <ArrowLeft size={16} aria-hidden className="y-flip" />
          {creator.firstName}&apos;s profile
        </Link>
        <div className="flex items-center gap-4">
          <FaceAvatar id={creator.id} name="" size={56} />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="y-display y-t-display">
              {repeat ? `Commission ${creator.firstName} again` : `Commission ${creator.firstName}`}
            </h1>
          </div>
        </div>
        <p className="y-lead y-fg-2 max-w-[62ch]">
          {repeat
            ? "Everything below is ready from last time. Review it, change anything, and send."
            : `Send a direct offer. ${creator.firstName} accepts or declines, usually ${responseLabel(creator.responseHours)}.`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="flex flex-col gap-2 lg:col-span-8">
          {repeat ? (
            <RepeatBanner creator={creator} repeat={repeat} x={x} />
          ) : repeatMissing ? (
            <Block tone="paper" pad="sm" className="!px-5">
              <p className="y-small y-fg-2">
                We couldn&apos;t find that previous commission, so this is a fresh brief. Your product
                context is still filled in.
              </p>
            </Block>
          ) : null}
          {!creator.available ? (
            <Block tone="paper" pad="sm" className="!px-5">
              <p className="y-small">
                <span className="font-semibold">{availabilityLabel(creator)}.</span>{" "}
                <span className="y-fg-2">
                  You can still send an offer now; the due date counts from when {creator.firstName} is free.
                </span>
              </p>
            </Block>
          ) : null}

          {sections.map((section, index) => (
            <Section
              key={section.id}
              id={`s-${section.id}`}
              step={index + 1}
              title={section.title}
              hint={section.hint}
              summary={summaries[section.id]}
              open={isOpen(section.id)}
              collapsible={collapsible}
              onToggle={() => toggleSection(section.id)}
              error={sectionError(section.id)}
            >
              {section.body}
            </Section>
          ))}

          {/* Mobile: inline order summary (the action lives in the bottom bar) */}
          <div className="flex flex-col gap-2 lg:hidden">
            <OrderSummary creator={creator} d={d} x={x} />
            <ProtectedNote compact />
          </div>
        </div>

        <aside className="hidden lg:col-span-4 lg:block" aria-label="Order summary">
          <div className="sticky top-24 flex flex-col gap-2">
            <OrderSummary
              creator={creator}
              d={d}
              x={x}
              action={
                <div className="flex flex-col gap-3">
                  <PillButton
                    variant="neon"
                    size="lg"
                    arrow
                    className="w-full"
                    disabled={!valid}
                    onClick={submit}
                  >
                    Send offer · {totalLabel}
                  </PillButton>
                  {todo}
                </div>
              }
            />
            <ProtectedNote compact />
          </div>
        </aside>
      </div>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] lg:hidden">
        {missing.length ? (
          <div className="mx-auto mb-2 max-w-md px-3 text-center">
            <button
              type="button"
              className="y-small rounded-full bg-(--y-paper) px-3 py-1.5 font-semibold shadow-(--y-shadow-float)"
              onClick={() => jumpTo(missing[0])}
            >
              {missing.length === 1 ? fieldTodo[missing[0]] : `${missing.length} things left · ${fieldTodo[missing[0]]}`}
            </button>
          </div>
        ) : null}
        <div className="y-bar mx-auto flex max-w-md items-center gap-3 rounded-full p-2 ps-5">
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="y-micro opacity-70">Due {shortDate(x.dueDate)}</span>
            <span className="y-small y-num truncate font-semibold">{totalLabel} total</span>
          </span>
          <PillButton variant="neon" arrow disabled={!valid} onClick={submit}>
            Send offer
          </PillButton>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                      */
/* -------------------------------------------------------------------------- */

function RepeatBanner({ creator, repeat, x }: { creator: Creator; repeat: Commission; x: Derived }) {
  const carried = [
    "Your last brief",
    x.product ? `${x.product.name} context` : null,
    x.learnings.length ? plural(x.learnings.length, "learning") : null,
    `${tierName[x.pkg.tier]} package`,
    ...x.chosen.map((a) => addonById[a.id].name),
  ].filter(Boolean) as string[];
  return (
    <Block tone="lavender" pad="md" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
          <Repeat2 size={20} aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="y-head">
            Commissioning {creator.firstName} again — your brief, product context and{" "}
            {plural(x.product?.learnings.length ?? 0, "learning")} are carried forward
          </h2>
          <p className="y-small y-fg-2">
            Based on{" "}
            <Link href={`/business/commissions/${repeat.id}`} className="y-link font-semibold text-(--b-fg)">
              {repeat.title}
            </Link>
            {repeat.completedAt ? `, completed ${shortDate(repeat.completedAt)}` : ""}.
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Carried forward">
        {carried.map((item) => (
          <li key={item}>
            <Chip>{item}</Chip>
          </li>
        ))}
      </ul>
    </Block>
  );
}

function OrderSummary({
  creator,
  d,
  x,
  action,
}: {
  creator: Creator;
  d: Draft;
  x: Derived;
  action?: React.ReactNode;
}) {
  const row = "flex items-baseline justify-between gap-3";
  return (
    <Block tone="paper" pad="md" className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <FaceAvatar id={creator.id} name="" size={44} />
        <div className="min-w-0 flex-1">
          <p className="y-small truncate font-semibold">{creator.name}</p>
          <p className="y-micro y-fg-2 flex items-center gap-2">
            <Rating value={creator.rating} count={creator.reviewCount} className="!text-xs" />
            <span>· {creator.onTimeRate}% on time</span>
          </p>
        </div>
      </div>
      <dl className="flex flex-col gap-2 border-t border-(--b-line) pt-4">
        <div className={row}>
          <dt className="y-small y-fg-2">Package</dt>
          <dd className="y-small text-end font-semibold">
            {tierName[x.pkg.tier]} · {x.pkg.name}
          </dd>
        </div>
        <div className={row}>
          <dt className="y-small y-fg-2">Deliverables</dt>
          <dd className="y-small text-end font-semibold">
            {d.videoCount} × {formatById[d.format].name.toLowerCase()}, up to {lengthLabel(d.durationSec)}
          </dd>
        </div>
        <div className={row}>
          <dt className="y-small y-fg-2">Due</dt>
          <dd className="y-small text-end font-semibold">{weekdayDate(x.dueDate)}, 18:00</dd>
        </div>
        <div className={row}>
          <dt className="y-small y-fg-2">Revisions</dt>
          <dd className="y-small text-end font-semibold">{x.revisions}</dd>
        </div>
      </dl>
      <PriceSummary
        price={x.pkg.price}
        priceLabel={`${tierName[x.pkg.tier]} package`}
        addons={x.addonPrices}
        className="border-t border-(--b-line) pt-4"
      />
      {action}
      <p className="y-micro y-fg-2 flex items-start gap-2">
        <Lock size={14} aria-hidden className="mt-0.5 flex-none" />
        You&apos;re only charged if they accept; the service fee is only charged when you approve the work.
      </p>
    </Block>
  );
}

function Success({
  s,
  creator,
  x,
  commissionId,
  repeat,
}: {
  s: DemoState;
  creator: Creator;
  x: Derived;
  commissionId: string;
  repeat: Commission | null;
}) {
  const persona = creator.id === ME.creatorId;
  const threadId = commissionById(s, commissionId)?.threadId;
  return (
    <Block
      tone="paper"
      pad="lg"
      className="mx-auto mt-2 flex w-full max-w-2xl flex-col items-center gap-6 text-center"
    >
      <Celebrate className="h-36 w-56 md:h-44 md:w-72" />
      <div className="flex flex-col gap-3" aria-live="polite">
        <h1 className="y-display y-t-display outline-none" tabIndex={-1} ref={(node) => node?.focus({ preventScroll: true })}>
          Offer sent to {creator.firstName}
        </h1>
        <p className="y-lead y-fg-2 mx-auto max-w-[48ch]">
          {creator.firstName} usually replies {responseLabel(creator.responseHours)}. You&apos;ll get
          a notification when {creator.firstName} accepts.
        </p>
      </div>
      <dl className="grid w-full grid-cols-1 gap-2 text-start sm:grid-cols-3">
        <div className="y-tile flex flex-col gap-1 p-4">
          <dt className="y-micro y-fg-2">Authorised, not charged</dt>
          <dd className="y-display y-num text-[26px] leading-none font-semibold">{money(x.totals.total)}</dd>
        </div>
        <div className="y-tile flex flex-col gap-1 p-4">
          <dt className="y-micro y-fg-2">Due</dt>
          <dd className="y-head">{weekdayDate(x.dueDate)}</dd>
        </div>
        <div className="y-tile flex flex-col gap-1 p-4">
          <dt className="y-micro y-fg-2">Package</dt>
          <dd className="y-head">{tierName[x.pkg.tier]}</dd>
        </div>
      </dl>
      <p className="y-small y-fg-2 max-w-[56ch]">
        {repeat && x.learnings.length
          ? `Your brief went with ${plural(x.learnings.length, "carried-forward learning")}, so ${creator.firstName} starts where you left off. `
          : ""}
        Payment is held only once {creator.firstName} accepts, and the service fee is charged when you
        approve the work.
      </p>
      {persona ? (
        <p className="y-micro y-fg-3 max-w-[52ch]">
          Demo tip: open the account menu and switch to Layla&apos;s view to accept this offer from the
          creator side.
        </p>
      ) : null}
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
        <PillButton href={`/business/commissions/${commissionId}`} variant="neon" size="lg" arrow>
          View commission
        </PillButton>
        <PillButton
          href={threadId ? `/business/messages?thread=${threadId}` : "/business/messages"}
          variant="soft"
          size="lg"
        >
          Message {creator.firstName}
        </PillButton>
        <PillButton href="/creators" variant="ghost" size="lg">
          Back to creators
        </PillButton>
      </div>
    </Block>
  );
}
