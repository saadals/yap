"use client";

import {
  BadgeCheck,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  MailOpen,
  Megaphone,
  PenLine,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { MyPitchPanel } from "@/components/creator/my-pitch-panel";
import { ProductDetails } from "@/components/creator/opportunity-blocks";
import { PitchComposer } from "@/components/creator/pitch-composer";
import { BusinessLogo } from "@/components/domain/business-logo";
import { PitchBadge } from "@/components/domain/status-badge";
import { Block } from "@/components/ui/block";
import { Checklist, DefinitionList, StatBox, StatGrid } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/empty-state";
import { BackPill, CardHead, WidePage } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SlotBar } from "@/components/ui/progress";
import { StickyActionBar } from "@/components/ui/sticky-bar";
import { StatusChip, Tag } from "@/components/ui/tags";
import { useToast } from "@/components/ui/toast";
import { attachmentMeta } from "@/lib/files";
import { lengthLabel, money, moneyRange, netRange, creatorNet, moneyExact, plural, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  brandHandleFor,
  businessById,
  deadlineDaysOf,
  findWork,
  isAdCopy,
  me,
  myPitchFor,
  openSlotCount,
  pitchesForRequest,
  portfolio,
  productById,
  reliabilityFigures,
  type WorkItem,
} from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import {
  CAMPAIGN_RELEASE_DAYS,
  FEE_PCT,
  RAW_FOOTAGE_INCLUDED,
  campaignPlatformById,
  formatById,
  jobTypeById,
  languageById,
  nicheById,
  platformById,
  tierById,
  usageById,
} from "@/lib/taxonomy";
import type { ContentRequest } from "@/lib/types";

import { lastFindWork } from "./find-query";
import { JobAction, payParts, platformsLabel } from "./job-card";
import { TakeWorkProvider } from "./take-work";

const noop = () => () => {};

/** "← Find work", back to the filters the creator came from (kept in this tab's session). */
function useFindWorkHref() {
  return useSyncExternalStore(noop, lastFindWork, () => paths.findWork());
}

/** Physical products are never shipped (round 3 answers, item 24). */
const isPhysical = (request: ContentRequest, niche?: string) =>
  !isAdCopy(request) && (niche === "gadgets" || request.brief.format === "unboxing");

/**
 * The job page (Work spec 6.6): an open order as everyone but its owner sees it, at the app's
 * own address (`/orders/[id]`). Header, the brief as a definition list with the brand's files,
 * "How it goes" in five steps, the price card with the one action, and the brand card with its
 * reliability figures. Pick now and Pitch now open their modals (`TakeWorkProvider`). A creator
 * who has pitched sees their pitch below the brief, to follow, edit or withdraw it.
 */
export function JobPage({ request }: { request: ContentRequest }) {
  return (
    <TakeWorkProvider>
      <JobBody request={request} />
    </TakeWorkProvider>
  );
}

function Unavailable({ title, body, back }: { title: string; body: string; back: string }) {
  return (
    <WidePage>
      <BackPill href={back} label="Find work" />
      <Block tone="paper" pad="md" className="mx-auto max-w-2xl">
        <h1 className="sr-only">{title}</h1>
        <EmptyState
          headingLevel={2}
          title={title}
          body={body}
          action={
            <PillButton href={paths.findWork()} variant="contrast" arrow>
              Find work
            </PillButton>
          }
        />
      </Block>
    </WidePage>
  );
}

