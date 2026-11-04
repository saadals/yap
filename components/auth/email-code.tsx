"use client";

import { ArrowLeft, Info } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { OtpInput } from "@/components/ui/otp-input";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";

export const DEMO_CODE = "123456";
const RESEND_SECONDS = 30;

/** Six-digit email code: auto-verifies when complete, 30s resend timer, inline error. */
export function EmailCodeStep({
  email,
  onBack,
  onVerified,
}: {
  email: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const toast = useToast();
  const errorId = useId();
  const hintId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  const verify = (value: string) => {
    if (value.length < 6 || checking) return;
    setChecking(true);
    window.setTimeout(() => {
      if (value === DEMO_CODE) {
        onVerified();
        return;
      }
      setChecking(false);
      setError("That code doesn't match. Check the latest email, or send a new code.");
    }, 650);
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        verify(code);
      }}
    >
      <div className="flex flex-col gap-2">
        <h1 className="y-display y-t-display">Check your email</h1>
        <p className="y-body y-fg-2">
          We sent a 6-digit sign-in code to{" "}
          <bdi dir="ltr" className="font-semibold text-(--b-fg)">
            {email}
          </bdi>
          . It expires in 10 minutes.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <OtpInput
          value={code}
          label="Sign-in code"
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
        arrow
        disabled={code.length < 6 || checking}
        aria-busy={checking || undefined}
        className="justify-between ps-7"
      >
        {checking ? "Checking code…" : "Verify and sign in"}
      </PillButton>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <PillButton
          variant="ghost"
          size="sm"
          onClick={onBack}
          icon={<ArrowLeft size={16} aria-hidden className="y-flip" />}
        >
          Use a different email
        </PillButton>
        <PillButton
          variant="ghost"
          size="sm"
          disabled={seconds > 0}
          onClick={() => {
            setSeconds(RESEND_SECONDS);
            setCode("");
            setError(null);
            toast({ message: `New code sent to ${email}`, tone: "info" });
          }}
        >
          {seconds > 0 ? (
            <>
              Resend in <span className="y-num">0:{String(seconds).padStart(2, "0")}</span>
            </>
          ) : (
            "Resend code"
          )}
        </PillButton>
      </div>
    </form>
  );
}
