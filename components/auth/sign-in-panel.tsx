"use client";

import { ChevronDown, ChevronLeft, Info, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { Lockup } from "@/components/ui/brand";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { OtpInput } from "@/components/ui/otp-input";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { useReducedMotion } from "@/lib/hooks";
import { paths, type SignInIntent } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { savedAccounts, useSavedAccounts, type SavedAccount, type SignInMethod } from "@/lib/saved-accounts";
import { businessById } from "@/lib/selectors";
import { useDemo, type DemoState } from "@/lib/store";

import { OrDivider, safeNext } from "./auth-bits";
import {
  countries,
  countryById,
  defaultCountry,
  formatPhone,
  fullNumber,
  isPlausible,
  maskedNumber,
} from "./phone";
import { MethodIcon, methodLabel } from "./provider-icons";

export type SignInPanelProps = {
  open: boolean;
  /** Which welcome button opened it; null when opened from the nav. */
  intent: SignInIntent | null;
  /** A page to return to after signing in (`?next=`). Wins over the intent's destination. */
  next?: string | null;
  onClose: () => void;
  /** Told where a sign-in is about to go, just before the session starts (HomeRoute on "/"). */
  onLeave?: (destination: string) => void;
};

const subscribeNoop = () => () => {};

const focusable =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const DEMO_CODE = "123456";
const RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const CLOSE_MS = 180;

const intentLabel: Record<SignInIntent, string> = {
  ask: "Ask for Yapps",
  make: "Make Yapps",
};

const providers: Exclude<SignInMethod, "phone">[] = ["apple", "tiktok", "instagram", "google"];

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
 * The one sign-in and sign-up flow: a full glass page on phones, an end-side glass panel on
 * desktop. Everything is simulated: any plausible number works with the demo code, and which demo
 * person you become follows the button you came through.
 */
export function SignInPanel(props: SignInPanelProps) {
  const host = useSyncExternalStore(
    subscribeNoop,
    () => document.getElementById("yapp-root") ?? document.body,
    () => null,
  );
  if (!props.open || !host) return null;
  return createPortal(<Panel {...props} />, host);
}

function Panel({ intent, next, onClose, onLeave }: SignInPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const s = useDemo();
  const { signIn } = usePrefs();
  const reducedMotion = useReducedMotion();
  const titleId = useId();
  const saved = useSavedAccounts().filter((row) => s.accounts.some((a) => a.id === row.accountId));

  const [state, setState] = useState<"open" | "closing" | "leaving">("open");
  const [revealed, setRevealed] = useState(false);
  const [stage, setStage] = useState<"choose" | "code">("choose");
  const [countryId, setCountryId] = useState(defaultCountry.id);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const country = countryById(countryId);
  const plausible = isPlausible(phone, country);
  const showMethods = revealed || saved.length === 0;
  const pending = Boolean(busy) || state !== "open";

  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = () => {
    if (state !== "open") return;
    if (reducedMotion) {
      onClose();
      return;
    }
    setState("closing");
    closeTimer.current = window.setTimeout(() => onCloseRef.current(), CLOSE_MS);
  };
  const requestCloseRef = useRef(requestClose);
  useEffect(() => {
    requestCloseRef.current = requestClose;
  });

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Focus moves in and is trapped, Esc closes, focus returns to the opener, the page can't scroll.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        requestCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(focusable)).filter(
        (node) => node.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  /**
   * Starts the session and leaves for the page this sign-in was heading to. Desktop: "Ask for
   * Yapps" opens New order, "Make Yapps" Find work, anything else "/" (Discover, or Work for an
   * account that only makes videos). Phones: the feed.
   */
  const finish = (row: SavedAccount) => {
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const destination = next
      ? safeNext(next)
      : !desktop
        ? paths.home
        : intent === "ask"
          ? paths.newOrder()
          : intent === "make"
            ? paths.findWork()
            : paths.landing;
    onLeave?.(destination);
    signIn(row.accountId);
    savedAccounts.remember(row);
    setState("leaving");
    toast({ message: `Signed in as ${personFor(s, row.accountId)}` });
    router.replace(destination);
  };

  /** Who a new sign-in becomes in the demo: the person who does what the button says. */
  const accountId = intent === "make" ? "layla" : "nour";

  const onSaved = (row: SavedAccount) => {
    setBusy(row.accountId);
    window.setTimeout(() => finish(row), 450);
  };

  const onProvider = (method: Exclude<SignInMethod, "phone">) => {
    setBusy(method);
    window.setTimeout(
      () => finish({ accountId, method, identifier: providerIdentifier(s, accountId, method) }),
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

  const setupHref = paths.onboarding(
    intent ? { start: intent === "make" ? "make" : "order" } : {},
  );

  return (
    <div className="y-signin" data-state={state}>
      <div className="y-signin-scrim" onClick={requestClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-tone="canvas"
        data-glass="strong"
        className="y-glass y-signin-page"
      >
        <div className="flex flex-none items-center justify-between gap-3">
          <button
            type="button"
            onClick={requestClose}
            className="y-round lg:hidden"
            data-tone-btn="soft"
            data-size="sm"
            aria-label="Back"
          >
            <ChevronLeft size={22} aria-hidden className="y-flip" />
          </button>
          <Lockup size={28} />
          <span aria-hidden className="size-11 flex-none lg:hidden" />
          <button
            type="button"
            onClick={requestClose}
            className="y-round hidden lg:inline-grid"
            data-tone-btn="soft"
            data-size="sm"
            aria-label="Close"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="y-display text-[24px] leading-tight font-semibold lg:text-[26px]">
            Sign in to Yapp
          </h2>
          {intent ? (
            <p className="y-small y-fg-2">
              Continuing as: <span className="font-semibold text-(--b-fg)">{intentLabel[intent]}</span>
            </p>
          ) : null}
        </div>

        {stage === "code" ? (
          <CodeStep
            number={fullNumber(phone, country)}
            onBack={() => setStage("choose")}
            leaving={state === "leaving"}
            onVerified={() =>
              finish({ accountId, method: "phone", identifier: maskedNumber(phone, country) })
            }
          />
        ) : showMethods ? (
          <>
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
                    className="y-input y-num"
                    value={phone}
                    onChange={(event) => {
                      const field = event.target;
                      const atEnd = field.selectionStart === field.value.length;
                      // Regroup only while typing at the end, so a mid-number edit keeps its caret.
                      setPhone(atEnd ? formatPhone(field.value, country) : field.value);
                    }}
                  />
                </div>
              </div>
              <PillButton
                type="submit"
                variant="neon"
                size="lg"
                disabled={!plausible || pending}
                aria-busy={busy === "phone" || undefined}
                className="w-full"
              >
                {busy === "phone" ? "Sending code…" : "Continue"}
              </PillButton>
            </form>

            <OrDivider label="or continue with" />

            <div className="flex flex-col gap-2.5">
              {providers.map((method) => (
                <button
                  key={method}
                  type="button"
                  className="y-signin-provider"
                  data-provider={method}
                  disabled={pending}
                  aria-busy={busy === method || undefined}
                  onClick={() => onProvider(method)}
                >
                  <MethodIcon method={method} />
                  {busy === method ? `Connecting to ${methodLabel[method]}…` : `Continue with ${methodLabel[method]}`}
                </button>
              ))}
              <p className="y-micro y-fg-3 text-center">
                Instagram sign-in works with Creator or Business accounts only.
              </p>
            </div>

            {saved.length > 0 ? (
              <PillButton variant="ghost" size="sm" onClick={() => setRevealed(false)} className="self-center">
                Back to saved accounts
              </PillButton>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h3 className="y-label">Saved accounts</h3>
              <p className="y-micro y-fg-2">Demo: Nour orders videos, Layla makes them.</p>
            </div>
            <ul className="flex flex-col gap-2">
              {saved.map((row) => (
                <SavedRow key={row.accountId} row={row} busy={busy === row.accountId} disabled={pending} onPick={onSaved} />
              ))}
            </ul>
            <PillButton variant="soft" size="lg" disabled={pending} onClick={() => setRevealed(true)} className="w-full">
              Use another account
            </PillButton>
          </div>
        )}

        {stage === "choose" ? (
          <div className="mt-auto flex flex-col items-center gap-2 pt-2 text-center">
            <p className="y-small y-fg-2">
              New here?{" "}
              <Link href={setupHref} className="y-link font-semibold text-(--b-fg)">
                Set up your account
              </Link>
            </p>
            <p className="y-micro y-fg-3">
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
  return (
    <li className="y-signin-account">
      <button
        type="button"
        className="y-signin-account-main"
        disabled={disabled}
        aria-busy={busy || undefined}
        onClick={() => onPick(row)}
      >
        <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name="" size={44} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="y-body truncate font-semibold">{account.name}</span>
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
        data-tone-btn="soft"
        data-size="sm"
        disabled={disabled}
        aria-label={`Remove ${account.name} from this device`}
        onClick={() => savedAccounts.forget(row.accountId)}
      >
        <X size={18} aria-hidden />
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
      <p className="y-body y-fg-2">
        Enter the 6-digit code sent to{" "}
        <bdi dir="ltr" className="y-num font-semibold text-(--b-fg)">
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
            <p id={hintId} className="y-micro y-fg-3 flex items-center gap-1.5 px-1">
              <Info size={14} aria-hidden />
              Demo: use code <span className="y-num font-semibold text-(--b-fg)">{DEMO_CODE}</span>
            </p>
          )}
        </div>
      </div>

      <PillButton
        type="submit"
        variant="neon"
        size="lg"
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
