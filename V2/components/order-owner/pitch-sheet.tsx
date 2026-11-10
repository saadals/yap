"use client";

import { ArrowUpRight, Check, MessageCircle, ShieldCheck, Sparkles, Star, Undo2, X } from "lucide-react";
import { useState } from "react";

import { languageList } from "@/components/domain/chips";
import { StarRow } from "@/components/domain/stars";
import { VideoPlayer } from "@/components/domain/video-player";
import { VideoThumb } from "@/components/domain/video-thumb";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { TextArea } from "@/components/ui/field";
import { MatchExplain } from "@/components/ui/match-score";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { hasContactDetails } from "@/lib/contact";
import { compact, lengthLabel, money, num, plural, quoted, timeAgoInline, timeOf, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { cityById, reviewsForCreator, videoById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { creatorKindById, formatById } from "@/lib/taxonomy";
import type { ContentRequest, Creator, Video } from "@/lib/types";

import { RatingOrNew } from "./pitch-card";
import { budgetNote, deliveryInfo, responseLabel, type RankedPitch } from "./shared";

/** The creator's track record in one line. */
export function TrustLine({ creator }: { creator: Creator }) {
  return (
    <p className="y-small y-fg-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="text-(--b-fg)">
        <RatingOrNew creator={creator} count />
      </span>
      <span aria-hidden>·</span>
      <span>{num(creator.completed)} done</span>
      <span aria-hidden>·</span>
      <span>{creator.onTimeRate}% on time</span>
      <span aria-hidden>·</span>
      <span>{responseLabel(creator.responseHours)}</span>
    </p>
  );
}

/** Pick one of a pitch's samples: a strip of small thumbnails under the player. */
function SampleStrip({ videos, currentId, onPick }: { videos: Video[]; currentId: string; onPick: (id: string) => void }) {
  if (videos.length < 2) return null;
  return (
    <ul className="flex justify-center gap-2" aria-label="Samples">
      {videos.map((v) => (
        <li key={v.id} className="w-16">
          <button
            type="button"
            onClick={() => onPick(v.id)}
            aria-pressed={v.id === currentId}
            aria-label={`Play ${v.title}`}
            className={`block w-full rounded-(--y-r-tile) transition-opacity ${
              v.id === currentId ? "ring-2 ring-(--b-fg) ring-offset-2 ring-offset-(--b-bg)" : "opacity-70 hover:opacity-100"
            }`}
          >
            <VideoThumb video={v} frame="9:16" showHook={false} showMeta={false} decorative />
          </button>
        </li>
      ))}
    </ul>
  );
}

const videoMeta = (video: Video) =>
  [
    formatById[video.format].name,
    languageList([video.lang]),
    lengthLabel(video.durationSec),
    video.madeFor ? `Made for ${video.madeFor}` : "Spec piece",
    video.stats ? `${compact(video.stats.views)} views` : null,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * The full pitch: the idea, the message, the samples (playing in place), terms, fit, the
 * creator's record and a review or two. The footer holds the decision. Mounted only while open.
 */
export function PitchSheet({
  request,
  item,
  canHire,
  commissionId,
  onClose,
  onHire,
  onMessage,
  onDecline,
  onRestore,
  onShortlist,
}: {
  request: ContentRequest;
  item: RankedPitch;
  canHire: boolean;
  commissionId?: string;
  onClose: () => void;
  onHire: () => void;
  onMessage: () => void;
  onDecline: () => void;
  onRestore: () => void;
  onShortlist: (on: boolean) => void;
}) {
  const s = useDemo();
  const { pitch, creator, fit } = item;
  const samples = pitch.sampleIds.map((id) => videoById(s, id)).filter((v): v is Video => v !== undefined);
  const [sampleId, setSampleId] = useState(samples[0]?.id ?? "");
  const sample = samples.find((v) => v.id === sampleId) ?? samples[0];
  const city = cityById(creator.cityId);
  const budget = budgetNote(pitch.price, request.budget);
  const delivery = deliveryInfo(pitch.deliveryDays, request, creator);
  const commission = commissionId ? s.commissions.find((c) => c.id === commissionId) : undefined;
  const reviews = reviewsForCreator(s, creator.id).slice(0, 2);
  const shortlisted = pitch.status === "shortlisted";
  const declined = pitch.status === "declined";
  const hired = pitch.status === "hired";
  const invited = request.invitedCreatorIds.includes(creator.id);

  const primary = hired ? (
    commissionId ? (
      <PillButton href={paths.job(commissionId)} variant="neon" size="lg" arrow className="flex-1 justify-between ps-5">
        Open the job
      </PillButton>
    ) : null
  ) : declined ? (
    <PillButton variant="contrast" size="lg" className="flex-1" icon={<Undo2 size={18} aria-hidden />} onClick={onRestore}>
      Reconsider
    </PillButton>
  ) : canHire ? (
    <PillButton variant="neon" size="lg" arrow className="flex-1 justify-between ps-5" onClick={onHire}>
      Hire {creator.firstName} for {money(pitch.price)}
    </PillButton>
  ) : null;

  return (
    <Sheet
      open
      onClose={onClose}
      title={creator.name}
      description={[
        creatorKindById[creator.kind].name,
        city?.name,
        `pitched ${timeAgoInline(pitch.sentAt)}`,
        invited ? "you invited them" : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      width="md"
      footer={
        <div className="flex gap-2">
          {primary}
          {!hired && !declined ? (
            <RoundIconButton
              size="lg"
              tone={shortlisted ? "contrast" : "outline"}
              label={shortlisted ? `Remove ${creator.firstName} from your shortlist` : `Shortlist ${creator.firstName}`}
              aria-pressed={shortlisted}
              onClick={() => onShortlist(!shortlisted)}
            >
              <Star size={20} aria-hidden className={shortlisted ? "fill-current" : ""} />
            </RoundIconButton>
          ) : null}
          {primary ? (
            <RoundIconButton size="lg" tone="outline" label={`Message ${creator.firstName}`} onClick={onMessage}>
              <MessageCircle size={20} aria-hidden />
            </RoundIconButton>
          ) : (
            <PillButton variant="outline" size="lg" className="flex-1" icon={<MessageCircle size={18} aria-hidden />} onClick={onMessage}>
              Message {creator.firstName}
            </PillButton>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <TrustLine creator={creator} />
          <PillButton href={paths.creator(creator.handle)} variant="ghost" size="sm" className="-ms-3 w-fit" icon={<ArrowUpRight size={15} aria-hidden />}>
            View profile
          </PillButton>
        </div>

        <div className="flex flex-col gap-3">
          <p className="y-micro y-fg-2 font-medium">The idea</p>
          <p dir="auto" className="y-display text-[21px] leading-snug font-semibold tracking-[-0.015em]">
            {quoted(pitch.angle)}
          </p>
          <p dir="auto" className="y-body y-fg-2 whitespace-pre-line">
            {pitch.message}
          </p>
        </div>

        {sample ? (
          <div className="flex flex-col gap-3">
            <p className="y-micro y-fg-2 font-medium">
              {samples.length > 1 ? `${samples.length} samples ${creator.firstName} picked for you` : `A sample ${creator.firstName} picked for you`}
            </p>
            <VideoPlayer key={sample.id} video={sample} size="sm" />
            <p className="y-micro y-fg-2 text-center">{videoMeta(sample)}</p>
            <SampleStrip videos={samples} currentId={sample.id} onPick={setSampleId} />
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-4 border-y border-(--b-line) py-4">
          <div className="flex flex-col gap-0.5">
            <dt className="y-micro y-fg-2">Quote</dt>
            <dd className="y-display y-num text-[24px] leading-tight">{money(pitch.price)}</dd>
            <dd className={`y-micro ${budget.over ? "font-semibold text-(--y-warning)" : "y-fg-2"}`}>{budget.text}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="y-micro y-fg-2">First version</dt>
            <dd className="y-display y-num text-[24px] leading-tight">{plural(pitch.deliveryDays, "day")}</dd>
            {hired && commission ? (
              <dd className="y-micro y-fg-2">Due {weekdayDate(commission.dueDate)}</dd>
            ) : (
              <dd className={`y-micro ${delivery.late ? "font-semibold text-(--y-warning)" : "y-fg-2"}`}>
                {delivery.startsOn ? `Starts ${weekdayDate(delivery.startsOn)}, ready ` : "By "}
                {weekdayDate(delivery.date)}
                {delivery.late ? `, after your ${weekdayDate(request.dueDate)} date` : ""}
              </dd>
            )}
          </div>
        </dl>

        <div className="flex flex-col gap-3">
          <p className="y-head flex items-center gap-2">
            <Sparkles size={16} aria-hidden /> {fit.score}% fit
          </p>
          <MatchExplain reasons={fit.reasons} gaps={fit.gaps} />
        </div>

        {reviews.length ? (
          <div className="flex flex-col gap-3">
            <p className="y-micro y-fg-2 font-medium">
              What clients said · {plural(creator.reviewCount, "review")}
            </p>
            <ul className="flex flex-col gap-3">
              {reviews.map((review) => (
                <li key={review.id} className="y-tile flex flex-col gap-1.5 p-4">
                  <StarRow value={review.rating} size={14} />
                  <p className="y-small" dir="auto">
                    {quoted(review.text)}
                  </p>
                  <p className="y-micro y-fg-2">
                    {review.authorName}, {review.authorTitle} · {formatById[review.format].name}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!hired && !declined ? (
          <PillButton
            variant="ghost"
            size="sm"
            className="-ms-3 w-fit"
            icon={<X size={16} aria-hidden />}
            onClick={onDecline}
            aria-label={`Decline ${creator.firstName}'s pitch`}
          >
            Decline this pitch
          </PillButton>
        ) : null}
      </div>
    </Sheet>
  );
}

/** Watch a pitch's samples. Opened from a card's thumbnail. */
export function SampleSheet({
  item,
  startId,
  onClose,
  onReadPitch,
}: {
  item: RankedPitch;
  startId: string;
  onClose: () => void;
  onReadPitch: () => void;
}) {
  const s = useDemo();
  const [currentId, setCurrentId] = useState(startId);
  const videos = item.pitch.sampleIds.map((id) => videoById(s, id)).filter((v): v is Video => v !== undefined);
  const video = videos.find((v) => v.id === currentId) ?? videos[0];
  if (!video) return null;
  return (
    <Sheet
      open
      onClose={onClose}
      title={video.title}
      description={`Sample from ${item.creator.name}`}
      width="md"
      footer={
        <PillButton variant="outline" size="lg" className="w-full" onClick={onReadPitch}>
          Read {item.creator.firstName}&apos;s pitch
        </PillButton>
      }
    >
      <div className="flex flex-col gap-4">
        <VideoPlayer key={video.id} video={video} size="md" />
        <p className="y-small y-fg-2 text-center">{videoMeta(video)}</p>
        <SampleStrip videos={videos} currentId={video.id} onPick={setCurrentId} />
      </div>
    </Sheet>
  );
}

/** Message a creator about this order (opens or reuses the conversation). */
export function MessageSheet({
  creator,
  request,
  onClose,
}: {
  creator: Creator;
  request: ContentRequest;
  onClose: () => void;
}) {
  const s = useDemo();
  const toast = useToast();
  const existing = s.threads.find(
    (t) =>
      t.businessId === request.businessId &&
      t.creatorId === creator.id &&
      !t.commissionId &&
      t.requestId === request.id &&
      t.messages.length > 0,
  );
  const [text, setText] = useState(`Hi ${creator.firstName}, thanks for your pitch. `);
  const [sentThread, setSentThread] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const quick = [
    "Could you share one more sample in this style?",
    "What would your opening line be, word for word?",
    "Could you deliver a few days sooner?",
  ];

  const send = () => {
    const body = text.trim();
    if (body.length < 5) {
      setError("Write a short message first.");
      return;
    }
    const id = actions.startThread({ creatorId: creator.id, subject: request.title, text: body, requestId: request.id });
    setSentThread(id);
    toast({ message: `Message sent to ${creator.firstName}` });
  };

  if (sentThread) {
    return (
      <Sheet open onClose={onClose} title={`Sent to ${creator.firstName}`} width="sm">
        <div className="flex flex-col gap-4">
          <div className="y-tile flex items-center gap-3 p-4">
            <span className="grid size-9 flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg)">
              <Check size={16} aria-hidden />
            </span>
            <p className="y-small">
              {creator.firstName} usually {responseLabel(creator.responseHours)}. We&apos;ll let you know when they do.
            </p>
          </div>
          <PillButton href={paths.messages(sentThread)} variant="contrast" arrow className="justify-between ps-5">
            Open the conversation
          </PillButton>
          <PillButton variant="ghost" onClick={onClose}>
            Back to the pitch
          </PillButton>
        </div>
      </Sheet>
    );
  }

  const last = existing?.messages.slice(-2) ?? [];
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Message ${creator.firstName}`}
      description={`About “${request.title}”`}
      width="sm"
      footer={
        <PillButton variant="contrast" size="lg" className="w-full" onClick={send}>
          Send message
        </PillButton>
      }
    >
      <div className="flex flex-col gap-4">
        {existing ? (
          <div className="y-tile flex flex-col gap-2 p-4">
            <p className="y-micro y-fg-2">You&apos;ve talked about this order</p>
            {last.map((m) => (
              <p key={m.id} className="y-small">
                <span className="font-semibold">{m.from === "business" ? "You" : m.from === "creator" ? creator.firstName : "Yapp"}: </span>
                <span dir="auto">{m.text}</span>
                <span className="y-micro y-fg-3"> · {timeOf(m.at)}</span>
              </p>
            ))}
            <PillButton href={paths.messages(existing.id)} size="sm" variant="ghost" className="-ms-3 w-fit">
              Open the full conversation
            </PillButton>
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <FaceAvatar id={creator.id} name="" size={36} />
          <p className="y-small y-fg-2">{creator.firstName} {responseLabel(creator.responseHours)}.</p>
        </div>
        <TextArea
          label="Message"
          required
          rows={5}
          value={text}
          data-autofocus
          error={error}
          onChange={(event) => {
            setText(event.target.value);
            if (error) setError(null);
          }}
        />
        {hasContactDetails(text) ? (
          <p className="y-micro y-fg-2 -mt-2 flex items-start gap-1.5 px-1" role="status">
            <ShieldCheck size={14} aria-hidden className="mt-0.5 flex-none" />
            Contact details are hidden when you send. Keep it on Yapp so payment protection covers the work.
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <p className="y-micro y-fg-2">Quick questions</p>
          <div className="flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                className="y-chip y-hoverable min-h-9 cursor-pointer text-start"
                onClick={() => setText((current) => `${current.trim()} ${q}`.trim())}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
