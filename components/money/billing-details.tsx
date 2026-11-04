"use client";

import { useState, useSyncExternalStore } from "react";

import { isEmail } from "@/components/settings/controls";
import { SelectField, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cityById, me } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { countries } from "@/lib/taxonomy";
import type { CountryId } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Persistence: the store has no fields for legal name / VAT / country, so they */
/* live in their own localStorage key (the invoice email lives in settings).    */
/* -------------------------------------------------------------------------- */

const KEY = "yapp-billing-details-v1";
type Stored = { companyName?: string; vat?: string; country?: CountryId };

let cache: Stored | null | undefined;
const listeners = new Set<() => void>();

function read(): Stored | null {
  if (cache === undefined) {
    try {
      cache = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as Stored | null;
    } catch {
      cache = null;
    }
  }
  return cache;
}

function write(next: Stored) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: keep it in memory */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type BillingDetails = {
  companyName: string;
  vat: string;
  country: CountryId;
  email: string;
};

/** Billing details for receipts, merged from the store and this browser's saved fields. */
export function useBillingDetails(): BillingDetails {
  const s = useDemo();
  const stored = useSyncExternalStore(subscribe, read, () => null);
  const business = me.business(s);
  return {
    companyName: stored?.companyName ?? business.name,
    vat: stored?.vat ?? "",
    country: stored?.country ?? cityById(business.cityId)?.countryId ?? "sa",
    email: s.settings.business.invoiceEmail,
  };
}

const countryOptions = (Object.keys(countries) as CountryId[]).map((id) => ({
  value: id,
  label: countries[id].name,
}));

function validate(form: BillingDetails) {
  return {
    companyName: form.companyName.trim().length < 2 ? "Enter the company name for your receipts." : null,
    vat:
      form.vat.trim() && !/^[A-Za-z0-9 -]{8,20}$/.test(form.vat.trim())
        ? "Use 8 to 20 letters or numbers, like 300123456700003."
        : null,
    email: !isEmail(form.email) ? "Enter an email like finance@daftar.app." : null,
  };
}

export function BillingDetailsForm() {
  const hydrated = useHydrated();
  const details = useBillingDetails();
  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-13 w-full !rounded-full" />
          </div>
        ))}
      </div>
    );
  }
  return <Form initial={details} />;
}

function Form({ initial }: { initial: BillingDetails }) {
  const toast = useToast();
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = validate(form);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const show = (field: keyof typeof errors) => (touched[field] ? errors[field] : null);

  const set = <K extends keyof BillingDetails>(key: K, value: BillingDetails[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const blur = (field: string) => () => setTouched((current) => ({ ...current, [field]: true }));

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched({ companyName: true, vat: true, email: true });
        if (errors.companyName || errors.vat || errors.email) return;
        const next = { ...form, companyName: form.companyName.trim(), vat: form.vat.trim(), email: form.email.trim() };
        write({ companyName: next.companyName, vat: next.vat, country: next.country });
        actions.updateSettings("business", { invoiceEmail: next.email });
        setForm(next);
        setSaved(next);
        toast({ message: "Billing details saved. New receipts will use them." });
      }}
    >
      <TextField
        label="Company name"
        required
        hint="The legal name printed on every receipt."
        value={form.companyName}
        onChange={(event) => set("companyName", event.target.value)}
        onBlur={blur("companyName")}
        error={show("companyName")}
        autoComplete="organization"
      />
      <TextField
        label="VAT or tax number"
        hint="Add it if you reclaim VAT on the service fee."
        value={form.vat}
        onChange={(event) => set("vat", event.target.value)}
        onBlur={blur("vat")}
        error={show("vat")}
        inputMode="text"
        placeholder="300123456700003"
      />
      <TextField
        label="Billing email"
        required
        type="email"
        hint="Receipts are sent here when a payment is held, released or refunded."
        value={form.email}
        onChange={(event) => set("email", event.target.value)}
        onBlur={blur("email")}
        error={show("email")}
        autoComplete="email"
      />
      <SelectField
        label="Country"
        required
        options={countryOptions}
        value={form.country}
        onChange={(event) => set("country", event.target.value as CountryId)}
      />
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <PillButton type="submit" variant="contrast" disabled={!dirty}>
          Save billing details
        </PillButton>
        {!dirty ? <span className="y-micro y-fg-3">All changes saved</span> : null}
      </div>
    </form>
  );
}
