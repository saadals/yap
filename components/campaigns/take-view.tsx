"use client";

import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  CircleCheck,
  Clock,
  EyeOff,
  Megaphone,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import type { IneligibleReason } from "@/lib/campaigns";
import { money, plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { businessById, eligibility, me, mySlot, openSlotCount, productById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import {
  CAMPAIGN_KEEP_LIVE_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  CAMPAIGN_RESTORE_HOURS,
  campaignPlatformById,
  languageById,
} from "@/lib/taxonomy";

import { ExplainerTile } from "./explainer";
import type { CampaignRequest } from "./owner-sheets";
import { Bullets, Spinner } from "./parts";
import { deadlineLine, disclosureName, ineligibleCopy, postingRule, requirementLine, seatsLine } from "./shared";

const knownReasons: IneligibleReason[] = [
  "own",
  "closed",
  "full",
  "joined",
  "excluded",
  "no_profile",
  "no_account",
  "unverified",
  "below",
  "above",
];

/** Everyone but the owner: decide, then take a slot (first come, first served). */
export function TakeView({ request }: { request: CampaignRequest }) {
  const s = useDemo();
  const toast = useToast();
  const [sheet, setSheet] = useState<"take" | "setup" | null>(null);
  const [raced, setRaced] = useState(false);

  const terms = request.campaign;
  const business = businessById(s, request.businessId);
  const product = productById(s, request.brief.productId);
  const platform = campaignPlatformById[terms.platform];
  const creator = me.creator(s);
  const check = eligibility(s, creator, request);
  const slot = mySlot(s, request.id, creator?.id);
  const open = openSlotCount(s, request);
  const hidden = me.hiddenRequestIds(s).includes(request.id);
  const full = raced || (!check.ok && check.reason === "full");

  const hide = () => {
    actions.hideRequest(request.id);
    toast({
      message: "Hidden. We won't show it to you again.",
      action: { label: "Undo", onClick: () => actions.unhideRequest(request.id) },
    });
  };

  /* --------------------------------------------------- the one action */
  let action: React.ReactNode;
  if (slot) {
    action = (
      <div className="flex flex-col gap-2">
        <p className="y-small flex items-center gap-2 font-semibold">
          <CircleCheck size={18} aria-hidden className="flex-none" />
          You have slot {slot.campaignSlot}
        </p>
        <PillButton href={paths.commission(slot.id)} variant="neon" size="lg" arrow className="justify-between ps-6">
          Go to your slot
        </PillButton>
      </div>
    );
  } else if (raced) {
    action = (
      <Notice
        icon={<Users size={18} aria-hidden />}
        title="All slots were just taken"
        body="Someone got there first. If a slot reopens, it goes to the first eligible creator who takes it."
        after={
          <PillButton href={paths.explore("orders")} variant="outline" className="w-fit">
            Find another campaign
          </PillButton>
        }
      />
    );
  } else if (check.ok) {
    action = (
      <PillButton variant="neon" size="lg" arrow className="justify-between ps-6" onClick={() => setSheet("take")}>
        Take a slot
      </PillButton>
    );
  } else if (check.reason === "no_profile") {
    action = (
      <div className="flex flex-col gap-2">
        <PillButton variant="neon" size="lg" arrow className="justify-between ps-6" onClick={() => setSheet("setup")}>
          Set up a creator profile
        </PillButton>
        <p className="y-micro y-fg-2 px-1">You need one to take a slot. It takes a minute.</p>
      </div>
    );
  } else if (check.reason === "no_account") {
    action = (
      <div className="flex flex-col gap-2">
        <PillButton
          href={paths.editProfile("accounts")}
          variant="neon"
          size="lg"
          arrow
          className="justify-between ps-6"
        >
          Connect your {platform.name} account
        </PillButton>
        <p className="y-micro y-fg-2 px-1">To check your followers. It&apos;s read-only.</p>
      </div>
    );
  } else {
    const copy = ineligibleCopy(check.reason, request, check.social?.followers);
    action = (
      <Notice
        icon={check.reason === "unverified" ? <Timer size={18} aria-hidden /> : <AlertCircle size={18} aria-hidden />}
        title={copy.title}
        body={copy.body}
        after={
          check.reason === "full" || check.reason === "closed" ? (
            <PillButton href={paths.explore("orders")} variant="outline" className="w-fit">
              Find another campaign
            </PillButton>
          ) : null
        }
      />
    );
  }

  const canHide = !slot && !(!check.ok && check.reason === "own");

  return (
    <div className="flex flex-col gap-2 pt-2">
      <Link
        href={paths.explore("orders")}
        className="y-small y-fg-2 inline-flex w-fit items-center gap-1.5 rounded-full px-1 py-1 font-medium hover:text-(--y-ink)"
      >
        <ArrowLeft size={16} aria-hidden className="y-flip" />
        Discover orders
      </Link>
      {/* Header + the decision */}
      <Block as="section" aria-labelledby="campaign-h" tone="paper" pad="md" className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="flex min-w-0 flex-col gap-4">
          {business ? (
            <div className="flex items-center gap-3">
              <BusinessLogo business={business} size={40} />
              <div className="min-w-0">
                <p className="y-small flex items-center gap-1.5 font-semibold">
                  {business.name}
                  {business.verified ? <BadgeCheck size={16} aria-label="Verified business" /> : null}
                </p>
                <p className="y-micro y-fg-2">{product ? `${product.name} · ` : ""}UGC campaign</p>
              </div>
            </div>
          ) : null}
          <h1 id="campaign-h" className="y-display y-t-display max-w-[24ch]">
            {request.title}
          </h1>
          <div className="flex flex-col gap-1.5">
            <p className="y-small flex items-start gap-2">
              <ShieldCheck size={18} aria-hidden className="mt-px flex-none" />
              {requirementLine(terms)}
            </p>
            <p className="y-small flex items-start gap-2">
              <Clock size={18} aria-hidden className="mt-px flex-none" />
              {deadlineLine(terms, business?.name)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:w-[380px] lg:flex-none">
          <div className="flex flex-col gap-1">
            <p className="flex items-baseline gap-2">
              <span className="y-display y-num text-[56px] leading-none font-semibold tracking-[-0.04em]">
                {money(terms.pricePerVideo)}
              </span>
              <span className="y-head">per Yapp</span>
            </p>
            {request.status === "closed" ? null : (
              <p className={`y-small ${open > 0 && open <= 3 ? "font-semibold" : "y-fg-2"}`}>
                {seatsLine(full ? 0 : open, request.slots, check.ok && !raced)}
                {full ? "" : ` · open until ${shortDate(terms.closesAt)}`}
              </p>
            )}
          </div>
          <div aria-live="polite">{action}</div>
          {canHide ? (
            hidden ? (
              <p className="y-small y-fg-2 flex items-center gap-2">
                <EyeOff size={16} aria-hidden />
                Hidden from your feed.
                <button
                  type="button"
                  className="font-semibold underline underline-offset-4"
                  onClick={() => actions.unhideRequest(request.id)}
                >
                  Undo
                </button>
              </p>
            ) : (
              <PillButton variant="ghost" size="sm" className="w-fit" onClick={hide}>
                Not interested
              </PillButton>
            )
          ) : null}
        </div>
      </Block>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:items-start [&>*]:min-w-0">
        {/* What to say */}
        <Block as="section" aria-labelledby="say-h" tone="paper" pad="md" className="flex flex-col gap-6 lg:col-span-7">
          <h2 id="say-h" className="y-head">
            What to say
          </h2>
          {request.brief.keyMessage ? <p className="y-body max-w-[62ch]">{request.brief.keyMessage}</p> : null}
          {terms.explainer ? <ExplainerTile name={terms.explainer.name} durationSec={terms.explainer.durationSec} /> : null}
          {request.brief.mustInclude.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="y-micro y-fg-2">Talking points</h3>
              <Bullets
                items={request.brief.mustInclude}
                marker={<Check size={16} strokeWidth={2.75} aria-hidden className="mt-0.5 flex-none" />}
              />
            </div>
          ) : null}
          {request.brief.avoid.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="y-micro y-fg-2">Restrictions</h3>
              <Bullets
                items={request.brief.avoid}
                marker={<Ban size={16} strokeWidth={2.5} aria-hidden className="mt-0.5 flex-none" />}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-2 border-t border-(--b-line) pt-4">
            <h3 className="y-micro y-fg-2">Posting</h3>
            <p className="y-small flex gap-2">
              <Megaphone size={16} aria-hidden className="mt-0.5 flex-none" />
              {postingRule(terms)}
            </p>
            {request.brief.languages.length ? (
              <p className="y-small y-fg-2">
                In {request.brief.languages.map((id) => languageById[id].name).join(" or ")}
              </p>
            ) : null}
          </div>
        </Block>

        {/* How you're paid */}
        <Block as="section" aria-labelledby="paid-h" tone="paper" pad="md" className="flex flex-col gap-3 lg:col-span-5">
          <h2 id="paid-h" className="y-head flex items-center gap-2">
            <ShieldCheck size={20} aria-hidden />
            How you&apos;re paid
          </h2>
          <p className="y-small">
            The budget is already held by Yapp. Once your video is approved, post it: your{" "}
            {money(terms.pricePerVideo)} is released {CAMPAIGN_RELEASE_DAYS} days after we verify the post, if
            it&apos;s still up.
          </p>
          <p className="y-small">
            Keep the post up for {CAMPAIGN_KEEP_LIVE_DAYS} days. If it comes down, you have {CAMPAIGN_RESTORE_HOURS}{" "}
            hours to put it back. If the business doesn&apos;t approve your video, the slot goes to another creator.
          </p>
        </Block>
      </div>

      {sheet === "take" ? (
        <TakeSlotSheet
          request={request}
          onClose={() => setSheet(null)}
          onFull={() => {
            setSheet(null);
            setRaced(true);
          }}
        />
      ) : null}
      <CreatorSetupSheet
        open={sheet === "setup"}
        onClose={() => setSheet(null)}
        onDone={() => {
          setSheet(null);
          toast({ message: `Your creator profile is ready. Next, connect your ${platform.name}.` });
        }}
        reason="to take a slot on this campaign"
      />
    </div>
  );
}

function Notice({
  icon,
  title,
  body,
  after,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
  after?: React.ReactNode;
}) {
  return (
    <div className="y-tile flex flex-col gap-3 p-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex-none">{icon}</span>
        <div className="flex flex-col gap-0.5">
          <p className="y-small font-semibold">{title}</p>
          {body ? <p className="y-small y-fg-2">{body}</p> : null}
        </div>
      </div>
      {after}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Confirm: take a slot                                                        */
/* -------------------------------------------------------------------------- */

export function TakeSlotSheet({
  request,
  onClose,
  onFull,
}: {
  request: CampaignRequest;
  onClose: () => void;
  onFull: () => void;
}) {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const [agreed, setAgreed] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [taking, setTaking] = useState(false);
  const timer = useRef(0);
  const terms = request.campaign;
  const platform = campaignPlatformById[terms.platform];
  const brandName = businessById(s, request.businessId)?.name;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const take = () => {
    if (taking) return;
    if (!agreed) {
      setNudge(true);
      return;
    }
    setTaking(true);
    timer.current = window.setTimeout(() => {
      const result = actions.acceptCampaignSlot(request.id);
      if (result.ok) {
        toast({ message: `Slot ${result.slot} is yours` });
        router.push(paths.commission(result.commissionId));
        return;
      }
      setTaking(false);
      if (result.reason === "full") {
        onFull();
        return;
      }
      const reason = knownReasons.find((r) => r === result.reason);
      toast({ message: reason ? ineligibleCopy(reason, request).title : "Couldn't take a slot. Try again.", tone: "info" });
      onClose();
    }, 600);
  };

  const rows = [
    {
      label: "You earn",
      value: `${money(terms.pricePerVideo)}, released ${CAMPAIGN_RELEASE_DAYS} days after your post is verified`,
    },
    {
      label: "Upload",
      value: `Within ${plural(terms.deadlineDays, "day")} of taking a slot${brandName ? `, set by ${brandName}` : ""}`,
    },
    { label: "Post on", value: `Your ${platform.name}, tagging ${terms.brandHandle}` },
    { label: "Disclosure", value: `Turn on the ${disclosureName(terms.platform)}` },
    { label: "Keep it up", value: `${CAMPAIGN_KEEP_LIVE_DAYS} days from verification` },
  ];

  return (
    <Sheet
      open
      onClose={onClose}
      width="sm"
      title="Take a slot"
      description={request.title}
      footer={
        <button
          type="button"
          className="y-pill w-full justify-between ps-6"
          data-variant="neon"
          data-arrow="true"
          data-size="lg"
          aria-disabled={!agreed || taking ? "true" : undefined}
          disabled={taking}
          onClick={take}
        >
          <span>{taking ? "Taking your slot…" : "Take a slot"}</span>
          <span aria-hidden className="y-arrow">
            {taking ? <Spinner /> : <Check size={20} />}
          </span>
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        <dl className="flex flex-col">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5 border-b border-(--b-line) py-3 first:pt-0">
              <dt className="y-micro y-fg-2">{row.label}</dt>
              <dd className="y-small font-semibold">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="y-small y-fg-2">
          Upload a review copy first. It&apos;s watermarked until the business approves it.
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
      </div>
    </Sheet>
  );
}
