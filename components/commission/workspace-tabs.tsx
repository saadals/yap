"use client";

import {
  Ban,
  BadgeCheck,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Film,
  Handshake,
  Image as ImageIcon,
  KeyRound,
  LifeBuoy,
  Lightbulb,
  Megaphone,
  Minus,
  Palette,
  Plus,
  Repeat2,
  Send,
  ShieldCheck,
  Star,
  Ticket,
  UserCheck,
  UserMinus,
  Wallet,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { BriefSummary } from "@/components/domain/brief-summary";
import { ThreadView } from "@/components/domain/thread-view";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useToast } from "@/components/ui/toast";
import { shortDate, timeAgo, timeOf, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { creatorById, threadById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { CommissionEvent, ProductAsset } from "@/lib/types";

import { autoApproveDate, type TabId, type Workspace } from "./helpers";

const tabs: { value: TabId; label: string }[] = [
  { value: "messages", label: "Messages" },
  { value: "brief", label: "Brief" },
  { value: "activity", label: "Activity" },
  { value: "files", label: "Files" },
];

export function WorkspaceTabs({
  ws,
  tab,
  onTab,
  sectionRef,
}: {
  ws: Workspace;
  tab: TabId;
  onTab: (tab: TabId) => void;
  sectionRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <section
      ref={sectionRef}
      aria-label="Commission details"
      data-tone="paper"
      className="y-block y-pad-md flex scroll-mt-24 flex-col gap-5"
    >
      <SegmentedToggle
        label="Show"
        options={tabs}
        value={tab}
        onChange={onTab}
        size="md"
        className="w-full sm:w-fit [&>button]:flex-1"
      />
      <div key={tab} className="y-enter">
        {tab === "messages" ? <Messages ws={ws} /> : null}
        {tab === "brief" ? <BriefTab ws={ws} /> : null}
        {tab === "activity" ? <Activity ws={ws} /> : null}
        {tab === "files" ? <FilesTab ws={ws} /> : null}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Messages({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const thread = threadById(s, ws.commission.threadId);
  if (!thread) {
    return (
      <EmptyState
        headingLevel={3}
        shape="bean"
        tint="sea"
        title="No conversation yet"
        body="Messages about this commission will appear here."
      />
    );
  }
  return (
    <ThreadView
      threadId={thread.id}
      role={ws.side}
      maxHeight="min(56dvh, 560px)"
      placeholder={`Message ${ws.otherName} about this commission…`}
    />
  );
}

/* -------------------------------------------------------------------------- */

const assetIcon: Record<ProductAsset["kind"], React.ReactNode> = {
  logo: <ImageIcon size={18} aria-hidden />,
  screens: <ImageIcon size={18} aria-hidden />,
  "demo-account": <KeyRound size={18} aria-hidden />,
  "brand-guide": <Palette size={18} aria-hidden />,
  footage: <Film size={18} aria-hidden />,
};

function BriefTab({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const toast = useToast();
  const { commission, product, side, slot } = ws;
  const learnings = product?.learnings ?? [];

  return (
    <div className="flex flex-col gap-8">
      <BriefSummary brief={commission.brief} product={product} />

      {slot ? <Posting ws={ws} /> : null}

      {product ? (
        <div className="flex flex-col gap-6 border-t border-(--b-line) pt-6">
          <div className="flex flex-col gap-1">
            <h3 className="y-head">Product context</h3>
            <p className="y-small y-fg-2 max-w-[62ch]">
              {side === "business"
                ? `Saved on ${product.name} and shared with every creator you work with.`
                : `What ${ws.businessName} wants every video about ${product.name} to get right.`}
            </p>
          </div>

          {product.tone.length ? (
            <div className="flex flex-col gap-2">
              <h4 className="y-micro y-fg-2">Tone</h4>
              <div className="flex flex-wrap gap-1.5">
                {product.tone.map((word) => (
                  <Chip key={word}>{word}</Chip>
                ))}
              </div>
            </div>
          ) : null}

          {product.dos.length || product.donts.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {product.dos.length ? (
                <div className="flex flex-col gap-2">
                  <h4 className="y-micro y-fg-2">Do</h4>
                  <ul className="flex flex-col gap-2">
                    {product.dos.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
                          <Plus size={12} strokeWidth={3} aria-hidden />
                        </span>
                        <span className="y-small">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {product.donts.length ? (
                <div className="flex flex-col gap-2">
                  <h4 className="y-micro y-fg-2">Don&apos;t</h4>
                  <ul className="flex flex-col gap-2">
                    {product.donts.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-(--b-chip) shadow-[inset_0_0_0_1.5px_var(--b-line)]">
                          <Minus size={12} strokeWidth={3} aria-hidden />
                        </span>
                        <span className="y-small">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {product.assets.length ? (
            <div className="flex flex-col gap-2">
              <h4 className="y-micro y-fg-2">Assets</h4>
              <ul className="grid gap-2 md:grid-cols-2">
                {product.assets.map((asset) => (
                  <li key={asset.id} className="y-tile flex items-center gap-3 py-2 ps-4 pe-2">
                    <span className="flex-none">{assetIcon[asset.kind]}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="y-small truncate font-semibold">{asset.name}</span>
                      <span className="y-micro y-fg-2">{asset.size}</span>
                    </span>
                    <RoundIconButton
                      size="sm"
                      label={asset.kind === "demo-account" ? `Copy ${asset.name}` : `Download ${asset.name}`}
                      className="!bg-(--b-bg)"
                      onClick={() =>
                        toast({
                          message:
                            asset.kind === "demo-account"
                              ? "Demo login copied. Use it only for filming."
                              : `Downloading ${asset.name}`,
                          tone: "info",
                        })
                      }
                    >
                      {asset.kind === "demo-account" ? <KeyRound size={18} aria-hidden /> : <Download size={18} aria-hidden />}
                    </RoundIconButton>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h4 className="y-head inline-flex items-center gap-2">
                <Lightbulb size={18} aria-hidden /> Carried forward
              </h4>
              <p className="y-small y-fg-2 max-w-[62ch]">
                {learnings.length
                  ? side === "business"
                    ? "Learnings from earlier commissions for this product. Every creator sees them with the brief."
                    : "What worked (and didn't) in earlier videos for this product. Worth reading before you film."
                  : side === "business"
                    ? "Nothing saved yet. When you review a commission, tick what you learned and it shows up here next time."
                    : "No learnings saved for this product yet."}
              </p>
            </div>
            {learnings.length ? (
              <ul className="flex flex-col gap-2">
                {learnings.map((learning) => {
                  const by = learning.creatorId ? creatorById(s, learning.creatorId) : undefined;
                  const fromHere = learning.sourceCommissionId === commission.id;
                  const sourceVisible =
                    learning.sourceCommissionId &&
                    !fromHere &&
                    s.commissions.some(
                      (c) =>
                        c.id === learning.sourceCommissionId &&
                        (side === "business" ? c.businessId === commission.businessId : c.creatorId === commission.creatorId),
                    );
                  return (
                    <li key={learning.id} className="y-tile flex flex-col gap-1 p-4">
                      <p className="y-small font-medium">{learning.text}</p>
                      <p className="y-micro y-fg-2">
                        {fromHere ? "From this commission" : by ? `From work with ${by.firstName}` : "Saved by the team"} ·{" "}
                        {shortDate(learning.createdAt)}
                        {sourceVisible ? (
                          <>
                            {" · "}
                            <Link href={paths.commission(learning.sourceCommissionId!)} className="y-link">
                              View commission
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Campaign slots: where and how the approved video gets posted. */
function Posting({ ws }: { ws: Workspace }) {
  const slot = ws.slot!;
  const rows = [
    { label: "Post on", value: slot.platformName },
    { label: "Tag", value: slot.brandHandle },
    { label: "Turn on", value: slot.disclosure },
    { label: "Keep it up", value: "Until month end, so the payment unlocks" },
  ];
  return (
    <div className="flex flex-col gap-3 border-t border-(--b-line) pt-6">
      <div className="flex flex-col gap-1">
        <h3 className="y-head inline-flex items-center gap-2">
          <Megaphone size={18} aria-hidden /> Posting
        </h3>
        <p className="y-small y-fg-2 max-w-[62ch]">
          {ws.side === "business"
            ? `After you approve, ${ws.creatorName} posts it on their own account.`
            : "After approval, you post it on your own account."}
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 border-t border-(--b-line) py-3">
            <dt className="y-micro y-fg-2">{row.label}</dt>
            <dd className="y-small font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const eventIcon: Record<CommissionEvent["kind"], React.ReactNode> = {
  offer_sent: <Send size={16} aria-hidden className="y-flip" />,
  offer_accepted: <Handshake size={16} aria-hidden />,
  offer_declined: <XCircle size={16} aria-hidden />,
  hired: <UserCheck size={16} aria-hidden />,
  funded: <ShieldCheck size={16} aria-hidden />,
  brief_updated: <FileText size={16} aria-hidden />,
  delivered: <Film size={16} aria-hidden />,
  revision_requested: <Repeat2 size={16} aria-hidden />,
  approved: <CheckCircle2 size={16} aria-hidden />,
  paid: <Banknote size={16} aria-hidden />,
  reviewed: <Star size={16} aria-hidden />,
  cancelled: <Ban size={16} aria-hidden />,
  disputed: <LifeBuoy size={16} aria-hidden />,
  due_changed: <CalendarClock size={16} aria-hidden />,
  slot_accepted: <Ticket size={16} aria-hidden />,
  creator_replaced: <UserMinus size={16} aria-hidden />,
  video_rejected: <XCircle size={16} aria-hidden />,
  posted: <Megaphone size={16} aria-hidden />,
  post_verified: <BadgeCheck size={16} aria-hidden />,
  payout_available: <Wallet size={16} aria-hidden />,
};

function Activity({ ws }: { ws: Workspace }) {
  const { commission, side } = ws;
  const events = [...commission.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const who = (actor: CommissionEvent["actor"]) =>
    actor === "system" ? "Yapp" : actor === side ? "You" : actor === "business" ? ws.businessName : ws.creatorName;

  if (!events.length) {
    return (
      <div className="flex flex-col gap-6">
        <KeyDates ws={ws} />
        <EmptyState
          headingLevel={3}
          shape="pill"
          tint="sun"
          title="No activity yet"
          body="Offers, deliveries, approvals and payments are logged here as they happen."
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <KeyDates ws={ws} />
      <ol className="flex flex-col" aria-label="Activity, newest first">
        {events.map((event, index) => (
          <li key={event.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`grid size-9 flex-none place-items-center rounded-full ${
                  index === 0 ? "bg-(--b-fg) text-(--b-bg)" : "bg-(--b-chip) text-(--b-chip-fg)"
                }`}
              >
                {eventIcon[event.kind] ?? <BadgeCheck size={16} aria-hidden />}
              </span>
              {index < events.length - 1 ? <span className="w-0.5 flex-1 bg-(--b-line)" aria-hidden /> : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1.5 pb-5">
              <p className="y-small font-medium">{event.text}</p>
              <p className="y-micro y-fg-2">
                {who(event.actor)} ·{" "}
                <time dateTime={event.at}>
                  {timeAgo(event.at) === shortDate(event.at) ? (
                    `${shortDate(event.at)}, ${timeOf(event.at)}`
                  ) : (
                    <>
                      {timeAgo(event.at)}
                      <span className="y-fg-3">
                        {" "}
                        · {shortDate(event.at)}, {timeOf(event.at)}
                      </span>
                    </>
                  )}
                </time>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Key dates at a glance, above the full log. */
function KeyDates({ ws }: { ws: Workspace }) {
  const { commission, latest, slot } = ws;
  const auto = commission.status === "delivered" ? autoApproveDate(commission, latest) : undefined;
  const ended = ["completed", "cancelled", "declined"].includes(commission.status);
  const rows: { label: string; value: string }[] = slot
    ? [
        // Campaign slots have no deadline yet (deferred by the PM).
        { label: "Slot taken", value: commission.createdAt },
        ...(latest ? [{ label: `Review copy ${latest.version} uploaded`, value: latest.deliveredAt }] : []),
        ...(auto ? [{ label: "Auto-approves", value: auto }] : []),
        ...(commission.completedAt ? [{ label: "Approved", value: commission.completedAt }] : []),
        ...(commission.post?.at ? [{ label: "Posted", value: commission.post.at }] : []),
        ...(commission.withdrawableFrom && commission.payment.status === "pending"
          ? [{ label: "Withdrawable from", value: commission.withdrawableFrom }]
          : []),
      ]
    : [
        { label: commission.source === "request" ? "Hired" : "Offer sent", value: commission.createdAt },
        ...(commission.acceptedAt && commission.source !== "request"
          ? [{ label: "Accepted", value: commission.acceptedAt }]
          : []),
        ...(ended ? [] : [{ label: "Due", value: commission.dueDate }]),
        ...(latest ? [{ label: `Version ${latest.version} delivered`, value: latest.deliveredAt }] : []),
        ...(auto ? [{ label: "Auto-approves", value: auto }] : []),
        ...(commission.completedAt ? [{ label: "Completed", value: commission.completedAt }] : []),
      ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-(--b-line) pb-6 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-0.5">
          <dt className="y-micro y-fg-2">{row.label}</dt>
          <dd className="y-small y-num font-semibold">
            {weekdayDate(row.value)} <span className="y-fg-2 font-normal">· {timeOf(row.value)}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------------------------------------------------- */

function FileRow({
  name,
  meta,
  icon,
  onDownload,
}: {
  name: string;
  meta: string;
  icon: React.ReactNode;
  onDownload: (name: string) => void;
}) {
  return (
    <li className="y-tile flex items-center gap-3 py-2 ps-4 pe-2">
      <span className="flex-none">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="y-small truncate font-semibold">{name}</span>
        <span className="y-micro y-fg-2">{meta}</span>
      </span>
      <RoundIconButton size="sm" label={`Download ${name}`} className="!bg-(--b-bg)" onClick={() => onDownload(name)}>
        <Download size={18} aria-hidden />
      </RoundIconButton>
    </li>
  );
}

function FilesTab({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const toast = useToast();
  const { commission, side, product, slot } = ws;
  const thread = threadById(s, commission.threadId);
  const shared = (thread?.messages ?? []).filter(
    (m) => m.attachment && m.attachment.kind !== "video",
  );
  const versions = [...commission.deliveries].reverse();
  const download = (name: string) => toast({ message: `Downloading ${name}`, tone: "info" });

  const empty = !versions.some((d) => d.files.length) && !shared.length && !product?.assets.length;
  if (empty) {
    return (
      <EmptyState
        headingLevel={3}
        shape="ball"
        tint="sea"
        title="No files yet"
        body={
          side === "business"
            ? `Videos and files ${ws.creatorName} delivers show up here, with anything shared in messages.`
            : "Your deliveries and anything shared in messages show up here."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {versions.map((delivery) => {
        if (!delivery.files.length) return null;
        // The ordering side only gets the watermarked preview of a review copy until it's approved.
        const preview = Boolean(delivery.reviewCopy) && side === "business" && delivery.status !== "approved";
        return (
          <div key={delivery.id} className="flex flex-col gap-2">
            <h3 className="y-small font-semibold">
              {slot ? "Review copy" : "Version"} {delivery.version}
              <span className="y-fg-2 font-normal"> · {shortDate(delivery.deliveredAt)}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {delivery.files.map((file) => (
                <FileRow
                  key={file.name}
                  name={file.name}
                  meta={preview ? `${file.size} · Watermarked preview` : file.size}
                  icon={<Film size={18} aria-hidden />}
                  onDownload={(name) =>
                    toast({
                      message: preview ? `Downloading the watermarked preview of ${name}` : `Downloading ${name}`,
                      tone: "info",
                    })
                  }
                />
              ))}
            </ul>
          </div>
        );
      })}
      {shared.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="y-small font-semibold">Shared in messages</h3>
          <ul className="flex flex-col gap-2">
            {shared.map((message) => (
              <FileRow
                key={message.id}
                onDownload={download}
                name={message.attachment!.name}
                meta={`${message.from === side ? "You" : message.from === "business" ? ws.businessName : ws.creatorName} · ${shortDate(message.at)}${message.attachment!.size ? ` · ${message.attachment!.size}` : ""}`}
                icon={<FileText size={18} aria-hidden />}
              />
            ))}
          </ul>
        </div>
      ) : null}
      {product?.assets.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="y-small font-semibold">Product assets from {ws.businessName}</h3>
          <ul className="flex flex-col gap-2">
            {product.assets
              .filter((asset) => asset.kind !== "demo-account")
              .map((asset) => (
                <FileRow key={asset.id} name={asset.name} meta={asset.size} icon={assetIcon[asset.kind]} onDownload={download} />
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
