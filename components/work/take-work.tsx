"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useRef, useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { ineligibleCopy } from "@/components/campaigns/shared";
import { VideoThumb } from "@/components/domain/video-thumb";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { TextArea, TextField } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { IneligibleReason } from "@/lib/campaigns";
import { compact, creatorNet, money, moneyExact, moneyRange, plural, priceLimits } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  brandHandleFor,
  businessById,
  deadlineDaysOf,
  eligibility,
  isAdCopy,
  me,
  openSlotCount,
  pitchesForRequest,
  platformEligibility,
  portfolio,
  productById,
  requestById,
} from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import {
  CAMPAIGN_RELEASE_DAYS,
  FEE_PCT,
  ORDER_DEADLINE_DEFAULT,
  PITCH_MIN,
  campaignPlatformById,
  tierById,
} from "@/lib/taxonomy";
import type { CampaignPlatformId, ContentRequest } from "@/lib/types";

import { findHref, DEFAULT_FIND } from "./find-query";

/**
 * Pick now and Pitch now (Work spec 6.7), from a job card, a list row, the job page's price card
 * or the phone bar. One provider per page holds the modals and the creator setup sheet; anything
 * inside it calls `useTakeWork()`:
 * - `pick(request)`: "Pick a Yapp from {brand}?" (one video, the price and the net, the brand's
 *   deadline, slots left; on a campaign with several platforms the creator chooses where to post,
 *   only the ones they qualify on), then "The slot is yours" or "Someone just took the last slot".
 * - `pitch(request)`: the idea (20+ characters), the price the brand pays ($30+, "You receive $X"
 *   under it) and optional samples from the portfolio; then "Pitch sent". No delivery days: the
 *   brand set the deadline.
 * - `setUp(then?)`: the creator setup sheet, for an account without a creator profile.
 * - `tiers(request)`: how follower tiers work, for a creator outside this campaign's tier.
 * No illustrations in any of them (round 3 answers, item 15).
 */

type Step =
  | { kind: "pick"; requestId: string }
  | { kind: "picked"; requestId: string; commissionId: string; platform: CampaignPlatformId }
  | { kind: "raced"; requestId: string }
  | { kind: "pitch"; requestId: string }
  | { kind: "sent"; requestId: string }
  | { kind: "tiers"; requestId: string };

type TakeWork = {
  pick: (request: ContentRequest) => void;
  pitch: (request: ContentRequest) => void;
  setUp: (then?: { pitch?: ContentRequest }) => void;
  tiers: (request: ContentRequest) => void;
};

const TakeWorkContext = createContext<TakeWork | null>(null);

export function useTakeWork(): TakeWork {
  const value = useContext(TakeWorkContext);
  if (!value) throw new Error("useTakeWork() needs a <TakeWorkProvider> above it.");
  return value;
}

/** First sentence of the idea, as the pitch's one-line angle (what the brand sees in the list). */
function angleOf(idea: string) {
  const text = idea.trim().replace(/\s+/g, " ");
  const first = text.split(/(?<=[.!?])\s/)[0] ?? text;
  return first.length > 120 ? `${first.slice(0, 117).trimEnd()}…` : first;
}

