"use client";

import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock,
  Package as PackageIcon,
  Sparkles,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Rating } from "@/components/domain/stars";
import { VideoThumb } from "@/components/domain/video-thumb";
import { Badge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/chip";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { at } from "@/lib/clock";
import {
  creatorNet,
  daysFromNow,
  money,
  moneyExact,
  moneyRange,
  netRange,
  plural,
  priceLimitError,
  priceLimits,
  quoted,
  weekdayDate,
} from "@/lib/format";
import { paths } from "@/lib/paths";
import { deadlineDaysOf, isAdCopy } from "@/lib/selectors";
import { actions } from "@/lib/store";
import { FEE_PCT, PITCH_MIN, addonById, formatById } from "@/lib/taxonomy";
import type { Business, ContentRequest, Creator, Pitch, Product, Video } from "@/lib/types";

import { ContactNotice } from "./ask-brand-sheet";
import {
  ANGLE_MAX,
  ANGLE_MIN,
  DAY_CHOICES,
  MAX_SAMPLES,
  MESSAGE_MAX,
  MESSAGE_MIN,
  WRITING_SAMPLE_MAX,
  angleSuggestions,
  budgetFit,
  defaultSamples,
  joinWritingSample,
  matchingPackage,
  pitchTemplate,
  rankSamples,
  splitWritingSample,
  suggestedPrice,
} from "./pitch-helpers";

type Field = "angle" | "message" | "price" | "days" | "samples";
const FIELDS: Field[] = ["angle", "message", "price", "days", "samples"];

/**
 * The pitch composer: a large sheet with the hook idea (the headline of the pitch), the message,
 * the price (what the brand pays, at least $30, with what you earn after Yapp's 20% under it), the
 * days (only on older orders: newer ones carry the brand's own deadline), samples, and a live preview
 * of the card the brand will see. Video pitches pick 1 to 3 portfolio videos; ad-copy pitches may
 * attach a short writing sample (sent with the message) and, optionally, videos whose words they
 * wrote. New pitch → `submitPitch`; editing (sent or viewed only) → `updatePitch`.
 */
export function PitchComposer(props: {
  open: boolean;
  onClose: () => void;
  request: ContentRequest;
  business?: Business;
  product?: Product;
  creator: Creator;
  videos: Video[];
  existing?: Pitch;
  onDone: (pitchId: string, edited: boolean) => void;
}) {
  // Mounted only while open: every opening starts from the pitch (or the defaults).
  return props.open ? <ComposerForm {...props} /> : null;
}

function ComposerForm({
  request,
  business,
  product,
  creator,
  videos,
  existing,
  onClose,
  onDone,
}: {
  open: boolean;
  request: ContentRequest;
  business?: Business;
  product?: Product;
  creator: Creator;
  videos: Video[];
  existing?: Pitch;
  onClose: () => void;
  onDone: (pitchId: string, edited: boolean) => void;
}) {
  const toast = useToast();
  const adCopy = isAdCopy(request);
  const pkg = adCopy ? undefined : matchingPackage(creator, request);
  const ranked = rankSamples(videos, request, product);
  const suggestions = angleSuggestions(request, product);
  const brandName = business?.name ?? "The brand";
  const format = formatById[request.brief.format];
  // The brand set the deadline on newer orders: the pitch just repeats it (the store does too).
  const brandDays = deadlineDaysOf(request);
  const videoCount = adCopy ? 1 : request.brief.videoCount;
  const initial = splitWritingSample(existing?.message ?? "");

  const [angle, setAngle] = useState(existing?.angle ?? "");
  const [message, setMessage] = useState(adCopy ? initial.message : (existing?.message ?? ""));
  const [writing, setWriting] = useState(adCopy ? initial.sample : "");
  const [price, setPrice] = useState(String(existing?.price ?? suggestedPrice(creator, request)));
  const [days, setDays] = useState(brandDays ?? existing?.deliveryDays ?? pkg?.deliveryDays ?? 5);
  const [customDays, setCustomDays] = useState(!DAY_CHOICES.includes(existing?.deliveryDays ?? pkg?.deliveryDays ?? 5));
  const [samples, setSamples] = useState<string[]>(
    existing?.sampleIds.filter((id) => videos.some((v) => v.id === id)) ?? (adCopy ? [] : defaultSamples(ranked)),
  );
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [attempted, setAttempted] = useState(false);

  const priceNum = Number(price);
  const limits = priceLimits(videoCount);
  const priceError =
    price.trim() === ""
      ? `Enter your price, from ${money(limits.min)}.`
      : priceNum < PITCH_MIN
        ? `The lowest pitch is ${money(PITCH_MIN)}.`
        : priceLimitError(priceNum, videoCount);
  const errors: Record<Field, string | null> = {
    angle:
      angle.trim().length < ANGLE_MIN
        ? adCopy
          ? "Add a one-line idea for the line your copy leads with (at least 10 characters)."
          : "Add a one-line idea for how the video opens (at least 10 characters)."
        : null,
    message:
      message.trim().length < MESSAGE_MIN
        ? `Write at least ${MESSAGE_MIN} characters so ${brandName} knows why you're a fit (${MESSAGE_MIN - message.trim().length} to go).`
        : null,
    price: priceError,
    days: brandDays !== undefined || (days >= 1 && days <= 60) ? null : "Pick between 1 and 60 days.",
    // Ad copy: samples are optional. Video: a brand-new creator profile has no portfolio yet, so
    // samples are optional until it does.
    samples:
      adCopy || videos.length === 0 || samples.length >= 1
        ? null
        : "Pick at least one sample so they can see your work.",
  };
  const show = (field: Field) => (attempted || touched[field] ? errors[field] : null);
  const errorCount = Object.values(errors).filter(Boolean).length;
  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));

  const priceValid = priceError === null;
  const fit = priceValid ? budgetFit(priceNum, request) : null;
  const deliverBy = at(days, "18:00");
  const late = brandDays === undefined && daysFromNow(deliverBy) > daysFromNow(request.dueDate);
  const requested = request.brief.addons
    .map((id) => creator.addons.find((a) => a.id === id))
    .filter((a) => a !== undefined);
  const requestedTotal = requested.reduce((sum, a) => sum + a.price, 0);
  const picked = samples.map((id) => videos.find((v) => v.id === id)).filter((v): v is Video => Boolean(v));

  const applyTemplate = () => {
    const previous = message;
    setMessage(
      pitchTemplate({
        creator,
        request,
        business,
        product,
        angle,
        days,
        pkg,
        sampleCount: samples.length,
      }),
    );
    touch("message");
    toast({
      message: "Template added. Make it sound like you before sending.",
      tone: "info",
      action: previous.trim() ? { label: "Undo", onClick: () => setMessage(previous) } : undefined,
    });
  };

  const toggleSample = (id: string) => {
    touch("samples");
    setSamples((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length >= MAX_SAMPLES
          ? current
          : [...current, id],
    );
  };

  const submit = () => {
    setAttempted(true);
    if (errorCount > 0) {
      const first = FIELDS.find((f) => errors[f]);
      document
        .querySelector<HTMLElement>(`[data-pitch-field="${first}"] input, [data-pitch-field="${first}"] textarea`)
        ?.focus();
      return;
    }
    const payload = {
      message: adCopy ? joinWritingSample(message, writing) : message.trim(),
      angle: angle.trim(),
      price: priceNum,
      deliveryDays: days,
      sampleIds: samples,
    };
    if (existing) {
      actions.updatePitch(existing.id, payload);
      onDone(existing.id, true);
    } else {
      onDone(actions.submitPitch({ requestId: request.id, ...payload }), false);
    }
  };

  const footer = (
    <div className="flex flex-col gap-2 pb-1">
      {attempted && errorCount > 0 ? (
        <p role="alert" className="y-small flex items-center gap-1.5 font-medium text-(--y-danger)">
          <AlertCircle size={16} aria-hidden />
          Fix {plural(errorCount, "thing")} above to send your pitch.
        </p>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="y-micro y-fg-2 order-2 sm:order-1">
          You can edit it until they open it, and withdraw it until they hire.
        </p>
        <PillButton
          type="submit"
          form="pitch-form"
          variant="neon"
          size="lg"
          arrow
          className="order-1 w-full justify-between ps-6 sm:order-2 sm:w-auto"
        >
          {existing ? "Save changes" : priceValid ? `Send pitch · ${money(priceNum)}` : "Send pitch"}
        </PillButton>
      </div>
    </div>
  );

  return (
    <Sheet
      open
      onClose={onClose}
      width="lg"
      title={existing ? "Edit your pitch" : `Pitch to ${business?.name ?? "the brand"}`}
      description={request.title}
      footer={footer}
    >
      <form
        id="pitch-form"
        noValidate
        className="flex flex-col gap-8 pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {/* Hook idea */}
        <div className="flex flex-col gap-3" data-pitch-field="angle">
          <TextArea
            label={adCopy ? "Your headline idea" : "Your hook idea"}
            required
            rows={2}
            maxLength={ANGLE_MAX}
            placeholder={adCopy ? "The line your copy leads with" : "How the video opens, in one line"}
            value={angle}
            onChange={(e) => setAngle(e.target.value.replace(/\n/g, " "))}
            onBlur={() => touch("angle")}
            hint={`The headline of your pitch: it's the first thing ${brandName} reads. ${angle.length}/${ANGLE_MAX}`}
            error={show("angle")}
          />
          <div className="flex flex-col gap-2">
            <p className="y-micro y-fg-2 flex items-center gap-1.5 px-1">
              <Sparkles size={14} aria-hidden /> Ideas from the brief. Tap one to start from it.
            </p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  aria-pressed={angle === idea}
                  onClick={() => {
                    setAngle(idea.slice(0, ANGLE_MAX));
                    touch("angle");
                  }}
                  className={`y-tile y-small flex items-start gap-2 px-3 py-2.5 text-start transition-shadow ${
                    angle === idea
                      ? "shadow-[inset_0_0_0_2px_var(--y-ink)]"
                      : "hover:shadow-[inset_0_0_0_1px_var(--y-line-strong)]"
                  }`}
                >
                  {angle === idea ? <Check size={16} aria-hidden className="mt-0.5 flex-none" /> : null}
                  <span>{idea}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="flex flex-col gap-2" data-pitch-field="message">
          <TextArea
            label="Message"
            required
            rows={8}
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={() => touch("message")}
            placeholder={`Hi ${brandName} team, I'm ${creator.firstName}…`}
            hint={`Why you, why ${product?.name ?? "this product"}, and what they'll get. ${message.trim().length}/${MESSAGE_MAX}`}
            error={show("message")}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ContactNotice text={`${angle} ${message} ${writing}`} />
            <PillButton
              size="sm"
              variant="soft"
              className="ms-auto"
              icon={<Wand2 size={16} aria-hidden />}
              onClick={applyTemplate}
            >
              Start from a template
            </PillButton>
          </div>
        </div>

        {/* Price and time */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3" data-pitch-field="price">
            <TextField
              label="Your price (USD)"
              required
              type="number"
              inputMode="numeric"
              min={limits.min}
              max={limits.max}
              step={5}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={() => touch("price")}
              hint={`What ${brandName} pays, from ${money(PITCH_MIN)}. Their budget: ${moneyRange(request.budget.min, request.budget.max)} (you'd earn ${netRange(request.budget.min, request.budget.max)}).`}
              error={show("price")}
            />
            <div aria-live="polite" className="flex flex-col gap-2 px-1">
              {fit === "within" ? (
                <Badge tone="success" icon={<BadgeCheck size={14} aria-hidden />} className="w-fit">
                  Within their budget
                </Badge>
              ) : fit === "above" ? (
                <Badge tone="warning" icon={<AlertCircle size={14} aria-hidden />} className="w-fit">
                  {money(priceNum - request.budget.max)} over budget: say why in your message
                </Badge>
              ) : fit === "below" ? (
                <Badge tone="info" icon={<AlertCircle size={14} aria-hidden />} className="w-fit">
                  Below their budget: they expect up to {money(request.budget.max)}
                </Badge>
              ) : null}
              {priceValid ? (
                <p className="y-small y-num">
                  <span className="font-semibold">You earn {moneyExact(creatorNet(priceNum))}</span>{" "}
                  <span className="y-fg-2">
                    after the {FEE_PCT}% Yapp fee. {brandName} pays {money(priceNum)}, nothing on top.
                  </span>
                </p>
              ) : null}
            </div>
            {pkg && (priceNum !== pkg.price || days !== pkg.deliveryDays) ? (
              <button
                type="button"
                className="y-tile flex items-center gap-3 p-3 text-start"
                onClick={() => {
                  setPrice(String(pkg.price));
                  setDays(pkg.deliveryDays);
                  setCustomDays(!DAY_CHOICES.includes(pkg.deliveryDays));
                }}
              >
                <PackageIcon size={18} aria-hidden className="flex-none" />
                <span className="min-w-0 flex-1">
                  <span className="y-small block font-semibold">Use your {pkg.name} package</span>
                  <span className="y-micro y-fg-2 block">
                    {money(pkg.price)} · {plural(pkg.deliveryDays, "day")} · {plural(pkg.revisions, "revision")}
                  </span>
                </span>
              </button>
            ) : null}
            {requested.length ? (
              <div className="y-tile flex flex-col gap-2 p-3">
                <p className="y-small">
                  <span className="font-semibold">They asked for </span>
                  {requested.map((a) => `${addonById[a.id].name} (${money(a.price)})`).join(", ")}. A pitch is one
                  price, so fold these in.
                </p>
                <PillButton
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  disabled={!priceValid}
                  onClick={() => {
                    setPrice(String(priceNum + requestedTotal));
                    toast({
                      message: `Added ${money(requestedTotal)} for the add-ons they asked for.`,
                      tone: "info",
                      action: {
                        label: "Undo",
                        onClick: () => setPrice(String(priceNum)),
                      },
                    });
                  }}
                >
                  Add {money(requestedTotal)} to my price
                </PillButton>
              </div>
            ) : null}
          </div>

          {brandDays !== undefined ? (
            <div className="flex flex-col gap-3" data-pitch-field="days">
              <p className="y-label">Deadline</p>
              <p className="y-small flex items-start gap-2 px-1">
                <CalendarDays size={16} aria-hidden className="mt-0.5 flex-none" />
                <span>
                  {brandName} set it: you&apos;ll have <span className="font-semibold">{plural(brandDays, "day")}</span>{" "}
                  to deliver after you&apos;re hired, so by {weekdayDate(deliverBy)} if they hire you today.
                </span>
              </p>
            </div>
          ) : (
            <fieldset className="flex flex-col gap-3" data-pitch-field="days">
              <legend className="y-label mb-2 w-full">
                <span>First version in</span>
                <span className="y-micro y-fg-3 font-medium">Required</span>
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {DAY_CHOICES.map((d) => (
                  <FilterChip
                    key={d}
                    pressed={!customDays && days === d}
                    onClick={() => {
                      setCustomDays(false);
                      setDays(d);
                    }}
                  >
                    {plural(d, "day")}
                  </FilterChip>
                ))}
                <FilterChip pressed={customDays} onClick={() => setCustomDays(true)}>
                  Other
                </FilterChip>
              </div>
              {customDays ? (
                <TextField
                  label="Days to the first version"
                  required
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  value={String(days)}
                  onChange={(e) => setDays(Math.round(Number(e.target.value) || 0))}
                  onBlur={() => touch("days")}
                  error={show("days")}
                />
              ) : null}
              <p className="y-small flex flex-wrap items-center gap-x-2 gap-y-1 px-1" aria-live="polite">
                <CalendarDays size={16} aria-hidden className="flex-none" />
                <span>
                  By <span className="font-semibold">{weekdayDate(deliverBy)}</span> if they hire you today
                </span>
              </p>
              {late && days >= 1 ? (
                <Badge tone="warning" icon={<Clock size={14} aria-hidden />} className="w-fit">
                  After their {weekdayDate(request.dueDate)} deadline
                </Badge>
              ) : (
                <p className="y-micro y-fg-2 px-1">Their deadline is {weekdayDate(request.dueDate)}.</p>
              )}
            </fieldset>
          )}
        </div>

        {/* Samples */}
        {adCopy ? (
          <fieldset className="flex flex-col gap-4" data-pitch-field="samples">
            <legend className="y-label mb-1 w-full">
              <span>Samples</span>
            </legend>
            <TextArea
              label="A short writing sample"
              rows={4}
              maxLength={WRITING_SAMPLE_MAX}
              value={writing}
              onChange={(e) => setWriting(e.target.value)}
              placeholder="Paste a headline and primary text you wrote, or a few lines in this brand's voice"
              hint={`Sent with your message, under "Writing sample". ${writing.trim().length}/${WRITING_SAMPLE_MAX}`}
            />
            {videos.length ? (
              <div className="flex flex-col gap-2">
                <p className="y-micro y-fg-2 px-1">
                  Or attach up to {MAX_SAMPLES} videos whose hooks or captions you wrote.
                </p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {ranked
                    .filter((r, i) => i < 8 || samples.includes(r.video.id))
                    .map(({ video }) => {
                      const checked = samples.includes(video.id);
                      const disabled = !checked && samples.length >= MAX_SAMPLES;
                      return (
                        <li key={video.id}>
                          <label className="sw-sample h-full" data-on={checked} data-off={disabled}>
                            <span className="relative">
                              <VideoThumb video={video} frame="4:5" showHook={false} showViews={false} decorative />
                              <input
                                type="checkbox"
                                className="y-check absolute start-1.5 top-1.5"
                                checked={checked}
                                disabled={disabled}
                                onChange={() => toggleSample(video.id)}
                                aria-label={`Attach “${video.title}”`}
                              />
                            </span>
                            <span className="y-micro y-clamp-2 px-0.5 font-medium">{video.title}</span>
                          </label>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ) : null}
          </fieldset>
        ) : (
          <fieldset className="flex flex-col gap-3" data-pitch-field="samples">
            <legend className="y-label mb-1 w-full">
              <span>Samples</span>
              <span className="y-micro y-fg-3 font-medium">
                {samples.length} of {MAX_SAMPLES} picked
              </span>
            </legend>
            {videos.length === 0 ? (
              <p className="y-small y-fg-2 px-1">
                Your portfolio is empty, so samples are optional for now. Brands pick creators whose work they can see:{" "}
                <Link href={paths.studioProfile("portfolio")} className="y-link font-semibold text-(--y-ink)">
                  add videos to your profile
                </Link>
                .
              </p>
            ) : (
              <>
                <p className="y-micro y-fg-2 px-1">
                  Pick 1 to 3. Your closest matches to this {format.noun[0]} come first.
                </p>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {ranked.map(({ video, tags }) => {
                    const checked = samples.includes(video.id);
                    const disabled = !checked && samples.length >= MAX_SAMPLES;
                    return (
                      <li key={video.id}>
                        <label className="sw-sample h-full" data-on={checked} data-off={disabled}>
                          <span className="relative">
                            <VideoThumb video={video} frame="4:5" showHook={false} showViews={false} decorative />
                            <input
                              type="checkbox"
                              className="y-check absolute start-1.5 top-1.5"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleSample(video.id)}
                              aria-label={`Use “${video.title}” as a sample`}
                            />
                          </span>
                          <span className="y-micro y-clamp-2 px-0.5 font-medium">{video.title}</span>
                          {tags.length ? <span className="y-micro y-fg-2 px-0.5 pb-0.5">{tags[0]}</span> : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {show("samples") ? (
              <p className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
                <AlertCircle size={16} aria-hidden /> {show("samples")}
              </p>
            ) : null}
          </fieldset>
        )}

        {/* Preview */}
        <section aria-labelledby="pitch-preview-h" className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 id="pitch-preview-h" className="y-head">
              How {brandName} sees it
            </h3>
            <p className="y-micro y-fg-2">Your card on their shortlist board, next to the other pitches.</p>
          </div>
          <PitchCardPreview
            creator={creator}
            angle={angle}
            message={message}
            price={priceValid ? priceNum : undefined}
            days={days}
            samples={picked}
          />
        </section>
      </form>
    </Sheet>
  );
}

/** The card the brand sees on its shortlist board, updated as you type. */
export function PitchCardPreview({
  creator,
  angle,
  message,
  price,
  days,
  samples,
}: {
  creator: Creator;
  angle: string;
  message: string;
  price?: number;
  days: number;
  samples: Video[];
}) {
  return (
    <article
      aria-label="Preview of your pitch card"
      className="y-block flex flex-col gap-4 p-4 md:p-5"
      data-tone="paper"
      style={{ boxShadow: "inset 0 0 0 1px var(--y-line-strong)" }}
    >
      <div className="flex items-center gap-3">
        <FaceAvatar id={creator.id} name="" size={40} />
        <div className="min-w-0 flex-1">
          <p className="y-small flex items-center gap-1.5 font-semibold">
            {creator.name}
            {creator.verified ? <BadgeCheck size={15} aria-label="ID verified" /> : null}
          </p>
          <p className="y-micro y-fg-2">
            {creator.reviewCount ? <Rating value={creator.rating} count={creator.reviewCount} /> : "New on Yapp"}
          </p>
        </div>
        <div className="text-end">
          <p className="y-head y-num">{price !== undefined ? money(price) : "—"}</p>
          <p className="y-micro y-fg-2">{plural(days, "day")}</p>
        </div>
      </div>
      <p className="y-display text-[18px] leading-snug font-medium">
        {angle.trim() ? quoted(angle.trim()) : <span className="y-fg-2">Your hook idea shows here</span>}
      </p>
      {message.trim() ? <p className="y-small y-fg-2 line-clamp-3 whitespace-pre-line">{message.trim()}</p> : null}
      {samples.length ? (
        <div className="grid max-w-[300px] grid-cols-3 gap-1.5">
          {samples.map((video) => (
            <VideoThumb
              key={video.id}
              video={video}
              frame="9:16"
              showHook={false}
              showMeta={false}
              playable
              decorative
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}
