"use client";

import { AtSign, CircleCheck, CircleX, Lightbulb, LoaderCircle, Wallet } from "lucide-react";
import { useEffect, useId, useState } from "react";

import {
  CAMPAIGN_FLOOR,
  ConnectStatus,
  READ_ONLY_NOTE,
  type ConnectPhase,
} from "@/components/account/social";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { FieldShell, SelectField, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { ACCOUNT_HINT, accountNumberError, BANK_CODE_HINT, bankCodeError } from "@/components/money/payout-methods";
import { cities } from "@/lib/data";
import { money, priceBreakdown } from "@/lib/format";
import { hashString } from "@/lib/hash";
import {
  creatorKindById,
  creatorKinds,
  DEFAULT_LANGUAGE,
  formatById,
  formats,
  languageById,
  languages,
  niches,
  PRICE_MAX_PER_YAPP,
  PRICE_MIN_PER_YAPP,
} from "@/lib/taxonomy";
import type { CreatorKind, FormatId, LanguageId, NicheId, PackageTier } from "@/lib/types";

import { CheckCards, GroupError, GroupLabel, RadioCards, toggleIn } from "./choice";
import { IdVerification, type IdStatus } from "./id-verify";
import { tiers, type MarketGuide } from "./market";
import { cityOptions, type Errors } from "./order-steps";
import type { Sample } from "./portfolio-uploader";

/**
 * Onboarding steps for making videos, condensed from the old creator setup. Self-contained: the
 * prototype doesn't create a new creator from them (the demo continues as Layla). The "Both" path
 * uses the short <MakeLite> step instead, which does create a creator profile.
 */

export type MakeData = {
  handle: string;
  kind: CreatorKind | "";
  languages: LanguageId[];
  formats: FormatId[];
  niches: NicheId[];
  samples: Sample[];
  tiktok: string;
  tiktokPhase: ConnectPhase;
  prices: Record<PackageTier, string>;
  pricesSet: boolean;
  payout: "bank" | "wallet";
  holder: string;
  account: string;
  bankCode: string;
  walletAccount: string;
  idStatus: IdStatus;
};

export const initialMakeData = (name: string): MakeData => ({
  handle: suggestHandle(name),
  kind: "",
  languages: [DEFAULT_LANGUAGE],
  formats: [],
  niches: [],
  samples: [],
  tiktok: "",
  tiktokPhase: "idle",
  prices: { basic: "", standard: "", premium: "" },
  pricesSet: false,
  payout: "bank",
  holder: name,
  account: "",
  bankCode: "",
  walletAccount: "",
  idStatus: "none",
});

const tierLabel: Record<PackageTier, string> = {
  basic: "One video",
  standard: "Video + 3 hooks",
  premium: "Three videos",
};

const handlePattern = /^[a-z0-9_.]{3,20}$/;
/** Stable generated face for the new creator (doesn't change as the handle is typed). */
export const NEW_FACE = "cr-new-profile";
const reservedHandles = ["yapp", "admin", "support", "help", "team", "creators"];

export function suggestHandle(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
}

/** Simulated "real followers" for an onboarding TikTok handle (6K–36K, so both outcomes show). */
export const simulatedFollowers = (handle: string) => 6_000 + (hashString(handle.toLowerCase()) % 30_000);

/** Suggested prices from the market guide, as form strings. */
export const suggestedPrices = (guide: MarketGuide): Record<PackageTier, string> => ({
  basic: String(guide.tiers.basic.price),
  standard: String(guide.tiers.standard.price),
  premium: String(guide.tiers.premium.price),
});

/* -------------------------------------------------------------------------- */
/* Handle availability (simulated lookup)                                      */
/* -------------------------------------------------------------------------- */

export type HandleStatus = "empty" | "invalid" | "checking" | "available" | "taken";

export function useHandleCheck(handle: string, taken: string[]): HandleStatus {
  const valid = handlePattern.test(handle);
  const isTaken = taken.includes(handle) || reservedHandles.includes(handle);
  const [result, setResult] = useState<{ handle: string; taken: boolean } | null>(null);
  useEffect(() => {
    if (!valid) return;
    const timer = window.setTimeout(() => setResult({ handle, taken: isTaken }), 650);
    return () => window.clearTimeout(timer);
  }, [handle, valid, isTaken]);
  if (!handle) return "empty";
  if (!valid) return "invalid";
  if (result?.handle !== handle) return "checking";
  return result.taken ? "taken" : "available";
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export function validateProfile(d: MakeData & { name: string; cityId: string }, handle: HandleStatus): Errors {
  const e: Errors = {};
  if (d.name.trim().length < 2) e.name = "Enter the name people will see.";
  if (handle === "empty") e.handle = "Choose a handle for your profile link.";
  if (handle === "invalid") e.handle = "Use 3–20 lowercase letters, numbers, dots or underscores.";
  if (handle === "taken") e.handle = "That handle is taken. Try one of the suggestions.";
  if (handle === "checking") e.handle = "Still checking that handle. Try again in a second.";
  if (!d.cityId) e.cityId = "Choose the city you film in.";
  if (!d.kind) e.kind = "Choose the option that fits you best.";
  return e;
}

export function validateWork(d: MakeData): Errors {
  const e: Errors = {};
  if (d.languages.length === 0) e.languages = "Pick at least one language you make videos in.";
  if (d.formats.length === 0) e.formats = "Pick at least one format you make.";
  if (d.niches.length === 0) e.niches = "Pick at least one kind of product.";
  return e;
}

export function validatePortfolio(d: MakeData): Errors {
  const e: Errors = {};
  if (d.samples.length === 0) e.samples = "Add at least one sample. People order from samples.";
  else if (d.samples.some((s) => s.progress < 100)) e.samples = "Wait for your uploads to finish.";
  d.samples.forEach((s) => {
    if (s.progress < 100) return;
    if (s.title.trim().length < 3) e[`title-${s.id}`] = "Give this sample a short title.";
    if (!s.format) e[`format-${s.id}`] = "Choose the format.";
  });
  return e;
}

export function validateTikTok(d: MakeData): Errors {
  const e: Errors = {};
  if (d.tiktokPhase === "connecting" || d.tiktokPhase === "checking")
    e.tiktok = "Still checking your account. One moment.";
  else if (d.tiktok.trim() && d.tiktokPhase !== "done")
    e.tiktok = "Connect the account first, or clear the handle to skip.";
  return e;
}

export function validatePaid(d: MakeData): Errors {
  const e: Errors = {};
  let previous = 0;
  for (const tier of tiers) {
    const value = d.prices[tier];
    const price = Number(value);
    if (!value || !Number.isFinite(price) || price < PRICE_MIN_PER_YAPP) e[`price-${tier}`] = `At least $${PRICE_MIN_PER_YAPP}.`;
    else if (price > PRICE_MAX_PER_YAPP) e[`price-${tier}`] = `At most $${PRICE_MAX_PER_YAPP.toLocaleString("en-US")}.`;
    else if (price <= previous) e[`price-${tier}`] = "More than the one before.";
    if (Number.isFinite(price)) previous = price;
  }
  if (d.payout === "bank") {
    if (d.holder.trim().length < 3) e.holder = "Enter the name on the account.";
    const account = accountNumberError(d.account);
    if (account) e.account = account;
    const code = bankCodeError(d.bankCode);
    if (code) e.bankCode = code;
  } else if (d.walletAccount.trim().length < 5) {
    e.walletAccount = "Enter the email or phone number your wallet uses.";
  }
  if (d.idStatus === "none") e.idStatus = "Verify your ID so you can get paid.";
  return e;
}

export function validateMakeLite(d: MakeData): Errors {
  const e: Errors = {};
  if (d.languages.length === 0) e.languages = "Pick at least one language.";
  if (d.formats.length === 0) e.formats = "Pick at least one format.";
  return e;
}

/* -------------------------------------------------------------------------- */
/* Shared pickers                                                              */
/* -------------------------------------------------------------------------- */

type SetMake = (patch: Partial<MakeData>) => void;

function LanguagePicker({ value, set, error }: { value: LanguageId[]; set: SetMake; error?: string | null }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-3">
      <GroupLabel id={id} required>
        Languages you make videos in
      </GroupLabel>
      <div role="group" aria-labelledby={id} data-invalid={error ? true : undefined} className="flex flex-wrap gap-2">
        {languages.map((lang) => (
          <FilterChip
            key={lang.id}
            pressed={value.includes(lang.id)}
            onClick={() => set({ languages: toggleIn(value, lang.id) })}
          >
            {lang.name}
          </FilterChip>
        ))}
      </div>
      <GroupError>{error}</GroupError>
    </div>
  );
}

function FormatChips({ value, set, error }: { value: FormatId[]; set: SetMake; error?: string | null }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-3">
      <GroupLabel id={id} required>
        Formats you make
      </GroupLabel>
      <div role="group" aria-labelledby={id} data-invalid={error ? true : undefined} className="flex flex-wrap gap-2">
        {formats.map((format) => {
          const Icon = format.icon;
          return (
            <FilterChip
              key={format.id}
              pressed={value.includes(format.id)}
              onClick={() => set({ formats: toggleIn(value, format.id) })}
              icon={<Icon size={16} aria-hidden />}
            >
              {format.name}
            </FilterChip>
          );
        })}
      </div>
      <GroupError>{error}</GroupError>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Steps                                                                       */
/* -------------------------------------------------------------------------- */

export function ProfileBasics({
  data,
  set,
  errors,
  handleStatus,
  taken,
}: {
  data: MakeData & { name: string; cityId: string };
  set: (patch: Partial<MakeData & { name: string; cityId: string }>) => void;
  errors: Errors;
  handleStatus: HandleStatus;
  taken: string[];
}) {
  const kindId = useId();
  const statusId = useId();
  const city = cities.find((c) => c.id === data.cityId);
  const suggestions =
    handleStatus === "taken"
      ? [
          `${data.handle}_`,
          `${data.handle}.${city ? city.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 6) : "creates"}`,
          `the.${data.handle}`,
        ]
          .map((h) => h.slice(0, 20))
          .filter((h) => handlePattern.test(h) && !taken.includes(h) && h !== data.handle)
      : [];

  return (
    <>
      <TextField
        label="Display name"
        required
        autoComplete="name"
        placeholder="e.g. Layla Mansour"
        hint="Your real name works best."
        value={data.name}
        error={errors.name}
        onChange={(event) => {
          const name = event.target.value;
          const autoHandle = suggestHandle(data.name) === data.handle;
          set(autoHandle ? { name, handle: suggestHandle(name) } : { name });
        }}
      />

      <FieldShell
        label="Handle"
        required
        hint={
          handleStatus === "empty" || handleStatus === "invalid"
            ? "3–20 characters: lowercase letters, numbers, dots and underscores."
            : undefined
        }
        error={errors.handle}
      >
        {({ id, describedBy }) => (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <AtSign
                size={18}
                aria-hidden
                className="y-fg-3 pointer-events-none absolute start-5 top-1/2 -translate-y-1/2"
              />
              <input
                id={id}
                dir="ltr"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={20}
                aria-describedby={[describedBy, statusId].filter(Boolean).join(" ")}
                aria-invalid={errors.handle || handleStatus === "taken" ? true : undefined}
                value={data.handle}
                onChange={(event) =>
                  set({ handle: event.target.value.toLowerCase().replace(/^@/, "").replace(/\s+/g, "") })
                }
                className="y-input ps-12 pe-12"
              />
              <span aria-hidden className="absolute end-4 top-1/2 -translate-y-1/2">
                {handleStatus === "checking" ? (
                  <LoaderCircle size={18} className="y-fg-3 animate-spin" />
                ) : handleStatus === "available" ? (
                  <CircleCheck size={18} className="text-(--y-success)" />
                ) : handleStatus === "taken" ? (
                  <CircleX size={18} className="text-(--y-danger)" />
                ) : null}
              </span>
            </div>
            <p id={statusId} className="y-micro y-fg-2 min-h-5 px-1" aria-live="polite">
              {handleStatus === "checking" ? "Checking availability…" : null}
              {handleStatus === "available" ? (
                <span className="font-semibold text-(--y-success)">
                  Handle available · yapp.co/{data.handle}
                </span>
              ) : null}
              {handleStatus === "taken" && !errors.handle ? (
                <span className="font-semibold text-(--y-danger)">That handle is taken.</span>
              ) : null}
            </p>
            {suggestions.length ? (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Available alternatives">
                <span className="y-micro y-fg-2">Try:</span>
                {suggestions.map((suggestion) => (
                  <PillButton key={suggestion} variant="soft" size="sm" onClick={() => set({ handle: suggestion })}>
                    @{suggestion}
                  </PillButton>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </FieldShell>

      <SelectField
        label="City you film in"
        required
        options={cityOptions}
        value={data.cityId}
        error={errors.cityId}
        onChange={(event) => set({ cityId: event.target.value })}
      />

      <div className="flex flex-col gap-3">
        <GroupLabel id={kindId} required>
          What kind of creator are you?
        </GroupLabel>
        <RadioCards<CreatorKind>
          labelledBy={kindId}
          value={data.kind}
          invalid={Boolean(errors.kind)}
          onChange={(kind) => set({ kind })}
          options={creatorKinds.map((kind) => {
            const Icon = kind.icon;
            return { value: kind.id, title: kind.name, body: kind.description, icon: <Icon size={20} /> };
          })}
        />
        <GroupError>{errors.kind}</GroupError>
      </div>
    </>
  );
}

export function WhatYouMake({ data, set, errors }: { data: MakeData; set: SetMake; errors: Errors }) {
  const formatsId = useId();
  const nichesId = useId();
  return (
    <>
      <LanguagePicker value={data.languages} set={set} error={errors.languages} />

      <div className="flex flex-col gap-3">
        <GroupLabel id={formatsId} required>
          Formats you make
        </GroupLabel>
        <CheckCards
          labelledBy={formatsId}
          values={data.formats}
          onToggle={(id) => set({ formats: toggleIn(data.formats, id) })}
          options={formats.map((format) => {
            const Icon = format.icon;
            return { value: format.id, title: format.name, body: format.short, icon: <Icon size={20} /> };
          })}
        />
        <GroupError>{errors.formats}</GroupError>
      </div>

      <div className="flex flex-col gap-3">
        <GroupLabel id={nichesId} required>
          Products you know well
        </GroupLabel>
        <div
          role="group"
          aria-labelledby={nichesId}
          data-invalid={errors.niches ? true : undefined}
          className="flex flex-wrap gap-2"
        >
          {niches.map((niche) => {
            const pressed = data.niches.includes(niche.id);
            const full = !pressed && data.niches.length >= 4;
            return (
              <FilterChip
                key={niche.id}
                pressed={pressed}
                onClick={() => {
                  if (full) return;
                  set({ niches: toggleIn(data.niches, niche.id) });
                }}
                className={full ? "opacity-50" : ""}
              >
                {niche.name}
              </FilterChip>
            );
          })}
        </div>
        <p className="y-micro y-fg-3 px-1" aria-live="polite">
          {data.niches.length >= 4 ? "That's 4, the most you can pick. Remove one to swap." : "Pick up to 4."}
        </p>
        <GroupError>{errors.niches}</GroupError>
      </div>
    </>
  );
}

/**
 * "Connect your TikTok (read-only)". Purely visual here: a handle, then the simulated connect and
 * follower check. Skippable; the real connection lives in Edit profile → Connected accounts.
 */
export function TikTokStep({
  data,
  set,
  errors,
  onConnect,
}: {
  data: MakeData;
  set: SetMake;
  errors: Errors;
  onConnect: () => void;
}) {
  const busy = data.tiktokPhase === "connecting" || data.tiktokPhase === "checking";
  const done = data.tiktokPhase === "done";
  return (
    <>
      <p className="y-small y-fg-2 max-w-[56ch]">
        Optional. Custom orders hire on your portfolio. UGC campaigns pay a fixed price per video by
        follower tier, starting at {CAMPAIGN_FLOOR} verified followers.
      </p>
      <div className="flex flex-col gap-3">
        <FieldShell
          label="TikTok handle"
          error={errors.tiktok}
          hint={READ_ONLY_NOTE}
        >
          {({ id, describedBy }) => (
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <AtSign
                  size={18}
                  aria-hidden
                  className="y-fg-3 pointer-events-none absolute start-5 top-1/2 -translate-y-1/2"
                />
                <input
                  id={id}
                  dir="ltr"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={30}
                  aria-describedby={describedBy}
                  aria-invalid={errors.tiktok ? true : undefined}
                  disabled={busy}
                  value={data.tiktok}
                  onChange={(event) =>
                    set({
                      tiktok: event.target.value.replace(/^@/, "").replace(/\s+/g, ""),
                      tiktokPhase: "idle",
                    })
                  }
                  className="y-input ps-12"
                />
              </div>
              <PillButton
                variant="contrast"
                onClick={onConnect}
                disabled={busy || done || data.tiktok.trim().length < 2}
                aria-busy={busy || undefined}
                className="flex-none"
              >
                {done ? "Connected" : busy ? "Connecting…" : "Connect read-only"}
              </PillButton>
            </div>
          )}
        </FieldShell>
        <ConnectStatus
          phase={data.tiktokPhase}
          platform="tiktok"
          followers={done ? simulatedFollowers(data.tiktok) : undefined}
        />
      </div>
    </>
  );
}

function PriceField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}) {
  return (
    <FieldShell label={label} required error={error} optionalLabel={false}>
      {({ id, describedBy }) => (
        <div className="relative">
          <span
            aria-hidden
            className="y-fg-2 pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 font-semibold"
          >
            $
          </span>
          <input
            id={id}
            inputMode="numeric"
            dir="ltr"
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            value={value}
            onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 5))}
            className="y-input y-num ps-9 text-lg font-semibold"
          />
        </div>
      )}
    </FieldShell>
  );
}

/** Prices (prefilled from the market guide), payout method and the simulated ID check. */
export function GetPaid({
  data,
  set,
  errors,
  guide,
  onPrice,
  onVerify,
}: {
  data: MakeData;
  set: SetMake;
  errors: Errors;
  guide: MarketGuide;
  onPrice: (tier: PackageTier, value: string) => void;
  onVerify: () => void;
}) {
  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="y-label mb-3 w-full">
          <span>Your prices</span>
          <span className="y-micro y-fg-3 font-medium">
            Suggested from {guide.sample} creators like you
          </span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {tiers.map((tier) => (
            <PriceField
              key={tier}
              label={tierLabel[tier]}
              value={data.prices[tier]}
              error={errors[`price-${tier}`]}
              onChange={(value) => onPrice(tier, value)}
            />
          ))}
        </div>
        <p className="y-micro y-fg-3 px-1">Change delivery times and what&apos;s included any time in Edit profile.</p>
      </fieldset>

      <div className="flex flex-col gap-3">
        <p className="y-label">Payout method</p>
        <SegmentedToggle<"bank" | "wallet">
          label="Payout method"
          size="md"
          value={data.payout}
          onChange={(payout) => set({ payout })}
          options={[
            { value: "bank", label: "Bank account" },
            { value: "wallet", label: "Digital wallet" },
          ]}
          className="w-fit"
        />
      </div>

      {data.payout === "bank" ? (
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Account holder"
            required
            autoComplete="name"
            value={data.holder}
            error={errors.holder}
            onChange={(event) => set({ holder: event.target.value })}
          />
          <TextField
            label="Account number"
            required
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            hint={ACCOUNT_HINT}
            value={data.account}
            error={errors.account}
            onChange={(event) => set({ account: event.target.value.toUpperCase().slice(0, 42) })}
          />
          <TextField
            label="Routing or transit number"
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            hint={BANK_CODE_HINT}
            value={data.bankCode}
            error={errors.bankCode}
            onChange={(event) => set({ bankCode: event.target.value.slice(0, 16) })}
          />
          <p className="y-micro y-fg-2 md:col-span-2">Payouts arrive in 1–2 business days.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Email or phone on the wallet"
            required
            dir="ltr"
            autoComplete="email"
            value={data.walletAccount}
            error={errors.walletAccount}
            hint="Any digital wallet that takes US dollars. Payouts arrive in 1–2 business days."
            onChange={(event) => set({ walletAccount: event.target.value })}
          />
        </div>
      )}

      <IdVerification status={data.idStatus} onSubmit={onVerify} error={errors.idStatus} />
    </>
  );
}

/** "Both" path: one short step that sets up making videos too. */
export function MakeLite({ data, set, errors }: { data: MakeData; set: SetMake; errors: Errors }) {
  return (
    <>
      <LanguagePicker value={data.languages} set={set} error={errors.languages} />
      <FormatChips value={data.formats} set={set} error={errors.formats} />
      <TextField
        label="TikTok handle"
        dir="ltr"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="yourhandle"
        hint={`Optional. Connect it to take UGC campaigns (from ${CAMPAIGN_FLOOR} followers). ${READ_ONLY_NOTE}`}
        value={data.tiktok}
        onChange={(event) => set({ tiktok: event.target.value.replace(/^@/, "").replace(/\s+/g, "") })}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Asides                                                                      */
/* -------------------------------------------------------------------------- */

export function ProfilePreview({
  data,
}: {
  data: MakeData & { name: string; cityId: string };
}) {
  const city = cities.find((c) => c.id === data.cityId);
  const meta = [
    data.kind ? creatorKindById[data.kind].name : null,
    data.languages.map((id) => languageById[id].name).join(", ") || null,
    data.formats.map((id) => formatById[id].name).join(", ") || null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Block as="section" tone="paper" pad="md" className="flex flex-col gap-3" aria-label="Profile preview">
      <p className="y-micro y-fg-2">How people will see you</p>
      <div className="flex items-center gap-3">
        <FaceAvatar id={NEW_FACE} name="" size={52} />
        <div className="flex min-w-0 flex-col">
          <p className="y-head truncate">{data.name.trim() || "Your name"}</p>
          <p className="y-small y-fg-2 truncate">
            @{data.handle || "handle"}
            {city ? ` · ${city.name}` : ""}
          </p>
        </div>
      </div>
      {meta ? <p className="y-small y-fg-2">{meta}</p> : null}
    </Block>
  );
}

export function PortfolioTips() {
  const titleId = useId();
  const tips = ["Hook in the first 2 seconds", "Film the real app on your own phone", "Captions on, and one clear ask at the end"];
  return (
    <Block as="section" tone="paper" pad="md" className="flex flex-col gap-3" aria-labelledby={titleId}>
      <h2 id={titleId} className="y-head flex items-center gap-2">
        <Lightbulb size={18} aria-hidden className="flex-none" />
        What converts
      </h2>
      <ol className="flex flex-col gap-2">
        {tips.map((tip, index) => (
          <li key={tip} className="y-small flex items-center gap-3">
            <span
              aria-hidden
              className="y-num grid size-6 flex-none place-items-center rounded-full bg-(--b-chip) text-xs font-semibold"
            >
              {index + 1}
            </span>
            {tip}
          </li>
        ))}
      </ol>
    </Block>
  );
}

export function KeepAll({ standardPrice }: { standardPrice: number }) {
  const titleId = useId();
  const breakdown = priceBreakdown(standardPrice);
  return (
    <Block as="section" tone="paper" pad="md" className="flex flex-col gap-3" aria-labelledby={titleId}>
      <h2 id={titleId} className="y-head flex items-center gap-2">
        <Wallet size={18} aria-hidden className="flex-none" />
        You keep 100%
      </h2>
      <dl className="flex flex-col gap-2">
        <div className="flex justify-between gap-3">
          <dt className="y-small">You earn</dt>
          <dd className="y-num y-head">{money(breakdown.creatorEarns)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="y-small y-fg-2">The buyer pays, with the 10% fee</dt>
          <dd className="y-num y-small y-fg-2">{money(breakdown.total)}</dd>
        </div>
      </dl>
      <p className="y-micro y-fg-2">On campaign videos you earn the full tier price; the brand pays the fee.</p>
    </Block>
  );
}
