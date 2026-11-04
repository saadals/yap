"use client";

import { Info, LogOut, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { usePrefs } from "@/lib/prefs";
import { businessById, creatorById, memberById } from "@/lib/selectors";
import { ME, useDemo, useHydrated } from "@/lib/store";
import type { Role } from "@/lib/types";

import {
  GoogleButton,
  OrDivider,
  PasswordField,
  isEmail,
  parseRole,
  roleForEmail,
  roleHome,
  safeNext,
} from "./auth-bits";
import { AuthLayout } from "./auth-layout";
import { DemoAccounts } from "./demo-accounts";
import { EmailCodeStep } from "./email-code";
import { ForgotPasswordSheet } from "./forgot-password";

type Mode = "password" | "code" | "verify";
type Busy = null | "password" | "code" | "google" | Role;

const emailError = "Enter your email address, like name@company.com.";

export function SignInScreen() {
  const params = useSearchParams();
  const preferred = parseRole(params.get("role"));
  const next = params.get("next");
  const fallback: Role = preferred ?? "business";

  const router = useRouter();
  const toast = useToast();
  const { role: cookieRole, setRole } = usePrefs();
  // The session cookie is only readable in the browser: show the "signed in" note after hydration
  // so the server HTML (always signed out) matches the first client render.
  const hydrated = useHydrated();
  const sessionRole = hydrated ? cookieRole : null;
  const s = useDemo();
  const business = businessById(s, ME.businessId);
  const member = memberById(s, ME.memberId);
  const creator = creatorById(s, ME.creatorId);

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [busy, setBusy] = useState<Busy>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

  const personFor = (role: Role) =>
    role === "business"
      ? `${member?.name ?? "Nour Haddad"} at ${business?.name ?? "Daftar"}`
      : (creator?.name ?? "Layla Mansour");

  const signIn = (role: Role) => {
    setRole(role);
    toast({ message: `Signed in as ${personFor(role)}` });
    router.push(safeNext(next, role));
  };

  const checkEmail = () => (isEmail(email) ? null : emailError);
  const checkPassword = () =>
    password.length === 0
      ? "Enter your password."
      : password.length < 8
        ? "Yapp passwords are at least 8 characters. Check for a typo."
        : null;

  const onPassword = () => {
    const found = { email: checkEmail(), password: checkPassword() };
    setErrors(found);
    if (found.email || found.password) return;
    setBusy("password");
    window.setTimeout(() => signIn(roleForEmail(email, fallback)), 700);
  };

  const onSendCode = () => {
    const found = checkEmail();
    setErrors({ email: found });
    if (found) return;
    setBusy("code");
    window.setTimeout(() => {
      setBusy(null);
      setMode("verify");
    }, 600);
  };

  const onDemo = (role: Role) => {
    setBusy(role);
    window.setTimeout(() => signIn(role), 450);
  };

  const onGoogle = () => {
    setBusy("google");
    window.setTimeout(() => signIn(fallback), 900);
  };

  const routing =
    fallback === "creator"
      ? "Emails with “nour” or “daftar” open Daftar; others open Layla."
      : "Emails with “layla” or “creator” open Layla; others open Daftar.";
  const demoHint = `Demo: any email and an 8+ character password. ${routing}`;

  const lead =
    preferred === "creator"
      ? "Pick up your pitches, deliver work and get paid."
      : preferred === "business"
        ? "Brief creators, review deliveries and approve payments."
        : "Pick up where you left off.";

  const signupHref = preferred ? `/signup?role=${preferred}` : "/signup";

  return (
    <AuthLayout
      aside={
        <DemoAccounts
          onPick={onDemo}
          pending={busy === "business" || busy === "creator" ? busy : null}
          preferred={preferred}
        />
      }
    >
      {sessionRole ? (
        <div className="y-tile flex flex-col gap-3 p-4">
          <p className="y-small">
            You&apos;re signed in as <span className="font-semibold">{personFor(sessionRole)}</span>.
          </p>
          <div className="flex flex-wrap gap-2">
            <PillButton href={roleHome(sessionRole)} variant="contrast" size="sm">
              Go to dashboard
            </PillButton>
            <PillButton
              variant="ghost"
              size="sm"
              icon={<LogOut size={16} aria-hidden />}
              onClick={() => {
                setRole(null);
                toast({ message: "Signed out", tone: "info" });
              }}
            >
              Sign out
            </PillButton>
          </div>
        </div>
      ) : null}

      {mode === "verify" ? (
        <EmailCodeStep
          email={email.trim()}
          onBack={() => setMode("code")}
          onVerified={() => signIn(roleForEmail(email, fallback))}
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="y-display y-t-display">
              {mode === "code" ? "Sign in with a code" : "Welcome back"}
            </h1>
            <p className="y-lead y-fg-2">
              {mode === "code"
                ? "No password needed. We'll email you a 6-digit code."
                : lead}
            </p>
          </div>

          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (busy) return;
              if (mode === "code") onSendCode();
              else onPassword();
            }}
          >
            <TextField
              label="Email"
              type="email"
              dir="ltr"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              error={errors.email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errors.email) setErrors((e) => ({ ...e, email: null }));
              }}
              onBlur={() => email && setErrors((e) => ({ ...e, email: checkEmail() }))}
            />

            {mode === "password" ? (
              <div className="flex flex-col gap-1">
                <PasswordField
                  value={password}
                  onChange={(value) => {
                    setPassword(value);
                    if (errors.password) setErrors((e) => ({ ...e, password: null }));
                  }}
                  onBlur={() =>
                    password && setErrors((e) => ({ ...e, password: checkPassword() }))
                  }
                  error={errors.password}
                />
                <PillButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setForgotOpen(true)}
                  className="self-end"
                >
                  Forgot password?
                </PillButton>
              </div>
            ) : null}

            <p className="y-micro y-fg-3 flex gap-1.5 px-1">
              <Info size={14} aria-hidden className="mt-px flex-none" />
              <span>
                {mode === "code" ? `Demo: the code is always 123456. ${routing}` : demoHint}
              </span>
            </p>

            <PillButton
              type="submit"
              variant="neon"
              size="lg"
              arrow
              disabled={Boolean(busy)}
              aria-busy={busy === "password" || busy === "code" || undefined}
              className="justify-between ps-7"
            >
              {mode === "code"
                ? busy === "code"
                  ? "Sending code…"
                  : "Email me a code"
                : busy === "password"
                  ? "Signing in…"
                  : "Sign in"}
            </PillButton>

            <PillButton
              variant="ghost"
              size="sm"
              icon={mode === "password" ? <Mail size={16} aria-hidden /> : undefined}
              onClick={() => {
                setMode(mode === "password" ? "code" : "password");
                setErrors({});
              }}
              className="self-center"
            >
              {mode === "password" ? "Email me a sign-in code instead" : "Use my password instead"}
            </PillButton>
          </form>

          <OrDivider />
          <GoogleButton onClick={onGoogle} busy={busy === "google"} />

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="y-small y-fg-2">
              New to Yapp?{" "}
              <Link href={signupHref} className="y-link font-semibold text-(--b-fg)">
                Create an account
              </Link>
            </p>
            <a href="#demo" className="y-link y-small y-fg-2 lg:hidden">
              Just exploring? Use a demo account
            </a>
          </div>
        </>
      )}

      <ForgotPasswordSheet
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        initialEmail={email}
      />
    </AuthLayout>
  );
}
