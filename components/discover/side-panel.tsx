"use client";

import { BadgeCheck, Copy, Lock, RotateCcw, Star } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { MessageSheet } from "@/components/discovery/message-sheet";
import { responseShort } from "@/components/discovery/profile-utils";
import { BusinessLogo } from "@/components/domain/business-logo";
import { VideoThumb } from "@/components/domain/video-thumb";
import { ActionPill, PickNowButton } from "@/components/ui/action-pill";
import { LineChart } from "@/components/ui/charts";
import { StatBox, StatGrid } from "@/components/ui/data";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { Progress, SlotBar } from "@/components/ui/progress";
import { Sheet, SheetActions } from "@/components/ui/sheet";
import { SampleChip, Tag } from "@/components/ui/tags";
import { useToast } from "@/components/ui/toast";
import { money, moneyExact, moneyRange, netRange, plural, quoted, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { businessById, creatorById, findWork, me, portfolio, productById, type WorkItem } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { formatById, jobTypeById, languageById, nicheById, orderKinds, usageById } from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

import { avgViews, cityName, fastestDelivery, totalFollowers, viewsLabel } from "./data";
import {
  SAMPLE_AD_RESULTS,
  SAMPLE_MEASURED,
  SAMPLE_MONTHS_12,
  SAMPLE_STORIES,
  sampleCreatorFigures,
  type AdMetricId,
} from "./sample";
import { storyCreators } from "./stories";

export type PanelView =
  | { kind: "creator"; id: string }
  | { kind: "story"; index: number }
  | { kind: "metric"; id: AdMetricId }
  | { kind: "order"; id: string };

const viewKey = (view: PanelView) =>
  view.kind === "story" ? `story:${view.index}` : `${view.kind}:${view.id}`;

/**
 * Discover's side panel: one component, four views (creator, story, metric, order). A panel from
 * the right on desktop, a bottom sheet on phones (the kit's `Sheet`, which traps focus, closes on
 * Esc or the scrim and returns focus to whatever opened it).
 */
export function SidePanel({
  s,
  view,
  onClose,
  onOpen,
}: {
  s: DemoState;
  view: PanelView | null;
  onClose: () => void;
  onOpen: (view: PanelView) => void;
}) {
  // The package picked in the creator view, per creator; the footer's "Book" follows it.
  const [picks, setPicks] = useState<Record<string, string>>({});
  const pick: PackagePick = {
    of: (creator) => picks[creator.id] ?? creator.packages[0]?.id ?? "",
    set: (creator, id) => setPicks((current) => ({ ...current, [creator.id]: id })),
  };
  const content = view ? panelContent(s, view, onOpen, pick) : null;
  return (
    <Sheet
      open={Boolean(view && content)}
      onClose={onClose}
      title={content?.title ?? ""}
      width="wide"
      footer={content?.footer}
    >
      {view && content ? (
        <ScrollTop key={viewKey(view)}>
          <div className="y-dsc-panel">{content.body}</div>
        </ScrollTop>
      ) : null}
    </Sheet>
  );
}

/** Starts each view at the top of the panel's scroll area. */
function ScrollTop({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current?.closest(".y-sheet-body")?.scrollTo({ top: 0 });
  }, []);
  return <div ref={ref}>{children}</div>;
}

type Content = { title: string; body: React.ReactNode; footer?: React.ReactNode };
type PackagePick = { of: (creator: Creator) => string; set: (creator: Creator, id: string) => void };

function panelContent(
  s: DemoState,
  view: PanelView,
  onOpen: (view: PanelView) => void,
  pick: PackagePick,
): Content | null {
  switch (view.kind) {
    case "creator": {
      const creator = creatorById(s, view.id);
      return creator
        ? {
            title: "Creator",
            body: <CreatorView s={s} creator={creator} pick={pick} />,
            footer: <CreatorFooter s={s} creator={creator} pick={pick} />,
          }
        : null;
    }
    case "story": {
      const story = SAMPLE_STORIES[view.index];
      return story
        ? { title: "Success story", body: <StoryView s={s} index={view.index} onOpen={onOpen} />, footer: <StoryFooter index={view.index} s={s} /> }
        : null;
    }
    case "metric": {
      const metric = SAMPLE_AD_RESULTS.find((m) => m.id === view.id);
      return metric
        ? {
            title: metric.title,
            body: <MetricView id={view.id} />,
            footer: (
              <SheetActions>
                <PillButton href={paths.explore("creators")} variant="contrast">
                  See creators who drive this
                </PillButton>
              </SheetActions>
            ),
          }
        : null;
    }
    case "order": {
      const item = orderItem(s, view.id);
      return item
        ? { title: item.kind === "campaign" ? orderKinds.campaign.name : orderKinds.custom.name, body: <OrderView s={s} item={item} />, footer: <OrderFooter item={item} /> }
        : null;
    }
  }
}

