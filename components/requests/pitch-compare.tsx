"use client";

import { Star } from "lucide-react";

import { languageList } from "@/components/domain/chips";
import { PitchBadge } from "@/components/domain/status-badge";
import { Rating } from "@/components/domain/stars";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { money, weekdayDate } from "@/lib/format";
import { cityById, videoById } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";
import { creatorKindById } from "@/lib/taxonomy";
import type { ContentRequest } from "@/lib/types";

import { budgetNote, deliveryInfo } from "./pitch-card";
import type { RankedPitch } from "./shared";

function Best({ children }: { children: React.ReactNode }) {
  return (
    <span className="y-badge !min-h-6 !px-2 !text-[11px]" data-tone-badge="ink">
      {children}
    </span>
  );
}

/** Side-by-side decision table: shortlisted pitches, or the top three by fit. */
export function PitchCompare({
  s,
  request,
  items,
  basis,
  neonId,
  canHire,
  onHire,
  onSample,
  onShortlist,
}: {
  s: DemoState;
  request: ContentRequest;
  items: RankedPitch[];
  basis: "shortlist" | "fit";
  neonId?: string;
  canHire: boolean;
  onHire: (pitchId: string) => void;
  onSample: (pitchId: string, videoId: string) => void;
  onShortlist: (pitchId: string, on: boolean) => void;
}) {
  const many = items.length > 1;
  const minBy = (pick: (i: RankedPitch) => number) =>
    many ? items.reduce((a, b) => (pick(b) < pick(a) ? b : a)).pitch.id : undefined;
  const maxBy = (pick: (i: RankedPitch) => number) =>
    many ? items.reduce((a, b) => (pick(b) > pick(a) ? b : a)).pitch.id : undefined;
  const lowest = minBy((i) => i.pitch.price);
  const fastest = minBy((i) => i.pitch.deliveryDays);
  const bestFit = maxBy((i) => i.fit.score);
  const bestRated = maxBy((i) => i.creator.rating);
  const mostOnTime = maxBy((i) => i.creator.onTimeRate);
  const mostRepeat = maxBy((i) => i.creator.repeatClientRate);

  const rowHead = "sticky start-0 z-[1] bg-(--b-bg) p-4 text-start align-top y-micro y-fg-2 font-medium w-32";
  const cell = "p-4 align-top border-s border-(--b-line)";

  return (
    <Block tone="paper" pad="none" className="overflow-hidden">
      <p className="y-small y-fg-2 px-5 pt-5 md:px-6">
        {basis === "shortlist"
          ? "Your shortlist, side by side."
          : "Your top pitches by fit. Shortlist two or more to compare exactly the ones you choose."}
      </p>
      <div className="overflow-x-auto pb-2">
        <table className="w-full min-w-[620px] border-collapse">
          <caption className="sr-only">Comparing {items.length} pitches</caption>
          <thead>
            <tr className="border-b border-(--b-line)">
              <td className={rowHead} />
              {items.map(({ pitch, creator }) => (
                <th key={pitch.id} scope="col" className={`${cell} text-start`}>
                  <span className="flex items-center gap-3">
                    <FaceAvatar id={creator.id} name="" size={44} />
                    <span className="min-w-0">
                      <span className="y-small block truncate font-semibold">{creator.name}</span>
                      <span className="y-micro y-fg-2 block truncate font-normal">
                        {creatorKindById[creator.kind].name} · {cityById(creator.cityId)?.name}
                      </span>
                    </span>
                  </span>
                  {pitch.status === "shortlisted" || pitch.status === "hired" ? (
                    <PitchBadge status={pitch.status} className="mt-2" />
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr]:border-b [&>tr]:border-(--b-line)">
            <tr>
              <th scope="row" className={rowHead}>
                Quote
              </th>
              {items.map(({ pitch }) => {
                const note = budgetNote(pitch.price, request.budget);
                return (
                  <td key={pitch.id} className={cell}>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="y-display y-num text-[24px] leading-none font-semibold">{money(pitch.price)}</span>
                      {lowest === pitch.id ? <Best>Lowest</Best> : null}
                    </span>
                    <span className={`y-micro mt-1 block ${note.over ? "font-semibold text-(--y-warning)" : "y-fg-2"}`}>
                      {note.text}
                    </span>
                  </td>
                );
              })}
            </tr>
            <tr>
              <th scope="row" className={rowHead}>
                First version
              </th>
              {items.map(({ pitch, creator }) => {
                const d = deliveryInfo(pitch.deliveryDays, request, creator);
                return (
                  <td key={pitch.id} className={cell}>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="y-small font-semibold">{pitch.deliveryDays} days</span>
                      {fastest === pitch.id ? <Best>Fastest</Best> : null}
                    </span>
                    <span className={`y-micro block ${d.late ? "font-semibold text-(--y-warning)" : "y-fg-2"}`}>
                      {d.startsOn ? `Starts ${weekdayDate(d.startsOn)}, ready ` : ""}
                      {weekdayDate(d.date)}
                      {d.late ? " · after your deadline" : ""}
                    </span>
                  </td>
                );
              })}
            </tr>
            <tr>
              <th scope="row" className={rowHead}>
                Fit
              </th>
              {items.map(({ pitch, fit }) => (
                <td key={pitch.id} className={cell}>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-(--y-lavender) px-2.5 py-0.5 text-(--y-on-color)">
                      <span className="y-display y-num text-[17px] font-semibold">{fit.score}</span>
                      <span className="y-micro">% fit</span>
                    </span>
                    {bestFit === pitch.id ? <Best>Best fit</Best> : null}
                  </span>
                  {fit.gaps[0] ? <span className="y-micro y-fg-2 mt-1 block">Gap: {fit.gaps[0]}</span> : null}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={rowHead}>
                Rating
              </th>
              {items.map(({ pitch, creator }) => (
                <td key={pitch.id} className={cell}>
                  <span className="flex flex-wrap items-center gap-2">
                    <Rating value={creator.rating} count={creator.reviewCount} />
                    {bestRated === pitch.id ? <Best>Highest</Best> : null}
                  </span>
                  <span className="y-micro y-fg-2 block">{creator.completed} completed</span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={rowHead}>
                On time
              </th>
              {items.map(({ pitch, creator }) => (
                <td key={pitch.id} className={cell}>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="y-small y-num font-semibold">{creator.onTimeRate}%</span>
                    {mostOnTime === pitch.id ? <Best>Most reliable</Best> : null}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={rowHead}>
                Repeat clients
              </th>
              {items.map(({ pitch, creator }) => (
                <td key={pitch.id} className={cell}>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="y-small y-num font-semibold">{creator.repeatClientRate}%</span>
                    {mostRepeat === pitch.id ? <Best>Most rehired</Best> : null}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={rowHead}>
                Languages
              </th>
              {items.map(({ pitch, creator }) => (
                <td key={pitch.id} className={`${cell} y-small`}>
                  {languageList(creator.languages)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={rowHead}>
                Angle
              </th>
              {items.map(({ pitch }) => (
                <td key={pitch.id} className={`${cell} y-small`} dir="auto">
                  &ldquo;{pitch.angle}&rdquo;
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={rowHead}>
                Sample
              </th>
              {items.map(({ pitch }) => {
                const video = pitch.sampleIds.map((id) => videoById(s, id)).find((v) => v !== undefined);
                return (
                  <td key={pitch.id} className={cell}>
                    {video ? (
                      <button
                        type="button"
                        className="group block w-24 rounded-(--y-r-tile)"
                        onClick={() => onSample(pitch.id, video.id)}
                        aria-label={`Play sample: ${video.title}`}
                      >
                        <VideoThumb video={video} frame="9:16" playable showHook={false} decorative />
                      </button>
                    ) : (
                      <span className="y-micro y-fg-3">No sample attached</span>
                    )}
                  </td>
                );
              })}
            </tr>
            <tr className="!border-b-0">
              <td className={rowHead} />
              {items.map(({ pitch, creator }) => (
                <td key={pitch.id} className={cell}>
                  <span className="flex flex-wrap items-center gap-2">
                    {canHire && pitch.status !== "hired" ? (
                      <PillButton
                        size="sm"
                        variant={neonId === pitch.id ? "neon" : "contrast"}
                        onClick={() => onHire(pitch.id)}
                      >
                        Hire {creator.firstName}
                      </PillButton>
                    ) : null}
                    {pitch.status !== "hired" ? (
                      <RoundIconButton
                        size="sm"
                        label={
                          pitch.status === "shortlisted"
                            ? `Remove ${creator.firstName} from shortlist`
                            : `Shortlist ${creator.firstName}`
                        }
                        aria-pressed={pitch.status === "shortlisted"}
                        onClick={() => onShortlist(pitch.id, pitch.status !== "shortlisted")}
                      >
                        <Star size={18} aria-hidden className={pitch.status === "shortlisted" ? "fill-current" : ""} />
                      </RoundIconButton>
                    ) : null}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Block>
  );
}
