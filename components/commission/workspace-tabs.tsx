"use client";

import { Download, FileText, Film, Image as ImageIcon, KeyRound, Lightbulb, Palette, Video as VideoIcon } from "lucide-react";
import Link from "next/link";

import { ThreadView } from "@/components/domain/thread-view";
import { DefinitionList } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useToast } from "@/components/ui/toast";
import { bytesLabel } from "@/lib/files";
import { clock, lengthLabel, plural, quoted, shortDate, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { commentAuthor, creatorById, jobTypeOf, threadById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import {
  addonById,
  aspects,
  CAMPAIGN_KEEP_LIVE_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  formatById,
  jobTypeById,
  languageById,
  platformById,
  usageById,
} from "@/lib/taxonomy";
import type { BriefAttachment, CommissionEvent, ProductAsset } from "@/lib/types";

import { categoryOf, type TabId, whenLabel, type Workspace } from "./helpers";

const tabs: { value: TabId; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "messages", label: "Messages" },
  { value: "brief", label: "Brief" },
  { value: "files", label: "Files" },
];

/** The tabs card under Deliveries (Work spec 6.8.4): Activity · Messages · Brief · Files. */
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
      aria-label="Order details"
      data-tone="paper"
      className="y-block y-ord-card y-ord-body scroll-mt-28"
    >
      <SegmentedToggle label="Show" options={tabs} value={tab} onChange={onTab} size="md" fill />
      <div key={tab} className="y-enter pt-[18px]">
        {tab === "activity" ? <Activity ws={ws} /> : null}
        {tab === "messages" ? <Messages ws={ws} /> : null}
        {tab === "brief" ? <BriefTab ws={ws} /> : null}
        {tab === "files" ? <FilesTab ws={ws} /> : null}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Activity                                                                    */
/* -------------------------------------------------------------------------- */

const moneyKinds: CommissionEvent["kind"][] = ["funded", "paid", "payout_available"];
const badKinds: CommissionEvent["kind"][] = ["cancelled", "disputed", "video_rejected", "creator_replaced", "offer_declined"];

type Row = { id: string; at: string; text: string; look?: "money" | "bad" };

/** Newest first; money events marked green, endings and disputes red. Comments join the log. */
function Activity({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const { commission } = ws;
  const rows: Row[] = commission.events.map((event) => ({
    id: event.id,
    at: event.at,
    text: event.text,
    look: moneyKinds.includes(event.kind) ? "money" : badKinds.includes(event.kind) ? "bad" : undefined,
  }));
  for (const delivery of commission.deliveries) {
    for (const comment of delivery.comments) {
      if (comment.deletedAt) continue;
      const who = commentAuthor(s, commission, comment);
      const name = who.own ? "you" : who.firstName;
      rows.push({
        id: comment.id,
        at: comment.createdAt,
        text:
          comment.atSec === null
            ? `General comment from ${name} on version ${delivery.version}`
            : `Comment from ${name} at ${clock(comment.atSec)} on version ${delivery.version}`,
      });
    }
  }
  rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  if (!rows.length) {
    return (
      <EmptyState
        headingLevel={3}
        title="No activity yet"
        body="Offers, deliveries, comments, approvals and payments are logged here as they happen."
      />
    );
  }
  return (
    <ol className="y-ord-act" aria-label="Activity, newest first">
      {rows.map((row) => (
        <li key={row.id} data-look={row.look}>
          <span className="sr-only">{row.look === "money" ? "Money: " : ""}</span>
          {row.text}
          <small>
            <time dateTime={row.at}>{whenLabel(row.at)}</time>
          </small>
        </li>
      ))}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                    */
/* -------------------------------------------------------------------------- */

function Messages({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const thread = threadById(s, ws.commission.threadId);
  if (!thread) {
    return (
      <EmptyState
        headingLevel={3}
        title="No conversation yet"
        body="Messages about this order show up here."
      />
    );
  }
  return (
    <ThreadView
      threadId={thread.id}
      role={ws.side}
      maxHeight="min(56dvh, 560px)"
      placeholder={`Message ${ws.otherName}…`}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Brief                                                                       */
/* -------------------------------------------------------------------------- */

const bullets = (items: string[]) =>
  items.length === 1 ? (
    items[0]
  ) : (
    <ul className="y-ord-bullets">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );

function BriefTab({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const { commission, product, side, slot, adCopy } = ws;
  const brief = commission.brief;
  const format = formatById[brief.format];
  const learnings = product?.learnings ?? [];
  const category = categoryOf(ws);
  const deadlineDays = slot?.terms?.deadlineDays;

  const items: { term: React.ReactNode; detail: React.ReactNode; wide?: boolean }[] = [
    { term: "Product", detail: product ? product.name : commission.title },
    {
      term: "Job type",
      detail: adCopy ? jobTypeById[jobTypeOf(commission)].name : `${jobTypeById[jobTypeOf(commission)].name} · ${format?.name ?? ""}`,
    },
  ];
  if (adCopy) {
    if (brief.copy?.pieces.length) items.push({ term: "What to write", detail: bullets(brief.copy.pieces) });
    if (brief.copy?.placements.length)
      items.push({ term: "Where it runs", detail: brief.copy.placements.map((id) => platformById[id].name).join(", ") });
  } else {
    items.push({
      term: "Length",
      detail: `${brief.videoCount > 1 ? `${plural(brief.videoCount, "video")} · ` : ""}About ${lengthLabel(brief.durationSec)} · ${aspects.find((a) => a.id === brief.aspect)?.id ?? brief.aspect}`,
    });
    items.push(
      slot
        ? { term: "Post on", detail: `${slot.platformName} · tag ${slot.brandHandle}` }
        : { term: "Platform", detail: brief.platforms.map((id) => platformById[id].name).join(", ") || "Any" },
    );
  }
  if (brief.hook) items.push({ term: "Hook", detail: brief.hook });
  if (brief.mustInclude.length) items.push({ term: adCopy ? "Must include" : "Must show", detail: bullets(brief.mustInclude) });
  if (brief.avoid.length) items.push({ term: "Don't say", detail: bullets(brief.avoid) });
  if (category) items.push({ term: "Category", detail: category });
  items.push({ term: "Language", detail: brief.languages.map((id) => languageById[id].name).join(", ") });
  items.push({
    term: "Deadline",
    detail: deadlineDays
      ? `Upload within ${plural(deadlineDays, "day")} of picking · set by ${ws.businessName}`
      : `Due ${weekdayDate(commission.dueDate)} · set by ${ws.businessName}`,
  });
  items.push({
    term: "Usage",
    detail: `${usageById[brief.usage].name} · included in the price${adCopy ? "" : " · raw footage included"}`,
  });
  if (!adCopy) items.push({ term: "On camera", detail: brief.onCamera ? "Creator on camera" : "Voiceover only" });
  items.push({ term: "Who it's for", detail: brief.audience, wide: true });
  items.push({ term: "Goal", detail: brief.goal, wide: true });
  items.push({ term: "Key message", detail: quoted(brief.keyMessage), wide: true });
  if (brief.addons.length)
    items.push({ term: "Add-ons", detail: brief.addons.map((id) => addonById[id].name).join(", ") });
  if (brief.references.length)
    items.push({
      term: "References",
      detail: bullets(brief.references.map((r) => (r.note ? `${r.label}: ${r.note}` : r.label))),
      wide: true,
    });
  if (brief.notes) items.push({ term: "Notes", detail: brief.notes, wide: true });
  if (slot) {
    items.push({ term: "Label", detail: slot.disclosure });
    items.push({
      term: "Keep it up",
      detail: `${CAMPAIGN_KEEP_LIVE_DAYS} days from verification · paid ${CAMPAIGN_RELEASE_DAYS} days after verification, if it's still up`,
    });
  }

  const files = brief.attachments ?? [];
  const assets = product?.assets ?? [];

  return (
    <div className="flex flex-col gap-8">
      <DefinitionList items={items} />

      {files.length || assets.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="y-ord-subh">Files from {ws.businessName}</h3>
          <ul className="y-ord-files">
            {files.map((file) => (
              <AttachmentRow key={file.id} file={file} />
            ))}
            {assets.map((asset) => (
              <AssetRow key={asset.id} asset={asset} />
            ))}
          </ul>
        </div>
      ) : null}

      {product ? (
        <div className="flex flex-col gap-3">
          <h3 className="y-ord-subh inline-flex items-center gap-2">
            <Lightbulb size={16} aria-hidden /> Carried forward from {product.name}
          </h3>
          {product.tone.length || product.dos.length || product.donts.length ? (
            <DefinitionList
              items={[
                ...(product.tone.length ? [{ term: "Tone", detail: product.tone.join(", ") }] : []),
                ...(product.dos.length ? [{ term: "Do", detail: bullets(product.dos) }] : []),
                ...(product.donts.length ? [{ term: "Don't", detail: bullets(product.donts) }] : []),
              ]}
            />
          ) : null}
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
                  <li key={learning.id} className="y-tile flex flex-col gap-1 px-4 py-3">
                    <p className="y-small font-medium">{learning.text}</p>
                    <p className="y-micro y-fg-2">
                      {fromHere ? "From this order" : by ? `From work with ${by.firstName}` : "Saved by the team"} ·{" "}
                      {shortDate(learning.createdAt)}
                      {sourceVisible ? (
                        <>
                          {" · "}
                          <Link href={paths.commission(learning.sourceCommissionId!)} className="y-link">
                            View order
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="y-small y-fg-2 max-w-[62ch]">
              {side === "business"
                ? "Nothing saved yet. When you review an order, tick what you learned and it shows up here next time."
                : "No learnings saved for this product yet."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

const assetIcon: Record<ProductAsset["kind"], React.ReactNode> = {
  logo: <ImageIcon size={18} aria-hidden />,
  screens: <ImageIcon size={18} aria-hidden />,
  "demo-account": <KeyRound size={18} aria-hidden />,
  "brand-guide": <Palette size={18} aria-hidden />,
  footage: <Film size={18} aria-hidden />,
};

const attachmentIcon: Record<BriefAttachment["kind"], React.ReactNode> = {
  document: <FileText size={18} aria-hidden />,
  image: <ImageIcon size={18} aria-hidden />,
  video: <VideoIcon size={18} aria-hidden />,
};

function FileRow({
  icon,
  name,
  meta,
  action = "Download",
  onAction,
}: {
  icon: React.ReactNode;
  name: string;
  meta: string;
  action?: string;
  onAction: () => void;
}) {
  return (
    <li className="y-ord-file">
      <span className="y-ord-file-ic">{icon}</span>
      <span className="min-w-0">
        <b className="block truncate font-semibold">{name}</b>
        <small className="y-fg-2">{meta}</small>
      </span>
      <button type="button" className="y-ord-ghost" onClick={onAction}>
        {action === "Download" ? <Download size={15} aria-hidden /> : <KeyRound size={15} aria-hidden />}
        {action}
        <span className="sr-only"> {name}</span>
      </button>
    </li>
  );
}

function AttachmentRow({ file }: { file: BriefAttachment }) {
  const toast = useToast();
  return (
    <FileRow
      icon={attachmentIcon[file.kind]}
      name={file.name}
      meta={`${bytesLabel(file.bytes)}${file.durationSec ? ` · ${clock(file.durationSec)}` : ""}`}
      onAction={() => toast({ message: `Downloading ${file.name}`, tone: "info" })}
    />
  );
}

function AssetRow({ asset }: { asset: ProductAsset }) {
  const toast = useToast();
  const demo = asset.kind === "demo-account";
  return (
    <FileRow
      icon={assetIcon[asset.kind]}
      name={asset.name}
      meta={demo ? "Login details · use it only for filming" : asset.size}
      action={demo ? "Copy" : "Download"}
      onAction={() =>
        toast({ message: demo ? "Demo login copied. Use it only for filming." : `Downloading ${asset.name}`, tone: "info" })
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Files                                                                       */
/* -------------------------------------------------------------------------- */

/** The review copy until approval; then the clean file and the raw footage, which is included. */
function FilesTab({ ws }: { ws: Workspace }) {
  const s = useDemo();
  const toast = useToast();
  const { commission, side, product, adCopy } = ws;
  const thread = threadById(s, commission.threadId);
  const shared = (thread?.messages ?? []).filter((m) => m.attachment && m.attachment.kind !== "video");
  const versions = [...commission.deliveries].reverse();
  const download = (name: string, how = "") => toast({ message: `Downloading ${how}${name}`, tone: "info" });
  const brandFiles = commission.brief.attachments ?? [];
  const assets = product?.assets ?? [];
  const slugOf = (name: string) => name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]?review[_-]?copy[_-]?/i, "");

  if (!versions.length && !shared.length && !brandFiles.length && !assets.length) {
    return (
      <EmptyState
        headingLevel={3}
        title="No files yet"
        body={
          side === "business"
            ? `What ${ws.creatorName} delivers shows up here, with anything shared in Messages.`
            : "Your deliveries and anything shared in Messages show up here."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {versions.map((delivery) => {
        if (!delivery.files.length && !delivery.text) return null;
        const approved = delivery.status === "approved";
        // The brand gets the watermarked review copy until approval, then the clean file.
        const preview = side === "business" && !approved && !adCopy;
        const firstVideo = delivery.files.find((f) => !f.kind || f.kind === "video");
        return (
          <div key={delivery.id} className="flex flex-col gap-2">
            <h3 className="y-ord-subh">
              Version {delivery.version}
              <span className="y-fg-2 font-normal">
                {" "}
                · {shortDate(delivery.deliveredAt)}
                {approved ? " · approved" : ""}
              </span>
            </h3>
            <ul className="y-ord-files">
              {delivery.files.map((file) => {
                const video = !file.kind || file.kind === "video";
                const label = adCopy
                  ? approved
                    ? "Final copy"
                    : "Document"
                  : video
                    ? preview
                      ? "Review copy · watermarked"
                      : approved
                        ? "Clean file, no watermark"
                        : "Your upload"
                    : file.kind === "subtitles"
                      ? "Subtitles"
                      : "File";
                return (
                  <FileRow
                    key={file.name}
                    icon={video ? <Film size={18} aria-hidden /> : <FileText size={18} aria-hidden />}
                    name={file.name}
                    meta={`${label} · ${file.size}`}
                    onAction={() => download(file.name, video && preview ? "the watermarked review copy of " : "")}
                  />
                );
              })}
              {approved && !adCopy ? (
                <FileRow
                  icon={<Film size={18} aria-hidden />}
                  name={`${slugOf(firstVideo?.name ?? "raw-footage")}_raw_footage.zip`}
                  meta="Raw footage · included with every approved video"
                  onAction={() => download("the raw footage")}
                />
              ) : null}
            </ul>
          </div>
        );
      })}

      {brandFiles.length || assets.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="y-ord-subh">From {ws.businessName}</h3>
          <ul className="y-ord-files">
            {brandFiles.map((file) => (
              <AttachmentRow key={file.id} file={file} />
            ))}
            {assets.map((asset) => (
              <AssetRow key={asset.id} asset={asset} />
            ))}
          </ul>
        </div>
      ) : null}

      {shared.length ? (
        <div className="flex flex-col gap-2">
          <h3 className="y-ord-subh">Shared in Messages</h3>
          <ul className="y-ord-files">
            {shared.map((message) => (
              <FileRow
                key={message.id}
                icon={<FileText size={18} aria-hidden />}
                name={message.attachment!.name}
                meta={`${message.from === side ? "You" : message.from === "business" ? ws.businessName : ws.creatorName} · ${shortDate(message.at)}${message.attachment!.size ? ` · ${message.attachment!.size}` : ""}`}
                onAction={() => download(message.attachment!.name)}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
