"use client";

import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { FieldShell } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import type { Role } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Session helpers (prototype: two demo accounts)                              */
/* -------------------------------------------------------------------------- */

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const roleHome = (role: Role) => (role === "business" ? "/business" : "/creator");

export const parseRole = (value: string | null): Role | null =>
  value === "business" || value === "creator" ? value : null;

/**
 * Which demo workspace an email opens. Emails mentioning "layla" or "creator" open the creator
 * side, "nour"/"daftar"/"business" the business side, anything else the fallback.
 */
export function roleForEmail(email: string, fallback: Role = "business"): Role {
  const value = email.toLowerCase();
  if (value.includes("layla") || value.includes("creator")) return "creator";
  if (value.includes("nour") || value.includes("daftar") || value.includes("business"))
    return "business";
  return fallback;
}

/** Same-origin path to continue to after signing in; never the other role's area or auth pages. */
export function safeNext(next: string | null, role: Role): string {
  const home = roleHome(role);
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return home;
  const other = role === "business" ? "/creator" : "/business";
  if (next === other || next.startsWith(`${other}/`) || next.startsWith(`${other}?`)) return home;
  if (/^\/(signin|signup|onboarding)(\/|\?|$)/.test(next)) return home;
  return next;
}

/** Free mailbox providers: allowed, but a work address builds more trust with creators. */
const freeMail = ["gmail.", "hotmail.", "outlook.", "yahoo.", "icloud.", "live.", "proton."];
export function workDomain(email: string): string | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain || !domain.includes(".")) return null;
  return freeMail.some((provider) => domain.startsWith(provider)) ? null : domain;
}

/* -------------------------------------------------------------------------- */
/* Small pieces                                                                */
/* -------------------------------------------------------------------------- */

export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="y-micro y-fg-3 flex items-center gap-3" role="separator" aria-label={label}>
      <span aria-hidden className="h-px flex-1 bg-(--b-line)" />
      <span aria-hidden>{label}</span>
      <span aria-hidden className="h-px flex-1 bg-(--b-line)" />
    </div>
  );
}

/** Soft pill; the "G" is a neutral monogram (no brand assets in the prototype). */
export function GoogleButton({
  onClick,
  busy = false,
  label = "Continue with Google",
}: {
  onClick: () => void;
  busy?: boolean;
  label?: string;
}) {
  return (
    <PillButton
      variant="soft"
      size="lg"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy || undefined}
      className="w-full"
      icon={
        <span
          aria-hidden
          className="y-display grid size-7 flex-none place-items-center rounded-full bg-(--b-bg) text-[15px] font-bold text-(--b-fg)"
        >
          G
        </span>
      }
    >
      {busy ? "Connecting to Google…" : label}
    </PillButton>
  );
}

/* -------------------------------------------------------------------------- */
/* Password                                                                    */
/* -------------------------------------------------------------------------- */

export function PasswordField({
  label = "Password",
  value,
  onChange,
  onBlur,
  error,
  hint,
  autoComplete = "current-password",
  required = true,
  children,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  hint?: string;
  autoComplete?: "current-password" | "new-password";
  required?: boolean;
  /** Rendered under the input (e.g. a strength meter). */
  children?: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <input
              id={id}
              type={visible ? "text" : "password"}
              dir="ltr"
              autoComplete={autoComplete}
              spellCheck={false}
              aria-describedby={describedBy}
              aria-invalid={error ? true : undefined}
              required={required}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onBlur={onBlur}
              className="y-input pe-14"
            />
            <RoundIconButton
              label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              size="sm"
              tone="soft"
              onClick={() => setVisible((v) => !v)}
              className="absolute end-1.5 top-1/2 -translate-y-1/2"
            >
              {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
            </RoundIconButton>
          </div>
          {children}
        </div>
      )}
    </FieldShell>
  );
}

export type Strength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  valid: boolean;
  checks: { label: string; met: boolean }[];
};

export function passwordStrength(password: string): Strength {
  const long = password.length >= 8;
  const checks = [
    { label: "8 or more characters", met: long },
    { label: "Upper and lower case", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "A number or symbol", met: /[\d\W_]/.test(password) },
  ];
  if (!password) return { score: 0, label: "", valid: false, checks };
  if (!long) return { score: 1, label: "Too short", valid: false, checks };
  const extra = [checks[1].met, checks[2].met, password.length >= 12].filter(Boolean).length;
  const score = Math.min(4, 1 + extra) as Strength["score"];
  const label = ["", "Weak", "Okay", "Strong", "Very strong"][score];
  return { score, label, valid: score >= 2, checks };
}

const meterColour = (score: number) =>
  score <= 1 ? "bg-(--y-danger)" : score === 2 ? "bg-(--y-warning)" : "bg-(--y-success)";

export function PasswordMeter({ password }: { password: string }) {
  const strength = passwordStrength(password);
  return (
    <div className="flex flex-col gap-2 px-1">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={`h-1.5 rounded-full transition-colors duration-(--y-dur-2) ${
                strength.score >= step ? meterColour(strength.score) : "bg-(--b-line)"
              }`}
            />
          ))}
        </div>
        <span className="y-micro y-fg-2 w-24 text-end" aria-live="polite">
          {strength.label ? `Strength: ${strength.label.toLowerCase()}` : ""}
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {strength.checks.map((check) => (
          <li
            key={check.label}
            className={`y-micro flex items-center gap-1.5 ${check.met ? "" : "y-fg-3"}`}
          >
            {check.met ? (
              <Check size={14} strokeWidth={3} aria-hidden className="text-(--y-success)" />
            ) : (
              <Circle size={12} aria-hidden />
            )}
            {check.label}
            <span className="sr-only">{check.met ? "(done)" : "(not yet)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
