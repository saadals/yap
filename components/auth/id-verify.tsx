"use client";

import { BadgeCheck, Camera, CircleCheck, LoaderCircle, ScanFace } from "lucide-react";
import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { SelectField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { countries } from "@/lib/taxonomy";

import { ChipRadioGroup, GroupLabel } from "./choice";

export type IdStatus = "none" | "pending" | "verified";

const documents = ["Passport", "National ID", "Residence permit"];

/** Sky block with the mock "Verify with your ID" flow: sheet → pending → verified. */
export function IdVerification({
  status,
  onSubmit,
  error,
}: {
  status: IdStatus;
  onSubmit: () => void;
  error?: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Block
      tone="sky"
      pad="md"
      className="flex flex-col gap-4"
      data-invalid={error ? true : undefined}
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="grid size-12 flex-none place-items-center rounded-full bg-(--b-chip)"
        >
          {status === "verified" ? <BadgeCheck size={24} /> : <ScanFace size={24} />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1" aria-live="polite">
          <p className="y-head">
            {status === "verified"
              ? "Identity verified"
              : status === "pending"
                ? "Checking your ID…"
                : "Verify your identity"}
          </p>
          <p className="y-small y-fg-2">
            {status === "verified"
              ? "Your profile shows the Verified badge, and payouts are unlocked."
              : status === "pending"
                ? "This usually takes under a minute. You can keep going while we check."
                : "Required before your first payout. Businesses see a Verified badge on your profile. Takes about a minute."}
          </p>
        </div>
      </div>
      {status === "none" ? (
        <PillButton
          variant="contrast"
          onClick={() => setOpen(true)}
          icon={<ScanFace size={18} aria-hidden />}
          className="w-full sm:w-fit"
        >
          Verify with your ID
        </PillButton>
      ) : status === "pending" ? (
        <Badge tone="info" icon={<LoaderCircle size={14} aria-hidden className="animate-spin" />} className="w-fit">
          In review
        </Badge>
      ) : (
        <Badge tone="success" icon={<CircleCheck size={14} aria-hidden />} className="w-fit">
          ID verified
        </Badge>
      )}
      {error ? <p className="y-small font-medium text-(--y-danger)">{error}</p> : null}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Verify with your ID"
        description="Your document is only used to confirm it's you. Businesses never see it."
        width="sm"
      >
        {open ? (
          <IdForm
            onDone={() => {
              setOpen(false);
              onSubmit();
            }}
          />
        ) : null}
      </Sheet>
    </Block>
  );
}

function IdForm({ onDone }: { onDone: () => void }) {
  const docId = useId();
  const [doc, setDoc] = useState("");
  const [country, setCountry] = useState("");
  const [front, setFront] = useState<"none" | "capturing" | "done">("none");
  const [tried, setTried] = useState(false);
  const missing = !doc ? "Choose a document." : !country ? "Choose the issuing country." : front !== "done" ? "Add a photo of your document." : null;

  return (
    <form
      noValidate
      className="flex flex-col gap-5 pt-2"
      onSubmit={(event) => {
        // The sheet is portalled, but React bubbles submit through the component tree to the
        // wizard's own form; keep it here.
        event.preventDefault();
        event.stopPropagation();
        setTried(true);
        if (!missing) onDone();
      }}
    >
      <div className="flex flex-col gap-3">
        <GroupLabel id={docId} required>
          Document
        </GroupLabel>
        <ChipRadioGroup
          labelledBy={docId}
          options={documents.map((d) => ({ value: d, label: d }))}
          value={doc}
          onChange={setDoc}
        />
      </div>
      <SelectField
        label="Issuing country"
        required
        value={country}
        onChange={(event) => setCountry(event.target.value)}
        options={[
          { value: "", label: "Choose a country" },
          ...Object.entries(countries).map(([id, c]) => ({ value: id, label: c.name })),
          { value: "other", label: "Somewhere else" },
        ]}
      />
      <div className="y-tile flex items-center gap-3 p-4">
        <span aria-hidden className="grid size-11 flex-none place-items-center rounded-full bg-(--b-bg)">
          {front === "done" ? <CircleCheck size={20} className="text-(--y-success)" /> : <Camera size={20} />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col" aria-live="polite">
          <span className="y-small font-medium">
            {front === "done" ? "Photo added" : "Photo of the front"}
          </span>
          <span className="y-micro y-fg-2">
            {front === "done" ? "Sharp and readable. Ready to submit." : "Flat surface, good light, all four corners."}
          </span>
        </div>
        {front === "done" ? (
          <PillButton variant="ghost" size="sm" onClick={() => setFront("none")}>
            Retake
          </PillButton>
        ) : (
          <PillButton
            variant="outline"
            size="sm"
            disabled={front === "capturing"}
            icon={
              front === "capturing" ? (
                <LoaderCircle size={16} aria-hidden className="animate-spin" />
              ) : undefined
            }
            onClick={() => {
              setFront("capturing");
              window.setTimeout(() => setFront("done"), 900);
            }}
          >
            {front === "capturing" ? "Capturing…" : "Take photo"}
          </PillButton>
        )}
      </div>
      {tried && missing ? (
        <p role="alert" className="y-small font-medium text-(--y-danger)">
          {missing}
        </p>
      ) : null}
      <PillButton type="submit" variant="contrast" size="lg">
        Submit for checking
      </PillButton>
    </form>
  );
}
