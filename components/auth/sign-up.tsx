"use client";

import { ArrowLeft, Building2, Video } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState } from "react";

import { Block } from "@/components/ui/block";
import { TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import type { Role } from "@/lib/types";

import {
  GoogleButton,
  OrDivider,
  PasswordField,
  PasswordMeter,
  isEmail,
  parseRole,
  passwordStrength,
  workDomain,
} from "./auth-bits";
import { AuthLayout, AuthVisual } from "./auth-layout";
import { GroupError, RadioCards } from "./choice";

type Field = "name" | "email" | "password" | "terms";

const visuals: Record<Role | "none", { title: React.ReactNode; points: string[] }> = {
  none: {
    title: (
      <>
        Where small teams get <span className="y-strong">social videos made</span>
      </>
    ),
    points: [
      "Selfie demos, walkthroughs and honest reviews",
      "Creators in every major Arabic dialect, and English",
      "Payment protected on every commission",
    ],
  },
  business: {
    title: (
      <>
        Brief once. Get videos that <span className="y-strong">sound like your customers</span>
      </>
    ),
    points: [
      "Pitches from creators who speak your audience's dialect",
      "Payment is held until you approve the video",
      "10% service fee, charged only when work completes",
    ],
  },
  creator: {
    title: (
      <>
        Get paid to <span className="y-strong">talk about apps</span> you&apos;d actually use
      </>
    ),
    points: [
      "You keep 100% of your price",
      "Payment is secured before you start filming",
      "Clear briefs with the product context built in",
    ],
  },
};

export function SignUpScreen() {
  const params = useSearchParams();
  const initialRole = parseRole(params.get("role"));
  const router = useRouter();
  const toast = useToast();
  const groupLabel = useId();
  const termsError = useId();

  const [step, setStep] = useState<0 | 1>(initialRole ? 1 : 0);
  const [role, setRole] = useState<Role | "">(initialRole ?? "");
  const [roleError, setRoleError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string | null>>>({});
  const [busy, setBusy] = useState<null | "form" | "google">(null);

  const check: Record<Field, () => string | null> = {
    name: () => (name.trim().length < 2 ? "Enter your name so creators know who they're talking to." : null),
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

  const goOnboarding = (chosen: Role, withName: string, withEmail: string) => {
    const query = new URLSearchParams();
    if (withName.trim()) query.set("name", withName.trim());
    const domain = chosen === "business" ? workDomain(withEmail) : null;
    if (domain) query.set("domain", domain);
    const qs = query.toString();
    router.push(`/onboarding/${chosen}${qs ? `?${qs}` : ""}`);
  };

  const submit = () => {
    const found: Partial<Record<Field, string | null>> = {
      name: check.name(),
      email: check.email(),
      password: check.password(),
      terms: check.terms(),
    };
    setErrors(found);
    if (Object.values(found).some(Boolean) || !role) return;
    setBusy("form");
    window.setTimeout(() => {
      toast({ message: "Account created. Let's set things up." });
      goOnboarding(role, name, email);
    }, 800);
  };

  const visual = visuals[step === 1 && role ? role : "none"];
  const freeMailHint =
    role === "business" && isEmail(email) && !workDomain(email)
      ? "Tip: a work address helps creators trust your requests. Personal emails work too."
      : role === "business"
        ? "Use your company address so creators know who they're working with."
        : undefined;

  return (
    <AuthLayout
      visual={<AuthVisual title={visual.title} points={visual.points} />}
      extra={
        <Block tone="night" pad="md" className="flex h-full flex-col justify-center gap-3">
          <p className="y-head">Just looking around?</p>
          <p className="y-small y-fg-2 max-w-[44ch]">
            Explore the two demo accounts, a business and a creator, without signing up.
          </p>
          <PillButton href="/signin#demo" variant="contrast" size="sm" className="w-fit">
            Explore the demo
          </PillButton>
        </Block>
      }
    >
      {step === 0 ? (
        <>
          <div className="flex flex-col gap-2">
            <p className="y-small y-fg-2 font-medium">Step 1 of 2</p>
            <h1 id={groupLabel} className="y-display y-t-display">
              How will you use Yapp?
            </h1>
            <p className="y-lead y-fg-2">You can add the other side later from the same account.</p>
          </div>
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!role) {
                setRoleError("Choose one to continue.");
                return;
              }
              setStep(1);
            }}
          >
            <RadioCards<Role>
              labelledBy={groupLabel}
              size="lg"
              value={role}
              invalid={Boolean(roleError)}
              onChange={(value) => {
                setRole(value);
                setRoleError(null);
              }}
              options={[
                {
                  value: "business",
                  title: "I need videos for my product",
                  body: "Post a request or hire a creator directly. Payment is held until you approve.",
                  icon: <Building2 size={24} />,
                  tone: "night",
                },
                {
                  value: "creator",
                  title: "I make videos",
                  body: "Film demos and reviews for apps. You keep 100% of your price.",
                  icon: <Video size={24} />,
                  tone: "butter",
                },
              ]}
            />
            <GroupError>{roleError}</GroupError>
            <PillButton type="submit" variant="neon" size="lg" arrow className="justify-between ps-7">
              Continue
            </PillButton>
          </form>
          <p className="y-small y-fg-2 text-center">
            Already have an account?{" "}
            <Link href="/signin" className="y-link font-semibold text-(--b-fg)">
              Sign in
            </Link>
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <PillButton
                variant="ghost"
                size="sm"
                onClick={() => setStep(0)}
                icon={<ArrowLeft size={16} aria-hidden className="y-flip" />}
                className="-ms-3"
              >
                Back
              </PillButton>
              <p className="y-small y-fg-2 font-medium">Step 2 of 2</p>
            </div>
            <h1 className="y-display y-t-display">Create your account</h1>
            <p className="y-lead y-fg-2">
              {role === "business"
                ? "Signing up as a business. Next, you'll tell us about your product."
                : "Signing up as a creator. Next, you'll set up your profile and prices."}{" "}
              <button
                type="button"
                className="y-link font-semibold text-(--b-fg)"
                onClick={() => setStep(0)}
              >
                Change
              </button>
            </p>
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
              label={role === "business" ? "Work email" : "Email"}
              type="email"
              dir="ltr"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              hint={freeMailHint}
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
                <span className="y-small">
                  I agree to Yapp&apos;s terms of service and privacy policy.{" "}
                  <span className="y-fg-2">
                    {role === "business"
                      ? "You pay a 10% service fee only when a commission completes."
                      : "You keep 100% of your price; the business pays the service fee."}
                  </span>
                </span>
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
              if (!role) return;
              setBusy("google");
              window.setTimeout(() => {
                toast({ message: "Google account connected. Let's set things up." });
                goOnboarding(role, name, "");
              }, 900);
            }}
          />
          <p className="y-small y-fg-2 text-center">
            Already have an account?{" "}
            <Link href={`/signin?role=${role}`} className="y-link font-semibold text-(--b-fg)">
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
