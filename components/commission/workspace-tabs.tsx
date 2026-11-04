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
  Minus,
  Palette,
  Plus,
  Repeat2,
  Send,
  ShieldCheck,
  Star,
  UserCheck,
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
import { shortDate, timeAgo, timeOf } from "@/lib/format";
import { creatorById, threadById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import type { CommissionEvent, ProductAsset } from "@/lib/types";

import type { TabId, Workspace } from "./helpers";

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
      role={ws.role}
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
  const { commission, product, role } = ws;
  const learnings = product?.learnings ?? [];

  return (
    <div className="flex flex-col gap-8">
      <BriefSummary brief={commission.brief} product={product} />

      {product ? (
        <div className="flex flex-col gap-6 border-t border-(--b-line) pt-6">
          <div className="flex flex-col gap-1">
            <h3 className="y-head">Product context</h3>
            <p className="y-small y-fg-2 max-w-[62ch]">
              {role === "business"
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
                  ? role === "business"
                    ? "Learnings from earlier commissions for this product. Every creator sees them with the brief."
                    : "What worked (and didn't) in earlier videos for this product. Worth reading before you film."
                  : role === "business"
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
                        (role === "business" ? c.businessId === commission.businessId : c.creatorId === commission.creatorId),
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
                            <Link href={`/${role}/commissions/${learning.sourceCommissionId}`} className="y-link">
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
};

function Activity({ ws }: { ws: Workspace }) {
  const { commission, role } = ws;
  const events = [...commission.events].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const who = (actor: CommissionEvent["actor"]) =>
    actor === "system" ? "Yapp" : actor === role ? "You" : actor === "business" ? ws.businessName : ws.creatorName;

  if (!events.length) {
    return (
      <EmptyState
        headingLevel={3}
        shape="pill"
        tint="sun"
        title="No activity yet"
        body="Offers, deliveries, approvals and payments are logged here as they happen."
      />
    );
  }
  return (
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
  const { commission, role, product } = ws;
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
          role === "business"
            ? `Videos and files ${ws.creatorName} delivers show up here, with anything shared in messages.`
            : "Your deliveries and anything shared in messages show up here."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {versions.map((delivery) =>
        delivery.files.length ? (
          <div key={delivery.id} className="flex flex-col gap-2">
            <h3 className="y-small font-semibold">
              Version {delivery.version}
              <span className="y-fg-2 font-normal"> · {shortDate(delivery.deliveredAt)}</span>
            </h3>
            <ul className="flex flex-col gap-2">
              {delivery.files.map((file) => (
                <FileRow key={file.name} name={file.name} meta={file.size} icon={<Film size={18} aria-hidden />} onDownload={download} />
              ))}
            </ul>
          </div>
        ) : null,
      )}
      {shared.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="y-small font-semibold">Shared in messages</h3>
          <ul className="flex flex-col gap-2">
            {shared.map((message) => (
              <FileRow
                key={message.id}
                onDownload={download}
                name={message.attachment!.name}
                meta={`${message.from === role ? "You" : message.from === "business" ? ws.businessName : ws.creatorName} · ${shortDate(message.at)}${message.attachment!.size ? ` · ${message.attachment!.size}` : ""}`}
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
