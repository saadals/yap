"use client";

import {
  Ban,
  FileText,
  History,
  Link2,
  Pencil,
  RotateCcw,
  Send,
  Star,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { RequestBadge } from "@/components/domain/status-badge";
import { BriefSummary } from "@/components/domain/brief-summary";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarStack, FaceAvatar } from "@/components/ui/face-avatar";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { KeyValues } from "@/components/ui/progress";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { lengthLabel, money, moneyRange, plural, shortDate, timeAgoInline, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { pitchesForRequest, productById, videoById } from "@/lib/selectors";
import { absoluteUrl } from "@/lib/site";
import { actions, useDemo } from "@/lib/store";
import { addonById, formatById, languageById, platformById } from "@/lib/taxonomy";
import type { ContentRequest, Video } from "@/lib/types";

import { CompareView } from "./compare";
import { HireSheet } from "./hire-sheet";
import { BarSpacer, MobileBar, OverflowMenu, RailSection, type MenuItem } from "./parts";
import { PitchCard } from "./pitch-card";
import { MessageSheet, PitchSheet, SampleSheet } from "./pitch-sheet";
import { BriefSheet, CloseRequestSheet, DeleteDraftSheet, EditRequestSheet, InviteSheet } from "./request-sheets";
import {
  deliverableLabel,
  isInRunning,
  isUndecided,
  rankPitches,
  sortLabels,
  sortPitches,
  type PitchSort,
  type RankedPitch,
} from "./shared";

type Tab = "new" | "shortlist" | "all" | "declined";

/** What's on top of the page: one sheet at a time; closing one returns to the one under it. */
type Overlay =
  | { kind: "pitch"; id: string }
  | { kind: "hire"; id: string }
  | { kind: "sample"; pitchId: string; videoId: string }
  | { kind: "message"; creatorId: string }
  | { kind: "invite" | "edit" | "close" | "delete" | "brief" };

/**
 * The owner's view of a custom request ("Get pitches"): a shortlist board of pitch cards (New ·
 * Shortlist · All · Declined), the full pitch in a side sheet, compare the shortlist side by side,
 * and hire into a held payment. Side rail: the brief, the product and its learnings, who can pitch.
 * `?pitch=<id>` opens that pitch (Home's "Decide on Nina's pitch").
 */
export function RequestOwnerView({ request }: { request: ContentRequest }) {
  const s = useDemo();
  const toast = useToast();
  const router = useRouter();
  const search = useSearchParams();
  const urlPitch = search.get("pitch");

  const product = productById(s, request.brief.productId);
  const pitches = pitchesForRequest(s, request.id);
  const ranked = rankPitches(s, request, pitches);
  const isDraft = request.status === "draft";
  const canHire = request.status === "open";

  const [tabChoice, setTabChoice] = useState<Tab | null>(null);
  const [sort, setSort] = useState<PitchSort>("fit");
  const [comparing, setComparing] = useState(false);
  // Pitches you open, star or decline during this visit stay in "New" until you leave, so cards
  // don't jump out from under you; next visit, "New" is only what you haven't opened.
  const [kept, setKept] = useState<string[]>([]);
  const [stack, setStack] = useState<Overlay[] | null>(null);

  // A deep-linked pitch opens until the first thing you do on the page.
  const fromUrl = urlPitch && ranked.some((r) => r.pitch.id === urlPitch) ? urlPitch : null;
  const overlays: Overlay[] = stack ?? (fromUrl ? [{ kind: "pitch", id: fromUrl }] : []);
  const top = overlays[overlays.length - 1];

  // Opening a pitch marks it viewed (the creator sees "Viewed"; it stops counting as unread).
  const viewingId = top?.kind === "pitch" ? top.id : undefined;
  useEffect(() => {
    if (viewingId) actions.markPitchViewed(viewingId);
  }, [viewingId]);

  const push = (overlay: Overlay) => {
    if (overlay.kind === "pitch") keep(overlay.id);
    if (overlay.kind === "sample") keep(overlay.pitchId);
    setStack([...overlays, overlay]);
  };
  const replaceTop = (overlay: Overlay) => {
    if (overlay.kind === "pitch") keep(overlay.id);
    setStack([...overlays.slice(0, -1), overlay]);
  };
  const pop = () => {
    if (stack === null && fromUrl) {
      keep(fromUrl);
      router.replace(paths.order(request.id), { scroll: false });
    }
    setStack(overlays.slice(0, -1));
  };

  /* -------------------------------------------------------------- derived */
  const isNew = (item: RankedPitch) =>
    item.pitch.status === "sent" || kept.includes(item.pitch.id) || (item.pitch.id === fromUrl && isUndecided(item.pitch));
  const counts: Record<Tab, number> = {
    new: ranked.filter(isNew).length,
    shortlist: ranked.filter((r) => r.pitch.status === "shortlisted").length,
    all: ranked.length,
    declined: ranked.filter((r) => r.pitch.status === "declined").length,
  };
  // Start on what needs reading; once someone is hired (or hiring is closed), on everything.
  const tab: Tab = tabChoice ?? (canHire && counts.new > 0 && !ranked.some((r) => r.pitch.status === "hired") ? "new" : "all");
  const shown = sortPitches(
    ranked.filter((r) =>
      tab === "new"
        ? isNew(r)
        : tab === "shortlist"
          ? r.pitch.status === "shortlisted"
          : tab === "declined"
            ? r.pitch.status === "declined"
            : true,
    ),
    sort,
  );
  // "All": hired first, declined last.
  const ordered =
    tab === "all"
      ? [
          ...shown.filter((r) => r.pitch.status === "hired"),
          ...shown.filter((r) => r.pitch.status !== "hired" && r.pitch.status !== "declined"),
          ...shown.filter((r) => r.pitch.status === "declined"),
        ]
      : shown;

  const shortlist = sortPitches(
    ranked.filter((r) => r.pitch.status === "shortlisted"),
    sort,
  );
  const showCompare = comparing && shortlist.length >= 2;
  const hired = ranked.filter((r) => r.pitch.status === "hired");
  const waiting = ranked.filter((r) => isInRunning(r.pitch));
  const commissionFor = (pitchId: string) => s.commissions.find((c) => c.pitchId === pitchId);
  const sampleOf = (item: RankedPitch) =>
    item.pitch.sampleIds.map((id) => videoById(s, id)).find((v): v is Video => v !== undefined);
  const itemById = (id: string) => ranked.find((r) => r.pitch.id === id);

  /* -------------------------------------------------------------- actions */
  function keep(pitchId: string) {
    const item = itemById(pitchId);
    if (item && isNew(item) && !kept.includes(pitchId)) setKept((current) => [...current, pitchId]);
  }
  const nameOf = (pitchId: string) => itemById(pitchId)?.creator.firstName ?? "the creator";
  const setShortlist = (pitchId: string, on: boolean) => {
    keep(pitchId);
    actions.shortlistPitch(pitchId, on);
    toast({ message: on ? `Shortlisted ${nameOf(pitchId)}` : `Took ${nameOf(pitchId)} off your shortlist` });
  };
  const decline = (pitchId: string) => {
    keep(pitchId);
    const previous = itemById(pitchId)?.pitch.status;
    actions.declinePitch(pitchId);
    toast({
      message: `Declined ${nameOf(pitchId)}'s pitch. We let them know kindly.`,
      action: { label: "Undo", onClick: () => actions.shortlistPitch(pitchId, previous === "shortlisted") },
    });
  };
  const restore = (pitchId: string) => {
    actions.shortlistPitch(pitchId, false);
    toast({ message: `${nameOf(pitchId)}'s pitch is back in the running` });
  };
  const letOthersKnow = () => {
    const previous = waiting.map((r) => ({ id: r.pitch.id, status: r.pitch.status }));
    previous.forEach(({ id }) => actions.declinePitch(id));
    toast({
      message: `Let ${plural(previous.length, "creator")} know you went with someone else`,
      action: {
        label: "Undo",
        onClick: () => previous.forEach(({ id, status }) => actions.shortlistPitch(id, status === "shortlisted")),
      },
    });
  };
  const copyLink = async () => {
    const url = absoluteUrl(paths.order(request.id));
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: "Link copied. Creators who open it can pitch right away." });
    } catch {
      toast({ message: `Copy this link: ${url}`, tone: "info" });
    }
  };
  const reopen = () => {
    actions.reopenRequest(request.id);
    toast({ message: "Reopened. Creators can pitch again." });
  };
  const deleteDraft = () => {
    router.push(paths.orders());
    window.setTimeout(() => actions.deleteRequest(request.id), 250);
    toast({ message: "Draft deleted" });
  };
  const openPitch = (id: string) => push({ kind: "pitch", id });
  const openHire = (id: string) => push({ kind: "hire", id });

  /* --------------------------------------------------------- header bits */
  const format = formatById[request.brief.format];
  const meta = [product?.name, format.name, moneyRange(request.budget.min, request.budget.max), `Due ${weekdayDate(request.dueDate)}`]
    .filter(Boolean)
    .join(" · ");

  const menu: MenuItem[] = isDraft
    ? [
        { label: "Edit brief", icon: <Pencil size={16} aria-hidden />, href: paths.newOrder({ draft: request.id }) },
        { label: "Delete draft", icon: <Trash2 size={16} aria-hidden />, danger: true, onSelect: () => push({ kind: "delete" }) },
      ]
    : [
        ...(request.status === "open"
          ? [{ label: "Edit order", icon: <Pencil size={16} aria-hidden />, onSelect: () => push({ kind: "edit" }) }]
          : []),
        { label: "Read the full brief", icon: <FileText size={16} aria-hidden />, onSelect: () => push({ kind: "brief" }) },
        { label: "Copy link for creators", icon: <Link2 size={16} aria-hidden />, onSelect: () => void copyLink() },
        ...(request.status === "open"
          ? [{ label: "Close order", icon: <Ban size={16} aria-hidden />, onSelect: () => push({ kind: "close" }) }]
          : request.status === "closed"
            ? [{ label: "Reopen order", icon: <RotateCcw size={16} aria-hidden />, onSelect: reopen }]
            : []),
      ];

  // The board's next step (desktop header, phone bar). Banner states carry their own action.
  const boardStep =
    canHire && pitches.length > 0 && !showCompare && hired.length === 0
      ? shortlist.length >= 2
        ? { label: `Compare ${shortlist.length} shortlisted`, short: `${shortlist.length} shortlisted`, onClick: () => setComparing(true), cta: "Compare" }
        : shortlist.length === 1
          ? {
              label: `Hire ${shortlist[0].creator.firstName}`,
              short: `${shortlist[0].creator.firstName} · ${money(shortlist[0].pitch.price)}`,
              onClick: () => openHire(shortlist[0].pitch.id),
              cta: "Hire",
            }
          : null
      : null;

  const hint =
    !canHire || hired.length
      ? null
      : shortlist.length === 0
        ? "Star the pitches you like. With two or more, you can compare them side by side."
        : shortlist.length === 1
          ? "Star one more to compare them side by side."
          : `${plural(shortlist.length, "pitch", "pitches")} on your shortlist.`;

  return (
    <Page>
      <PageHeader
        back={{ href: paths.orders(), label: "Orders" }}
        title={<span className="block max-w-[28ch]">{request.title}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <RequestBadge status={request.status} />
            <span>{meta}</span>
          </span>
        }
        actions={
          <>
            {request.status === "open" && pitches.length > 0 ? (
              <PillButton variant="outline" icon={<UserPlus size={16} aria-hidden />} onClick={() => push({ kind: "invite" })}>
                Invite creators
              </PillButton>
            ) : null}
            <OverflowMenu label="More for this order" items={menu} size="md" tone="outline" />
            {boardStep ? (
              <PillButton variant="neon" className="max-lg:!hidden" onClick={boardStep.onClick}>
                {boardStep.label}
              </PillButton>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start [&>*]:min-w-0">
        <div className="flex flex-col gap-4 lg:col-span-8">
          {/* State banners */}
          {isDraft ? (
            <Block tone="paper" pad="md" className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <h2 className="y-head">This is a draft</h2>
                <p className="y-small y-fg-2">
                  Creators can&apos;t see it yet. Check the brief, then post it to start getting pitches.
                </p>
              </div>
              <PillButton href={paths.newOrder({ draft: request.id })} variant="neon" arrow className="justify-between ps-5">
                Finish and post
              </PillButton>
            </Block>
          ) : null}

          {hired.length ? (
            <Block tone="paper" pad="md" className="flex flex-col gap-4">
              {hired.map(({ pitch, creator }) => {
                const commission = commissionFor(pitch.id);
                return (
                  <div key={pitch.id} className="flex flex-wrap items-center gap-3">
                    <FaceAvatar id={creator.id} name="" size={44} />
                    <div className="min-w-0 flex-1">
                      <h2 className="y-head">You hired {creator.firstName}</h2>
                      <p className="y-small y-fg-2">
                        {money(pitch.price)} · first version{" "}
                        {commission ? `due ${weekdayDate(commission.dueDate)}` : `in ${plural(pitch.deliveryDays, "day")}`}
                      </p>
                    </div>
                    {commission ? (
                      <PillButton href={paths.job(commission.id)} variant={canHire ? "outline" : "neon"} arrow className="justify-between ps-5">
                        Open the job
                      </PillButton>
                    ) : null}
                  </div>
                );
              })}
              {waiting.length ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-(--b-line) pt-4">
                  <AvatarStack size={28} people={waiting.map((r) => ({ id: r.creator.id, name: r.creator.name }))} />
                  <p className="y-small min-w-0 flex-1">
                    {plural(waiting.length, "other creator")} {waiting.length === 1 ? "is" : "are"} still waiting to hear back.
                  </p>
                  <PillButton size="sm" variant="outline" icon={<Send size={14} aria-hidden className="y-flip" />} onClick={letOthersKnow}>
                    Let them know
                  </PillButton>
                </div>
              ) : null}
            </Block>
          ) : null}

          {request.status === "closed" ? (
            <Block tone="paper" pad="md" className="flex flex-wrap items-center gap-3">
              <Ban size={20} aria-hidden className="flex-none" />
              <p className="y-small min-w-0 flex-1">
                <span className="font-semibold">This order is closed.</span> Reopen it to hire from these pitches.
              </p>
              <PillButton variant="contrast" icon={<RotateCcw size={16} aria-hidden />} onClick={reopen}>
                Reopen order
              </PillButton>
            </Block>
          ) : null}

          {/* Main: the brief (drafts), the board, or the comparison */}
          {isDraft ? (
            <Block as="section" aria-labelledby="preview-h" tone="paper" pad="md" className="flex flex-col gap-5">
              <div>
                <h2 id="preview-h" className="y-head">
                  What creators will see
                </h2>
                <p className="y-small y-fg-2">The brief as it will be posted.</p>
              </div>
              <BriefSummary brief={request.brief} product={product} />
            </Block>
          ) : showCompare ? (
            <CompareView
              s={s}
              request={request}
              product={product}
              items={shortlist}
              canHire={canHire}
              onBack={() => setComparing(false)}
              onHire={openHire}
              onOpen={openPitch}
              onPlay={(pitchId, videoId) => push({ kind: "sample", pitchId, videoId })}
              onShortlist={setShortlist}
            />
          ) : pitches.length === 0 ? (
            <Block tone="paper" pad="md">
              <EmptyState
                title={request.status === "open" ? "No pitches yet" : "No pitches came in"}
                body={
                  request.status === "open"
                    ? "Creators who match usually pitch within a day. Invite a few who fit to hear back sooner."
                    : "Reopen the order, or invite creators directly to get pitches."
                }
                shape="ball"
                tint="sea"
                face="focus"
                action={
                  request.status === "open" ? (
                    <PillButton variant="neon" icon={<UserPlus size={16} aria-hidden />} onClick={() => push({ kind: "invite" })}>
                      Invite creators
                    </PillButton>
                  ) : undefined
                }
              />
            </Block>
          ) : (
            <section aria-label="Pitches" className="flex flex-col gap-3">
              <Tabs
                label="Pitches"
                value={tab}
                onSelect={(id) => setTabChoice(id)}
                items={[
                  { id: "new", label: "New", count: counts.new },
                  { id: "shortlist", label: "Shortlist", count: counts.shortlist },
                  { id: "all", label: "All", count: counts.all },
                  { id: "declined", label: "Declined", count: counts.declined },
                ]}
              />
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <p className="y-small y-fg-2 flex min-w-0 items-center gap-1.5">
                  {hint ? (
                    <>
                      <Star size={14} aria-hidden className="flex-none" /> {hint}
                    </>
                  ) : null}
                </p>
                <label className="y-small flex flex-none items-center gap-2">
                  <span className="y-fg-2">Sort</span>
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as PitchSort)}
                    className="y-input !min-h-9 !w-auto !rounded-full !py-0 !ps-3 !pe-8 text-[13px] font-medium"
                  >
                    {(Object.keys(sortLabels) as PitchSort[]).map((key) => (
                      <option key={key} value={key}>
                        {sortLabels[key]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="sr-only" aria-live="polite">
                {plural(ordered.length, "pitch", "pitches")} shown
              </p>
              {ordered.length ? (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {ordered.map((item) => (
                    <PitchCard
                      key={item.pitch.id}
                      item={item}
                      request={request}
                      product={product}
                      sample={sampleOf(item)}
                      isNew={item.pitch.status === "sent"}
                      canHire={canHire}
                      commissionId={commissionFor(item.pitch.id)?.id}
                      onOpen={() => openPitch(item.pitch.id)}
                      onPlay={(videoId) => push({ kind: "sample", pitchId: item.pitch.id, videoId })}
                      onShortlist={(on) => setShortlist(item.pitch.id, on)}
                      onDecline={() => decline(item.pitch.id)}
                      onRestore={() => restore(item.pitch.id)}
                      onHire={() => openHire(item.pitch.id)}
                    />
                  ))}
                </div>
              ) : (
                <Block tone="paper" pad="md">
                  <EmptyState
                    headingLevel={3}
                    title={tab === "shortlist" ? "No shortlist yet" : tab === "new" ? "You're all caught up" : "Nothing declined"}
                    body={
                      tab === "shortlist"
                        ? "Star a pitch you like. Two or more can be compared side by side."
                        : tab === "new"
                          ? "You've read every pitch. New ones show up here the moment they arrive."
                          : "Pitches you decline move here, and you can reconsider them any time."
                    }
                    shape="gem"
                    tint="sun"
                    face="smile"
                    action={
                      <PillButton variant="outline" onClick={() => setTabChoice("all")}>
                        See all pitches
                      </PillButton>
                    }
                  />
                </Block>
              )}
            </section>
          )}
        </div>

        <aside aria-label="About this order" className="y-rail flex flex-col gap-2 lg:col-span-4">
          {!isDraft ? <BriefCard request={request} onOpen={() => push({ kind: "brief" })} /> : null}
          <ProductCard request={request} />
          <ReachCard request={request} onInvite={() => push({ kind: "invite" })} />
        </aside>
      </div>

      {boardStep ? (
        <>
          <BarSpacer />
          <MobileBar label="Next step">
            <p className="y-small min-w-0 flex-1 truncate font-medium">{boardStep.short}</p>
            <PillButton variant="neon" onClick={boardStep.onClick}>
              {boardStep.cta}
            </PillButton>
          </MobileBar>
        </>
      ) : null}

      {/* Sheets: one at a time, mounted only while open */}
      {top?.kind === "pitch" && itemById(top.id) ? (
        <PitchSheet
          key={top.id}
          request={request}
          item={itemById(top.id)!}
          canHire={canHire}
          commissionId={commissionFor(top.id)?.id}
          onClose={pop}
          onHire={() => replaceTop({ kind: "hire", id: top.id })}
          onMessage={() => push({ kind: "message", creatorId: itemById(top.id)!.creator.id })}
          onDecline={() => {
            pop();
            decline(top.id);
          }}
          onRestore={() => restore(top.id)}
          onShortlist={(on) => setShortlist(top.id, on)}
        />
      ) : null}
      {top?.kind === "hire" && itemById(top.id) ? (
        <HireSheet key={top.id} item={itemById(top.id)!} request={request} onClose={pop} />
      ) : null}
      {top?.kind === "sample" && itemById(top.pitchId) ? (
        <SampleSheet
          key={`${top.pitchId}-${top.videoId}`}
          item={itemById(top.pitchId)!}
          startId={top.videoId}
          onClose={pop}
          onReadPitch={() => replaceTop({ kind: "pitch", id: top.pitchId })}
        />
      ) : null}
      {top?.kind === "message" && s.creators.some((c) => c.id === top.creatorId) ? (
        <MessageSheet creator={s.creators.find((c) => c.id === top.creatorId)!} request={request} onClose={pop} />
      ) : null}
      {top?.kind === "invite" ? <InviteSheet request={request} onClose={pop} /> : null}
      {top?.kind === "edit" ? <EditRequestSheet request={request} onClose={pop} /> : null}
      {top?.kind === "close" ? <CloseRequestSheet request={request} pitchCount={pitches.length} onClose={pop} /> : null}
      {top?.kind === "delete" ? <DeleteDraftSheet onDelete={deleteDraft} onClose={pop} /> : null}
      {top?.kind === "brief" ? <BriefSheet request={request} product={product} onClose={pop} /> : null}
    </Page>
  );
}

/* -------------------------------------------------------------------------- */
/* Side rail                                                                   */
/* -------------------------------------------------------------------------- */

function BriefCard({ request, onOpen }: { request: ContentRequest; onOpen: () => void }) {
  const b = request.brief;
  const facts = [
    deliverableLabel(b.format, b.videoCount),
    `up to ${lengthLabel(b.durationSec)}`,
    b.languages.map((id) => languageById[id].name).join(", "),
    b.platforms.map((id) => platformById[id].short).join(", "),
  ].join(" · ");
  return (
    <Block as="section" aria-labelledby="brief-h" tone="paper" pad="md" className="flex flex-col gap-3">
      <h2 id="brief-h" className="y-head">
        The brief
      </h2>
      <p className="y-small font-medium">{b.keyMessage}</p>
      <p className="y-micro y-fg-2">{facts}</p>
      {b.mustInclude.length ? (
        <p className="y-micro y-fg-2">
          {plural(b.mustInclude.length, "must-include")}
          {b.avoid.length ? ` · ${plural(b.avoid.length, "thing", "things")} to avoid` : ""}
        </p>
      ) : null}
      <PillButton variant="outline" size="sm" className="w-fit" icon={<FileText size={14} aria-hidden />} onClick={onOpen}>
        Show full brief
      </PillButton>
    </Block>
  );
}

function ProductCard({ request }: { request: ContentRequest }) {
  const s = useDemo();
  const product = productById(s, request.brief.productId);
  if (!product) return null;
  const learnings = product.learnings;
  return (
    <Block as="section" aria-labelledby="product-h" tone="paper" pad="md" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="y-display grid size-10 flex-none place-items-center rounded-(--y-r-field) text-base font-semibold text-white"
          style={{ background: product.brandColor }}
        >
          {product.name.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="product-h" className="y-head">
            <Link href={paths.product(product.id)} className="hover:underline">
              {product.name}
            </Link>
          </h2>
          <p className="y-micro y-fg-2">{product.oneLiner}</p>
        </div>
      </div>
      <RailSection title={learnings.length ? `Learnings carried forward · ${learnings.length}` : "Learnings carried forward"}>
        {learnings.length ? (
          <ul className="flex flex-col gap-2.5">
            {learnings.slice(0, 3).map((l) => {
              const creator = s.creators.find((c) => c.id === l.creatorId);
              const inBrief = request.brief.mustInclude.includes(l.text) || request.brief.avoid.includes(l.text);
              return (
                <li key={l.id} className="flex gap-2">
                  <History size={14} aria-hidden className="mt-0.5 flex-none" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="y-small">{l.text}</span>
                    <span className="y-micro y-fg-2">
                      {creator ? `From ${creator.firstName}'s job` : "From a past job"} · {shortDate(l.createdAt)}
                      {inBrief ? " · in this brief" : ""}
                    </span>
                  </span>
                </li>
              );
            })}
            {learnings.length > 3 ? (
              <li>
                <Link href={paths.product(product.id)} className="y-micro y-fg-2 font-medium underline underline-offset-4">
                  See all {learnings.length} on {product.name}
                </Link>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="y-small y-fg-2">
            What you learn on each finished job for {product.name} is saved here and offered in every new brief.
          </p>
        )}
      </RailSection>
      {product.assets.length ? (
        <p className="y-micro y-fg-2 border-t border-(--b-line) pt-3">
          {plural(product.assets.length, "file")} ({product.assets.map((a) => a.name).slice(0, 2).join(", ")}
          {product.assets.length > 2 ? "…" : ""}) shared with the creator you hire.
        </p>
      ) : null}
    </Block>
  );
}

function ReachCard({ request, onInvite }: { request: ContentRequest; onInvite: () => void }) {
  const s = useDemo();
  const pitches = pitchesForRequest(s, request.id);
  const invited = request.invitedCreatorIds
    .map((id) => s.creators.find((c) => c.id === id))
    .filter((c) => c !== undefined);
  const rows = [
    { label: "Who can pitch", value: request.visibility === "invite" ? "Invite only" : "Everyone who fits" },
    { label: "Hiring", value: plural(request.slots, "creator") },
    ...(request.status !== "draft"
      ? [
          { label: "Posted", value: timeAgoInline(request.postedAt) === "just now" ? "Just now" : capitalize(timeAgoInline(request.postedAt)) },
          { label: "Views", value: request.views.toLocaleString("en-US") },
        ]
      : []),
  ];
  const extras = request.brief.addons.map((id) => addonById[id].name);
  return (
    <Block as="section" aria-labelledby="reach-h" tone="paper" pad="md" className="flex flex-col gap-4">
      <h2 id="reach-h" className="y-head">
        Who&apos;s pitching
      </h2>
      <KeyValues rows={rows} />
      {extras.length ? (
        <p className="y-micro y-fg-2">
          Extras asked for: <span className="text-(--b-fg)">{extras.join(", ")}</span>
        </p>
      ) : null}
      <RailSection
        title={invited.length ? `Invited · ${invited.length}` : "Invited"}
        action={
          request.status === "open" ? (
            <PillButton variant="ghost" size="sm" className="-me-3" icon={<UserPlus size={14} aria-hidden />} onClick={onInvite}>
              Invite
            </PillButton>
          ) : undefined
        }
      >
        {invited.length ? (
          <ul className="flex flex-col gap-2">
            {invited.map((creator) => {
              const pitch = pitches.find((p) => p.creatorId === creator.id);
              return (
                <li key={creator.id} className="flex items-center gap-2.5">
                  <FaceAvatar id={creator.id} name="" size={28} />
                  <span className="y-small min-w-0 flex-1 truncate font-medium">{creator.name}</span>
                  <span className="y-micro y-fg-2 flex-none">{pitch ? `Pitched ${money(pitch.price)}` : "Not yet"}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="y-small y-fg-2">
            {request.visibility === "invite"
              ? "Invite only, so nobody can pitch until you invite someone."
              : "Nobody yet. Everyone who fits can already pitch; invite favourites so they see it first."}
          </p>
        )}
      </RailSection>
    </Block>
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
