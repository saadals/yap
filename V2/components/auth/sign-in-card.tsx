"use client";

import { ChevronDown, Info, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { OtpInput } from "@/components/ui/otp-input";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { defaultMode, homeFor, rememberMode, type Mode } from "@/lib/mode";
import { paths, type SignInIntent } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { savedAccounts, useSavedAccounts, type SavedAccount, type SignInMethod } from "@/lib/saved-accounts";
import { businessById } from "@/lib/selectors";
import { useDemo, useHydrated, type DemoState } from "@/lib/store";

import { OrDivider, safeNext } from "./auth-bits";
import { countries, countryById, defaultCountry, formatPhone, fullNumber, isPlausible, maskedNumber } from "./phone";
import { MethodIcon, methodLabel } from "./provider-icons";

const DEMO_CODE = "123456";
const RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const providers: Exclude<SignInMethod, "phone">[] = ["apple", "google", "tiktok", "instagram"];

/** `?intent=order|make` (V1's "ask" still means order). */
const toIntent = (value: string | null): SignInIntent | null =>
  value === "order" || value === "ask" ? "order" : value === "make" ? "make" : null;

const intentLine: Record<SignInIntent, string> = {
  order: "Get short videos made for your product, with payment held until you approve.",
  make: "Make videos for tech brands. You keep 100% of your price.",
};

/** "Nour Haddad at Daftar" / "Layla Mansour". */
function personFor(s: DemoState, accountId: string): string {
  const account = s.accounts.find((a) => a.id === accountId);
  if (!account) return "your demo account";
  const business = businessById(s, account.businessId);
  return account.kind === "business" && business ? `${account.name} at ${business.name}` : account.name;
}

/** The masked identifier a provider sign-in leaves in the saved-accounts list. */
function providerIdentifier(s: DemoState, accountId: string, method: SignInMethod): string {
  const account = s.accounts.find((a) => a.id === accountId);
  if (!account) return "";
  const [local, domain] = account.email.split("@");
  if (method === "apple") return "•••@privaterelay.appleid.com";
  if (method === "google") return `${local[0]}•••@${domain}`;
  return `@${account.reserved.handle}`;
}

/**
 * /signin: one page for signing in and creating an account, as a centred card. Saved accounts
 * come first (one tap), then a phone number and a 6-digit code, then Apple, Google, TikTok and
 * Instagram. Everything is simulated: any plausible number works with the demo code, and who you
 * become follows the door you came through (`?intent=order` is Nour, `?intent=make` is Layla).
 * `?new=1` is the sign-up reading of the same card: the code leads into onboarding.
 *
 * Reads search params, so render it inside <Suspense>.
 */
export function SignInCard() {
  const params = useSearchParams();
  const intent = toIntent(params.get("intent"));
  const next = params.get("next");
  const isNew = params.get("new") === "1";
  const hydrated = useHydrated();
  // Saved accounts live in this browser only: wait for them rather than flash the phone form first.
  if (!hydrated) return <SignInSkeleton />;
  return <Card intent={intent} next={next} isNew={isNew} />;
}

function Card({ intent, next, isNew }: { intent: SignInIntent | null; next: string | null; isNew: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const s = useDemo();
  const { signIn } = usePrefs();
  const titleId = useId();
  const saved = useSavedAccounts().filter((row) => s.accounts.some((a) => a.id === row.accountId));

  const [stage, setStage] = useState<"choose" | "code">("choose");
  const [countryId, setCountryId] = useState(defaultCountry.id);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const country = countryById(countryId);
  const plausible = isPlausible(phone, country);
  const pending = Boolean(busy) || leaving;

  /** Who a new sign-in becomes in the demo: the person who does what the door says. */
  const newAccountId = intent === "make" ? "layla" : "nour";
  const start = intent === "make" ? "make" : intent === "order" ? "order" : undefined;
  const onboardingHref = paths.onboarding(start ? { start } : {});

  /**
   * Starts the session and leaves for the page this sign-in was heading to. `fresh` marks a phone
   * or provider sign-in: on the sign-up card that's a new account, so setup comes first (onboarding
   * signs the demo person in at the end).
   */
  const finish = (row: SavedAccount, fresh: boolean) => {
    setLeaving(true);
    if (isNew && fresh) {
      router.push(onboardingHref);
      return;
    }
    signIn(row.accountId);
    savedAccounts.remember(row);
    const account = s.accounts.find((a) => a.id === row.accountId);
    const mode: Mode = intent ? (intent === "make" ? "studio" : "order") : account ? defaultMode(account) : "order";
    rememberMode(row.accountId, mode);
    toast({ message: `Signed in as ${personFor(s, row.accountId)}` });
    router.replace(safeNext(next, homeFor(mode)));
  };

  const onSaved = (row: SavedAccount) => {
    setBusy(row.accountId);
    window.setTimeout(() => finish(row, false), 450);
  };

  const onProvider = (method: Exclude<SignInMethod, "phone">) => {
    setBusy(method);
    window.setTimeout(
      () =>
        finish({ accountId: newAccountId, method, identifier: providerIdentifier(s, newAccountId, method) }, true),
      900,
    );
  };

  const onSendCode = () => {
    if (!plausible || pending) return;
    setBusy("phone");
    window.setTimeout(() => {
      setBusy(null);
      setStage("code");
    }, 600);
  };

  const title = isNew ? "Create your account" : "Sign in to Yapp";
  const lead = intent
    ? intentLine[intent]
    : isNew
      ? "One account to order videos and to make them. It takes about two minutes."
      : "Welcome back. Pick up where you left off.";

  const savedList =
    saved.length > 0 ? (
      <div className="flex flex-col gap-2">
        <p className="y-label">{isNew ? "Already on Yapp?" : "Continue as"}</p>
        <ul className="flex flex-col gap-2" aria-label="Accounts saved on this device">
          {saved.map((row) => (
            <SavedRow key={row.accountId} row={row} busy={busy === row.accountId} disabled={pending} onPick={onSaved} />
          ))}
        </ul>
        <p className="y-micro y-fg-2 px-1">Demo: Nour orders videos, Layla makes them.</p>
      </div>
    ) : null;

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-5">
      <Block tone="paper" pad="lg" className="y-signin-card flex flex-col gap-6" aria-labelledby={titleId}>
        <div className="flex flex-col gap-1.5">
          <h1 id={titleId} className="y-display y-t-display">
            {title}
          </h1>
          <p className="y-body y-fg-2">{lead}</p>
        </div>

        {stage === "code" ? (
          <CodeStep
            number={fullNumber(phone, country)}
            onBack={() => setStage("choose")}
            leaving={leaving}
            onVerified={() =>
              finish({ accountId: newAccountId, method: "phone", identifier: maskedNumber(phone, country) }, true)
            }
          />
        ) : (
          <>
            {isNew ? null : savedList}
            {!isNew && saved.length > 0 ? <OrDivider label="or use your phone number" /> : null}

            <form
              noValidate
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                onSendCode();
              }}
            >
              <div className="flex flex-col gap-2">
                <label htmlFor={`${titleId}-tel`} className="y-label">
                  Phone number
                </label>
                <div className="flex gap-2" dir="ltr">
                  <div className="y-signin-cc">
                    <span aria-hidden className="y-num">
                      {country.dial}
                    </span>
                    <ChevronDown size={16} aria-hidden />
                    <select
                      aria-label="Country code"
                      value={countryId}
                      onChange={(event) => setCountryId(event.target.value)}
                    >
                      {countries.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} ({option.dial})
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    id={`${titleId}-tel`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder="415 555 0123"
                    className="y-input y-num min-w-0 flex-1"
                    value={phone}
                    onChange={(event) => {
                      const field = event.target;
                      const atEnd = field.selectionStart === field.value.length;
                      // Regroup only while typing at the end, so a mid-number edit keeps its caret.
                      setPhone(atEnd ? formatPhone(field.value, country) : field.value);
                    }}
                  />
                </div>
                <p className="y-micro y-fg-2 px-1">We&apos;ll text you a 6-digit code. No password to remember.</p>
              </div>
              <PillButton
                type="submit"
                variant="neon"
                disabled={!plausible || pending}
                aria-busy={busy === "phone" || undefined}
                className="w-full"
              >
                {busy === "phone" ? "Sending code…" : "Send code"}
              </PillButton>
            </form>

            <OrDivider label="or continue with" />

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                {providers.map((method) => (
                  <button
                    key={method}
                    type="button"
                    className="y-signin-provider"
                    data-provider={method}
                    disabled={pending}
                    aria-busy={busy === method || undefined}
                    aria-label={`Continue with ${methodLabel[method]}`}
                    onClick={() => onProvider(method)}
                  >
                    <MethodIcon method={method} />
                    {busy === method ? "Connecting…" : methodLabel[method]}
                  </button>
                ))}
              </div>
              <p className="y-micro y-fg-2 text-center">Instagram works with Creator or Business accounts.</p>
            </div>

            {isNew ? savedList : null}
          </>
        )}
      </Block>

      {stage === "choose" ? (
        <div className="flex flex-col items-center gap-1.5 text-center">
          {isNew ? (
            saved.length > 0 ? null : (
              <p className="y-small y-fg-2">
                Have an account?{" "}
                <Link
                  href={paths.signIn({ intent: intent ?? undefined, next: next ?? undefined })}
                  className="y-link font-semibold text-(--y-ink)"
                >
                  Sign in
                </Link>
              </p>
            )
          ) : (
            <p className="y-small y-fg-2">
              New here?{" "}
              <Link href={onboardingHref} className="y-link font-semibold text-(--y-ink)">
                Get started
              </Link>
            </p>
          )}
          <p className="y-micro y-fg-2">
            By continuing you agree to the{" "}
            <Link href={paths.legal} className="y-link">
              Terms
            </Link>{" "}
            and{" "}
            <Link href={paths.legal} className="y-link">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SavedRow({
  row,
  busy,
  disabled,
  onPick,
}: {
  row: SavedAccount;
  busy: boolean;
  disabled: boolean;
  onPick: (row: SavedAccount) => void;
}) {
  const s = useDemo();
  const account = s.accounts.find((a) => a.id === row.accountId);
  if (!account) return null;
  const business = businessById(s, account.businessId);
  const role = account.kind === "business" && business ? business.name : account.creatorId ? "Creator" : "Personal";
  return (
    <li className="y-signin-account">
      <button
        type="button"
        className="y-signin-account-main"
        disabled={disabled}
        aria-busy={busy || undefined}
        onClick={() => onPick(row)}
      >
        <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name="" size={40} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">
            {account.name}
            <span className="y-fg-2 font-normal"> · {role}</span>
          </span>
          <span className="y-micro y-fg-2 flex min-w-0 items-center gap-1.5">
            <MethodIcon method={row.method} size={13} />
            <bdi dir="ltr" className="truncate">
              {busy ? "Signing in…" : row.identifier}
            </bdi>
          </span>
        </span>
      </button>
      <button
        type="button"
        className="y-round me-1.5"
        data-tone-btn="ghost"
        data-size="sm"
        disabled={disabled}
        aria-label={`Remove ${account.name} from this device`}
        onClick={() => savedAccounts.forget(row.accountId)}
      >
        <X size={16} aria-hidden />
      </button>
    </li>
  );
}

/** The 6-digit SMS code: checks itself when complete, 60s resend timer, five tries per code. */
function CodeStep({
  number,
  onBack,
  onVerified,
  leaving,
}: {
  number: string;
  onBack: () => void;
  onVerified: () => void;
  leaving: boolean;
}) {
  const toast = useToast();
  const errorId = useId();
  const hintId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const locked = attempts >= MAX_ATTEMPTS;

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  const verify = (value: string) => {
    if (value.length < 6 || checking || locked || leaving) return;
    setChecking(true);
    window.setTimeout(() => {
      if (value === DEMO_CODE) {
        onVerified();
        return;
      }
      const used = attempts + 1;
      setAttempts(used);
      setChecking(false);
      setError(
        used >= MAX_ATTEMPTS
          ? "Too many tries. Send a new code to try again."
          : "That code doesn't match. Check the latest text, or send a new code.",
      );
    }, 650);
  };

  const resend = () => {
    setSeconds(RESEND_SECONDS);
    setCode("");
    setError(null);
    setAttempts(0);
    toast({ message: `New code sent to ${number}`, tone: "info" });
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        verify(code);
      }}
    >
      <p className="y-body">
        Enter the 6-digit code we sent to{" "}
        <bdi dir="ltr" className="y-num font-semibold">
          {number}
        </bdi>
      </p>

      <div className="flex flex-col gap-2">
        <OtpInput
          value={code}
          label="Verification code"
          invalid={Boolean(error)}
          describedBy={error ? errorId : hintId}
          onChange={(value) => {
            setCode(value);
            setError(null);
            if (value.length === 6) verify(value);
          }}
        />
        <div aria-live="polite">
          {error ? (
            <p id={errorId} className="y-small px-1 font-medium text-(--y-danger)">
              {error}
            </p>
          ) : (
            <p id={hintId} className="y-micro y-fg-2 flex items-center gap-1.5 px-1">
              <Info size={14} aria-hidden />
              Demo: use code <span className="y-num font-semibold text-(--b-fg)">{DEMO_CODE}</span>
            </p>
          )}
        </div>
      </div>

      <PillButton
        type="submit"
        variant="neon"
        disabled={code.length < 6 || checking || locked || leaving}
        aria-busy={checking || undefined}
        className="w-full"
      >
        {checking || leaving ? "Checking code…" : "Verify"}
      </PillButton>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <PillButton variant="ghost" size="sm" onClick={onBack}>
          Change number
        </PillButton>
        <PillButton variant="ghost" size="sm" disabled={seconds > 0} onClick={resend}>
          {seconds > 0 ? (
            <>
              Resend in{" "}
              <span className="y-num">
                {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
              </span>
            </>
          ) : (
            "Resend code"
          )}
        </PillButton>
      </div>
    </form>
  );
}

export function SignInSkeleton() {
  return (
    <div className="flex w-full max-w-[420px] flex-col gap-5" aria-busy="true" aria-label="Loading">
      <Block tone="paper" pad="lg" className="flex flex-col gap-5">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-16 w-full !rounded-(--y-r-tile)" />
        <Skeleton className="h-16 w-full !rounded-(--y-r-tile)" />
        <Skeleton className="h-11 w-full !rounded-full" />
      </Block>
    </div>
  );
}
