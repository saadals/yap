"use client";

import { AlertCircle, CircleCheck, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import type { IneligibleReason } from "@/lib/campaigns";
import { addDays, NOW_ISO } from "@/lib/clock";
import { compact, money, moneyExact, creatorNet, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { brandHandleFor, businessById, me, openSlotCount, platformEligibility } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import {
  CAMPAIGN_KEEP_LIVE_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  FEE_PCT,
  campaignPlatformById,
  usageById,
} from "@/lib/taxonomy";
import type { CampaignPlatformId, CampaignTerms, ContentRequest } from "@/lib/types";

import { disclosureName, ineligibleCopy, pickLabel, platformCheckLine, uploadLine } from "./campaign-copy";

export type CampaignRequest = ContentRequest & { campaign: CampaignTerms };

/**
 * "Pick a Yapp from {brand}?": what you earn (the listed price and your net) and when, the upload
 * deadline the brand set as a date, where you'll post (a choice when you qualify on more than one of
 * the campaign's platforms), the usage, and the one tick for the posting rule. Then
 * `acceptCampaignSlot(requestId, creatorId, platform)` (first come, first served) and "The slot is
 * yours" with "Open the job". A slot lost to someone faster reports back with `onFull`.
 */
export function PickSheet({
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
  const s = useDemo();
  const brand = businessById(s, request.businessId)?.name ?? "the brand";
  return (
    <Sheet open={open} onClose={onClose} width="sm" title={`Pick a Yapp from ${brand}?`} description={request.title}>
      {open ? <PickBody request={request} brand={brand} onClose={onClose} onFull={onFull} /> : null}
    </Sheet>
  );
}

function PickBody({
  request,
  brand,
  onClose,
  onFull,
}: {
  request: CampaignRequest;
  brand: string;
  onClose: () => void;
  onFull: () => void;
}) {
  const s = useDemo();
  const terms = request.campaign;
  const creator = me.creator(s);
  const checks = platformEligibility(creator, request);
  const allowed = checks.filter((c) => c.ok).map((c) => c.platform);
  const blocked = checks.filter((c) => !c.ok);
  const [chosen, setChosen] = useState<CampaignPlatformId | undefined>(undefined);
  const [agreed, setAgreed] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ commissionId: string; slot: number; platform: CampaignPlatformId } | null>(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const platform = chosen && allowed.includes(chosen) ? chosen : (allowed[0] ?? terms.platforms[0]);
  const platformName = campaignPlatformById[platform].name;
  const net = moneyExact(creatorNet(terms.pricePerVideo));
  const uploadBy = weekdayDate(addDays(NOW_ISO, terms.deadlineDays));
  const left = openSlotCount(s, request);

  if (picked) {
    return (
      <div className="flex flex-col gap-5 pt-3" role="status">
        <div className="flex items-start gap-3">
          <CircleCheck size={24} aria-hidden className="mt-0.5 flex-none text-(--y-success)" />
          <div className="flex flex-col gap-1">
            <p className="y-head">The slot is yours</p>
            <p className="y-small y-fg-2">
              {uploadLine(terms.deadlineDays, uploadBy)} (set by {brand}). Once {brand} approves it, post it on your{" "}
              {campaignPlatformById[picked.platform].name}. You&apos;re paid {net} {CAMPAIGN_RELEASE_DAYS} days after we
              verify the post.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <PillButton href={paths.job(picked.commissionId)} variant="neon" arrow className="justify-between ps-6">
            Open the job
          </PillButton>
          <PillButton variant="ghost" onClick={onClose}>
            Stay on this page
          </PillButton>
        </div>
      </div>
    );
  }

  const pick = () => {
    if (picking) return;
    if (!agreed) {
      setNudge(true);
      return;
    }
    setPicking(true);
    setError(null);
    // A short pause: picking is a race with other creators (first come, first served).
    timer.current = window.setTimeout(() => {
      const result = actions.acceptCampaignSlot(request.id, creator?.id, platform);
      setPicking(false);
      if (result.ok) {
        setPicked({ commissionId: result.commissionId, slot: result.slot, platform: result.platform });
        return;
      }
      if (result.reason === "full") {
        onFull();
        return;
      }
      setError(ineligibleCopy(result.reason as IneligibleReason, request, undefined, platform)?.title ?? "Couldn't pick a Yapp. Try again.");
    }, 600);
  };

  const rows = [
    {
      label: "You earn",
      value: `${net} for 1 Yapp at ${money(terms.pricePerVideo)}, after the ${FEE_PCT}% Yapp fee. Released ${CAMPAIGN_RELEASE_DAYS} days after your post is verified.`,
    },
    { label: `Deadline, set by ${brand}`, value: uploadLine(terms.deadlineDays, uploadBy) },
    ...(allowed.length > 1
      ? []
      : [
          {
            label: "Where you'll post",
            value: `Your ${platformName}, tagging ${brandHandleFor(terms, platform)}, with the ${disclosureName(platform)}`,
          },
        ]),
    { label: "Keep it up", value: `${CAMPAIGN_KEEP_LIVE_DAYS} days from when we verify the post` },
    { label: `How ${brand} may use it`, value: `${usageById[request.brief.usage].name}, included in the price` },
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

      {allowed.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="y-label mb-2">Where you&apos;ll post</legend>
          {checks
            .filter((c) => c.ok)
            .map((c) => (
              <label
                key={c.platform}
                className={`y-tile flex cursor-pointer items-start gap-3 p-3.5 ${platform === c.platform ? "shadow-[inset_0_0_0_2px_var(--y-ink)]" : ""}`}
              >
                <input
                  type="radio"
                  name="pick-platform"
                  className="y-check mt-0.5 flex-none !rounded-full"
                  checked={platform === c.platform}
                  onChange={() => setChosen(c.platform)}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="y-small font-semibold">{campaignPlatformById[c.platform].name}</span>
                  <span className="y-micro y-fg-2">
                    {c.ok ? `${compact(c.social.followers)} verified followers · tag ${brandHandleFor(terms, c.platform)}` : ""}
                  </span>
                </span>
              </label>
            ))}
        </fieldset>
      ) : null}
      {blocked.length ? (
        <p className="y-micro y-fg-2 -mt-2">
          {blocked
            .map((c) => {
              const line = platformCheckLine(c, terms);
              return `${campaignPlatformById[c.platform].name}: ${line.charAt(0).toLowerCase()}${line.slice(1)}`;
            })
            .join(". ")}
          .
        </p>
      ) : null}

      <p className="y-small y-fg-2">
        You upload a review copy first. It stays watermarked until {brand} approves it.
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
          aria-describedby={nudge ? "pick-agree-hint" : undefined}
          data-autofocus
        />
        <span className="y-small font-semibold">
          I&apos;ll post it on {platformName} with the tag and the {disclosureName(platform)}
        </span>
      </label>
      {nudge ? (
        <p id="pick-agree-hint" role="alert" className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
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
        arrow={!picking}
        icon={picking ? <LoaderCircle size={18} aria-hidden className="animate-spin" /> : undefined}
        aria-disabled={!agreed || picking ? "true" : undefined}
        onClick={pick}
      >
        {picking ? "Picking your Yapp…" : pickLabel(left, request.slots)}
      </PillButton>
    </div>
  );
}