/* ------------------------------------------------------------------ pieces */

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="y-dsc-psec">
      <div className="y-dsc-h4">
        <h3>{title}</h3>
        {aside ? <span>{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Bars({ rows }: { rows: { label: string; pct: number }[] }) {
  return (
    <ul className="y-dsc-hb">
      {rows.map((row) => (
        <li key={row.label}>
          <span className="truncate">{row.label}</span>
          <Progress value={row.pct / 100} tone="gradient" />
          <b className="y-num">{row.pct}%</b>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------ creator view */

function CreatorView({ s, creator, pick: picked }: { s: DemoState; creator: Creator; pick: PackagePick }) {
  const views = avgViews(s, creator);
  const followers = totalFollowers(creator);
  const sample = sampleCreatorFigures(creator.id, views);
  const videos = portfolio(s, creator).slice(0, 4);
  const languages = creator.languages.map((id) => languageById[id]?.name).filter(Boolean).join(" · ");
  const badges = [
    creator.verified ? { label: "Yapp Verified", look: "green" as const } : null,
    creator.topRated ? { label: "Top rated", look: "neutral" as const } : null,
    creator.responseHours <= 1 ? { label: "Replies in about an hour", look: "neutral" as const } : null,
    creator.available ? { label: "Available now", look: "neutral" as const } : null,
  ].filter((b): b is { label: string; look: "green" | "neutral" } => Boolean(b)).slice(0, 3);
  const platforms = (creator.socials ?? []).map((a) => (a.platform === "tiktok" ? "TikTok" : a.platform === "instagram" ? "Instagram" : "Snapchat"));
  const pick = picked.of(creator);

  return (
    <>
      <div className="y-dsc-ph">
        <FaceAvatar id={creator.id} name="" size={76} />
        <div className="min-w-0">
          <h3 className="y-dsc-cname">
            {creator.name}
            {creator.verified ? <BadgeCheck size={18} aria-label="Verified" className="flex-none" /> : null}
          </h3>
          <p className="y-dsc-meta">
            {cityName(creator)} · {nicheById[creator.niches[0]]?.name} · {languages}
          </p>
          {badges.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {badges.map((badge) => (
                <Tag key={badge.label} tone={badge.look}>
                  {badge.label}
                </Tag>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {videos.length ? (
        <div className="y-dsc-sreel">
          {videos.map((video) => (
            <div key={video.id} className="y-dsc-sreel-v">
              <VideoThumb video={video} frame="9:16" showHook={false} />
            </div>
          ))}
        </div>
      ) : null}

      <Section title="Performance" aside="On Yapp">
        <StatGrid>
          <StatBox size="md" value={views === null ? "—" : viewsLabel(views)} label="Avg views" sub={`${plural(videos.length, "video")} shown`} />
          <StatBox size="md" value="—" label="Engagement" sub="Needs a connected account" className="y-dsc-stat-quiet" />
          <StatBox size="md" value={`${creator.onTimeRate}%`} label="On-time delivery" sub={`${plural(fastestDelivery(creator), "day")} at the fastest`} />
          <StatBox size="md" value={`${creator.repeatClientRate}%`} label="Brands rehire" sub={`${plural(creator.completed, "order")} done`} />
          <StatBox
            size="md"
            value={
              <span className="inline-flex items-center gap-1">
                <Star size={15} aria-hidden className="fill-current" />
                {creator.rating.toFixed(1)}
              </span>
            }
            label={plural(creator.reviewCount, "review")}
            sub={`Replies in about ${responseShort(creator.responseHours)}`}
          />
          <StatBox
            size="md"
            value={followers === null ? "—" : viewsLabel(followers)}
            label="Total followers"
            sub={platforms.length ? platforms.join(" · ") : "No account connected"}
          />
        </StatGrid>
      </Section>

      <Section title="Views trend" aside={<SampleChip />}>
        <LineChart
          values={sample.views30}
          labels={sample.views30.map((_, index) => `Day ${index + 1}`)}
          format={(n) => viewsLabel(Math.round(n))}
          unit="views"
          height={170}
          label={`Sample: daily views over the last 30 days, ${sample.viewsChangePct >= 0 ? "up" : "down"} ${Math.abs(sample.viewsChangePct)}% from the first ten days to the last ten.`}
        />
      </Section>

      <Section title="Audience" aside={<SampleChip />}>
        <div className="y-dsc-aud">
          <div>
            <h4>Country</h4>
            <Bars rows={sample.country} />
          </div>
          <div>
            <h4>Age</h4>
            <Bars rows={sample.age} />
          </div>
          <div>
            <h4>Gender</h4>
            <Bars rows={sample.gender} />
          </div>
        </div>
      </Section>

      <Section title="Packages" aside="Prices are final">
        <div className="y-dsc-pks" role="radiogroup" aria-label="Packages">
          {creator.packages.map((pkg) => {
            const on = pkg.id === pick;
            return (
              <button
                key={pkg.id}
                type="button"
                role="radio"
                aria-checked={on}
                className="y-dsc-pk"
                data-on={on ? "true" : undefined}
                onClick={() => picked.set(creator, pkg.id)}
              >
                <span className="min-w-0">
                  <b>{pkg.name}</b>
                  <span>
                    {plural(pkg.videos, "video")} · up to {pkg.maxSeconds}s · {plural(pkg.revisions, "revision")} ·{" "}
                    {pkg.deliveryDays}-day delivery
                  </span>
                </span>
                <span className="y-dsc-pk-pr y-num">{money(pkg.price)}</span>
              </button>
            );
          })}
        </div>
        <p className="y-dsc-pk-note">
          Usage rights are part of the price: you choose organic only or paid ads for 6 months, 12
          months or no end date when you order. Raw footage comes with every approved video.
        </p>
      </Section>

      <p className="y-dsc-assure">
        <span>
          <Lock size={14} aria-hidden /> Payment held until you approve
        </span>
        <span>
          <RotateCcw size={14} aria-hidden /> Two revisions included
        </span>
      </p>
    </>
  );
}

function CreatorFooter({ s, creator, pick: picked }: { s: DemoState; creator: Creator; pick: PackagePick }) {
  const { account } = usePrefs();
  const pick = picked.of(creator);
  const [messageOpen, setMessageOpen] = useState(false);
  const own = me.creator(s)?.id === creator.id;
  const pkg = creator.packages.find((p) => p.id === pick) ?? creator.packages[0];
  if (own)
    return (
      <SheetActions>
        <PillButton href={paths.creator(creator.handle)} variant="contrast">
          View your profile
        </PillButton>
      </SheetActions>
    );
  const book = paths.orderCreator(creator.handle, { package: pkg?.id });
  return (
    <SheetActions>
      {account ? (
        <PillButton variant="outline" onClick={() => setMessageOpen(true)}>
          Message
        </PillButton>
      ) : (
        <PillButton variant="outline" href={paths.signIn({ next: paths.creator(creator.handle) })}>
          Message
        </PillButton>
      )}
      <PillButton href={book} variant="neon">
        Book · {pkg ? money(pkg.price) : ""}
      </PillButton>
      {account ? <MessageSheet creator={creator} open={messageOpen} onClose={() => setMessageOpen(false)} /> : null}
    </SheetActions>
  );
}

/* -------------------------------------------------------------- story view */

function StoryView({ s, index, onOpen }: { s: DemoState; index: number; onOpen: (view: PanelView) => void }) {
  const story = SAMPLE_STORIES[index];
  const business = businessById(s, story.businessId);
  const creators = storyCreators(s, story);
  const metric = story.results[0];
  const hooks = creators
    .map((creator) => ({ creator, video: portfolio(s, creator).find((v) => v.aspect === "9:16") ?? portfolio(s, creator)[0] }))
    .filter((h) => Boolean(h.video));
  if (!business) return null;
  return (
    <>
      <div className="y-dsc-brandrow">
        <BusinessLogo business={business} size={42} />
        <div className="min-w-0">
          <b>{business.name}</b>
          <span className="y-dsc-meta">
            {story.weeks}-week program · {story.yapps} Yapps · {story.adSpend} ad spend
          </span>
        </div>
        <SampleChip className="ms-auto">Sample story</SampleChip>
      </div>
      <h3 className="y-display y-dsc-panel-h">{story.title}</h3>
      <div className="y-dsc-sres">
        {story.results.map((result) => (
          <div key={result.label}>
            <b className="y-num">{result.value}</b>
            <span>{result.label}</span>
          </div>
        ))}
      </div>
      <Section title={`${metric.label} week by week`}>
        <LineChart
          values={story.after}
          compare={story.before}
          labels={story.after.map((_, i) => `Week ${i + 1}`)}
          format={(n) => (story.unit === "money" ? `$${n.toFixed(n < 10 ? 2 : 0)}` : Math.round(n).toString())}
          height={170}
          legend={{ value: "With Yapp", compare: "Before" }}
          label={`Sample: ${metric.label} over six weeks with Yapp, against the six weeks before.`}
        />
      </Section>
      {hooks.length ? (
        <Section title="The Yapps that won">
          <div className="y-dsc-sreel">
            {hooks.map(({ creator, video: clip }, i) => (
              <div key={creator.id} className="y-dsc-sreel-v">
                {clip ? <VideoThumb video={clip} frame="9:16" showHook={false} showMeta={false} decorative /> : null}
                <span className="y-dsc-sreel-tag">Hook {String.fromCharCode(65 + i)}</span>
                <span className="y-dsc-sreel-foot">
                  <span>CTR {story.hookCtr[i] ?? "—"}</span>
                  <span>{creator.firstName}</span>
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
      <Section title="How they did it">
        <ol className="y-dsc-tl">
          <li>
            <span>Week 1</span>Posted one brief. {story.pitched} creators pitched within 24 hours; they picked {creators.length}.
          </li>
          <li>
            <span>Week 2</span>
            {Math.round(story.yapps / 3)} Yapps delivered, each creator trying three different hooks.
          </li>
          <li>
            <span>Weeks 3–4</span>Ran all of them as ads, paused the bottom half and hired the best creators again.
          </li>
          <li>
            <span>Week {story.weeks}</span>Scaled the winning hooks to the full budget.
          </li>
        </ol>
      </Section>
      <figure className="y-dsc-quote">
        <blockquote>{quoted(story.quote)}</blockquote>
        <figcaption>{story.quoteBy}</figcaption>
      </figure>
      <Section title="Creators on this campaign">
        <ul className="y-dsc-prows">
          {creators.map((creator) => (
            <li key={creator.id}>
              <button type="button" className="y-dsc-prow" onClick={() => onOpen({ kind: "creator", id: creator.id })}>
                <FaceAvatar id={creator.id} name="" size={40} />
                <span className="min-w-0 flex-1">
                  <b className="truncate">{creator.name}</b>
                  <span className="y-dsc-meta">
                    {cityName(creator)} · <Star size={11} aria-hidden className="inline -translate-y-px fill-current" />{" "}
                    {creator.rating.toFixed(1)}
                  </span>
                </span>
                <span className="y-dsc-prow-pr y-num">From {money(Math.min(...creator.packages.map((p) => p.price)))}</span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function StoryFooter({ s, index }: { s: DemoState; index: number }) {
  const toast = useToast();
  const { account } = usePrefs();
  const story = SAMPLE_STORIES[index];
  const business = businessById(s, story.businessId);
  const campaign = paths.newOrder({ type: "campaign" });
  const copy = async () => {
    const text = `${story.title}. ${story.yapps} Yapps over ${story.weeks} weeks from ${business?.name ?? "the brand"}: several creators, three hooks each, run as ads, with the best creators hired again.`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ message: "Brief copied. Paste it into a new order." });
    } catch {
      toast({ message: "Couldn't copy here. Select the story's text instead.", tone: "info" });
    }
  };
  return (
    <SheetActions>
      <PillButton variant="outline" icon={<Copy size={16} aria-hidden />} onClick={copy}>
        Copy this brief
      </PillButton>
      <PillButton href={account ? campaign : paths.signIn({ next: campaign, intent: "ask" })} variant="neon">
        Start a similar campaign
      </PillButton>
    </SheetActions>
  );
}

/* ------------------------------------------------------------- metric view */

function MetricView({ id }: { id: AdMetricId }) {
  const metric = SAMPLE_AD_RESULTS.find((m) => m.id === id)!;
  const format = (n: number) => (metric.unit === "money" ? `$${Math.round(n)}` : `${n.toFixed(n < 10 ? 2 : 0)}%`);
  return (
    <>
      <div className="y-dsc-metric">
        <span className="y-eyebrow">{metric.name}</span>
        <span className="y-dsc-metric-big y-num">{metric.big}</span>
        <p className="y-dsc-sub">
          {metric.yapp} on Yapp against {metric.typical} for typical paid social creative.
        </p>
        <SampleChip>Sample figures</SampleChip>
      </div>
      <Section title="12 months">
        <LineChart
          values={metric.yappSeries}
          compare={metric.typicalSeries}
          labels={SAMPLE_MONTHS_12}
          axis={SAMPLE_MONTHS_12.map((m) => m.toUpperCase())}
          format={format}
          height={170}
          legend={{ value: "Yapp", compare: "Typical" }}
          label={`Sample: ${metric.name} on Yapp against typical paid social, December to November.`}
        />
      </Section>
      <StatGrid>
        <StatBox size="md" value={`${metric.monthsAhead} of ${metric.ofMonths}`} label="Months ahead" />
        <StatBox size="md" value={SAMPLE_MEASURED.campaigns} label="Campaigns measured" />
        <StatBox size="md" value={SAMPLE_MEASURED.adSpend} label="Ad spend tracked" />
      </StatGrid>
      <p className="y-dsc-method">
        How it would be measured: brands that connect an ad account share anonymous results, and
        Yapp creatives are compared with the same brand&apos;s other creatives over the same period. Ad
        accounts can&apos;t be connected yet, so every figure here is a sample.
      </p>
    </>
  );
}

/* -------------------------------------------------------------- order view */

function orderItem(s: DemoState, id: string): WorkItem | undefined {
  return findWork(s, { pageSize: 500, includeHidden: true }).items.find((item) => item.id === id);
}

function OrderView({ s, item }: { s: DemoState; item: WorkItem }) {
  const { account } = usePrefs();
  const signedIn = Boolean(account);
  const request = item.request;
  const product = productById(s, request.brief.productId);
  const slots = item.slots;
  const work = item.format ? formatById[item.format]?.name : jobTypeById[item.jobType]?.name;
  const delivered = s.commissions
    .filter((c) => c.requestId === request.id)
    .flatMap((c) => c.deliveries.filter((d) => d.status === "approved" && d.video).map((d) => ({ video: d.video!, creator: creatorById(s, c.creatorId) })))
    .slice(0, 4);
  return (
    <>
      <div className="y-dsc-brandrow">
        <BusinessLogo business={item.business} size={42} />
        <div className="min-w-0">
          <b>{item.brandName}</b>
          <span className="y-dsc-meta">
            {nicheById[item.category]?.name} · {work} · closes {shortDate(item.closesAt)}
          </span>
        </div>
      </div>
      <h3 className="y-display y-dsc-panel-h">{item.title}</h3>
      <StatGrid>
        {slots ? (
          <>
            <StatBox size="md" value={money(item.pay.amount)} label="Per Yapp" sub={`You earn ${moneyExact(item.pay.net)}`} />
            <StatBox size="md" value={slots.left} label="Yapps left" sub={`${slots.taken} of ${slots.total} picked`} />
          </>
        ) : (
          <>
            <StatBox size="md" value={moneyRange(item.pay.min, item.pay.max)} label="Budget" sub={`You earn ${netRange(item.pay.min, item.pay.max)}`} />
            <StatBox size="md" value={item.pitches} label={item.pitches === 1 ? "Pitch so far" : "Pitches so far"} />
          </>
        )}
        <StatBox size="md" value={item.deadlineDays ? plural(item.deadlineDays, "day") : shortDate(request.dueDate)} label={item.deadlineDays ? "To deliver" : "Due"} />
      </StatGrid>
      {slots ? (
        <Section title="Yapps">
          <SlotBar total={slots.total} taken={slots.taken} size="lg" />
        </Section>
      ) : null}
      <Section title="The brief">
        <p className="y-dsc-brief-text">{request.brief.goal}</p>
        {request.brief.keyMessage ? <p className="y-dsc-brief-text">Key message: {quoted(request.brief.keyMessage)}</p> : null}
        <ul className="y-dsc-facts">
          {product ? <li>Product: {product.name}</li> : null}
          <li>Usage: {usageById[request.brief.usage]?.name}, included in the price</li>
          {item.kind === "campaign" ? <li>Pay: 7 days after your post is verified</li> : <li>Pay: on approval</li>}
        </ul>
      </Section>
      {delivered.length ? (
        <Section title="Delivered so far">
          <div className="y-dsc-sreel">
            {delivered.map(({ video, creator }) => (
              <div key={video.id} className="y-dsc-sreel-v">
                <VideoThumb video={video} frame="9:16" showHook={false} showViews={false} decorative />
                {creator ? (
                  <span className="y-dsc-sreel-foot">
                    <span>{creator.firstName}</span>
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}
      {signedIn && !item.action.can && item.action.reason !== "pitched" && item.action.reason !== "joined" ? (
        <p className="y-dsc-method">{item.action.label}. The order page has the rest.</p>
      ) : null}
    </>
  );
}

function OrderFooter({ item }: { item: WorkItem }) {
  const href = paths.order(item.id);
  if (item.slots)
    return (
      <SheetActions className="w-full">
        <PickNowButton left={item.slots.left} total={item.slots.total} href={href} className="w-full" />
      </SheetActions>
    );
  return (
    <SheetActions className="w-full">
      <ActionPill href={href} className="w-full">
        Send a pitch
      </ActionPill>
    </SheetActions>
  );
}