function JobBody({ request }: { request: ContentRequest }) {
  const s = useDemo();
  const toast = useToast();
  const back = useFindWorkHref();
  const [editing, setEditing] = useState(false);

  const creator = me.creator(s);
  const business = businessById(s, request.businessId);
  const brand = business?.name ?? "The brand";
  const product = productById(s, request.brief.productId);
  const myPitch = creator && !request.campaign ? myPitchFor(s, request.id, creator.id) : undefined;
  const invited = creator ? request.invitedCreatorIds.includes(creator.id) : false;
  const hidden = me.hiddenRequestIds(s).includes(request.id);

  if (request.status === "draft") {
    return (
      <Unavailable
        back={back}
        title="This order isn't published yet"
        body="The brand is still writing it. It shows up in Find work once it's open."
      />
    );
  }
  if (!request.campaign && request.visibility === "invite" && !invited && !myPitch) {
    return (
      <Unavailable
        back={back}
        title="This order is invite-only"
        body="The brand picked a few creators to pitch on it. Keep your portfolio sharp so you get the next invite."
      />
    );
  }

  const item: WorkItem | undefined = findWork(s, { includeHidden: true, pageSize: 1000 }).items.find(
    (i) => i.id === request.id,
  );
  const campaign = Boolean(request.campaign);
  const adCopy = isAdCopy(request);
  const niche = product?.niche ?? business?.industry ?? "consumer";
  const days = deadlineDaysOf(request);
  const left = campaign ? openSlotCount(s, request) : 0;
  const pitches = pitchesForRequest(s, request.id).length;
  const open = request.status === "open" || (campaign && request.status === "hired");

  // Price and net, from the Find work item when the job is still listed.
  const pay = item
    ? { ...payParts(item), net: item.pay.netLabel.replace(/^you earn /, "") }
    : request.campaign
      ? {
          figure: money(request.campaign.pricePerVideo),
          unit: "per Yapp",
          net: moneyExact(creatorNet(request.campaign.pricePerVideo)),
        }
      : { figure: moneyRange(request.budget.min, request.budget.max), unit: "budget", net: netRange(request.budget.min, request.budget.max) };

  /* -------------------------------------------------------------- header */
  const status =
    item?.action.reason === "joined" ? (
      <StatusChip look="done">You picked a slot</StatusChip>
    ) : myPitch ? (
      <PitchBadge status={myPitch.status} />
    ) : !open || !item ? (
      <StatusChip look="negative">{request.status === "hired" ? "Hired" : "Closed"}</StatusChip>
    ) : campaign ? (
      left > 0 ? (
        <StatusChip look="moving">UGC campaign · pick now</StatusChip>
      ) : (
        <StatusChip look="waiting">All slots taken</StatusChip>
      )
    ) : (
      <StatusChip look="waiting">Custom order · pitch</StatusChip>
    );

  const chips: React.ReactNode[] = [];
  if (adCopy) chips.push(<Tag key="job" tone="dark">{jobTypeById["ad-copy"].name}</Tag>);
  else {
    chips.push(<Tag key="fmt">{formatById[request.brief.format].name}</Tag>);
    const where = campaign ? request.campaign!.platforms.map((p) => campaignPlatformById[p].name).join(" + ") : platformsLabel(request.brief.platforms);
    if (where) chips.push(<Tag key="plat">{where}</Tag>);
    chips.push(
      <Tag key="len">
        {lengthLabel(request.brief.durationSec)} · {request.brief.aspect}
      </Tag>,
    );
  }
  chips.push(
    <Tag key="close">
      {campaign ? "Closes" : "Pitch by"} {weekdayDate(request.closesAt)}
    </Tag>,
  );
  if (invited) chips.push(<Tag key="inv" icon={<MailOpen size={13} aria-hidden />}>{brand} invited you</Tag>);

  /* --------------------------------------------------------------- brief */
  const terms = request.campaign;
  const brief = request.brief;
  const rows: { term: React.ReactNode; detail: React.ReactNode; wide?: boolean }[] = [
    {
      term: "What it is",
      detail: product ? `${product.name} — ${product.oneLiner}` : `${brand} — a ${nicheById[niche].name} product`,
      wide: true,
    },
    {
      term: "Job type",
      detail: adCopy
        ? `${jobTypeById["ad-copy"].name}${brief.copy?.pieces.length ? ` · ${plural(brief.copy.pieces.length, "piece")}` : ""}`
        : `${jobTypeById.video.name} · ${formatById[brief.format].name}${!campaign && brief.videoCount > 1 ? ` · ${plural(brief.videoCount, "video")}` : ""}`,
    },
    { term: "Category", detail: nicheById[niche].name },
  ];
  if (brief.hook) rows.push({ term: adCopy ? "Opening line" : "Hook", detail: brief.hook, wide: true });
  if (brief.keyMessage) rows.push({ term: "Key message", detail: brief.keyMessage, wide: true });
  if (adCopy && brief.copy?.pieces.length) rows.push({ term: "What to write", detail: brief.copy.pieces.join(" · "), wide: true });
  if (brief.mustInclude.length) rows.push({ term: adCopy ? "Must say" : "Must show", detail: brief.mustInclude.join(" · ") });
  if (brief.avoid.length) rows.push({ term: "Don't say", detail: brief.avoid.join(" · ") });
  rows.push({
    term: "Deadline",
    detail: campaign
      ? `Upload within ${plural(terms!.deadlineDays, "day")} of picking · set by ${brand}`
      : days
        ? `Version 1 within ${plural(days, "day")} of being hired · set by ${brand}`
        : `Due ${weekdayDate(request.dueDate)} · set by ${brand}`,
  });
  rows.push({
    term: campaign ? "Post on your account" : "Where it runs",
    detail: campaign
      ? `Yes · ${terms!.platforms
          .map((p) => `${campaignPlatformById[p].name}, tag ${brandHandleFor(terms!, p)}`)
          .join(" or ")} · paid-partnership label on`
      : adCopy
        ? `Nothing is posted · ${brand} runs it${brief.copy?.placements.length ? ` on ${brief.copy.placements.map((p) => platformById[p].name).join(", ")}` : ""}`
        : `No · ${brand} runs it${brief.platforms.length ? ` on ${brief.platforms.map((p) => platformById[p].name).join(", ")}` : " as an ad"}`,
  });
  rows.push({
    term: "Usage",
    detail: `${usageById[brief.usage].name}, included in the price${RAW_FOOTAGE_INCLUDED && !adCopy ? " · raw footage included" : ""}`,
  });
  if (brief.languages.length)
    rows.push({ term: "Language", detail: brief.languages.map((id) => languageById[id].name).join(" or ") });
  if (brief.notes) rows.push({ term: "Notes", detail: brief.notes, wide: true });
  const saysShipping = [brief.notes ?? "", ...brief.mustInclude].some((t) => /\bship/i.test(t));
  if (isPhysical(request, niche) && !saysShipping)
    rows.push({
      term: "The product",
      detail: "Use one you already own, or work from the companion app. Yapp doesn't ship products yet.",
      wide: true,
    });

  const files = [
    ...(terms?.explainer
      ? [{ id: "explainer", kind: "video" as const, name: terms.explainer.name, meta: `Video · ${Math.round(terms.explainer.durationSec)} s · explainer` }]
      : []),
    ...(brief.attachments ?? []).map((f) => ({ id: f.id, kind: f.kind, name: f.name, meta: attachmentMeta(f) })),
  ];

  /* ---------------------------------------------------------------- steps */
  const steps: [string, string][] = campaign
    ? [
        ["Pick", "Take a slot, no pitching"],
        ["Upload", `Within ${plural(terms!.deadlineDays, "day")}, set by ${brand}`],
        ["Review", `${brand} approves`],
        ["Post", `On your ${terms!.platforms.map((p) => campaignPlatformById[p].name).join(" or ")}`],
        ["Paid", `${CAMPAIGN_RELEASE_DAYS} days after your post is verified`],
      ]
    : [
        ["Pitch", "Your idea and price"],
        ["Hired", `${brand} picks you`],
        adCopy
          ? ["Write", days ? `Within ${plural(days, "day")} of being hired` : `By ${weekdayDate(request.dueDate)}`]
          : ["Film", days ? `Within ${plural(days, "day")} of being hired` : `By ${weekdayDate(request.dueDate)}`],
        ["Review", "Two revisions included"],
        ["Paid", "On approval"],
      ];

  /* ------------------------------------------------------------ price card */
  const checklist = campaign
    ? [
        `For creators with ${tierById[terms!.tierId].label} verified followers`,
        `Deadline set by ${brand}: upload within ${plural(terms!.deadlineDays, "day")}`,
        "Fixed price, no pitching",
        `Paid ${CAMPAIGN_RELEASE_DAYS} days after your post is verified`,
        "Money held by Yapp from the start",
      ]
    : ["Set your own price", `${brand} picks from the pitches`, "Money held when you're hired", "Paid on approval"];

  const action = item ? (
    <JobAction item={item} place="cta" />
  ) : (
    <p className="y-small y-fg-2 text-center">
      {request.status === "hired" && !campaign ? `${brand} hired a creator for this one.` : "This order isn't taking creators any more."}{" "}
      <Link href={paths.findWork()} className="font-semibold text-(--y-ink) underline underline-offset-4">
        Find more work
      </Link>
    </p>
  );

  /* ----------------------------------------------------------- brand card */
  const more = findWork(s, { pageSize: 1000 })
    .items.filter((i) => i.business.id === request.businessId && i.id !== request.id)
    .slice(0, 3);
  const figures = reliabilityFigures(business);

  const hide = () => {
    actions.hideRequest(request.id);
    toast({
      message: "Hidden from Find work and your feed.",
      action: { label: "Undo", onClick: () => actions.unhideRequest(request.id) },
    });
  };

  return (
    <WidePage className="y-jobpage">
      <BackPill href={back} label="Find work" />
      <div className="y-dgrid">
        <div className="y-dmain">
          {/* Header */}
          <Block as="header" tone="paper" pad="none" className="y-dhead">
            <div className="y-wholine">
              {business ? <BusinessLogo business={business} size={44} /> : null}
              <span className="min-w-0">
                <b className="flex items-center gap-1.5">
                  {brand}
                  {business?.verified ? <BadgeCheck size={16} aria-label="Verified brand" /> : null}
                </b>
                {nicheById[niche].name}
              </span>
              <span className="flex-1" />
              {status}
            </div>
            <h1 className="y-display y-dhead-t">{request.title}</h1>
            <div className="flex flex-wrap items-center gap-1.5">
              {chips}
              {!item?.mySlot && !myPitch && open ? (
                hidden ? (
                  <PillButton size="sm" variant="ghost" className="ms-auto" icon={<Eye size={16} aria-hidden />} onClick={() => actions.unhideRequest(request.id)}>
                    Hidden · Show again
                  </PillButton>
                ) : (
                  <PillButton size="sm" variant="ghost" className="ms-auto" icon={<EyeOff size={16} aria-hidden />} onClick={hide}>
                    Not interested
                  </PillButton>
                )
              ) : null}
            </div>
          </Block>

          {/* The brief */}
          <Block as="section" aria-labelledby="brief-h" tone="paper" pad="none" className="y-dcard">
            <CardHead id="brief-h" as="h2" title="The brief" />
            <DefinitionList items={rows} />
            {files.length ? (
              <>
                <div className="y-eyebrow mt-5 mb-2">Files from {brand}</div>
                <ul className="y-files">
                  {files.map((file) => (
                    <li key={file.id} className="y-file">
                      <span className="y-file-ic" aria-hidden>
                        {file.kind === "video" ? (
                          <PlayCircle size={18} strokeWidth={1.75} />
                        ) : file.kind === "image" ? (
                          <ImageIcon size={18} strokeWidth={1.75} />
                        ) : (
                          <FileText size={18} strokeWidth={1.75} />
                        )}
                      </span>
                      <span className="min-w-0">
                        <b>{file.name}</b>
                        <small>{file.meta}</small>
                      </span>
                      <button
                        type="button"
                        className="y-file-dl"
                        aria-label={`Download ${file.name}`}
                        onClick={() => toast({ message: "Files are simulated in this demo, so there's nothing to download." })}
                      >
                        <Download size={16} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {product ? (
              <div className="mt-4">
                <ProductDetails product={product} />
              </div>
            ) : null}
          </Block>

          {/* How it goes */}
          <Block as="section" aria-labelledby="steps-h" tone="paper" pad="none" className="y-dcard">
            <CardHead id="steps-h" as="h2" title="How it goes" />
            <ol className="y-steps5">
              {steps.map(([title, body], index) => (
                <li key={title}>
                  <span aria-hidden>{index + 1}</span>
                  <b>{title}</b>
                  {body}
                </li>
              ))}
            </ol>
          </Block>

          {/* Your pitch */}
          {myPitch && creator ? (
            <Block as="section" id="your-pitch" aria-label="Your pitch" tone="paper" pad="none" className="y-dcard scroll-mt-24">
              {editing ? (
                <PitchComposer
                  key={`edit-${myPitch.id}`}
                  request={request}
                  business={business}
                  product={product}
                  creator={creator}
                  videos={portfolio(s, creator)}
                  existing={myPitch}
                  onCancel={() => setEditing(false)}
                  onDone={() => setEditing(false)}
                />
              ) : (
                <MyPitchPanel pitch={myPitch} request={request} business={business} onEdit={() => setEditing(true)} />
              )}
            </Block>
          ) : null}
        </div>

        <aside className="y-dside" aria-label="Price and brand">
          <Block as="section" aria-label="Price" tone="paper" pad="none" className="y-dcard y-opcta">
            <p className="y-fig-xxl y-num">
              <span className="whitespace-nowrap">{pay.figure}</span>
              <span className="y-fig-unit">{pay.unit}</span>
            </p>
            <p className="y-opcta-net y-num">
              You earn <b>{pay.net}</b> after the {FEE_PCT}% Yapp fee
            </p>
            {campaign ? (
              <>
                <SlotBar total={request.slots} taken={request.slots - left} size="lg" className="mt-3.5 mb-2" />
                <p className="y-small y-fg-2 y-num">
                  <b className="text-(--y-ink)">
                    {left} of {request.slots}
                  </b>{" "}
                  slots left · Closes {weekdayDate(request.closesAt)}
                </p>
              </>
            ) : (
              <p className="y-small y-fg-2 y-num mt-1.5">
                {plural(pitches, "pitch", "pitches")} so far · Pitch by {weekdayDate(request.closesAt)}
              </p>
            )}
            <div className="mt-4">{action}</div>
            <Checklist items={checklist} className="mt-4" />
          </Block>

          <Block as="section" aria-labelledby="brand-h" tone="paper" pad="none" className="y-dcard">
            <div className="y-person">
              {business ? <BusinessLogo business={business} size={52} /> : null}
              <span className="min-w-0">
                <b id="brand-h">{brand}</b>
                <small>
                  {nicheById[business?.industry ?? niche].name}
                  {business?.verified ? " · verified brand" : ""}
                </small>
              </span>
            </div>
            <StatGrid columns={3} className="y-relgrid">
              {figures.map((f) => (
                <StatBox key={f.id} value={f.value} label={<span title={f.hint}>{f.label}</span>} />
              ))}
            </StatGrid>
            {figures.every((f) => !f.known) ? (
              <p className="y-micro y-fg-2 mt-2">Figures appear after {brand}&apos;s first few hires.</p>
            ) : null}
            {more.length ? (
              <>
                <div className="y-eyebrow mt-4 mb-1">More from {brand}</div>
                <ul>
                  {more.map((other) => (
                    <li key={other.id} className="y-orow">
                      <span className="y-orow-ic" aria-hidden>
                        {other.kind === "campaign" ? <Megaphone size={17} strokeWidth={1.75} /> : <PenLine size={17} strokeWidth={1.75} />}
                      </span>
                      <span className="min-w-0">
                        <Link href={paths.order(other.id)} className="y-orow-link">
                          {other.title}
                        </Link>
                        <small className="y-num">
                          {payParts(other).figure}
                          {other.kind === "campaign" && other.slots
                            ? ` · ${other.slots.left} left`
                            : ` · ${plural(other.pitches, "pitch", "pitches")}`}
                        </small>
                      </span>
                      <ChevronRight size={16} aria-hidden className="y-flip y-fg-3" />
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Block>
        </aside>
      </div>

      {item ? (
        <StickyActionBar label={campaign ? "Pick now" : "Pitch now"}>
          <JobAction item={item} place="bar" />
        </StickyActionBar>
      ) : null}
    </WidePage>
  );
}
