"use client";

import { CalendarCheck, CheckCircle2, FileCheck2, Repeat2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PaymentMethodPicker, PriceSummary } from "@/components/domain/money";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { TextArea } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { money, moneyExact, plural, priceBreakdown, quoted, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { deadlineDaysOf, isAdCopy, me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { AUTO_APPROVE_DAYS, addonById, usageById } from "@/lib/taxonomy";
import type { ContentRequest } from "@/lib/types";

import { TrustLine } from "./pitch-sheet";
import { addonsFor, deliverableLabel, deliveryInfo, type RankedPitch } from "./shared";

/**
 * Checkout for a pitch: the quote, extras the creator offers (the brief's requested ones ticked),
 * the total held now (the listed prices, nothing on top), the usage on this order, the card, the
 * dates and what happens next. "Hire and hold $X" secures the payment and opens the job. Mounted
 * only while open so every visit starts fresh.
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
  const toast = useToast();
  const router = useRouter();
  const { pitch, creator } = item;
  const offered = addonsFor(request, creator);
  const [addons, setAddons] = useState(() =>
    offered.filter((a) => request.brief.addons.includes(a.id)).map((a) => a.id),
  );
  const [note, setNote] = useState("");
  const [methodId, setMethodId] = useState(() => {
    const methods = me.paymentMethods(s);
    return methods.find((m) => m.isDefault)?.id ?? methods[0]?.id ?? "";
  });
  const [paying, setPaying] = useState(false);
  const timer = useRef(0);
  useEffect(() => {
    const t = timer;
    return () => window.clearTimeout(t.current);
  }, []);

  const chosen = offered.filter((a) => addons.includes(a.id)).map((a) => ({ id: a.id, price: a.price }));
  const totals = priceBreakdown(pitch.price, chosen);
  const delivery = deliveryInfo(pitch.deliveryDays, request, creator);
  const missing = request.brief.addons.filter((id) => !offered.some((a) => a.id === id));
  const revisions = 2 + (addons.includes("extra-revision") ? 1 : 0);
  const adCopy = isAdCopy(request);
  const deadline = deadlineDaysOf(request);
  const usage = usageById[request.brief.usage];

  const confirm = () => {
    if (!methodId || paying) return;
    setPaying(true);
    timer.current = window.setTimeout(() => {
      const id = actions.hirePitch({ pitchId: pitch.id, addons: chosen, paymentMethodId: methodId, note });
      toast({ message: `${creator.firstName} is hired. ${moneyExact(totals.total)} is held until you approve.` });
      router.push(paths.job(id));
    }, 700);
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Hire ${creator.firstName}`}
      description={request.title}
      width="md"
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="y-pill w-full justify-between ps-5"
            data-variant="neon"
            data-arrow="true"
            data-size="lg"
            disabled={!methodId || paying}
            onClick={confirm}
          >
            <span aria-live="polite">{paying ? "Holding the payment…" : `Hire and hold ${moneyExact(totals.total)}`}</span>
            <span aria-hidden className="y-arrow">
              {paying ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <CalendarCheck size={18} />
              )}
            </span>
          </button>
          <p className="y-micro y-fg-3 text-center">
            You can cancel for a full refund until the first version is delivered.
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="y-tile flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <FaceAvatar id={creator.id} name="" size={40} />
            <div className="min-w-0">
              <p className="y-small font-semibold">{creator.name}</p>
              <TrustLine creator={creator} />
            </div>
          </div>
          <p dir="auto" className="y-small border-t border-(--b-line) pt-3">
            <span className="y-fg-2">{adCopy ? "Their sample line: " : "Their idea: "}</span>
            {quoted(pitch.angle)}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2">
          <div className="y-tile flex flex-col gap-0.5 p-4">
            <dt className="y-micro y-fg-2">Their quote</dt>
            <dd className="y-display y-num text-[24px] leading-tight">{money(pitch.price)}</dd>
            <dd className="y-micro y-fg-2">{deliverableLabel(request)}, as briefed</dd>
          </div>
          <div className="y-tile flex flex-col gap-0.5 p-4">
            <dt className="y-micro y-fg-2">First version by</dt>
            <dd className="y-head">{weekdayDate(delivery.date)}</dd>
            {delivery.startsOn ? (
              <dd className="y-micro y-fg-2">Starts when free, {weekdayDate(delivery.startsOn)}</dd>
            ) : deadline ? (
              <dd className="y-micro y-fg-2">Your deadline: {plural(deadline, "day")} from hire</dd>
            ) : null}
            <dd className="y-micro y-fg-2 inline-flex items-center gap-1">
              <Repeat2 size={13} aria-hidden /> {plural(revisions, "round")} of changes included
            </dd>
          </div>
        </dl>

        {offered.length ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="y-label mb-2">Extras from {creator.firstName}</legend>
            {offered.map((addon) => {
              const info = addonById[addon.id];
              const Icon = info.icon;
              const on = addons.includes(addon.id);
              const requested = request.brief.addons.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className={`y-tile flex cursor-pointer items-start gap-3 p-3.5 ${on ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
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
                {creator.firstName} doesn&apos;t offer {missing.map((id) => addonById[id].name.toLowerCase()).join(" or ")}. Ask
                in a message if you need it.
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <div className="y-tile p-4">
          <PriceSummary price={pitch.price} priceLabel={`${creator.firstName}'s quote`} addons={chosen} showRights={false} />
          <p className="y-micro y-fg-2 mt-2.5 inline-flex items-start gap-1.5">
            <FileCheck2 size={14} aria-hidden className="mt-px flex-none" />
            {adCopy
              ? `Usage: ${usage.phrase}, included in the price.`
              : `Usage: ${usage.phrase}, included in the price. Raw footage included.`}
          </p>
        </div>

        <PaymentMethodPicker value={methodId} onChange={setMethodId} />

        <div className="flex flex-col gap-2">
          <h3 className="y-label">What happens next</h3>
          <ul className="flex flex-col gap-2">
            <li className="y-small flex items-start gap-2.5">
              <ShieldCheck size={18} aria-hidden className="mt-px flex-none" />
              {moneyExact(totals.total)} is held now and paid to {creator.firstName} only when you approve.
            </li>
            <li className="y-small flex items-start gap-2.5">
              <CheckCircle2 size={18} aria-hidden className="mt-px flex-none" />
              {creator.firstName} starts {delivery.startsOn ? `on ${weekdayDate(delivery.startsOn)}` : "today"} and gets your
              product context and assets.
            </li>
            <li className="y-small flex items-start gap-2.5">
              <CheckCircle2 size={18} aria-hidden className="mt-px flex-none" />
              You review each version and approve it or request changes ({plural(revisions, "round")} included). A version
              you don&apos;t answer approves itself {plural(AUTO_APPROVE_DAYS, "day")} after it arrives.
            </li>
            <li className="y-small flex items-start gap-2.5">
              <CheckCircle2 size={18} aria-hidden className="mt-px flex-none" />
              Nothing delivered means a full refund of {moneyExact(totals.total)}.
            </li>
          </ul>
        </div>

        <TextArea
          label={`Note to ${creator.firstName}`}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything before they start? Timing, access, which part of the idea you liked."
          hint="Sent as your first message in the job."
        />
      </div>
    </Sheet>
  );
}