export function TakeWorkProvider({ children }: { children: React.ReactNode }) {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step | null>(null);
  const [setup, setSetup] = useState<{ pitch?: string } | null>(null);
  // Pick: the platform chosen on a campaign with several.
  const [platform, setPlatform] = useState<CampaignPlatformId | undefined>(undefined);
  // Pitch form.
  const [idea, setIdea] = useState("");
  const [price, setPrice] = useState("");
  const [samples, setSamples] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ idea?: string; price?: string }>({});
  const fieldsRef = useRef<HTMLDivElement>(null);

  const api: TakeWork = {
    pick: (request) => {
      setPlatform(undefined);
      setStep({ kind: "pick", requestId: request.id });
    },
    pitch: (request) => {
      setIdea("");
      setPrice(String(request.budget.max));
      setSamples([]);
      setErrors({});
      setStep({ kind: "pitch", requestId: request.id });
    },
    setUp: (then) => setSetup({ pitch: then?.pitch?.id }),
    tiers: (request) => setStep({ kind: "tiers", requestId: request.id }),
  };

  const close = () => setStep(null);
  const request = step ? requestById(s, step.requestId) : undefined;
  const brand = request ? (businessById(s, request.businessId)?.name ?? "The brand") : "The brand";

  /* ------------------------------------------------------------------ pick */
  let pickModal: React.ReactNode = null;
  if (request?.campaign && (step?.kind === "pick" || step?.kind === "picked" || step?.kind === "raced" || step?.kind === "tiers")) {
    const terms = request.campaign;
    const left = openSlotCount(s, request);
    const net = creatorNet(terms.pricePerVideo);
    const creator = me.creator(s);
    const checks = platformEligibility(creator, request);
    const allowed = checks.filter((c) => c.ok).map((c) => c.platform);
    const choice = platform && allowed.includes(platform) ? platform : (allowed[0] ?? terms.platforms[0]);
    const days = terms.deadlineDays;

    if (step.kind === "pick") {
      const take = () => {
        const result = actions.acceptCampaignSlot(request.id, undefined, choice);
        if (result.ok) {
          setStep({ kind: "picked", requestId: request.id, commissionId: result.commissionId, platform: result.platform });
          return;
        }
        if (result.reason === "full") {
          setStep({ kind: "raced", requestId: request.id });
          return;
        }
        const copy = ineligibleCopy(result.reason as IneligibleReason, request, undefined, choice);
        toast({ message: copy.title, tone: "info" });
        close();
      };
      pickModal = (
        <ConfirmModal
          open
          onClose={close}
          title={`Pick a Yapp from ${brand}?`}
          primary={{
            label: "Pick now",
            tone: "neon",
            onClick: take,
            disabled: left <= 0,
            "aria-label": `Pick now, ${left} of ${request.slots} remaining`,
          }}
          link={{ label: "Not now" }}
          fields={
            terms.platforms.length > 1 ? (
              <fieldset className="y-pick-where">
                <legend className="y-label">Where you&apos;ll post</legend>
                {checks.map((c) => {
                  const name = campaignPlatformById[c.platform].name;
                  const why = c.ok
                    ? `${compact(c.social.followers)} verified followers · tag ${brandHandleFor(terms, c.platform)}`
                    : c.reason === "no_account"
                      ? `No ${name} account connected`
                      : c.reason === "unverified"
                        ? "Still verifying your followers"
                        : `${compact(c.social?.followers ?? 0)} followers, outside ${tierById[terms.tierId].label}`;
                  return (
                    <label key={c.platform} className="y-pick-opt" data-off={c.ok ? undefined : "true"}>
                      <input
                        type="radio"
                        name="pick-platform"
                        className="y-check flex-none"
                        disabled={!c.ok}
                        checked={choice === c.platform}
                        onChange={() => setPlatform(c.platform)}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="y-small font-semibold">{name}</span>
                        <span className="y-micro y-fg-2">{why}</span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            ) : (
              <p className="y-small y-fg-2 text-center">
                Post it on your {campaignPlatformById[choice].name}, tagging {brandHandleFor(terms, choice)}, with
                the paid-partnership label.
              </p>
            )
          }
        >
          You&apos;ll make <b>1 video</b> for <b>{money(terms.pricePerVideo)}</b> and earn <b>{moneyExact(net)}</b> after
          the {FEE_PCT}% Yapp fee. {brand} set the deadline: upload within <b>{plural(days, "day")}</b> of picking.{" "}
          <b>
            {left} of {request.slots}
          </b>{" "}
          slots left.
        </ConfirmModal>
      );
    } else if (step.kind === "picked") {
      pickModal = (
        <ConfirmModal
          open
          onClose={close}
          title="The slot is yours"
          primary={{
            label: "Go to the order",
            onClick: () => {
              close();
              router.push(paths.commission(step.commissionId));
            },
          }}
          link={{ label: "Keep browsing" }}
        >
          It&apos;s in <b>Making</b>. Film it and upload version 1 within <b>{plural(days, "day")}</b> (set by{" "}
          {brand}). You&apos;re paid <b>{moneyExact(net)}</b> {CAMPAIGN_RELEASE_DAYS} days after your post on{" "}
          {campaignPlatformById[step.platform].name} is verified.
        </ConfirmModal>
      );
    } else if (step.kind === "raced") {
      const product = productById(s, request.brief.productId);
      pickModal = (
        <ConfirmModal
          open
          onClose={close}
          title="Someone just took the last slot"
          primary={{
            label: "See similar",
            onClick: () => {
              close();
              router.push(
                findHref({ ...DEFAULT_FIND, kind: "campaign", categories: product ? [product.niche] : [] }),
              );
            },
          }}
          link={{ label: "Not now" }}
        >
          If a slot reopens, it goes to the first eligible creator who picks it.
        </ConfirmModal>
      );
    } else {
      const check = eligibility(s, creator, request);
      const copy =
        !check.ok && (check.reason === "below" || check.reason === "above")
          ? ineligibleCopy(check.reason, request, check.social?.followers, check.platform)
          : undefined;
      pickModal = (
        <ConfirmModal open onClose={close} title="How follower tiers work" primary={{ label: "Got it", onClick: close }}>
          A UGC campaign is open to creators whose verified followers, on the platform they post to, fall in
          the brand&apos;s tier. This one is for <b>{tierById[terms.tierId].label}</b>
          {terms.platforms.length > 1 ? ` on ${terms.platforms.map((p) => campaignPlatformById[p].name).join(" or ")}` : ` on ${campaignPlatformById[terms.platforms[0]].name}`}.{" "}
          {copy?.body ?? ""} Custom orders have no tier: any creator can pitch.
        </ConfirmModal>
      );
    }
  }

  /* ----------------------------------------------------------------- pitch */
  let pitchModal: React.ReactNode = null;
  if (request && !request.campaign && (step?.kind === "pitch" || step?.kind === "sent")) {
    const pitches = pitchesForRequest(s, request.id).length;
    const creator = me.creator(s);
    const videos = creator && !isAdCopy(request) ? portfolio(s, creator).slice(0, 6) : [];
    const limits = priceLimits(request.brief.videoCount);
    const amount = Number(price.replace(/[^0-9.]/g, ""));
    const receive = Number.isFinite(amount) && amount > 0 ? creatorNet(amount) : 0;

    if (step.kind === "pitch") {
      const send = () => {
        const next: typeof errors = {};
        if (idea.trim().length < 20) next.idea = "Write your idea in at least 20 characters";
        if (!(amount >= PITCH_MIN)) next.price = `Minimum price is ${money(PITCH_MIN)}`;
        else if (!Number.isInteger(amount) || amount > limits.max)
          next.price = `Whole dollars, up to ${money(limits.max)} for ${plural(request.brief.videoCount, "video")}`;
        setErrors(next);
        const first = next.idea ? "textarea" : next.price ? "input[inputmode]" : null;
        if (first) {
          toast({ message: (next.idea ?? next.price)!, tone: "info" });
          fieldsRef.current?.querySelector<HTMLElement>(first)?.focus();
          return;
        }
        const id = actions.submitPitch({
          requestId: request.id,
          message: idea.trim(),
          angle: angleOf(idea),
          price: amount,
          deliveryDays: deadlineDaysOf(request) ?? ORDER_DEADLINE_DEFAULT,
          sampleIds: samples,
        });
        if (!id || !me.creator(s)) {
          toast({ message: "Couldn't send. Try again.", tone: "info" });
          return;
        }
        setStep({ kind: "sent", requestId: request.id });
      };
      pitchModal = (
        <ConfirmModal
          open
          onClose={close}
          title={`Pitch to ${brand}`}
          primary={{ label: "Send pitch", onClick: send }}
          link={{ label: "Cancel" }}
          fields={
            <div ref={fieldsRef} className="flex flex-col gap-3">
              <TextArea
                label="Your idea"
                required
                rows={3}
                value={idea}
                maxLength={600}
                error={errors.idea}
                onChange={(event) => {
                  setIdea(event.target.value);
                  if (errors.idea && event.target.value.trim().length >= 20) setErrors((e) => ({ ...e, idea: undefined }));
                }}
                placeholder={
                  isAdCopy(request)
                    ? "Lead with the problem in the headline, then the one result that matters"
                    : "Open on the problem, then show the fix in one tap"
                }
              />
              <div className="flex flex-col gap-1.5">
                <TextField
                  label="Your price"
                  required
                  inputMode="numeric"
                  value={price ? `$${price.replace(/[^0-9]/g, "")}` : ""}
                  error={errors.price}
                  aria-label="Your price in dollars, what the brand pays"
                  onChange={(event) => {
                    setPrice(event.target.value.replace(/[^0-9]/g, "").slice(0, 6));
                    if (errors.price) setErrors((e) => ({ ...e, price: undefined }));
                  }}
                />
                <p className="y-micro y-fg-2 px-1" aria-live="polite">
                  {receive ? (
                    <>
                      You receive <b className="y-num text-(--y-ink)">{moneyExact(receive)}</b> after the {FEE_PCT}%
                      Yapp fee · budget {moneyRange(request.budget.min, request.budget.max)}
                    </>
                  ) : (
                    <>Budget {moneyRange(request.budget.min, request.budget.max)}</>
                  )}
                </p>
              </div>
              {videos.length ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="y-label mb-1 flex w-full justify-between">
                    <span>Sample videos</span>
                    <span className="y-micro y-fg-3 font-medium">Optional</span>
                  </legend>
                  <div className="y-pitch-samples">
                    {videos.map((video) => {
                      const on = samples.includes(video.id);
                      return (
                        <button
                          key={video.id}
                          type="button"
                          aria-pressed={on}
                          aria-label={`${on ? "Remove" : "Attach"} ${video.title}`}
                          className="y-pitch-sample"
                          onClick={() =>
                            setSamples((list) =>
                              on ? list.filter((x) => x !== video.id) : list.length >= 3 ? list : [...list, video.id],
                            )
                          }
                        >
                          <VideoThumb video={video} frame="9:16" showHook={false} showMeta={false} decorative />
                        </button>
                      );
                    })}
                  </div>
                  <p className="y-micro y-fg-2 px-1">Up to 3 from your portfolio. {samples.length ? `${samples.length} attached.` : ""}</p>
                </fieldset>
              ) : null}
            </div>
          }
        >
          Tell them your idea in 2–3 lines.{" "}
          {pitches ? `${plural(pitches, "creator")} pitched so far.` : "Be the first to pitch."}
        </ConfirmModal>
      );
    } else {
      pitchModal = (
        <ConfirmModal
          open
          onClose={close}
          title="Pitch sent"
          primary={{ label: "Done", onClick: close }}
          link={{ label: "See your pitches", href: paths.pitches, onClick: close }}
        >
          {brand} will see it in their pitches. You&apos;ll get a notification if they pick you.
        </ConfirmModal>
      );
    }
  }

  return (
    <TakeWorkContext.Provider value={api}>
      {children}
      {pickModal}
      {pitchModal}
      <CreatorSetupSheet
        open={setup !== null}
        reason="to take work on Yapp"
        onClose={() => setSetup(null)}
        onDone={() => {
          const then = setup?.pitch ? requestById(s, setup.pitch) : undefined;
          setSetup(null);
          if (then) api.pitch(then);
          else toast({ message: "Your creator profile is ready. Connect an account to pick campaign slots." });
        }}
      />
    </TakeWorkContext.Provider>
  );
}
