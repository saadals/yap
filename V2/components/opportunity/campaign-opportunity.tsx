"use client";

import {
  AlertCircle,
  ArrowLeft,
  AtSign,
  Ban,
  BadgeCheck,
  Check,
  CircleCheck,
  Clock,
  Eye,
  EyeOff,
  Megaphone,
  ShieldCheck,
  Tag,
  Timer,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ConnectSocialSheet } from "@/components/account/connect-social-sheet";
import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { SlotBadge } from "@/components/domain/status-badge";
import { Block } from "@/components/ui/block";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { KeyValues, ProgressBar } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { compact, lengthLabel, money, plural, quoted, shortDate, weekdayDate } from "@/lib/format";
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
import type { CampaignTerms, ContentRequest } from "@/lib/types";

import { disclosureName, ineligibleCopy, requirementLine, slotsLine } from "./campaign-copy";
import { ActionBar, BrandLine, Bullets, ExplainerTile, MoreMenu, Section } from "./parts";
import { TakeSlotSheet } from "./take-slot-sheet";

type CampaignRequest = ContentRequest & { campaign: CampaignTerms };

/**
 * A UGC campaign, as anyone but its owner sees it: the fixed price and slots left, who can take a
 * slot (with the fix when you can't yet), what to say, the posting rules and how you're paid.
 * One action: take a slot (confirm sheet → `acceptCampaignSlot` → the job).
 */
