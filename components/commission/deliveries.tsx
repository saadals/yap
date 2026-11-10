"use client";

import { Download, FileText, MessageCircle } from "lucide-react";
import { useCallback, useState } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { CardHead } from "@/components/ui/page";
import { useToast } from "@/components/ui/toast";
import { plural } from "@/lib/format";
import { commentCounts, isTextDelivery, visibleComments } from "@/lib/selectors";
import type { Delivery, DeliveryComment } from "@/lib/types";

import { CommentsPanel } from "./comments-panel";
import { versionLabel, type Workspace } from "./helpers";
import { OrderPlayer, PlayerPlaceholder } from "./order-player";

/** Open one version, and optionally highlight one comment (from `?version=`, `?comment=` or a link). */
export type DeliveriesRequest = { deliveryId?: string; commentId?: string; key: number };

type Seek = { at: number; key: number; id: string };

/**
 * The Deliveries card (Work spec 6.8.3): version tabs newest first, each with its comment count
 * and a dot while it has comments this side hadn't seen; the player (or, for ad copy, the copy)
 * on the left and the comments on the right, side by side when the card is wide enough.
 */
export function Deliveries({
  ws,
  request,
  fresh,
  sectionRef,
}: {
  ws: Workspace;
  request?: DeliveriesRequest;
  fresh: ReadonlySet<string>;
  sectionRef: React.RefObject<HTMLElement | null>;
}) {
  const { commission, side, adCopy } = ws;
  const deliveries = commission.deliveries;
  const latest = deliveries[deliveries.length - 1] as Delivery | undefined;
  const [picked, setPicked] = useState<{ id: string; count: number } | null>(null);
  const [viewed, setViewed] = useState<ReadonlySet<string>>(() => new Set(latest ? [latest.id] : []));
  const [activeId, setActiveId] = useState<string | undefined>();
  const [seek, setSeek] = useState<Seek | null>(null);
  const [time, setTime] = useState<{ id: string; t: number }>({ id: "", t: 0 });
  const [seenRequest, setSeenRequest] = useState(0);

  // Requests from outside (the URL, a "View" line in Messages): derived during render.
  if (request && request.key !== seenRequest) {
    setSeenRequest(request.key);
    const owner = request.commentId
      ? deliveries.find((d) =>
          d.comments.some((c) => c.id === request.commentId || c.replies.some((r) => r.id === request.commentId)),
        )
      : undefined;
    const target = owner ?? deliveries.find((d) => d.id === request.deliveryId);
    if (target) {
      setPicked({ id: target.id, count: deliveries.length });
      if (!viewed.has(target.id)) setViewed(new Set([...viewed, target.id]));
      const comment = owner
        ? target.comments.find((c) => c.id === request.commentId || c.replies.some((r) => r.id === request.commentId))
        : undefined;
      setActiveId(comment?.id);
      if (comment && comment.atSec !== null) setSeek({ at: comment.atSec, key: (seek?.key ?? 0) + 1, id: target.id });
    }
  }

  // A newly delivered version takes over from an earlier pick.
  const selected =
    (picked && picked.count === deliveries.length ? deliveries.find((d) => d.id === picked.id) : undefined) ?? latest;
  const selectedId = selected?.id ?? "";
  const now = time.id === selectedId ? time.t : 0;
  const onTime = useCallback((t: number) => setTime({ id: selectedId, t }), [selectedId]);

  const select = (delivery: Delivery) => {
    setPicked({ id: delivery.id, count: deliveries.length });
    setActiveId(undefined);
    if (!viewed.has(delivery.id)) setViewed(new Set([...viewed, delivery.id]));
  };

  const seekTo = (comment: DeliveryComment) => {
    setActiveId(comment.id);
    const at = comment.atSec;
    if (at === null) return;
    setSeek((current) => ({ at, key: (current?.key ?? 0) + 1, id: selectedId }));
  };

  const meta = deliveries.length
    ? `${plural(deliveries.length, "version")} · ${commission.revisionsUsed} of ${commission.revisionsIncluded} revisions used`
    : "Nothing uploaded yet";
  // The creator sees the version they're making next as a quiet tab.
  const making =
    side === "creator" && (commission.status === "revision" || (commission.status === "in_progress" && deliveries.length > 0))
      ? deliveries.length + 1
      : undefined;

  return (
    <section
      ref={sectionRef}
      id="deliveries"
      data-tone="paper"
      aria-labelledby="deliveries-title"
      className="y-block y-ord-card y-ord-body scroll-mt-28"
    >
      <CardHead id="deliveries-title" as="h2" title="Deliveries" aside={meta} />

      {deliveries.length ? (
        <div className="y-ord-vtabs" role="group" aria-label="Versions">
          {making ? (
            <span className="y-ord-vtab" data-pending="true">
              <span className="y-ord-vtab-thumb" aria-hidden />v{making} · Not sent yet
            </span>
          ) : null}
          {[...deliveries].reverse().map((delivery) => {
            const count = commentCounts(delivery).total;
            const unread =
              !viewed.has(delivery.id) &&
              delivery.comments.some((c) => fresh.has(c.id) || c.replies.some((r) => fresh.has(r.id)));
            return (
              <button
                key={delivery.id}
                type="button"
                className="y-ord-vtab"
                aria-pressed={delivery.id === selectedId}
                onClick={() => select(delivery)}
              >
                <span className="y-ord-vtab-thumb" aria-hidden>
                  {delivery.video ? (
                    <VideoThumb video={delivery.video} frame="9:16" showHook={false} showMeta={false} rounded={false} decorative />
                  ) : (
                    <FileText size={14} />
                  )}
                </span>
                v{delivery.version} · {versionLabel(delivery, side)}
                {count ? (
                  <span className="y-ord-cbadge" data-unread={unread ? "true" : undefined}>
                    <MessageCircle size={14} aria-hidden />
                    {count}
                    <span className="sr-only">
                      {" "}
                      {plural(count, "comment")}
                      {unread ? ", new" : ""}
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="y-ord-rv">
        <div className="y-ord-rv-grid">
          <div className="min-w-0">
            {!selected ? (
              <>
                {adCopy ? (
                  <div className="y-ord-copy" data-empty="true">
                    <p>
                      {side === "creator"
                        ? "Your copy shows here after you send it."
                        : `${ws.creatorName}'s copy shows here when it's delivered.`}
                    </p>
                  </div>
                ) : (
                  <PlayerPlaceholder>
                    {side === "creator"
                      ? "Your version 1 will play here after you upload it."
                      : `${ws.creatorName}'s version 1 will play here when it's delivered.`}
                  </PlayerPlaceholder>
                )}
                <p className="y-ord-dnote">
                  {side === "creator"
                    ? adCopy
                      ? "Type it in or attach a document: PDF, DOC, DOCX or TXT."
                      : "Upload from your computer or phone. MP4 or MOV, 9:16."
                    : adCopy
                      ? "You read it here and comment before you approve."
                      : "You review a watermarked copy first, then get the clean file and raw footage when you approve."}
                </p>
              </>
            ) : isTextDelivery(selected) ? (
              <CopyBlock delivery={selected} />
            ) : selected.video ? (
              <OrderPlayer
                key={`player-${selectedId}`}
                video={selected.video}
                comments={visibleComments(selected)}
                seek={seek && seek.id === selectedId ? seek : undefined}
                onTime={onTime}
                activeId={activeId}
                onPin={(comment) => setActiveId(comment.id)}
                watermark={side === "business" && selected.status !== "approved"}
              />
            ) : null}

            {selected ? <PlayerNote ws={ws} delivery={selected} /> : null}
            {selected?.note ? (
              <DeliveryNote
                key={`note-${selectedId}`}
                label={side === "creator" ? "Your note" : `${ws.creatorName}'s note`}
                text={selected.note}
              />
            ) : null}
          </div>

          {selected ? (
            <CommentsPanel
              key={selectedId}
              ws={ws}
              delivery={selected}
              time={now}
              activeId={activeId}
              onSeek={seekTo}
              onActivate={setActiveId}
              fresh={fresh}
            />
          ) : (
            <div className="y-ord-cpanel">
              <div className="y-ord-chead">
                <h3>
                  Comments <span className="y-ord-chead-n">(0)</span>
                </h3>
              </div>
              <p className="y-ord-cempty">
                {side === "creator"
                  ? `No comments yet. When ${ws.otherName} ${adCopy ? "reads your copy" : "watches your version"}, their notes show up here.`
                  : `Comments open when version 1 is in. Only you and ${ws.otherName} see them.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** The line under the player: what the viewer is looking at (Work spec 6.8.3). */
function PlayerNote({ ws, delivery }: { ws: Workspace; delivery: Delivery }) {
  const { side, adCopy } = ws;
  const approved = delivery.status === "approved";
  if (adCopy) {
    return (
      <p className="y-ord-dnote">
        {approved
          ? side === "business"
            ? "Approved. The final copy and its document are in Files."
            : `${ws.businessName} approved this copy.`
          : side === "business"
            ? "Read it here and leave comments on the right. The document is in Files."
            : `${ws.businessName} reads this and comments on the right.`}
      </p>
    );
  }
  if (side === "business") {
    return approved ? (
      <p className="y-ord-dnote">
        <b>Approved.</b> The clean file and raw footage are in Files.
      </p>
    ) : (
      <p className="y-ord-dnote">
        <b>Watermarked review copy.</b>{" "}
        {delivery.status === "changes_requested"
          ? "You asked for changes on this version."
          : "You get the clean file and raw footage when you approve."}
      </p>
    );
  }
  return (
    <p className="y-ord-dnote">
      {approved
        ? `${ws.businessName} approved this version and has the clean file.`
        : `${ws.businessName} sees a watermarked copy until they approve.`}
    </p>
  );
}

/** Ad copy: the delivered text, as written, with its documents. */
function CopyBlock({ delivery }: { delivery: Delivery }) {
  const toast = useToast();
  return (
    <div className="y-ord-copy">
      <h3 className="y-ord-copy-h">
        <FileText size={14} aria-hidden /> The copy · version {delivery.version}
      </h3>
      {delivery.text ? (
        <p className="y-ord-copy-text">{delivery.text}</p>
      ) : (
        <p className="y-small y-fg-2">The copy is in the attached document.</p>
      )}
      {delivery.files.length ? (
        <ul className="y-ord-copy-files" aria-label="Documents">
          {delivery.files.map((file) => (
            <li key={file.name}>
              <FileText size={16} aria-hidden className="flex-none" />
              <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
              <span className="y-fg-2 y-num flex-none">{file.size}</span>
              <button
                type="button"
                className="y-ord-iconbtn"
                aria-label={`Download ${file.name}`}
                onClick={() => toast({ message: `Downloading ${file.name}`, tone: "info" })}
              >
                <Download size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The creator's note on a version: small, clamped to three lines with "Show more". */
function DeliveryNote({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 180;
  return (
    <div className="mt-3 flex flex-col gap-1">
      <p className={`y-small y-fg-2 whitespace-pre-line ${long && !open ? "line-clamp-3" : ""}`}>
        <span className="font-semibold text-(--y-ink)">{label}: </span>
        {text}
      </p>
      {long ? (
        <button
          type="button"
          className="y-micro y-link y-hit w-fit font-semibold"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}
