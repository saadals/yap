"use client";

import { CalendarCheck, MessageCircle, Repeat2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { CreatorRow } from "@/components/domain/creator-card";
import { PaymentMethodPicker, PriceSummary, ProtectedNote } from "@/components/domain/money";
import { Celebrate } from "@/components/ui/celebrate";
import { TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { money, moneyExact, priceBreakdown, quoted, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { addonById } from "@/lib/taxonomy";
import type { ContentRequest } from "@/lib/types";

import { TrustLine, deliveryInfo } from "./pitch-card";
import { deliverableLabel, type RankedPitch } from "./shared";

/**
 * Checkout for a pitch: confirm the quote, pick extras the creator offers, pay into protection.
 * Mounted only while open so every visit starts fresh.
 */
export function HireSheet({
  item,
  request,
  onClose,
}: {
  item: RankedPitch;
  request: ContentRequest;
  onClose: () => void;
}) {
  const s = useDemo();
  const { pitch, creator } = item;
  const [addons, setAddons] = useState(() =>
    creator.addons.filter((a) => request.brief.addons.includes(a.id)).map((a) => a.id),
  );
  const [note, setNote] = useState("");
  const [methodId, setMethodId] = useState(() => {
    const methods = me.paymentMethods(s);
    return methods.find((m) => m.isDefault)?.id ?? methods[0]?.id ?? "";
  });
  const [phase, setPhase] = useState<"form" | "paying" | "done">("form");
  const [commissionId, setCommissionId] = useState<string | null>(null);
  const timer = useRef(0);
  useEffect(() => {
    const t = timer;
    return () => window.clearTimeout(t.current);
  }, []);

  const chosen = creator.addons.filter((a) => addons.includes(a.id)).map((a) => ({ id: a.id, price: a.price }));
  const totals = priceBreakdown(pitch.price, chosen);
  const delivery = deliveryInfo(pitch.deliveryDays, request, creator);
  const due = delivery.date;
  const missing = request.brief.addons.filter((id) => !creator.addons.some((a) => a.id === id));
  const revisions = 2 + (addons.includes("extra-revision") ? 1 : 0);
  const commission = commissionId ? s.commissions.find((c) => c.id === commissionId) : undefined;

  const confirm = () => {
    if (!methodId || phase !== "form") return;
    setPhase("paying");
    timer.current = window.setTimeout(() => {
      const id = actions.hirePitch({ pitchId: pitch.id, addons: chosen, paymentMethodId: methodId, note });
      setCommissionId(id);
      setPhase("done");
    }, 800);
  };

  if (phase === "done" && commissionId) {
    return (
      <Sheet open onClose={onClose} title={`${creator.firstName} is hired`} hideTitle side="center" width="md">
        <div className="flex flex-col items-center gap-5 pt-2 text-center">
          <Celebrate className="h-36 w-56" />
          <div className="flex flex-col gap-2">
            <h3 className="y-display y-title" aria-live="polite">
              {creator.firstName} is on it.
            </h3>
            <p className="y-body y-fg-2 mx-auto max-w-[40ch]">
              Payment is protected until you approve. The first version is due{" "}
              {weekdayDate(commission?.dueDate ?? due)}, and you&apos;ll
              get a message the moment it&apos;s ready.
            </p>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-2">
            <PillButton href={paths.commission(commissionId)} variant="neon" size="lg" arrow className="justify-between ps-6">
              Open commission
            </PillButton>
            <PillButton
              href={paths.messages(commission?.threadId)}
              variant="outline"
              icon={<MessageCircle size={18} aria-hidden />}
            >
              Message {creator.firstName}
            </PillButton>
          </div>
        </div>
      </Sheet>
    );
  }

  const footer = (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="y-pill w-full justify-between ps-6"
        data-variant="neon"
        data-arrow="true"
        data-size="lg"
        disabled={!methodId || phase !== "form"}
        onClick={confirm}
      >
        <span>{phase === "paying" ? "Securing payment…" : `Hire ${creator.firstName} · ${moneyExact(totals.total)}`}</span>
        <span aria-hidden className="y-arrow">
          {phase === "paying" ? (
            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <CalendarCheck size={20} />
          )}
        </span>
      </button>
      <p className="y-micro y-fg-3 text-center">
        By hiring you agree to Yapp&apos;s commission terms. You can cancel for a full refund until work is delivered.
      </p>
    </div>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Hire ${creator.firstName}`}
      description={request.title}
      width="md"
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        <div className="y-tile flex flex-col gap-3 p-4">
          <CreatorRow creator={creator} href={null} meta={<TrustLine creator={creator} />} />
          <p dir="auto" className="y-small border-t border-(--b-line) pt-3">
            <span className="y-fg-2">Their angle: </span>{quoted(pitch.angle)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2">
          <div className="y-tile flex flex-col gap-0.5 p-4">
            <dt className="y-micro y-fg-2">Their quote</dt>
            <dd className="y-display y-num text-[28px] leading-tight font-semibold">{money(pitch.price)}</dd>
            <dd className="y-micro y-fg-2">
              {deliverableLabel(request.brief.format, request.brief.videoCount)}, as briefed
            </dd>
          </div>
          <div className="y-tile flex flex-col gap-0.5 p-4">
            <dt className="y-micro y-fg-2">First version</dt>
            <dd className="y-head">{weekdayDate(due)}</dd>
            {delivery.startsOn ? (
              <dd className="y-micro y-fg-2">Starts when free on {weekdayDate(delivery.startsOn)}</dd>
            ) : null}
            <dd className="y-micro y-fg-2 inline-flex items-center gap-1">
              <Repeat2 size={13} aria-hidden /> {revisions} rounds of changes included
            </dd>
          </div>
        </dl>

        {creator.addons.length ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="y-label mb-2">Extras from {creator.firstName}</legend>
            {creator.addons.map((addon) => {
              const info = addonById[addon.id];
              const Icon = info.icon;
              const on = addons.includes(addon.id);
              const requested = request.brief.addons.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className={`y-tile flex cursor-pointer items-start gap-3 p-4 ${on ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
                >
                  <Icon size={18} aria-hidden className="mt-0.5 flex-none" />
                  <span className="min-w-0 flex-1">
                    <span className="y-small block font-semibold">
                      {info.name}
                      {requested ? <span className="y-micro y-fg-2 font-medium"> · in your brief</span> : null}
                    </span>
                    <span className="y-micro y-fg-2 block">{info.description}</span>
                  </span>
                  <span className="y-small y-num flex-none font-semibold">+{money(addon.price)}</span>
                  <input
                    type="checkbox"
                    className="y-check mt-0.5"
                    checked={on}
                    onChange={() =>
                      setAddons((current) => (on ? current.filter((id) => id !== addon.id) : [...current, addon.id]))
                    }
                  />
                </label>
              );
            })}
            {missing.length ? (
              <p className="y-micro y-fg-2 px-1">
                {creator.firstName} doesn&apos;t offer {missing.map((id) => addonById[id].name.toLowerCase()).join(" or ")}.
                Ask in a message if you need it.
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <TextArea
          label={`Note to ${creator.firstName}`}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything before they start? Timing, access, which angle you liked best."
          hint="Sent as your first message in the commission chat."
        />

        <PaymentMethodPicker value={methodId} onChange={setMethodId} />

        <div className="y-tile p-4">
          <PriceSummary price={pitch.price} addons={chosen} usage={request.brief.usage} />
        </div>

        <ProtectedNote />
      </div>
    </Sheet>
  );
}
