"use client";

import {
  Ban,
  Eye,
  FileText,
  History,
  Link2,
  MoreHorizontal,
  Package,
  Pencil,
  RotateCcw,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CampaignOrderView } from "@/components/campaigns";
import { BriefSummary } from "@/components/domain/brief-summary";
import { CreatorRow } from "@/components/domain/creator-card";
import { PitchBadge } from "@/components/domain/status-badge";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarStack, FaceAvatar } from "@/components/ui/face-avatar";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { money, moneyRange, plural, shortDate, timeAgo, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { isCampaign, pitchesForRequest, productById } from "@/lib/selectors";
import { absoluteUrl } from "@/lib/site";
import { actions, useDemo } from "@/lib/store";
import { addonById } from "@/lib/taxonomy";
import type { ContentRequest } from "@/lib/types";

import { HireSheet } from "./hire-sheet";
import { PitchRow, PitchSheet } from "./pitch-card";
import { PitchCompare } from "./pitch-compare";
import { CloseRequestSheet, EditRequestSheet, InviteSheet, MessageSheet, SampleSheet } from "./request-sheets";
import { briefComplete, isUndecided, rankPitches, sortPitches, type PitchSort, type RankedPitch } from "./shared";

/** Skeleton for the order page while the saved demo state loads. */
export function OrderSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading order">
      <div className="flex flex-col gap-3 px-1 pt-2 pb-5">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-12 w-4/5 max-w-2xl" />
        <Skeleton className="h-5 w-72" />
      </div>
      <Skeleton className="h-11 w-72" />
      <div className="y-block flex flex-col gap-2 p-3" data-tone="paper">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="size-11 flex-none !rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type RequestTab = "pitches" | "brief" | "invited";
type Tab = RequestTab;
type Filter = "all" | "new" | "shortlisted" | "declined";

/**
 * The owner's view of a custom request: pitches (list or compare), the brief, invited creators,
 * and hiring. Rendered by the order page when the signed-in account placed the request.
 * - `initialTab`: the section to open on (`?tab=`); "invited" also opens the invite sheet.
 * - `openPitchId`: a pitch to open straight away (`?pitch=`, e.g. from a notification).
 */
export function RequestView(props: { request: ContentRequest; initialTab?: RequestTab; openPitchId?: string }) {
  // Campaigns take slots, not pitches: they have their own page body.
  if (isCampaign(props.request)) {
    return (
      <Page>
        <CampaignOrderView request={props.request} />
      </Page>
    );
  }
  return <OwnerRequestView {...props} />;
}

function OwnerRequestView({
  request,
  initialTab,
  openPitchId,
}: {
  request: ContentRequest;
  initialTab?: RequestTab;
  openPitchId?: string;
}) {
  const openInvite = initialTab === "invited";
  const s = useDemo();
  const toast = useToast();
  const router = useRouter();
  const product = productById(s, request.brief.productId);
  const pitches = pitchesForRequest(s, request.id);
  const ranked = rankPitches(s, request, pitches);
  const isDraft = request.status === "draft";

  // Pitches that were unseen when the business opened the page keep their "New" badge.
  const [newIds] = useState(() => new Set(pitches.filter((p) => p.status === "sent").map((p) => p.id)));
  const [tab, setTab] = useState<Tab>(isDraft ? "brief" : (initialTab ?? "pitches"));
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<PitchSort>("fit");
  const [view, setView] = useState<"list" | "compare">("list");
  const [openId, setOpenId] = useState<string | null>(() =>
    openPitchId && pitches.some((p) => p.id === openPitchId) ? openPitchId : null,
  );
  const [hireId, setHireId] = useState<string | null>(null);
  const [messageCreatorId, setMessageCreatorId] = useState<string | null>(null);
  const [sample, setSample] = useState<{ pitchId: string; videoId: string } | null>(null);
  const [sheet, setSheet] = useState<null | "more" | "invite" | "edit" | "close">(
    openInvite && request.status === "open" ? "invite" : null,
  );

  // Opening the request marks unseen pitches as viewed (creators see "Viewed").
  const sentKey = pitches
    .filter((p) => p.status === "sent")
    .map((p) => p.id)
    .join(",");
  useEffect(() => {
    if (!sentKey || request.status === "draft") return;
    sentKey.split(",").forEach((id) => actions.markPitchViewed(id));
  }, [sentKey, request.status]);

  const canHire = request.status === "open";
  const counts: Record<Filter, number> = {
    all: ranked.length,
    new: ranked.filter((r) => newIds.has(r.pitch.id) && isUndecided(r.pitch)).length,
    shortlisted: ranked.filter((r) => r.pitch.status === "shortlisted").length,
    declined: ranked.filter((r) => r.pitch.status === "declined").length,
  };
  // "New" = unseen when the business opened the page and still waiting for a decision.
  const matches = ({ pitch }: RankedPitch) =>
    filter === "all" ||
    (filter === "new" && newIds.has(pitch.id) && isUndecided(pitch)) ||
    filter === pitch.status;
  const sorted = sortPitches(ranked.filter(matches), sort);
  const active = [
    ...sorted.filter((r) => r.pitch.status === "hired"),
    ...sorted.filter((r) => r.pitch.status !== "hired" && r.pitch.status !== "declined"),
  ];
  const declined = sorted.filter((r) => r.pitch.status === "declined");

  const shortlist = sortPitches(
    ranked.filter((r) => r.pitch.status === "shortlisted" || r.pitch.status === "hired"),
    sort,
  );
  const compareBasis: "shortlist" | "fit" = shortlist.length >= 2 ? "shortlist" : "fit";
  const compareItems =
    compareBasis === "shortlist"
      ? shortlist.slice(0, 4)
      : sortPitches(
          ranked.filter((r) => r.pitch.status !== "declined"),
          "fit",
        ).slice(0, 3);

  // The list itself carries no neon: Hire turns neon inside an opened pitch. The compare table is
  // a decision view, so its top shortlisted pitch gets the one neon Hire.
  const neonId =
    canHire && tab === "pitches" && view === "compare"
      ? compareItems.find((r) => r.pitch.status === "shortlisted")?.pitch.id
      : undefined;

  const hired = ranked.filter((r) => r.pitch.status === "hired");
  const waiting = ranked.filter(
    (r) => r.pitch.status === "sent" || r.pitch.status === "viewed" || r.pitch.status === "shortlisted",
  );
  const invited = request.invitedCreatorIds
    .map((id) => s.creators.find((c) => c.id === id))
    .filter((c) => c !== undefined);
  // Filters with nothing in them stay out of the way (unless selected).
  const filters = (
    [
      ["all", "All"],
      ["new", "New"],
      ["shortlisted", "Shortlisted"],
      ["declined", "Declined"],
    ] as [Filter, string][]
  ).filter(([id]) => id === "all" || id === filter || counts[id] > 0);

  /* ------------------------------------------------------------ actions */
  const nameOf = (pitchId: string) => ranked.find((r) => r.pitch.id === pitchId)?.creator.firstName ?? "Creator";

  const shortlist_ = (pitchId: string, on: boolean) => {
    actions.shortlistPitch(pitchId, on);
    toast({ message: on ? `Shortlisted ${nameOf(pitchId)}` : `Removed ${nameOf(pitchId)} from your shortlist` });
  };
  const decline = (pitchId: string) => {
    const previous = ranked.find((r) => r.pitch.id === pitchId)?.pitch.status;
    actions.declinePitch(pitchId);
    toast({
      message: `Declined ${nameOf(pitchId)}'s pitch`,
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
  const publish = () => {
    const invites = request.invitedCreatorIds;
    actions.updateRequest(request.id, { invitedCreatorIds: [] });
    actions.publishDraft(request.id);
    invites.forEach((id) => actions.inviteToRequest(request.id, id));
    setTab("pitches");
    toast({ message: "Your request is live. Most requests get their first pitch within 3 hours." });
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
  const closeSheet = () => {
    if (sheet === "invite" && openInvite) router.replace(paths.order(request.id), { scroll: false });
    setSheet(null);
  };

  const hireItem = hireId ? ranked.find((r) => r.pitch.id === hireId) : undefined;
  const messageCreator = messageCreatorId ? s.creators.find((c) => c.id === messageCreatorId) : undefined;
  const sampleItem = sample ? ranked.find((r) => r.pitch.id === sample.pitchId) : undefined;
  // The open pitch steps aside while a sample, message or hire sheet is on top, then comes back.
  const openItem = openId ? ranked.find((r) => r.pitch.id === openId) : undefined;
  const showPitch = openItem && !hireItem && !messageCreator && !sample;

  const meta = [
    product?.name,
    moneyRange(request.budget.min, request.budget.max),
    `Due ${weekdayDate(request.dueDate)}`,
    isDraft ? "Not posted yet" : plural(request.views, "view"),
  ]
    .filter(Boolean)
    .join(" · ");

  const moreItems: { label: string; icon: React.ReactNode; onClick: () => void }[] = isDraft
    ? []
    : [
        ...(request.status !== "hired"
          ? [{ label: "Edit request", icon: <Pencil size={18} aria-hidden />, onClick: () => setSheet("edit") }]
          : []),
        {
          label: "Copy link for creators",
          icon: <Link2 size={18} aria-hidden />,
          onClick: () => {
            setSheet(null);
            void copyLink();
          },
        },
        ...(request.status === "open"
          ? [{ label: "Close request", icon: <Ban size={18} aria-hidden />, onClick: () => setSheet("close") }]
          : []),
      ];

  return (
    <Page>
      <div className="flex flex-col gap-2">
        <PageHeader
          back={{ href: paths.orders(), label: "All orders" }}
          title={<span className="block max-w-[24ch]">{request.title}</span>}
          description={meta}
          className="!pb-3"
          actions={
            isDraft ? null : (
              <>
                {request.status === "open" ? (
                  <PillButton variant="contrast" icon={<UserPlus size={18} aria-hidden />} onClick={() => setSheet("invite")}>
                    Invite creators
                  </PillButton>
                ) : null}
                <PillButton
                  variant="outline"
                  icon={<MoreHorizontal size={18} aria-hidden />}
                  onClick={() => setSheet("more")}
                  aria-haspopup="dialog"
                >
                  More
                </PillButton>
              </>
            )
          }
        />

        {/* State banners */}
        {isDraft ? (
          <Block tone="night" pad="md" className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <h2 className="y-head">This request is a draft</h2>
              <p className="y-small y-fg-2">
                {briefComplete(request)
                  ? "Creators can't see it yet. Publish when you're happy with the brief."
                  : "A few parts of the brief are missing. Finish them in the wizard, then publish."}
              </p>
            </div>
            {briefComplete(request) ? (
              <PillButton variant="neon" arrow size="lg" className="justify-between ps-6" onClick={publish}>
                Publish request
              </PillButton>
            ) : (
              <PillButton href={paths.newOrder({ draft: request.id })} variant="neon" arrow size="lg" className="justify-between ps-6">
                Finish and publish
              </PillButton>
            )}
          </Block>
        ) : null}

        {request.status === "hired" && hired.length ? (
          <Block tone="mist" pad="md" className="flex flex-col gap-4">
            {hired.map(({ pitch, creator }) => {
              const commission = s.commissions.find((c) => c.pitchId === pitch.id);
              return (
                <div key={pitch.id} className="flex flex-wrap items-center gap-3">
                  <FaceAvatar id={creator.id} name="" size={48} />
                  <div className="min-w-0 flex-1">
                    <h2 className="y-head">You hired {creator.firstName}</h2>
                    <p className="y-small y-fg-2">
                      {money(pitch.price)} · first version {commission ? `due ${weekdayDate(commission.dueDate)}` : `in ${pitch.deliveryDays} days`}
                    </p>
                  </div>
                  {commission ? (
                    <PillButton href={paths.commission(commission.id)} variant="contrast" arrow>
                      Open commission
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
          <Block tone="mist" pad="md" className="flex flex-wrap items-center gap-3">
            <Ban size={20} aria-hidden />
            <p className="y-small min-w-0 flex-1">
              <span className="font-semibold">This request is closed.</span> Reopen it to hire from these pitches.
            </p>
            <PillButton
              variant="contrast"
              icon={<RotateCcw size={16} aria-hidden />}
              onClick={() => {
                actions.reopenRequest(request.id);
                toast({ message: "Reopened. Creators can pitch again." });
              }}
            >
              Reopen request
            </PillButton>
          </Block>
        ) : null}

        {/* Sections */}
        <div className="pt-6 pb-1">
          <SegmentedToggle
            label="Request sections"
            size="md"
            className="bg-(--y-paper)"
            value={tab}
            onChange={setTab}
            options={[
              { value: "pitches", label: `Pitches · ${pitches.length}` },
              { value: "brief", label: "Brief" },
              { value: "invited", label: `Invited · ${invited.length}` },
            ]}
          />
        </div>

        {tab === "pitches" ? (
          isDraft ? (
            <Block tone="paper" pad="md">
              <EmptyState
                title="No pitches yet"
                body="Publish your request and creators who fit will start pitching with an angle, a price and samples."
                shape="pill"
                tint="mint"
                face="calm"
              />
            </Block>
          ) : pitches.length === 0 ? (
            <Block tone="paper" pad="md">
              <EmptyState
                title={request.status === "open" ? "Waiting for the first pitch" : "No pitches came in"}
                body={
                  request.status === "open"
                    ? "Most requests get their first pitch within 3 hours. Invite a few creators who fit to hear back sooner."
                    : "Reopen the request or invite creators directly to get pitches."
                }
                shape="ball"
                tint="sea"
                face="focus"
                action={
                  request.status === "open" ? (
                    <PillButton variant="contrast" icon={<UserPlus size={18} aria-hidden />} onClick={() => setSheet("invite")}>
                      Invite creators
                    </PillButton>
                  ) : undefined
                }
              />
            </Block>
          ) : (
            <>
              <div className="flex flex-col gap-2 pb-1 md:flex-row md:items-center">
                <div
                  role="group"
                  aria-label="Filter pitches"
                  className="y-scroll-x -mx-(--y-gutter) flex gap-2 px-(--y-gutter) md:mx-0 md:px-0"
                >
                  {filters.map(([id, label]) => (
                    <FilterChip key={id} pressed={filter === id} count={counts[id]} onClick={() => setFilter(id)}>
                      {label}
                    </FilterChip>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 md:ms-auto">
                  <label className="flex items-center">
                    <span className="sr-only">Sort pitches</span>
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value as PitchSort)}
                      className="y-input !min-h-11 !w-auto !bg-transparent text-sm font-semibold"
                    >
                      <option value="fit">Best fit first</option>
                      <option value="price">Lowest price first</option>
                      <option value="fastest">Fastest first</option>
                      <option value="newest">Newest first</option>
                    </select>
                  </label>
                  <SegmentedToggle
                    label="View"
                    size="md"
                    value={view}
                    onChange={setView}
                    options={[
                      { value: "list", label: "List" },
                      { value: "compare", label: "Compare" },
                    ]}
                  />
                </div>
              </div>

              {view === "compare" ? (
                compareItems.length ? (
                  <PitchCompare
                    s={s}
                    request={request}
                    items={compareItems}
                    basis={compareBasis}
                    neonId={neonId}
                    canHire={canHire}
                    onHire={setHireId}
                    onSample={(pitchId, videoId) => setSample({ pitchId, videoId })}
                    onShortlist={shortlist_}
                  />
                ) : (
                  <Block tone="paper" pad="md">
                    <EmptyState
                      title="Nothing to compare"
                      body="Every pitch is declined. Reconsider one from the Declined filter to compare it."
                      shape="gem"
                      tint="sun"
                    />
                  </Block>
                )
              ) : active.length || declined.length ? (
                <Block tone="paper" pad="none" className="flex flex-col p-2 md:p-3">
                  <p className="sr-only" aria-live="polite">
                    {plural(active.length + declined.length, "pitch", "pitches")} shown
                  </p>
                  {active.length ? (
                    <ul className="flex flex-col">
                      {active.map((item) => (
                      <PitchRow
                        key={item.pitch.id}
                        request={request}
                        item={item}
                        isNew={newIds.has(item.pitch.id)}
                        onOpen={() => setOpenId(item.pitch.id)}
                        onShortlist={(on) => shortlist_(item.pitch.id, on)}
                        onRestore={() => restore(item.pitch.id)}
                      />
                    ))}
                    </ul>
                  ) : null}
                  {declined.length ? (
                    <>
                      {filter === "all" && active.length ? (
                        <h2 className="y-micro y-fg-2 mt-2 border-t border-(--b-line) px-3 pt-4 pb-1 md:px-4">Not selected</h2>
                      ) : null}
                      <ul className="flex flex-col">
                        {declined.map((item) => (
                      <PitchRow
                        key={item.pitch.id}
                        request={request}
                        item={item}
                        isNew={false}
                        onOpen={() => setOpenId(item.pitch.id)}
                        onShortlist={(on) => shortlist_(item.pitch.id, on)}
                        onRestore={() => restore(item.pitch.id)}
                      />
                    ))}
                      </ul>
                    </>
                  ) : null}
                </Block>
              ) : (
                <Block tone="paper" pad="md">
                  <EmptyState
                    title={
                      filter === "shortlisted"
                        ? "No shortlist yet"
                        : filter === "new"
                          ? "You're all caught up"
                          : "Nothing declined"
                    }
                    body={
                      filter === "shortlisted"
                        ? "Tap the star on a pitch you like. Shortlisted creators can be compared side by side."
                        : filter === "new"
                          ? "You've seen every pitch. New ones will show up here the moment they arrive."
                          : "Pitches you decline move here, and you can reconsider them any time."
                    }
                    shape="gem"
                    tint="sun"
                    face="smile"
                    headingLevel={3}
                    action={
                      <PillButton variant="contrast" onClick={() => setFilter("all")}>
                        See all pitches
                      </PillButton>
                    }
                  />
                </Block>
              )}
            </>
          )
        ) : null}

        {tab === "brief" ? (
          <div className="grid gap-2 lg:grid-cols-12">
            <Block as="section" aria-labelledby="brief-h" tone="paper" pad="md" className="flex flex-col gap-5 lg:col-span-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="brief-h" className="y-display y-title">
                  The brief
                </h2>
                {isDraft ? (
                  <PillButton href={paths.newOrder({ draft: request.id })} size="sm" variant="outline" icon={<Pencil size={14} aria-hidden />}>
                    Edit brief
                  </PillButton>
                ) : null}
              </div>
              <BriefSummary brief={request.brief} product={product} />
              {!isDraft ? (
                <p className="y-micro y-fg-3">
                  Creators pitched on this brief, so it stays as is. Agree any changes in a message before you hire.
                </p>
              ) : null}
            </Block>
            <div className="flex flex-col gap-2 lg:col-span-4">
              {product ? (
                <Block as="section" aria-labelledby="product-h" tone="paper" pad="md" className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id="product-h" className="y-head">
                      Product context
                    </h2>
                    <PillButton href={paths.product(product.id)} size="sm" variant="ghost">
                      Open
                    </PillButton>
                  </div>
                  <p className="y-small y-fg-2">{product.description}</p>
                  {product.tone.length ? <p className="y-small y-fg-2">Tone: {product.tone.join(", ")}</p> : null}
                  {product.assets.length ? (
                    <ul className="flex flex-col gap-1.5">
                      {product.assets.map((asset) => (
                        <li key={asset.id} className="y-small flex items-center gap-2">
                          {asset.kind === "demo-account" ? (
                            <Users size={15} aria-hidden className="flex-none" />
                          ) : asset.kind === "brand-guide" ? (
                            <FileText size={15} aria-hidden className="flex-none" />
                          ) : (
                            <Package size={15} aria-hidden className="flex-none" />
                          )}
                          <span className="min-w-0 truncate">{asset.name}</span>
                          <span className="y-micro y-fg-3 ms-auto flex-none">{asset.size}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="y-micro y-fg-3">Shared with the creator you hire, the moment work starts.</p>

                  <h3 className="y-small mt-3 flex items-center gap-2 border-t border-(--b-line) pt-5 font-semibold">
                    <History size={16} aria-hidden /> Carried forward
                  </h3>
                  {product.learnings.length ? (
                    <ul className="flex flex-col gap-3">
                      {product.learnings.map((l) => {
                        const creator = s.creators.find((c) => c.id === l.creatorId);
                        const inBrief = request.brief.mustInclude.includes(l.text) || request.brief.avoid.includes(l.text);
                        return (
                          <li key={l.id} className="flex flex-col gap-0.5">
                            <p className="y-small">{l.text}</p>
                            <p className="y-micro y-fg-2">
                              {creator ? `From ${creator.firstName}'s commission` : "From a past commission"} · {shortDate(l.createdAt)}
                              {inBrief ? " · in this brief" : ""}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="y-small y-fg-2">
                      When you finish a commission for {product.name}, what you learned is saved here and offered in every
                      new brief.
                    </p>
                  )}
                </Block>
              ) : null}
              <p className="y-micro y-fg-3 px-2">
                Hiring {plural(request.slots, "creator")}, {request.visibility === "invite" ? "invite only" : "open to everyone who fits"}.
                {request.brief.addons.length
                  ? ` Extras requested: ${request.brief.addons.map((id) => addonById[id].name).join(", ")}.`
                  : ""}
              </p>
            </div>
          </div>
        ) : null}

        {tab === "invited" ? (
          <Block as="section" aria-labelledby="invited-h" tone="paper" pad="md" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="invited-h" className="y-display y-title">
                  Invited creators
                </h2>
                <p className="y-small y-fg-2">
                  {request.visibility === "invite"
                    ? "Only these creators can see and pitch on this request."
                    : "They got a personal invite. Everyone else who fits can still pitch."}
                </p>
              </div>
              {request.status === "open" ? (
                <PillButton variant="contrast" size="sm" icon={<UserPlus size={16} aria-hidden />} onClick={() => setSheet("invite")}>
                  Invite more
                </PillButton>
              ) : null}
            </div>
            {invited.length ? (
              <ul className="flex flex-col divide-y divide-(--b-line)">
                {invited.map((creator) => {
                  const pitch = pitches.find((p) => p.creatorId === creator.id);
                  return (
                    <li key={creator.id} className="py-3 first:pt-0 last:pb-0">
                      <CreatorRow
                        creator={creator}
                        meta={
                          pitch
                            ? `Pitched ${money(pitch.price)} · ${timeAgo(pitch.sentAt)}`
                            : `Hasn't pitched yet · ${plural(Math.round(creator.responseHours), "hour")} typical reply`
                        }
                        action={
                          <span className="flex items-center gap-2">
                            {pitch ? (
                              <PitchBadge status={pitch.status} />
                            ) : (
                              <span className="y-badge hidden sm:inline-flex" data-tone-badge="neutral">
                                <Eye size={14} aria-hidden /> Invited
                              </span>
                            )}
                            <PillButton size="sm" variant="outline" onClick={() => setMessageCreatorId(creator.id)}>
                              Message
                            </PillButton>
                          </span>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title="You haven't invited anyone"
                body={
                  request.visibility === "invite"
                    ? "This request is invite only, so nobody can pitch until you invite someone."
                    : "Everyone who fits can already pitch. Invite a few favourites so they see it first."
                }
                shape="bean"
                tint="blush"
                face="smile"
                headingLevel={3}
                action={
                  request.status === "open" ? (
                    <PillButton variant="contrast" icon={<UserPlus size={18} aria-hidden />} onClick={() => setSheet("invite")}>
                      Invite creators
                    </PillButton>
                  ) : undefined
                }
              />
            )}
          </Block>
        ) : null}
      </div>

      {/* Sheets (mounted only while open, so each visit starts fresh) */}
      {sheet === "more" ? (
        <Sheet open onClose={closeSheet} title="More" description={request.title} side="center" width="sm">
          <ul className="-mx-2 flex flex-col">
            {moreItems.map((item) => (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={item.onClick}
                  className="y-body flex min-h-12 w-full items-center gap-3 rounded-(--y-r-sm) px-2 text-start font-semibold transition-colors hover:bg-(--b-chip)"
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      ) : null}
      {sheet === "invite" ? <InviteSheet request={request} onClose={closeSheet} /> : null}
      {sheet === "edit" ? <EditRequestSheet request={request} onClose={closeSheet} /> : null}
      {sheet === "close" ? <CloseRequestSheet request={request} pitchCount={pitches.length} onClose={closeSheet} /> : null}
      {showPitch ? (
        <PitchSheet
          key={openItem.pitch.id}
          s={s}
          request={request}
          item={openItem}
          canHire={canHire}
          commissionId={s.commissions.find((c) => c.pitchId === openItem.pitch.id)?.id}
          onClose={() => setOpenId(null)}
          onHire={() => {
            setOpenId(null);
            setHireId(openItem.pitch.id);
          }}
          onMessage={() => setMessageCreatorId(openItem.creator.id)}
          onSample={(videoId) => setSample({ pitchId: openItem.pitch.id, videoId })}
          onDecline={() => {
            setOpenId(null);
            decline(openItem.pitch.id);
          }}
          onRestore={() => restore(openItem.pitch.id)}
          onShortlist={(on) => shortlist_(openItem.pitch.id, on)}
        />
      ) : null}
      {hireItem ? <HireSheet key={hireItem.pitch.id} item={hireItem} request={request} onClose={() => setHireId(null)} /> : null}
      {messageCreator ? (
        <MessageSheet key={messageCreator.id} creator={messageCreator} request={request} onClose={() => setMessageCreatorId(null)} />
      ) : null}
      {sample && sampleItem ? (
        <SampleSheet
          key={`${sample.pitchId}-${sample.videoId}`}
          videoIds={sampleItem.pitch.sampleIds}
          startId={sample.videoId}
          creator={sampleItem.creator}
          onClose={() => setSample(null)}
        />
      ) : null}
    </Page>
  );
}
