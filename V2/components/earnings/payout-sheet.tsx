"use client";

import { CalendarClock, Plus } from "lucide-react";
import { useState } from "react";

import { Celebrate } from "@/components/ui/celebrate";
import { FieldShell } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { DAY, NOW, TZ_OFFSET } from "@/lib/clock";
import { money, weekdayDate } from "@/lib/format";
import { me } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";

import { PayoutIcon } from "./payout-methods";

/** Two business days from the demo clock, skipping Saturday and Sunday. */
export function arrivalDate(): string {
  let t = NOW;
  let added = 0;
  while (added < 2) {
    t += DAY;
    const weekday = new Date(t + TZ_OFFSET).getUTCDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return new Date(t).toISOString();
}

/**
 * Withdraw: how much (the whole balance to start, whole dollars), where to (the payout methods,
 * default first), and when it arrives. Then a short confirmation. Mounted only while open, so
 * every opening starts from the full balance.
 */
export function PayoutSheet(props: {
  open: boolean;
  onClose: () => void;
  available: number;
  onAddMethod: () => void;
}) {
  if (!props.open) return null;
  return <PayoutFlow {...props} />;
}

function PayoutFlow({
  onClose,
  available,
  onAddMethod,
}: {
  onClose: () => void;
  available: number;
  onAddMethod: () => void;
}) {
  const s = useDemo();
  const methods = [...me.payoutMethods(s)].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const [amount, setAmount] = useState(String(available));
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<{ amount: number; to: string } | null>(null);
  const chosen = methods.find((m) => m.id === methodId) ?? methods[0];
  const arrival = weekdayDate(arrivalDate());
  const value = Number(amount);
  const error =
    amount.trim() === ""
      ? "Enter an amount to withdraw."
      : !Number.isFinite(value) || value <= 0
        ? "Enter an amount above $0."
        : !Number.isInteger(value)
          ? "Use whole dollars."
          : value > available
            ? `You can withdraw up to ${money(available)}.`
            : null;

  if (done) {
    return (
      <Sheet
        open
        onClose={onClose}
        title="Your payout is on its way"
        side="center"
        width="sm"
        footer={
          <div className="flex justify-end">
            <PillButton variant="contrast" onClick={onClose}>
              Done
            </PillButton>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <Celebrate className="h-28 w-48" />
          <p className="y-display y-num text-[40px] leading-none tracking-[-0.03em]">{money(done.amount)}</p>
          <p className="y-body y-fg-2 max-w-[36ch]" aria-live="polite">
            Heading to {done.to}. Expect it by {arrival}. It shows as processing in your activity until
            it lands.
          </p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Withdraw"
      description={`${money(available)} available. Payouts are free.`}
      width="sm"
      footer={
        methods.length ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <PillButton variant="ghost" onClick={onClose}>
              Cancel
            </PillButton>
            <PillButton type="submit" form="payout-form" variant="neon">
              {error ? "Withdraw" : `Withdraw ${money(value)}`}
            </PillButton>
          </div>
        ) : null
      }
    >
      {!methods.length ? (
        <div className="flex flex-col items-start gap-3">
          <p className="y-body">Add a bank account or a digital wallet first, then withdraw.</p>
          <PillButton
            variant="contrast"
            icon={<Plus size={18} aria-hidden />}
            onClick={() => {
              onClose();
              onAddMethod();
            }}
          >
            Add payout method
          </PillButton>
        </div>
      ) : (
        <form
          id="payout-form"
          noValidate
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            setTouched(true);
            if (error || !chosen) return;
            actions.requestPayout(value, chosen.id);
            setDone({ amount: value, to: `${chosen.label} (${chosen.detail.replace(/^Account/, "account")})` });
          }}
        >
          <FieldShell label="Amount" required hint={`Whole dollars, up to ${money(available)}.`} error={touched ? error : null}>
            {({ id, describedBy }) => (
              <div className="sb-money flex items-center">
                <span aria-hidden>$</span>
                <input
                  id={id}
                  name="amount"
                  aria-describedby={describedBy}
                  aria-invalid={touched && error ? true : undefined}
                  className="y-input y-num text-lg font-semibold"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
                  onBlur={() => setTouched(true)}
                  data-autofocus
                />
                {value !== available ? (
                  <PillButton
                    variant="soft"
                    size="sm"
                    className="absolute end-1.5"
                    onClick={() => setAmount(String(available))}
                    aria-label={`Withdraw everything, ${money(available)}`}
                  >
                    All
                  </PillButton>
                ) : null}
              </div>
            )}
          </FieldShell>

          <fieldset className="flex flex-col gap-2">
            <legend className="y-label mb-2">Send to</legend>
            {methods.map((method) => {
              const checked = chosen?.id === method.id;
              return (
                <label
                  key={method.id}
                  className={`y-tile flex min-h-14 cursor-pointer items-center gap-3 px-3 ${checked ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""}`}
                >
                  <input
                    type="radio"
                    name="payout-method"
                    className="y-check !rounded-full"
                    checked={checked}
                    onChange={() => setMethodId(method.id)}
                  />
                  <PayoutIcon kind={method.kind} size={16} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="y-small font-semibold">{method.label}</span>
                    <span className="y-micro y-fg-2 y-num truncate">
                      {method.detail}
                      {method.isDefault ? " · Default" : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          <p className="y-small flex items-start gap-3">
            <CalendarClock size={18} aria-hidden className="mt-0.5 flex-none" />
            <span>
              <span className="font-semibold">Arrives by {arrival}</span>
              <span className="y-fg-2 block">
                One to two business days. Bank transfers can take longer on public holidays.
              </span>
            </span>
          </p>
        </form>
      )}
    </Sheet>
  );
}
