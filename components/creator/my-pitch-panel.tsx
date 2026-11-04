"use client";

import { MessageCircle, Pencil, Search } from "lucide-react";

import { PitchBadge } from "@/components/domain/status-badge";
import { VideoThumb } from "@/components/domain/video-thumb";
import { PillButton } from "@/components/ui/pill-button";
import { at } from "@/lib/clock";
import { money, plural, weekdayDate } from "@/lib/format";
import { useDemo } from "@/lib/store";
import { videoById } from "@/lib/selectors";
import type { Business, ContentRequest, Pitch, Video } from "@/lib/types";

import { commissionForPitch, pitchNextStep } from "./pitch-helpers";
import { PitchTimeline, WithdrawPitchButton } from "./pitch-status";

/** The creator's own pitch on a request: status, timeline, what they sent, and next actions. */
export function MyPitchPanel({
  pitch,
  request,
  business,
  onEdit,
}: {
  pitch: Pitch;
  request: ContentRequest;
  business?: Business;
  onEdit: () => void;
}) {
  const s = useDemo();
  const businessName = business?.name ?? "The business";
  const editable = request.status === "open" && (pitch.status === "sent" || pitch.status === "viewed");
  const withdrawable = editable || (request.status === "open" && pitch.status === "shortlisted");
  const commission = pitch.status === "hired" ? commissionForPitch(s, pitch) : undefined;
  const samples = pitch.sampleIds
    .map((id) => videoById(s, id))
    .filter((v): v is Video => Boolean(v));
  const closedForOthers = request.status !== "open" && pitch.status !== "hired";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="y-micro y-fg-2">Your pitch</p>
          <h2 className="y-display y-title">
            {money(pitch.price)} · {plural(pitch.deliveryDays, "day")}
          </h2>
        </div>
        <PitchBadge status={pitch.status} />
      </div>

      <PitchTimeline pitch={pitch} />

      <p className="y-body max-w-[62ch] font-medium" aria-live="polite">
        {closedForOthers && pitch.status !== "declined"
          ? `${businessName} has closed this request, so it's no longer taking pitches.`
          : pitchNextStep(pitch.status, businessName)}
      </p>

      <div className="y-tile flex flex-col gap-4 p-4 md:p-5">
        <div className="flex flex-col gap-1">
          <p className="y-micro y-fg-2">Angle</p>
          <p className="y-display text-[19px] leading-snug">&ldquo;{pitch.angle}&rdquo;</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="y-micro y-fg-2">Message</p>
          <p className="y-small max-w-[62ch] whitespace-pre-line">{pitch.message}</p>
        </div>
        <p className="y-micro y-fg-2">
          First version promised {plural(pitch.deliveryDays, "day")} after hiring (around{" "}
          {weekdayDate(at(pitch.deliveryDays, "18:00"))} if hired today).
        </p>
        {samples.length ? (
          <div className="flex flex-col gap-2">
            <p className="y-micro y-fg-2">{plural(samples.length, "sample")}</p>
            <div className="grid max-w-md grid-cols-3 gap-2">
              {samples.map((video) => (
                <div key={video.id} className="flex flex-col gap-1.5">
                  <VideoThumb video={video} frame="4:5" showHook={false} decorative />
                  <span className="y-micro y-clamp-2">{video.title}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {pitch.status === "hired" ? (
          commission ? (
            <PillButton href={`/creator/commissions/${commission.id}`} variant="contrast" arrow>
              Open the commission
            </PillButton>
          ) : (
            <PillButton href="/creator/commissions" variant="contrast" arrow>
              Go to commissions
            </PillButton>
          )
        ) : null}
        {editable ? (
          <PillButton variant="contrast" icon={<Pencil size={16} aria-hidden />} onClick={onEdit}>
            Edit pitch
          </PillButton>
        ) : null}
        {pitch.status === "shortlisted" ? (
          <PillButton href="/creator/messages" variant="outline" icon={<MessageCircle size={16} aria-hidden />}>
            Check messages
          </PillButton>
        ) : null}
        {withdrawable ? (
          <WithdrawPitchButton
            pitch={pitch}
            requestTitle={request.title}
            businessName={businessName}
            size="md"
            variant="outline"
          />
        ) : null}
        {pitch.status === "declined" || closedForOthers ? (
          <PillButton href="/creator/opportunities" variant="outline" icon={<Search size={16} aria-hidden />}>
            Find similar requests
          </PillButton>
        ) : null}
      </div>
      {pitch.status === "shortlisted" ? (
        <p className="y-micro y-fg-2">
          Shortlisted pitches are locked so {businessName} compares the version they picked. Message
          them if something needs to change.
        </p>
      ) : null}
    </div>
  );
}
