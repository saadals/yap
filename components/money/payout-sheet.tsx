"use client";

import { CalendarClock, Plus } from "lucide-react";
import { useState } from "react";

import { Celebrate } from "@/components/ui/celebrate";
import { FieldShell, SelectField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { DAY, NOW } from "@/lib/clock";
import { money, weekdayDate } from "@/lib/format";
import { actions, useDemo } from "@/lib/store";

import { payoutLabel } from "./payout-methods";

/** Two business days from the demo clock, skipping Saturday and Sunday (UAE weekend). */
function arrivalDate(): string {
  let t = NOW;
  let added = 0;
  while (added < 2) {
    t += DAY;
    const weekday = new Date(t + 3 * 60 * 60 * 1000).getUTCDay();
    if (weekday !== 0 && weekday !== 6) added += 1;
  }
  return new Date(t).toISOString();
}

export function PayoutSheet({
  open,
  onClose,
  available,
  onAddMethod,
}: {
  open: boolean;
  onClose: () => void;
  available: number;
  onAddMethod: () => void;
}) {
  const s = useDemo();
  const toast = useToast();
  const defaultId = (s.payoutMethods.find((m) => m.isDefault) ?? s.payoutMethods[0])?.id ?? "";
  /** null until edited: the field starts at the full available balance. */
  const [amount, setAmount] = useState<string | null>(null);
  const [methodId, setMethodId] = useState("");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<{ amount: number; label: string } | null>(null);

  const chosen = s.payoutMethods.find((m) => m.id === (methodId || defaultId));
  const display = amount ?? String(available);
  const value = Number(display);
  const error =
    display.trim() === ""
      ? "Enter an amount to withdraw."
      : !Number.isFinite(value) || value <= 0
      ? "Enter an amount above $0."
      : !Number.isInteger(value)
        ? "Use whole dollars."
        : value > available
          ? `You can withdraw up to ${money(available)}.`
          : null;
  const arrival = weekdayDate(arrivalDate());

  const close = () => {
    setAmount(null);
    setMethodId("");
    setTouched(false);
    setDone(null);
    onClose();
  };

  const confirm = () => {
    setTouched(true);
    if (error || !chosen) return;
    actions.requestPayout(value, chosen.id);
    toast({ message: `Payout of ${money(value)} requested. It's on its way to ${chosen.label}.` });
    setDone({ amount: value, label: payoutLabel(chosen) });
  };

  if (done) {
    return (
      <Sheet
        open={open}
        onClose={close}
        title="Payout on its way"
        side="center"
        width="sm"
        footer={
          <div className="flex justify-end">
            <PillButton variant="contrast" onClick={close}>
              Done
            </PillButton>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <Celebrate className="h-32 w-52" />
          <p className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
            {money(done.amount)}
          </p>
          <p className="y-body y-fg-2 max-w-[36ch]" aria-live="polite">
            Heading to {done.label}. Expect it by {arrival}. You&apos;ll see it as processing in your
            payout history until it lands.
          </p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Withdraw earnings"
      description={`${money(available)} available. Payouts are free.`}
      width="sm"
      footer={
        s.payoutMethods.length ? (
          <div className="flex flex-wrap gap-2">
            <PillButton
              type="submit"
              form="payout-form"
              variant="contrast"
              disabled={Boolean(error) || !chosen}
            >
              {error ? "Withdraw" : `Withdraw ${money(value)}`}
            </PillButton>
            <PillButton variant="ghost" onClick={close}>
              Cancel
            </PillButton>
          </div>
        ) : null
      }
    >
      {s.payoutMethods.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="y-body">Add a bank account or wallet first, then come back to withdraw.</p>
          <PillButton
            variant="contrast"
            icon={<Plus size={18} aria-hidden />}
            onClick={() => {
              close();
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
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            confirm();
          }}
        >
          <FieldShell
            label="Amount"
            required
            hint={`Whole dollars, up to ${money(available)}.`}
            error={touched ? error : null}
          >
            {({ id, describedBy }) => (
              <div className="relative flex items-center gap-2">
                <span aria-hidden className="y-fg-2 pointer-events-none absolute start-5 font-semibold">
                  $
                </span>
                <input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={touched && error ? true : undefined}
                  className="y-input y-num !ps-9 text-lg font-semibold"
                  inputMode="numeric"
                  value={display}
                  onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
                  onBlur={() => setTouched(true)}
                  data-autofocus
                />
                <PillButton
                  variant="soft"
                  size="sm"
                  className="absolute end-1.5"
                  onClick={() => setAmount(String(available))}
                  aria-label={`Withdraw the maximum, ${money(available)}`}
                >
                  Max
                </PillButton>
              </div>
            )}
          </FieldShell>
          <SelectField
            label="Send to"
            required
            options={s.payoutMethods.map((m) => ({
              value: m.id,
              label: `${payoutLabel(m)}${m.isDefault ? " (default)" : ""}`,
            }))}
            value={methodId || defaultId}
            onChange={(event) => setMethodId(event.target.value)}
          />
          <div className="y-tile flex items-start gap-3 p-4">
            <CalendarClock size={20} aria-hidden className="mt-0.5 flex-none" />
            <div>
              <p className="y-small font-semibold">Arrives in 1–2 business days</p>
              <p className="y-micro y-fg-2">
                Expected by {arrival}. Bank transfers can take a little longer on public holidays.
              </p>
            </div>
          </div>
        </form>
      )}
    </Sheet>
  );
}
