"use client";

import { AlertCircle, CircleCheck, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { addDays, NOW_ISO } from "@/lib/clock";
import { money, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { CAMPAIGN_KEEP_LIVE_DAYS, CAMPAIGN_RELEASE_DAYS, campaignPlatformById } from "@/lib/taxonomy";
import type { CampaignTerms, ContentRequest } from "@/lib/types";

import { disclosureName, ineligibleCopy, uploadLine } from "./campaign-copy";

type CampaignRequest = ContentRequest & { campaign: CampaignTerms };

/**
 * Confirm a slot: what you earn and when, the upload deadline as a date, where to post and the
 * disclosure you agree to. Then `acceptCampaignSlot` (first come, first served) and a success
 * state that links to the job. A slot lost to someone faster reports back with `onFull`.
 */
export function TakeSlotSheet({
  open,
  request,
  onClose,
  onFull,
}: {
  open: boolean;
  request: CampaignRequest;
  onClose: () => void;
  onFull: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} width="sm" title="Take a slot" description={request.title}>
      {open ? <TakeSlotBody request={request} onClose={onClose} onFull={onFull} /> : null}
    </Sheet>
  );
}

function TakeSlotBody({
  request,
  onClose,
  onFull,
}: {
  request: CampaignRequest;
  onClose: () => void;
  onFull: () => void;
}) {
  const s = useDemo();
  const [agreed, setAgreed] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [taking, setTaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState<{ commissionId: string; slot: number } | null>(null);
  const timer = useRef(0);
  const terms = request.campaign;
  const platform = campaignPlatformById[terms.platform];
  const brandName = businessById(s, request.businessId)?.name ?? "the brand";
  const uploadBy = weekdayDate(addDays(NOW_ISO, terms.deadlineDays));

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (taken) {
    return (
      <div className="flex flex-col gap-5 pt-3" role="status">
        <div className="flex items-start gap-3">
          <CircleCheck size={24} aria-hidden className="mt-0.5 flex-none text-(--y-success)" />
          <div className="flex flex-col gap-1">
            <p className="y-head">Slot {taken.slot} is yours</p>
            <p className="y-small y-fg-2">
              {uploadLine(terms.deadlineDays, uploadBy)}. {brandName} reviews it, then you post it.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <PillButton href={paths.job(taken.commissionId)} variant="neon" arrow className="justify-between ps-6">
            Open the job
          </PillButton>
          <PillButton variant="ghost" onClick={onClose}>
            Stay on this page
          </PillButton>
        </div>
      </div>
    );
  }

  const take = () => {
    if (taking) return;
    if (!agreed) {
      setNudge(true);
      return;
    }
    setTaking(true);
    setError(null);
    // A short pause: taking a slot is a race with other creators (first come, first served).
    timer.current = window.setTimeout(() => {
      const result = actions.acceptCampaignSlot(request.id);
      setTaking(false);
      if (result.ok) {
        setTaken({ commissionId: result.commissionId, slot: result.slot });
        return;
      }
      if (result.reason === "full") {
        onFull();
        return;
      }
      const copy = ineligibleCopy(result.reason as Parameters<typeof ineligibleCopy>[0], request);
      setError(copy?.title ?? "Couldn't take a slot. Try again.");
    }, 600);
  };

  const rows = [
    { label: "You earn", value: `${money(terms.pricePerVideo)}, released ${CAMPAIGN_RELEASE_DAYS} days after your post is verified` },
    { label: `Deadline, set by ${brandName}`, value: uploadLine(terms.deadlineDays, uploadBy) },
    { label: "Post on", value: `Your ${platform.name}, tagging ${terms.brandHandle}, with the ${disclosureName(terms.platform)}` },
    { label: "Keep it up", value: `${CAMPAIGN_KEEP_LIVE_DAYS} days from when we verify the post` },
  ];

  return (
    <div className="flex flex-col gap-5 pt-3">
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 border-b border-(--b-line) py-3 first:pt-0">
            <dt className="y-micro y-fg-2">{row.label}</dt>
            <dd className="y-small font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="y-small y-fg-2">
        You upload a review copy first. It stays watermarked until {brandName} approves it.
      </p>
      <label className="y-tile flex cursor-pointer items-start gap-3 p-4">
        <input
          type="checkbox"
          className="y-check mt-0.5 flex-none"
          checked={agreed}
          onChange={(event) => {
            setAgreed(event.target.checked);
            setNudge(false);
          }}
          aria-describedby={nudge ? "take-agree-hint" : undefined}
          data-autofocus
        />
        <span className="y-small font-semibold">
          I&apos;ll post with the tag and the {disclosureName(terms.platform)}
        </span>
      </label>
      {nudge ? (
        <p id="take-agree-hint" role="alert" className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
          <AlertCircle size={16} aria-hidden className="flex-none" />
          Tick the box to agree to the posting rule.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
          <AlertCircle size={16} aria-hidden className="flex-none" />
          {error}
        </p>
      ) : null}
      <PillButton
        variant="neon"
        size="lg"
        className="w-full justify-between ps-6"
        arrow={!taking}
        icon={taking ? <LoaderCircle size={18} aria-hidden className="animate-spin" /> : undefined}
        aria-disabled={!agreed || taking ? "true" : undefined}
        onClick={take}
      >
        {taking ? "Taking your slot…" : `Take the slot · ${money(terms.pricePerVideo)}`}
      </PillButton>
    </div>
  );
}
