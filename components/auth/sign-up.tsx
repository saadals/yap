"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { paths } from "@/lib/paths";

import {
  GoogleButton,
  OrDivider,
  PasswordField,
  PasswordMeter,
  isEmail,
  passwordStrength,
  workDomain,
} from "./auth-bits";
import { AuthLayout, AuthVisual } from "./auth-layout";
import { GroupError } from "./choice";

type Field = "name" | "email" | "password" | "terms";
type Start = "order" | "make" | "both";

const parseStart = (value: string | null): Start | undefined =>
  value === "order" || value === "make" || value === "both" ? value : undefined;

const visual = {
  title: (
    <>
      One account to <span className="y-strong">order videos and to make them</span>
    </>
  ),
  points: [
    "Order from creators who speak your audience's dialect",
    "Make videos for apps, and keep 100% of your price",
    "Payment protected on every order",
  ],
};

export function SignUpScreen() {
  const params = useSearchParams();
  // Optional: a page that already knows the intent (e.g. "Make videos") can pass it through.
  const start = parseStart(params.get("start"));
  const router = useRouter();
  const toast = useToast();
  const termsError = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>({});
  const [busy, setBusy] = useState<null | "form" | "google">(null);

  const check: Record<Field, () => string | null> = {
    name: () => (name.trim().length < 2 ? "Enter your name so people know who they're talking to." : null),
    email: () => (isEmail(email) ? null : "Enter a valid email address, like name@company.com."),
    password: () =>
      passwordStrength(password).valid
        ? null
        : "Use at least 8 characters with a mix of cases, numbers or symbols.",
    terms: () => (terms ? null : "Please agree to the terms to create your account."),
  };
  const blur = (field: Field) => () => setErrors((e) => ({ ...e, [field]: check[field]() }));
  const clear = (field: Field) => {
    if (errors[field]) setErrors((e) => ({ ...e, [field]: null }));
  };

  const goOnboarding = (withName: string, withEmail: string) => {
    router.push(
      paths.onboarding({
        start,
        name: withName.trim() || undefined,
        domain: workDomain(withEmail) ?? undefined,
      }),
    );
  };

  const submit = () => {
    const found: Partial<Record<Field, string | null>> = {
      name: check.name(),
      email: check.email(),
      password: check.password(),
      terms: check.terms(),
    };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    setBusy("form");
    window.setTimeout(() => {
      toast({ message: "Account created. Let's set things up." });
      goOnboarding(name, email);
    }, 800);
  };

  return (
    <AuthLayout aside={<AuthVisual title={visual.title} points={visual.points} />}>
      <div className="flex flex-col gap-2">
        <h1 className="y-display y-t-display">Create your account</h1>
        <p className="y-lead y-fg-2">One account to order videos and to make them.</p>
      </div>

      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) submit();
        }}
      >
        <TextField
          label="Full name"
          required
          autoComplete="name"
          value={name}
          error={errors.name}
          onChange={(event) => {
            setName(event.target.value);
            clear("name");
          }}
          onBlur={() => name && blur("name")()}
        />
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
            clear("email");
          }}
          onBlur={() => email && blur("email")()}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          onChange={(value) => {
            setPassword(value);
            clear("password");
          }}
          onBlur={() => password && blur("password")()}
        >
          <PasswordMeter password={password} />
        </PasswordField>

        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-start gap-3 px-1">
            <input
              type="checkbox"
              className="y-check mt-0.5"
              checked={terms}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? termsError : undefined}
              onChange={(event) => {
                setTerms(event.target.checked);
                if (event.target.checked) clear("terms");
              }}
            />
            <span className="y-small">I agree to Yapp&apos;s terms of service and privacy policy.</span>
          </label>
          <GroupError id={termsError}>{errors.terms}</GroupError>
        </div>

        <PillButton
          type="submit"
          variant="neon"
          size="lg"
          arrow
          disabled={Boolean(busy)}
          aria-busy={busy === "form" || undefined}
          className="justify-between ps-7"
        >
          {busy === "form" ? "Creating your account…" : "Create account"}
        </PillButton>
      </form>

      <OrDivider />
      <GoogleButton
        label="Sign up with Google"
        busy={busy === "google"}
        onClick={() => {
          setBusy("google");
          window.setTimeout(() => {
            toast({ message: "Google account connected. Let's set things up." });
            goOnboarding(name, "");
          }, 900);
        }}
      />
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="y-small y-fg-2">
          Already have an account?{" "}
          <Link href={paths.signIn()} className="y-link font-semibold text-(--b-fg)">
            Sign in
          </Link>
        </p>
        <Link href={`${paths.signIn()}#demo`} className="y-link y-small y-fg-2">
          Just looking? Explore the demo
        </Link>
      </div>
    </AuthLayout>
  );
}
