"use client";

import {
  ArrowLeft,
  CalendarDays,
  Eye,
  EyeOff,
  Lightbulb,
  Lock,
  MailOpen,
  MessageCircle,
  Minus,
  Check,
  Sparkles,
  Type,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { BriefSummary } from "@/components/domain/brief-summary";
import { Badge } from "@/components/ui/badge";
import { Block } from "@/components/ui/block";
import { MatchScore } from "@/components/ui/match-score";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { KeyValues } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { money, moneyRange, netRange, plural, timeAgoInline, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import {
  businessById,
  deadlineDaysOf,
  fit as fitFor,
  isAdCopy,
  me,
  myPitchFor,
  pitchesForRequest,
  portfolio,
  productById,
} from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { FEE_PCT, aspects, formatById, jobTypeById, languageById, orderKinds, pitchStatus } from "@/lib/taxonomy";
import type { ContentRequest, Product } from "@/lib/types";

import { deliverables, voiced } from "@/components/find-work/work-items";

import { AskBrandSheet, threadAbout } from "./ask-brand-sheet";
import { MyPitch } from "./my-pitch";
import { ActionBar, BrandLine, BrandRecord, BriefFiles, Bullets, MoreMenu, Section, Unavailable } from "./parts";
import { PitchComposer } from "./pitch-composer";
import { commissionForPitch, median } from "./pitch-helpers";

const scrollToId = (id: string) =>
  window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" }));

/**
 * Someone else's custom order, as a creator sees it: the brief (usage, the brand's deadline, the
 * closing date, files, the hook line; for ad copy the pieces and placements) and the product
 * context in the main column; the budget with your net, your fit, your pitch and the brand's five
 * reliability figures in the rail (the action in a sticky bar on phones). Accounts without a
 * creator profile set one up first and carry straight on to the composer. The owner never gets
 * here (the order page shows them the pitches), so nobody pitches on their own order.
 */
export function RequestOpportunity({ request }: { request: ContentRequest }) {
  const s = useDemo();
  const toast = useToast();
  const [composer, setComposer] = useState<"new" | "edit" | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);

  const creator = me.creator(s);
  const myPitch = creator ? myPitchFor(s, request.id, creator.id) : undefined;
  const invited = creator ? request.invitedCreatorIds.includes(creator.id) : false;
  const hidden = me.hiddenRequestIds(s).includes(request.id);

  if (request.status === "draft") {
    return (
      <Unavailable
        title="This order isn't posted yet"
        body="The brand is still writing it. It shows up in Find work once it's open for pitches."
      />
    );
  }
  if (request.visibility === "invite" && !invited && !myPitch) {
    return (
      <Unavailable
        title="This order is invite-only"
        body="The brand picked a few creators to pitch on it. Keep your portfolio fresh so you're on the next list."
      />
    );
  }

  const business = businessById(s, request.businessId);
  const brandName = business?.name ?? "The brand";
  const product = productById(s, request.brief.productId);
  const fit = creator ? voiced(fitFor(s, creator, request), request) : undefined;
  const pitches = pitchesForRequest(s, request.id);
  const typical = median(pitches.map((p) => p.price));
  const videos = creator ? portfolio(s, creator) : [];
  const isOpen = request.status === "open";
  const job = myPitch?.status === "hired" ? commissionForPitch(s, myPitch) : undefined;
  const thread = threadAbout(s, request);
  const format = formatById[request.brief.format];
  const adCopy = isAdCopy(request);
  const days = deadlineDaysOf(request);
  const budget = moneyRange(request.budget.min, request.budget.max);
  const budgetNet = netRange(request.budget.min, request.budget.max);
  // Yapp doesn't ship products yet (round 3 answers, item 24), unless the brief already says how.
  const physical =
    !adCopy &&
    (product?.niche === "gadgets" || request.brief.format === "unboxing") &&
    ![request.brief.notes ?? "", ...request.brief.mustInclude].some((t) => /\bship/i.test(t));
  const deadlineLine = days
    ? `You'll have ${plural(days, "day")} to deliver after you're hired`
    : `Due ${weekdayDate(request.dueDate)}`;

  const hide = () => {
    actions.hideRequest(request.id);
    toast({
      message: "Hidden from Find work.",
      action: { label: "Undo", onClick: () => actions.unhideRequest(request.id) },
    });
  };
  const startPitch = () => (creator ? setComposer("new") : setSetupOpen(true));
  const ask = () => (creator ? setAskOpen(true) : setSetupOpen(true));

  const competition =
    pitches.length === 0
      ? isOpen
        ? "No pitches yet. Early pitches get read first."
        : "No pitches"
      : [
          `${plural(pitches.length, "pitch", "pitches")} so far${myPitch ? ", including yours" : ""}`,
          typical !== undefined ? `typical ${money(typical)}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  /* ---------------------------------------------------------- the one action */
  const action = myPitch ? null : isOpen ? (
    <div className="flex flex-col gap-2">
      <PillButton variant="neon" size="lg" arrow className="w-full justify-between ps-6" onClick={startPitch}>
        {creator ? "Pitch now" : "Set up and pitch"}
      </PillButton>
      <p className="y-micro y-fg-2 px-1">
        {creator
          ? `You set the price and earn it less Yapp's ${FEE_PCT}%. Payment is held before you start.`
          : "A creator profile takes a minute. Then you're straight back here."}
      </p>
    </div>
  ) : (
    <p className="y-small flex items-center gap-2">
      <Lock size={16} aria-hidden className="flex-none" />
      {request.status === "hired" ? `${brandName} hired another creator` : "No longer taking pitches"}
    </p>
  );

  const deal = (
    <Block tone="paper" pad="md" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className="y-micro y-fg-2">
          Budget{adCopy ? "" : ` for ${plural(request.brief.videoCount, "video")}`}
        </p>
        <p className="y-display y-num text-[32px] leading-none tracking-[-0.03em]">{budget}</p>
        <p className="y-small y-num">
          You&apos;d earn <span className="font-semibold">{budgetNet}</span>
          <span className="y-fg-2"> after the {FEE_PCT}% Yapp fee</span>
        </p>
      </div>
      <p className="y-small flex items-start gap-2">
        <CalendarDays size={16} aria-hidden className="mt-0.5 flex-none" />
        <span>{deadlineLine}</span>
      </p>
      <KeyValues
        rows={[
          { label: isOpen ? "Pitch by" : "Closed", value: weekdayDate(request.closesAt) },
          { label: "Posted", value: timeAgoInline(request.postedAt) },
        ]}
      />
      <p className="y-small y-fg-2 flex items-start gap-2">
        <Users size={16} aria-hidden className="mt-0.5 flex-none" />
        {competition}
      </p>
      {myPitch ? (
        <div className="border-t border-(--b-line) pt-5">
          <MyPitch
            pitch={myPitch}
            request={request}
            business={business}
            justSent={sentId === myPitch.id}
            onEdit={() => setComposer("edit")}
          />
        </div>
      ) : (
        <div className="hidden lg:block">{action}</div>
      )}
    </Block>
  );

  const fitCard = (
    <Block as="section" aria-labelledby="fit-h" tone="paper" pad="md" className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h2 id="fit-h" className="y-head flex items-center gap-2">
          <Sparkles size={18} aria-hidden className="flex-none" />
          Your fit
        </h2>
        {fit ? <MatchScore value={fit.score} label="fit" showBar={false} /> : null}
      </div>
      {fit ? (
        <ul className="flex flex-col gap-2">
          {fit.reasons.map((reason) => (
            <li key={reason} className="y-small flex items-start gap-2">
              <Check size={16} strokeWidth={2.75} aria-hidden className="mt-0.5 flex-none" />
              {reason}
            </li>
          ))}
          {fit.gaps.map((gap) => (
            <li key={gap} className="y-small y-fg-2 flex items-start gap-2">
              <Minus size={16} strokeWidth={2.75} aria-hidden className="mt-0.5 flex-none" />
              <span>
                <span className="sr-only">Gap: </span>
                {gap}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="y-small y-fg-2">
          With a creator profile, we show how your languages, formats and portfolio match this brief.
        </p>
      )}
    </Block>
  );

  return (
    <Page className={isOpen || job ? "sw-has-bar" : ""}>
      <Link
        href={paths.findWork()}
        className="y-small y-fg-2 -ms-1 inline-flex w-fit items-center gap-1.5 rounded-full py-1 pe-2 font-medium hover:text-(--y-ink)"
      >
        <ArrowLeft size={16} aria-hidden className="y-flip" />
        Find work
      </Link>

      {/* Header: who's asking, the title, one meta line, my status */}
      <header className="flex flex-col gap-3 pt-3 pb-5 md:pb-6">
        <div className="flex items-start justify-between gap-3">
          {business ? <BrandLine business={business} /> : <span />}
          <MoreMenu
            items={
              myPitch
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
          {(adCopy
            ? [orderKinds.custom.name, request.brief.languages.map((l) => languageById[l].name).join(" or "), deliverables(request)]
            : [
                orderKinds.custom.name,
                format.name,
                request.brief.languages.map((l) => languageById[l].name).join(" or "),
                deliverables(request),
                aspects.find((a) => a.id === request.brief.aspect)?.name ?? request.brief.aspect,
              ]
          ).join(" · ")}
        </p>
        {(invited && !myPitch) || hidden || adCopy ? (
          <div className="flex flex-wrap items-center gap-2">
            {adCopy ? (
              <Badge tone="ink" icon={<Type size={14} aria-hidden />}>
                {jobTypeById["ad-copy"].name}
              </Badge>
            ) : null}
            {invited && !myPitch ? (
              <Badge tone="ink" icon={<MailOpen size={14} aria-hidden />}>
                {brandName} invited you
              </Badge>
            ) : null}
            {hidden && !myPitch ? (
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
        <aside className="flex flex-col gap-3 lg:order-2 lg:col-span-4" aria-label="Budget, your fit and your pitch">
          <div className="y-rail flex flex-col gap-3">
            {deal}
            {fitCard}
            {business ? <BrandRecord business={business} /> : null}
          </div>
        </aside>

        <div className="flex flex-col gap-3 lg:order-1 lg:col-span-8">
          <Section title="The brief" id="brief-h">
            {request.brief.hook ? (
              <div className="y-tile flex flex-col gap-1 p-4">
                <p className="y-micro y-fg-2">{adCopy ? "Opening line from " : "Hook from "}{brandName}</p>
                <p className="y-body font-medium">{request.brief.hook}</p>
              </div>
            ) : null}
            <BriefSummary brief={request.brief} product={product} />
            {physical ? (
              <p className="y-small y-fg-2">
                Yapp doesn&apos;t ship products yet: use one you already own, or work from the companion app.
              </p>
            ) : null}
            <BriefFiles files={request.brief.attachments ?? []} brandName={brandName} />
          </Section>
          {product ? <ProductContext product={product} /> : null}
          <Section title="Questions about the brief?" id="ask-h">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="y-small y-fg-2 max-w-[48ch]">
                {thread
                  ? `You're already talking to ${brandName} about this order.`
                  : `Ask ${brandName} ${myPitch ? "anything about the brief" : "before you pitch"}. Contact details stay hidden: everything happens on Yapp.`}
              </p>
              {thread ? (
                <PillButton href={paths.messages(thread.id)} variant="outline" icon={<MessageCircle size={16} aria-hidden />}>
                  Open the conversation
                </PillButton>
              ) : (
                <PillButton variant="outline" icon={<MessageCircle size={16} aria-hidden />} onClick={ask}>
                  Message {brandName}
                </PillButton>
              )}
            </div>
          </Section>
        </div>
      </div>

      {/* Phone: the next step stays in reach */}
      {myPitch?.status === "hired" ? (
        <ActionBar label="Your job">
          <p className="y-small min-w-0 flex-1 truncate font-semibold">You&apos;re hired</p>
          <PillButton href={job ? paths.job(job.id) : paths.studioJobs()} variant="neon" arrow>
            Open the job
          </PillButton>
        </ActionBar>
      ) : myPitch && isOpen ? (
        <ActionBar label="Your pitch">
          <p className="y-small min-w-0 flex-1 truncate">
            <span className="font-semibold">Your pitch</span> · {pitchStatus[myPitch.status].label}
          </p>
          <PillButton variant="contrast" onClick={() => scrollToId("my-pitch")}>
            See your pitch
          </PillButton>
        </ActionBar>
      ) : isOpen && !myPitch ? (
        <ActionBar label="Pitch on this order">
          <p className="y-small min-w-0 flex-1 truncate">
            <span className="y-num font-semibold">{budget}</span>
            <span className="y-fg-2"> · you earn {budgetNet}</span>
          </p>
          <PillButton variant="neon" arrow onClick={startPitch}>
            {creator ? "Pitch now" : "Set up and pitch"}
          </PillButton>
        </ActionBar>
      ) : null}

      {creator ? (
        <PitchComposer
          open={composer !== null}
          onClose={() => setComposer(null)}
          request={request}
          business={business}
          product={product}
          creator={creator}
          videos={videos}
          existing={composer === "edit" ? myPitch : undefined}
          onDone={(pitchId, edited) => {
            setComposer(null);
            if (edited) {
              toast({ message: `Pitch updated. ${brandName} sees the new version.` });
              return;
            }
            setSentId(pitchId);
            toast({ message: `Pitch sent to ${brandName}` });
            scrollToId("my-pitch");
          }}
        />
      ) : null}
      <CreatorSetupSheet
        open={setupOpen}
        reason="to pitch on this order"
        onClose={() => setSetupOpen(false)}
        onDone={() => {
          setSetupOpen(false);
          if (isOpen) setComposer("new");
        }}
      />
      {business ? (
        <AskBrandSheet open={askOpen} onClose={() => setAskOpen(false)} request={request} brandName={brandName} />
      ) : null}
    </Page>
  );
}

/** The product as creators see it: what it is, the tone, dos and don'ts, and what worked before. */
function ProductContext({ product }: { product: Product }) {
  return (
    <Section title={`About ${product.name}`} id="product-h">
      <div className="flex flex-col gap-1.5">
        <p className="y-body max-w-[62ch]">{product.description}</p>
        {product.tone.length ? (
          <p className="y-small y-fg-2">Tone: {product.tone.join(", ").toLowerCase()}</p>
        ) : null}
      </div>
      {product.dos.length || product.donts.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {product.dos.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="y-micro y-fg-2">Do</h3>
              <Bullets items={product.dos} />
            </div>
          ) : null}
          {product.donts.length ? (
            <div className="flex flex-col gap-2">
              <h3 className="y-micro y-fg-2">Don&apos;t</h3>
              <Bullets items={product.donts} />
            </div>
          ) : null}
        </div>
      ) : null}
      {product.learnings.length ? (
        <div className="y-tile flex flex-col gap-2.5 p-4">
          <h3 className="y-small flex items-center gap-2 font-semibold">
            <Lightbulb size={16} aria-hidden className="flex-none" />
            What worked in earlier videos
          </h3>
          <Bullets items={product.learnings.slice(0, 4).map((l) => l.text)} />
        </div>
      ) : null}
      {product.assets.length ? (
        <p className="y-micro y-fg-2">
          Shared after hiring: {product.assets.map((a) => a.name).join(", ")}.
        </p>
      ) : null}
    </Section>
  );
}
