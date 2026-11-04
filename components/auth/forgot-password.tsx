"use client";

import { MailCheck } from "lucide-react";
import { useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

import { isEmail } from "./auth-bits";

/** Reset flow: email → simulated send → "Check your inbox". */
export function ForgotPasswordSheet({
  open,
  onClose,
  initialEmail,
}: {
  open: boolean;
  onClose: () => void;
  initialEmail: string;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Reset your password"
      description="We'll email you a link to choose a new one."
      side="center"
      width="sm"
    >
      {/* Remount per opening so the form starts fresh with the latest email. */}
      {open ? <ForgotPasswordBody initialEmail={initialEmail} onClose={onClose} /> : null}
    </Sheet>
  );
}

function ForgotPasswordBody({
  initialEmail,
  onClose,
}: {
  initialEmail: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"form" | "sending" | "sent">("form");

  const send = () => {
    if (!isEmail(email)) {
      setError("Enter the email you signed up with, like name@company.com.");
      return;
    }
    setError(null);
    setState("sending");
    window.setTimeout(() => setState("sent"), 800);
  };

  if (state === "sent") {
    return (
      <div className="flex flex-col gap-5 pt-2" role="status">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-(--y-sky) text-(--y-on-color)"
        >
          <MailCheck size={26} />
        </span>
        <div className="flex flex-col gap-2">
          <h3 className="y-display y-title">Check your inbox</h3>
          <p className="y-body y-fg-2">
            If an account exists for{" "}
            <bdi dir="ltr" className="font-semibold text-(--b-fg)">
              {email.trim()}
            </bdi>
            , a reset link is on its way. It works for 30 minutes.
          </p>
          <p className="y-small y-fg-3">
            Nothing after a few minutes? Check spam, or send it again.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <PillButton variant="contrast" onClick={onClose} className="sm:flex-1">
            Back to sign in
          </PillButton>
          <PillButton
            variant="ghost"
            onClick={() => toast({ message: `Sent another link to ${email.trim()}`, tone: "info" })}
          >
            Send it again
          </PillButton>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5 pt-2"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        send();
      }}
    >
      <TextField
        label="Email"
        type="email"
        dir="ltr"
        autoComplete="email"
        required
        data-autofocus
        value={email}
        error={error}
        onChange={(event) => {
          setEmail(event.target.value);
          if (error) setError(null);
        }}
      />
      <PillButton type="submit" variant="contrast" size="lg" disabled={state === "sending"}>
        {state === "sending" ? "Sending link…" : "Send reset link"}
      </PillButton>
    </form>
  );
}