export function CampaignOpportunity({ request }: { request: CampaignRequest }) {
  const s = useDemo();
  const toast = useToast();
  const [sheet, setSheet] = useState<"take" | "setup" | "connect" | null>(null);
  const [raced, setRaced] = useState(false);

  const terms = request.campaign;
  const business = businessById(s, request.businessId);
  const brandName = business?.name ?? "The brand";
  const product = productById(s, request.brief.productId);
  const platform = campaignPlatformById[terms.platform];
  const creator = me.creator(s);
  const check = eligibility(s, creator, request);
  const slot = mySlot(s, request.id, creator?.id);
  const open = raced ? 0 : openSlotCount(s, request);
  const taken = request.slots - openSlotCount(s, request);
  const hidden = me.hiddenRequestIds(s).includes(request.id);
  const full = raced || (!check.ok && check.reason === "full");
  const closed = request.status === "closed";
  const reason = check.ok ? undefined : check.reason;

  const hide = () => {
    actions.hideRequest(request.id);
    toast({ message: "Hidden from Find work.", action: { label: "Undo", onClick: () => actions.unhideRequest(request.id) } });
  };

  /* ---------------------------------------------------------- the one action */
  type Action = { label: string; neon: boolean; href?: string; onClick?: () => void; disabled?: boolean } | null;
  const slotLabel =
    slot && (slot.status === "in_progress" || slot.status === "revision")
      ? `Your Yapp · due ${shortDate(slot.dueDate)}`
      : "Open your job";
  const action: Action = slot
    ? { label: slotLabel, neon: true, href: paths.job(slot.id) }
    : full
      ? { label: "Campaign full", neon: false, disabled: true }
      : check.ok
        ? { label: "Take a slot", neon: true, onClick: () => setSheet("take") }
        : reason === "no_profile"
          ? { label: "Set up and take a slot", neon: true, onClick: () => setSheet("setup") }
          : reason === "no_account"
            ? { label: `Connect your ${platform.name}`, neon: true, onClick: () => setSheet("connect") }
            : null;

  const actionButton = (size: "md" | "lg", wide: boolean) =>
    action ? (
      action.href ? (
        <PillButton href={action.href} variant={action.neon ? "neon" : "outline"} size={size} arrow className={wide ? "w-full justify-between ps-6" : ""}>
          {action.label}
        </PillButton>
      ) : (
        <PillButton
          variant={action.neon ? "neon" : "outline"}
          size={size}
          arrow={action.neon}
          disabled={action.disabled}
          className={wide ? "w-full justify-between ps-6" : ""}
          onClick={action.onClick}
        >
          {action.label}
        </PillButton>
      )
    ) : null;

  const notice = (() => {
    if (slot) return null;
    if (raced)
      return {
        icon: <Users size={18} aria-hidden />,
        title: "The last slot was just taken",
        body: "Someone got there first. If a slot reopens, it goes to the first creator who qualifies and takes it.",
      };
    if (!reason || reason === "no_profile" || reason === "no_account") return null;
    const copy = ineligibleCopy(reason, request, check.ok ? undefined : check.social?.followers);
    return {
      icon: reason === "unverified" ? <Timer size={18} aria-hidden /> : reason === "full" ? <Users size={18} aria-hidden /> : <AlertCircle size={18} aria-hidden />,
      ...copy,
    };
  })();

  /* ------------------------------------------------------------- eligibility */
  const social = creator?.socials?.find((a) => a.platform === terms.platform);
  const yourStatus = !creator
    ? { ok: false, text: "Set up a creator profile, then connect your account so we can check your followers." }
    : slot
      ? { ok: true, text: `You have slot ${slot.campaignSlot}.` }
      : !social
        ? { ok: false, text: `No ${platform.name} connected yet. Connect it read-only to check your followers.` }
        : !social.verified
          ? { ok: false, text: `We're still checking @${social.handle}.` }
          : check.ok
            ? { ok: true, text: `You qualify: ${compact(social.followers)} verified followers on ${platform.name} (@${social.handle}).` }
            : reason === "below" || reason === "above"
              ? { ok: false, text: `You have ${compact(social.followers)} verified followers on ${platform.name}, ${reason === "below" ? "below" : "above"} this tier.` }
              : { ok: false, text: `${compact(social.followers)} verified followers on ${platform.name} (@${social.handle}).` };

  const deal = (
    <Block tone="paper" pad="md" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="flex items-baseline gap-2">
          <span className="y-display y-num text-[40px] leading-none tracking-[-0.03em]">{money(terms.pricePerVideo)}</span>
          <span className="y-small y-fg-2">per video</span>
        </p>
        <p className="y-micro y-fg-2">You keep 100%. The budget is already held by Yapp.</p>
      </div>
      {closed ? null : (
        <div className="flex flex-col gap-2">
          <p className={`y-small ${open > 0 && open <= 3 ? "font-semibold" : ""}`}>{slotsLine(open, request.slots)}</p>
          <ProgressBar value={taken / request.slots} label={`${taken} of ${request.slots} slots taken`} />
        </div>
      )}
      <KeyValues
        rows={[
          { label: closed ? "Closed" : "Takes creators until", value: weekdayDate(terms.closesAt) },
          { label: "Upload within", value: `${plural(terms.deadlineDays, "day")} of taking a slot` },
        ]}
      />
      <div className="hidden flex-col gap-3 lg:flex">
        {actionButton("lg", true)}
        {notice ? <Notice {...notice} /> : null}
      </div>
    </Block>
  );

  const requirements = (
    <Block as="section" aria-labelledby="who-h" tone="paper" pad="md" className="flex flex-col gap-4">
      <h2 id="who-h" className="y-head flex items-center gap-2">
        <ShieldCheck size={18} aria-hidden className="flex-none" />
        Who can take a slot
      </h2>
      <ul className="flex flex-col gap-2">
        <li className="y-small flex items-start gap-2">
          <Users size={16} aria-hidden className="mt-0.5 flex-none" />
          {requirementLine(terms)}
        </li>
        <li className="y-small flex items-start gap-2">
          <BadgeCheck size={16} aria-hidden className="mt-0.5 flex-none" />
          Followers are verified through a read-only connection: bots and inactive accounts don&apos;t count
        </li>
        <li className="y-small flex items-start gap-2">
          <Clock size={16} aria-hidden className="mt-0.5 flex-none" />
          First come, first served: one slot per creator
        </li>
      </ul>
      <p
        className={`y-small flex items-start gap-2 border-t border-(--b-line) pt-4 ${yourStatus.ok ? "font-semibold" : ""}`}
        aria-live="polite"
      >
        {yourStatus.ok ? (
          <CircleCheck size={16} aria-hidden className="mt-0.5 flex-none text-(--y-success)" />
        ) : (
          <AlertCircle size={16} aria-hidden className="mt-0.5 flex-none" />
        )}
        {yourStatus.text}
      </p>
      {creator && !social && !slot ? (
        <PillButton variant="outline" size="sm" className="w-fit" icon={<AtSign size={15} aria-hidden />} onClick={() => setSheet("connect")}>
          Connect {platform.name}
        </PillButton>
      ) : null}
    </Block>
  );

  return (
    <Page className={action ? "sw-has-bar" : ""}>
      <Link
        href={paths.findWork({ kind: "campaign" })}
        className="y-small y-fg-2 -ms-1 inline-flex w-fit items-center gap-1.5 rounded-full py-1 pe-2 font-medium hover:text-(--y-ink)"
      >
        <ArrowLeft size={16} aria-hidden className="y-flip" />
        Find work
      </Link>

      <header className="flex flex-col gap-3 pt-3 pb-5 md:pb-6">
        <div className="flex items-start justify-between gap-3">
          {business ? <BrandLine business={business} extra={product && product.name !== business.name ? product.name : undefined} /> : <span />}
          <MoreMenu
            items={
              slot
                ? []
                : [
                    hidden
                      ? { label: "Show in Find work again", icon: <Eye size={16} aria-hidden />, onSelect: () => actions.unhideRequest(request.id) }
                      : { label: "Not interested", icon: <EyeOff size={16} aria-hidden />, onSelect: hide },
                  ]
            }
          />
        </div>
        <h1 className="y-display y-t-display max-w-[30ch]">{request.title}</h1>
        <p className="y-body y-fg-2">
          {[
            "UGC campaign",
            `Posted on your ${platform.name}`,
            request.brief.languages.map((l) => languageById[l].name).join(" or "),
            `${lengthLabel(request.brief.durationSec)} video`,
          ].join(" · ")}
        </p>
        {slot || hidden ? (
          <div className="flex flex-wrap items-center gap-2">
            {slot ? <SlotBadge commission={slot} side="creator" /> : null}
            {hidden && !slot ? (
              <span className="y-small y-fg-2 inline-flex items-center gap-1.5">
                <EyeOff size={15} aria-hidden /> Hidden from Find work ·{" "}
                <button type="button" className="y-link font-semibold text-(--y-ink)" onClick={() => actions.unhideRequest(request.id)}>
                  Show again
                </button>
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4 [&>*]:min-w-0">
        <aside className="flex flex-col gap-3 lg:order-2 lg:col-span-4" aria-label="Price, slots and who can take one">
          <div className="y-rail flex flex-col gap-3">
            {deal}
            {/* On phones the notice sits here, under the price (the action is in the bar). */}
            {notice ? (
              <div className="lg:hidden">
                <Notice {...notice} />
              </div>
            ) : null}
            {requirements}
          </div>
        </aside>

        <div className="flex flex-col gap-3 lg:order-1 lg:col-span-8">
          <Section title="What to say" id="say-h">
            {request.brief.keyMessage ? (
              <p className="y-display text-[19px] leading-snug font-medium">{quoted(request.brief.keyMessage)}</p>
            ) : null}
            {request.brief.goal ? <p className="y-body y-fg-2 max-w-[62ch]">{request.brief.goal}</p> : null}
            {terms.explainer ? <ExplainerTile name={terms.explainer.name} durationSec={terms.explainer.durationSec} /> : null}
            <div className="grid gap-5 md:grid-cols-2">
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
                  <h3 className="y-micro y-fg-2">Please avoid</h3>
                  <Bullets items={request.brief.avoid} marker={<Ban size={16} strokeWidth={2.5} aria-hidden className="mt-0.5 flex-none" />} />
                </div>
              ) : null}
            </div>
            <dl className="grid gap-4 border-t border-(--b-line) pt-4 md:grid-cols-2">
              {request.brief.audience ? (
                <div className="flex flex-col gap-1">
                  <dt className="y-micro y-fg-2">Who it&apos;s for</dt>
                  <dd className="y-small">{request.brief.audience}</dd>
                </div>
              ) : null}
              <div className="flex flex-col gap-1">
                <dt className="y-micro y-fg-2">Language and length</dt>
                <dd className="y-small">
                  {request.brief.languages.map((l) => languageById[l].name).join(" or ")} · vertical · up to{" "}
                  {lengthLabel(request.brief.durationSec)}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="Posting rules" id="post-h" icon={<Megaphone size={18} aria-hidden className="flex-none" />}>
            <ul className="flex flex-col gap-3">
              <li className="y-small flex items-start gap-2.5">
                <AtSign size={16} aria-hidden className="mt-0.5 flex-none" />
                <span>
                  Post on your own {platform.name} and tag <span className="font-semibold">{terms.brandHandle}</span>
                </span>
              </li>
              <li className="y-small flex items-start gap-2.5">
                <Tag size={16} aria-hidden className="mt-0.5 flex-none" />
                <span>Turn on the {disclosureName(terms.platform)}: it tells viewers the post is paid</span>
              </li>
              <li className="y-small flex items-start gap-2.5">
                <Clock size={16} aria-hidden className="mt-0.5 flex-none" />
                <span>
                  Keep it up for {CAMPAIGN_KEEP_LIVE_DAYS} days. If it comes down, you have {CAMPAIGN_RESTORE_HOURS} hours to put it back
                </span>
              </li>
            </ul>
          </Section>

          <Section title="How you're paid" id="paid-h" icon={<ShieldCheck size={18} aria-hidden className="flex-none" />}>
            <ol className="flex flex-col gap-3">
              {[
                `${brandName} has already paid: the whole budget is held by Yapp before anyone takes a slot.`,
                `Upload a review copy within ${plural(terms.deadlineDays, "day")}. It stays watermarked until ${brandName} approves it.`,
                `Once it's approved, post it with the tag and the label. We check the post for you.`,
                `Your ${money(terms.pricePerVideo)} is released ${CAMPAIGN_RELEASE_DAYS} days after we verify the post, if it's still up.`,
              ].map((text, index) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="y-micro y-num grid size-6 flex-none place-items-center rounded-full bg-(--y-mist) font-semibold">
                    {index + 1}
                  </span>
                  <span className="y-small pt-0.5">{text}</span>
                </li>
              ))}
            </ol>
            <p className="y-micro y-fg-2">
              If {brandName} doesn&apos;t approve your video, the slot goes to another creator and nothing is owed.
            </p>
          </Section>
        </div>
      </div>

      {action ? (
        <ActionBar label="Take a slot">
          <p className="y-small min-w-0 flex-1 truncate">
            <span className="y-num font-semibold">{money(terms.pricePerVideo)}</span>
            <span className="y-fg-2"> · {slot ? `slot ${slot.campaignSlot}` : slotsLine(open, request.slots).toLowerCase()}</span>
          </p>
          {actionButton("md", false)}
        </ActionBar>
      ) : null}

      <TakeSlotSheet
        open={sheet === "take"}
        request={request}
        onClose={() => setSheet(null)}
        onFull={() => {
          setSheet(null);
          setRaced(true);
        }}
      />
      <CreatorSetupSheet
        open={sheet === "setup"}
        reason="to take a slot on this campaign"
        onClose={() => setSheet((current) => (current === "setup" ? null : current))}
        onDone={() => {
          // Straight on to the next step: connect the account the campaign posts on (the sheet
          // shows it as connected if the setup already did it).
          setSheet("connect");
        }}
      />
      {creator ? (
        <ConnectSocialSheet
          open={sheet === "connect"}
          onClose={() => setSheet(null)}
          creatorId={creator.id}
          platform={terms.platform}
          reason="to take a slot on this campaign"
        />
      ) : null}
    </Page>
  );
}

function Notice({ icon, title, body }: { icon: React.ReactNode; title: string; body?: string }) {
  return (
    <div className="y-tile flex items-start gap-2.5 p-4" role="status">
      <span className="mt-0.5 flex-none">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <p className="y-small font-semibold">{title}</p>
        {body ? <p className="y-small y-fg-2">{body}</p> : null}
      </div>
    </div>
  );
}
