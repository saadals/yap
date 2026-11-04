"use client";

import {
  ArrowLeft,
  Ban,
  Eye,
  FileText,
  Globe,
  History,
  Link2,
  Lock,
  Package,
  Pencil,
  RotateCcw,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { BriefSummary } from "@/components/domain/brief-summary";
import { CreatorRow } from "@/components/domain/creator-card";
import { PitchBadge, RequestBadge } from "@/components/domain/status-badge";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { AvatarStack, FaceAvatar } from "@/components/ui/face-avatar";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { JobCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { daysFromNow, money, moneyRange, num, plural, relativeDay, shortDate, timeAgo, weekdayDate } from "@/lib/format";
import { pitchesForRequest, productById, requestById } from "@/lib/selectors";
import { ME, actions, useDemo, useHydrated } from "@/lib/store";
import { addonById, formatById } from "@/lib/taxonomy";
import type { ContentRequest } from "@/lib/types";

import { HireSheet } from "./hire-sheet";
import { PitchCard } from "./pitch-card";
import { PitchCompare } from "./pitch-compare";
import { CloseRequestSheet, EditRequestSheet, InviteSheet, MessageSheet, SampleSheet } from "./request-sheets";
import { briefComplete, isUndecided, rankPitches, sortPitches, type PitchSort, type RankedPitch } from "./shared";

export function RequestDetailPage() {
  return (
    <AppShell role="business">
      <Suspense fallback={<DetailSkeleton />}>
        <RequestDetail />
      </Suspense>
    </AppShell>
  );
}

function DetailSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading request">
        <div className="y-block y-pad-md flex flex-col gap-4" data-tone="paper">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-12 w-4/5" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 !rounded-(--y-r-tile)" />
            ))}
          </div>
        </div>
        <Skeleton className="mt-4 h-11 w-72" />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    </Page>
  );
}

function RequestDetail() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const hydrated = useHydrated();
  const s = useDemo();
  if (!hydrated) return <DetailSkeleton />;
  const request = requestById(s, params.id);
  if (!request || request.businessId !== ME.businessId) {
    return (
      <Page width="narrow">
        <Block tone="paper" pad="lg">
          <EmptyState
            title="We couldn't find that request"
            body="It may have been deleted, or the link is from another account. All of your requests are in one place."
            shape="dome"
            tint="violet"
            action={
              <PillButton href="/business/requests" variant="contrast">
                Back to requests
              </PillButton>
            }
          />
        </Block>
      </Page>
    );
  }
  return <RequestView key={request.id} request={request} openInvite={search.get("invite") === "1"} />;
}

type Tab = "pitches" | "brief" | "invited";
type Filter = "all" | "new" | "shortlisted" | "declined";

function RequestView({ request, openInvite }: { request: ContentRequest; openInvite: boolean }) {
  const s = useDemo();
  const toast = useToast();
  const router = useRouter();
  const product = productById(s, request.brief.productId);
  const format = formatById[request.brief.format];
  const FormatIcon = format.icon;
  const pitches = pitchesForRequest(s, request.id);
  const ranked = rankPitches(s, request, pitches);
  const isDraft = request.status === "draft";

  // Pitches that were unseen when the business opened the page keep their "New" badge.
  const [newIds] = useState(() => new Set(pitches.filter((p) => p.status === "sent").map((p) => p.id)));
  const [tab, setTab] = useState<Tab>(isDraft ? "brief" : "pitches");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<PitchSort>("fit");
  const [view, setView] = useState<"list" | "compare">("list");
  const [hireId, setHireId] = useState<string | null>(null);
  const [messageCreatorId, setMessageCreatorId] = useState<string | null>(null);
  const [sample, setSample] = useState<{ pitchId: string; videoId: string } | null>(null);
  const [sheet, setSheet] = useState<null | "invite" | "edit" | "close">(
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

  // Exactly one neon: Hire on the top shortlisted pitch (drafts use it for Publish instead).
  const neonId =
    canHire && tab === "pitches"
      ? (view === "list" ? active : compareItems).find((r) => r.pitch.status === "shortlisted")?.pitch.id
      : undefined;

  const hired = ranked.filter((r) => r.pitch.status === "hired");
  const waiting = ranked.filter(
    (r) => r.pitch.status === "sent" || r.pitch.status === "viewed" || r.pitch.status === "shortlisted",
  );
  const invited = request.invitedCreatorIds
    .map((id) => s.creators.find((c) => c.id === id))
    .filter((c) => c !== undefined);
  const daysLeft = daysFromNow(request.dueDate);

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
    const url = `${window.location.origin}/creator/opportunities/${request.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: "Link copied. Creators who open it can pitch right away." });
    } catch {
      toast({ message: `Copy this link: ${url}`, tone: "info" });
    }
  };
  const closeSheet = () => {
    if (sheet === "invite" && openInvite) router.replace(`/business/requests/${request.id}`, { scroll: false });
    setSheet(null);
  };

  const hireItem = hireId ? ranked.find((r) => r.pitch.id === hireId) : undefined;
  const messageCreator = messageCreatorId ? s.creators.find((c) => c.id === messageCreatorId) : undefined;
  const sampleItem = sample ? ranked.find((r) => r.pitch.id === sample.pitchId) : undefined;

  return (
    <Page>
      <div className="flex flex-col gap-2">
        {/* Header */}
        <Block tone="paper" pad="md" className="flex flex-col gap-5">
          <Link href="/business/requests" className="y-pill w-fit !ps-2" data-variant="ghost" data-size="sm">
            <ArrowLeft size={18} aria-hidden className="y-flip" />
            All requests
          </Link>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <RequestBadge status={request.status} />
                <span className="y-chip">
                  <FormatIcon size={14} aria-hidden /> {format.name}
                </span>
                <span className="y-chip">
                  {request.visibility === "invite" ? (
                    <>
                      <Lock size={14} aria-hidden /> Invite only
                    </>
                  ) : (
                    <>
                      <Globe size={14} aria-hidden /> Open to everyone who fits
                    </>
                  )}
                </span>
              </div>
              <h1 className="y-display y-t-display max-w-[24ch]">{request.title}</h1>
              <p className="y-small y-fg-2">
                {product ? (
                  <Link href={`/business/products/${product.id}`} className="y-link font-semibold text-(--b-fg)">
                    {product.name}
                  </Link>
                ) : null}
                {" · "}
                {isDraft ? "Not posted yet" : `Posted ${timeAgo(request.postedAt)}`} · Due {weekdayDate(request.dueDate)}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[560px] lg:flex-none">
              <div className="y-tile flex flex-col p-3 px-4">
                <dt className="y-micro y-fg-2 order-2">{pitches.length === 1 ? "pitch" : "pitches"}</dt>
                <dd className="y-display y-num text-[32px] leading-none font-semibold">{pitches.length}</dd>
              </div>
              <div className="y-tile flex flex-col p-3 px-4">
                <dt className="y-micro y-fg-2 order-2">budget</dt>
                <dd className="y-display y-num text-[22px] leading-[32px] font-semibold">
                  {moneyRange(request.budget.min, request.budget.max)}
                </dd>
              </div>
              <div className="y-tile flex flex-col p-3 px-4">
                <dt className="y-micro y-fg-2 order-2">{request.views === 1 ? "view" : "views"}</dt>
                <dd className="y-display y-num text-[32px] leading-none font-semibold">{num(request.views)}</dd>
              </div>
              <div className="y-tile flex flex-col p-3 px-4">
                <dt className="y-micro y-fg-2 order-2">
                  {daysLeft < 0 ? "overdue" : daysLeft === 0 ? "due today" : "until due"}
                </dt>
                <dd
                  className={`y-display y-num text-[22px] leading-[32px] font-semibold ${daysLeft < 0 ? "text-(--y-danger)" : ""}`}
                >
                  {daysLeft === 0 ? "Today" : plural(Math.abs(daysLeft), "day")}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            {isDraft ? (
              <PillButton href={`/business/requests/new?draft=${request.id}`} variant="outline" icon={<Pencil size={16} aria-hidden />}>
                Continue editing
              </PillButton>
            ) : (
              <>
                {request.status === "open" ? (
                  <PillButton variant="contrast" icon={<UserPlus size={18} aria-hidden />} onClick={() => setSheet("invite")}>
                    Invite creators
                  </PillButton>
                ) : null}
                {request.status !== "hired" ? (
                  <PillButton variant="outline" icon={<Pencil size={16} aria-hidden />} onClick={() => setSheet("edit")}>
                    Edit
                  </PillButton>
                ) : null}
                <PillButton variant="outline" icon={<Link2 size={16} aria-hidden />} onClick={copyLink}>
                  Copy link
                </PillButton>
                {request.status === "open" ? (
                  <PillButton variant="ghost" icon={<Ban size={16} aria-hidden />} onClick={() => setSheet("close")}>
                    Close request
                  </PillButton>
                ) : request.status === "closed" ? (
                  <PillButton
                    variant="ghost"
                    icon={<RotateCcw size={16} aria-hidden />}
                    onClick={() => {
                      actions.reopenRequest(request.id);
                      toast({ message: "Reopened. Creators can pitch again." });
                    }}
                  >
                    Reopen
                  </PillButton>
                ) : null}
              </>
            )}
          </div>
        </Block>

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
              <PillButton href={`/business/requests/new?draft=${request.id}`} variant="neon" arrow size="lg" className="justify-between ps-6">
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
                    <PillButton href={`/business/commissions/${commission.id}`} variant="contrast" arrow>
                      Open commission
                    </PillButton>
                  ) : null}
                </div>
              );
            })}
            {waiting.length ? (
              <div className="y-tile flex flex-wrap items-center gap-3 p-3 ps-4">
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
              <span className="font-semibold">This request is closed.</span> Creators can&apos;t pitch, and it&apos;s out of their feeds. Reopen it to hire from these pitches.
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
              <div className="flex flex-col gap-2 pb-1 lg:flex-row lg:items-center">
                <div
                  role="group"
                  aria-label="Filter pitches"
                  className="y-scroll-x -mx-(--y-gutter) flex gap-2 px-(--y-gutter) lg:mx-0 lg:px-0"
                >
                  {(
                    [
                      ["all", "All"],
                      ["new", "New"],
                      ["shortlisted", "Shortlisted"],
                      ["declined", "Declined"],
                    ] as [Filter, string][]
                  ).map(([id, label]) => (
                    <FilterChip key={id} pressed={filter === id} count={counts[id]} onClick={() => setFilter(id)}>
                      {label}
                    </FilterChip>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 lg:ms-auto">
                  <label className="flex items-center gap-2">
                    <span className="y-small y-fg-2">Sort</span>
                    <select
                      value={sort}
                      onChange={(event) => setSort(event.target.value as PitchSort)}
                      className="y-input !min-h-11 !w-auto !bg-(--y-paper) text-sm font-semibold"
                    >
                      <option value="fit">Best fit</option>
                      <option value="price">Lowest price</option>
                      <option value="fastest">Fastest</option>
                      <option value="newest">Newest</option>
                    </select>
                  </label>
                  <SegmentedToggle
                    label="View"
                    size="md"
                    className="bg-(--y-paper)"
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
                <div className="flex flex-col gap-2">
                  <p className="sr-only" aria-live="polite">
                    {plural(active.length + declined.length, "pitch", "pitches")} shown
                  </p>
                  {active.map((item) => (
                    <PitchCard
                      key={item.pitch.id}
                      s={s}
                      request={request}
                      item={item}
                      isNew={newIds.has(item.pitch.id)}
                      neon={neonId === item.pitch.id}
                      canHire={canHire}
                      commissionId={s.commissions.find((c) => c.pitchId === item.pitch.id)?.id}
                      onHire={() => setHireId(item.pitch.id)}
                      onMessage={() => setMessageCreatorId(item.creator.id)}
                      onSample={(videoId) => setSample({ pitchId: item.pitch.id, videoId })}
                      onDecline={() => decline(item.pitch.id)}
                      onRestore={() => restore(item.pitch.id)}
                      onShortlist={(on) => shortlist_(item.pitch.id, on)}
                    />
                  ))}
                  {declined.length ? (
                    <>
                      {filter === "all" ? (
                        <h2 className="y-micro y-fg-2 px-2 pt-4">Not selected</h2>
                      ) : null}
                      {declined.map((item) => (
                        <PitchCard
                          key={item.pitch.id}
                          s={s}
                          request={request}
                          item={item}
                          isNew={false}
                          neon={false}
                          canHire={false}
                          onHire={() => undefined}
                          onMessage={() => setMessageCreatorId(item.creator.id)}
                          onSample={(videoId) => setSample({ pitchId: item.pitch.id, videoId })}
                          onDecline={() => undefined}
                          onRestore={() => restore(item.pitch.id)}
                          onShortlist={() => undefined}
                        />
                      ))}
                    </>
                  ) : null}
                </div>
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
                  <PillButton href={`/business/requests/new?draft=${request.id}`} size="sm" variant="outline" icon={<Pencil size={14} aria-hidden />}>
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
              <Block as="section" aria-labelledby="terms-h" tone="paper" pad="md" className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 id="terms-h" className="y-head">
                    Budget and timing
                  </h2>
                  {!isDraft && request.status !== "hired" ? (
                    <PillButton size="sm" variant="ghost" icon={<Pencil size={14} aria-hidden />} onClick={() => setSheet("edit")}>
                      Edit
                    </PillButton>
                  ) : null}
                </div>
                <dl className="flex flex-col gap-2">
                  <div className="y-tile p-4">
                    <dt className="y-micro y-fg-2">Budget</dt>
                    <dd className="y-display y-num text-[24px] font-semibold">{moneyRange(request.budget.min, request.budget.max)}</dd>
                  </div>
                  <div className="y-tile p-4">
                    <dt className="y-micro y-fg-2">Due</dt>
                    <dd className="y-small font-semibold">
                      {weekdayDate(request.dueDate)} · {relativeDay(request.dueDate)}
                    </dd>
                  </div>
                  <div className="y-tile p-4">
                    <dt className="y-micro y-fg-2">Hiring</dt>
                    <dd className="y-small font-semibold">
                      {plural(request.slots, "creator")} · {request.visibility === "invite" ? "invite only" : "open to everyone who fits"}
                    </dd>
                  </div>
                </dl>
              </Block>
              {product ? (
                <Block as="section" aria-labelledby="product-h" tone="paper" pad="md" className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 id="product-h" className="y-head">
                      Product context
                    </h2>
                    <PillButton href={`/business/products/${product.id}`} size="sm" variant="ghost">
                      Open
                    </PillButton>
                  </div>
                  <p className="y-small y-fg-2">{product.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.tone.map((t) => (
                      <span key={t} className="y-chip">
                        {t}
                      </span>
                    ))}
                  </div>
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
                </Block>
              ) : null}
              {product ? (
                <Block as="section" aria-labelledby="learn-h" tone="mist" pad="md" className="flex flex-col gap-3">
                  <h2 id="learn-h" className="y-head flex items-center gap-2">
                    <History size={18} aria-hidden /> Carried forward
                  </h2>
                  {product.learnings.length ? (
                    <ul className="flex flex-col gap-2">
                      {product.learnings.map((l) => {
                        const creator = s.creators.find((c) => c.id === l.creatorId);
                        const inBrief = request.brief.mustInclude.includes(l.text) || request.brief.avoid.includes(l.text);
                        return (
                          <li key={l.id} className="y-tile flex flex-col gap-1 p-3">
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
              {request.brief.addons.length ? (
                <p className="y-micro y-fg-3 px-2">
                  Extras requested: {request.brief.addons.map((id) => addonById[id].name).join(", ")}.
                </p>
              ) : null}
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
      {sheet === "invite" ? <InviteSheet request={request} onClose={closeSheet} /> : null}
      {sheet === "edit" ? <EditRequestSheet request={request} onClose={closeSheet} /> : null}
      {sheet === "close" ? <CloseRequestSheet request={request} pitchCount={pitches.length} onClose={closeSheet} /> : null}
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
