"use client";

import { AlertCircle, ArrowLeft, BadgeCheck, CalendarDays, Clock, Package as PackageIcon, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { PriceSummary } from "@/components/domain/money";
import { Rating } from "@/components/domain/stars";
import { Badge } from "@/components/ui/badge";
import { FilterChip } from "@/components/ui/chip";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { useToast } from "@/components/ui/toast";
import { ContactNotice } from "@/components/requests/contact-notice";
import { at } from "@/lib/clock";
import { daysFromNow, money, moneyRange, plural, priceLimitError, priceLimits, quoted, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { actions } from "@/lib/store";
import { addonById, formatById } from "@/lib/taxonomy";
import type { Business, ContentRequest, Creator, Pitch, Product, Video } from "@/lib/types";

import {
  ANGLE_MAX,
  ANGLE_MIN,
  MESSAGE_MAX,
  MESSAGE_MIN,
  angleSuggestions,
  budgetFit,
  matchingPackage,
  pitchTemplate,
  rankSamples,
} from "./pitch-helpers";

const DAY_CHOICES = [3, 5, 7, 10, 14];
const MAX_SAMPLES = 3;

type Field = "angle" | "message" | "price" | "days" | "samples";

export function PitchComposer({
  request,
  business,
  product,
  creator,
  videos,
  existing,
  onDone,
  onCancel,
}: {
  request: ContentRequest;
  business?: Business;
  product?: Product;
  creator: Creator;
  videos: Video[];
  /** Edit mode: prefill from this pitch and save with updatePitch. */
  existing?: Pitch;
  onDone: (pitchId: string) => void;
  onCancel?: () => void;
}) {
  const toast = useToast();
  const rootRef = useRef<HTMLDivElement>(null);
  const pkg = matchingPackage(creator, request);
  const ranked = rankSamples(videos, request, product);
  const suggestions = angleSuggestions(request, product);
  const businessName = business?.name ?? "The business";
  const format = formatById[request.brief.format];

  const [step, setStep] = useState<"compose" | "preview">("compose");
  const [angle, setAngle] = useState(existing?.angle ?? "");
  const [message, setMessage] = useState(existing?.message ?? "");
  const [price, setPrice] = useState(
    String(
      existing?.price ??
        Math.min(Math.max(pkg?.price ?? request.budget.min, request.budget.min), request.budget.max),
    ),
  );
  const [days, setDays] = useState(existing?.deliveryDays ?? pkg?.deliveryDays ?? 5);
  const [customDays, setCustomDays] = useState(!DAY_CHOICES.includes(existing?.deliveryDays ?? pkg?.deliveryDays ?? 5));
  const [samples, setSamples] = useState<string[]>(
    existing?.sampleIds.filter((id) => videos.some((v) => v.id === id)) ??
      ranked
        .filter((r) => r.score > 1.5)
        .slice(0, 2)
        .map((r) => r.video.id),
  );
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [attempted, setAttempted] = useState(false);

  const priceNum = Number(price);
  // $30 to $5,000 per video the brief asks for (and never a pitch under $30).
  const limits = priceLimits(request.brief.videoCount);
  const priceError = price.trim() === "" ? `Enter your price, from ${money(limits.min)}.` : priceLimitError(priceNum, request.brief.videoCount);
  const priceValid = priceError === null;
  const errors: Record<Field, string | null> = {
    angle:
      angle.trim().length < ANGLE_MIN
        ? "Add a one-line idea for how you'd open the video (at least 10 characters)."
        : null,
    message:
      message.trim().length < MESSAGE_MIN
        ? `Write at least ${MESSAGE_MIN} characters so ${businessName} knows why you're a fit (${MESSAGE_MIN - message.trim().length} to go).`
        : null,
    price: priceError,
    days: days >= 1 && days <= 60 ? null : "Pick between 1 and 60 days.",
    // A brand-new creator profile has no portfolio yet: samples are optional until it does.
    samples:
      videos.length === 0 || samples.length >= 1 ? null : "Pick at least one sample so they can see your work.",
  };
  const show = (field: Field) => (attempted || touched[field] ? errors[field] : null);
  const errorCount = Object.values(errors).filter(Boolean).length;
  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));

  const fit = priceValid ? budgetFit(priceNum, request) : null;
  const deliverBy = at(days, "18:00");
  const daysToDue = daysFromNow(request.dueDate);
  const late = daysFromNow(deliverBy) > daysToDue;
  const requested = request.brief.addons
    .map((id) => creator.addons.find((a) => a.id === id))
    .filter((a) => a !== undefined);
  const requestedTotal = requested.reduce((sum, a) => sum + a.price, 0);
  const pickedVideos = samples
    .map((id) => videos.find((v) => v.id === id))
    .filter((v): v is Video => Boolean(v));

  const scrollTop = () =>
    window.requestAnimationFrame(() =>
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );

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

  const goPreview = () => {
    setAttempted(true);
    if (errorCount > 0) {
      const first = (["angle", "message", "price", "days", "samples"] as Field[]).find((f) => errors[f]);
      const node = rootRef.current?.querySelector<HTMLElement>(`[data-field="${first}"] input, [data-field="${first}"] textarea`);
      node?.focus();
      return;
    }
    setStep("preview");
    scrollTop();
  };

  const submit = () => {
    const payload = {
      message: message.trim(),
      angle: angle.trim(),
      price: priceNum,
      deliveryDays: days,
      sampleIds: samples,
    };
    if (existing) {
      actions.updatePitch(existing.id, payload);
      toast({ message: `Pitch updated. ${businessName} now sees the new version.` });
      onDone(existing.id);
    } else {
      const id = actions.submitPitch({ requestId: request.id, ...payload });
      onDone(id);
    }
  };

  if (step === "preview") {
    return (
      <div ref={rootRef} className="flex scroll-mt-24 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="y-micro y-fg-2">Step 2 of 2 · Preview</p>
          <h2 className="y-display y-title">This is what {businessName} will see</h2>
          <p className="y-small y-fg-2 max-w-[62ch]">
            Your pitch sits next to others in their list. Check the price, the date and that your
            samples open on the right piece.
          </p>
        </div>

        <article
          className="y-tile flex flex-col gap-5 p-4 md:p-6"
          aria-label={`Preview of your pitch to ${businessName}`}
        >
          <div className="flex flex-wrap items-start gap-3">
            <FaceAvatar id={creator.id} name="" size={52} />
            <div className="min-w-0 flex-1">
              <p className="y-head flex items-center gap-1.5">
                {creator.name}
                {creator.verified ? <BadgeCheck size={16} aria-label="ID verified" /> : null}
              </p>
              <p className="y-micro y-fg-2 flex flex-wrap items-center gap-x-2">
                {creator.reviewCount ? (
                  <Rating value={creator.rating} count={creator.reviewCount} />
                ) : (
                  <span>New on Yapp</span>
                )}
                {creator.completed ? (
                  <>
                    <span>{creator.onTimeRate}% on time</span>
                    <span>{creator.completed} completed</span>
                  </>
                ) : null}
              </p>
            </div>
            <div className="text-end">
              <p className="y-display y-num text-[30px] leading-none font-semibold tracking-[-0.03em]">
                {money(priceNum)}
              </p>
              <p className="y-micro y-fg-2 mt-1">
                {plural(days, "day")} · by {weekdayDate(deliverBy)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="y-micro y-fg-2">Angle</p>
            <p className="y-display text-[20px] leading-snug">{quoted(angle)}</p>
          </div>
          <p className="y-body max-w-[62ch] whitespace-pre-line">{message.trim()}</p>
          {pickedVideos.length ? (
            <div className="flex flex-col gap-2">
              <p className="y-micro y-fg-2">{plural(pickedVideos.length, "sample")}</p>
              <div className="grid grid-cols-3 gap-2 sm:max-w-md">
                {pickedVideos.map((video) => (
                  <div key={video.id} className="flex flex-col gap-1.5">
                    <VideoThumb video={video} frame="4:5" showHook={false} decorative />
                    <span className="y-micro y-clamp-2">{video.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <PriceSummary price={priceNum} perspective="creator" priceLabel="Your price" showRights={false} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <PillButton
            variant="ghost"
            icon={<ArrowLeft size={18} aria-hidden className="y-flip" />}
            onClick={() => {
              setStep("compose");
              scrollTop();
            }}
          >
            Back to edit
          </PillButton>
          <PillButton variant="neon" size="lg" arrow onClick={submit} className="ps-7">
            {existing ? "Save changes" : "Send pitch"}
          </PillButton>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="flex scroll-mt-24 flex-col gap-7">
      <div className="flex flex-col gap-1">
        <p className="y-micro y-fg-2">Step 1 of 2 · {existing ? "Edit your pitch" : "Write your pitch"}</p>
        <h2 className="y-display y-title">{existing ? "Update your pitch" : "Pitch on this request"}</h2>
      </div>

      {/* Angle */}
      <div className="flex flex-col gap-3" data-field="angle">
        <TextField
          label="Your angle"
          required
          maxLength={ANGLE_MAX}
          placeholder="The hook or idea you'd open with"
          value={angle}
          onChange={(e) => setAngle(e.target.value)}
          onBlur={() => touch("angle")}
          hint={`One line. ${angle.length}/${ANGLE_MAX}`}
          error={show("angle")}
        />
        <div className="flex flex-col gap-2">
          <p className="y-micro y-fg-2 flex items-center gap-1.5 px-1">
            <Sparkles size={14} aria-hidden /> Ideas from the brief. Tap one to start from it.
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            {suggestions.map((idea) => (
              <button
                key={idea}
                type="button"
                aria-pressed={angle === idea}
                onClick={() => {
                  setAngle(idea.slice(0, ANGLE_MAX));
                  touch("angle");
                }}
                className={`y-tile y-hoverable y-small p-3 text-start ${
                  angle === idea ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""
                }`}
              >
                {idea}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="flex flex-col gap-2" data-field="message">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="y-small y-fg-2 max-w-[44ch]">
            Say why you, why {product?.name ?? "this product"}, and what they&apos;ll get.
          </p>
          <PillButton size="sm" variant="soft" icon={<Wand2 size={16} aria-hidden />} onClick={applyTemplate}>
            Use a template
          </PillButton>
        </div>
        <TextArea
          label="Message"
          required
          rows={9}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => touch("message")}
          placeholder={`Hi ${businessName} team, I'm ${creator.firstName}…`}
          hint={`${message.trim().length}/${MESSAGE_MAX} · at least ${MESSAGE_MIN} characters`}
          error={show("message")}
        />
        <ContactNotice text={`${angle} ${message}`} />
      </div>

      {/* Price */}
      <div className="flex flex-col gap-3" data-field="price">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
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
              hint={`Their budget: ${moneyRange(request.budget.min, request.budget.max)}`}
              error={show("price")}
            />
            <div aria-live="polite" className="flex flex-wrap gap-1.5 px-1">
              {fit === "within" ? (
                <Badge tone="success" icon={<BadgeCheck size={14} aria-hidden />}>
                  Within their {moneyRange(request.budget.min, request.budget.max)} budget
                </Badge>
              ) : fit === "above" ? (
                <Badge tone="warning" icon={<AlertCircle size={14} aria-hidden />}>
                  {money(priceNum - request.budget.max)} over budget. Say why in your message
                </Badge>
              ) : fit === "below" ? (
                <Badge tone="info" icon={<AlertCircle size={14} aria-hidden />}>
                  Below their budget. They expect up to {money(request.budget.max)}
                </Badge>
              ) : null}
            </div>
            {pkg ? (
              <div className="y-tile flex flex-wrap items-center gap-3 p-3">
                <span className="grid size-10 flex-none place-items-center rounded-full bg-(--b-bg)" aria-hidden>
                  <PackageIcon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="y-small font-semibold">
                    Your {pkg.name} package · {money(pkg.price)}
                  </p>
                  <p className="y-micro y-fg-2">
                    {plural(pkg.videos, "video")} · up to {pkg.maxSeconds}s · {plural(pkg.deliveryDays, "day")} ·{" "}
                    {plural(pkg.revisions, "revision")}
                  </p>
                </div>
                <PillButton
                  size="sm"
                  variant="outline"
                  disabled={priceNum === pkg.price && days === pkg.deliveryDays}
                  onClick={() => {
                    setPrice(String(pkg.price));
                    setDays(pkg.deliveryDays);
                    setCustomDays(!DAY_CHOICES.includes(pkg.deliveryDays));
                  }}
                >
                  Use package
                </PillButton>
              </div>
            ) : null}
            {requested.length ? (
              <div className="y-tile flex flex-col gap-2 p-3">
                <p className="y-small">
                  <span className="font-semibold">They asked for </span>
                  {requested.map((a) => `${addonById[a.id].name} (${money(a.price)})`).join(", ")}.
                </p>
                <p className="y-micro y-fg-2">
                  Pitches are one price. Fold your add-on prices in so there are no surprises later.
                </p>
                <PillButton
                  size="sm"
                  variant="soft"
                  className="w-fit"
                  disabled={!priceValid}
                  onClick={() => {
                    setPrice(String(priceNum + requestedTotal));
                    toast({
                      message: `Added ${money(requestedTotal)} for requested add-ons.`,
                      tone: "info",
                      action: { label: "Undo", onClick: () => setPrice(String(priceNum)) },
                    });
                  }}
                >
                  Add {money(requestedTotal)} to my price
                </PillButton>
              </div>
            ) : null}
          </div>
          <div className="y-tile flex flex-col gap-3 p-4">
            {priceValid ? (
              <PriceSummary price={priceNum} perspective="creator" priceLabel="Your price" />
            ) : (
              <p className="y-small y-fg-2">Enter a price to see what you earn.</p>
            )}
          </div>
        </div>
      </div>

      {/* Delivery */}
      <fieldset className="flex flex-col gap-3" data-field="days">
        <legend className="y-label mb-3 w-full">
          <span>Delivery time</span>
          <span className="y-micro y-fg-3 font-medium">Required</span>
        </legend>
        <div className="flex flex-wrap gap-2">
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
            Custom
          </FilterChip>
        </div>
        {customDays ? (
          <TextField
            label="Days to first version"
            required
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            value={String(days)}
            onChange={(e) => setDays(Math.round(Number(e.target.value) || 0))}
            onBlur={() => touch("days")}
            error={show("days")}
            className="max-w-xs"
          />
        ) : null}
        <p className="y-small flex flex-wrap items-center gap-2 px-1" aria-live="polite">
          <CalendarDays size={16} aria-hidden />
          <span>
            First version by <span className="font-semibold">{weekdayDate(deliverBy)}</span>
          </span>
          {late && days >= 1 ? (
            <Badge tone="warning" icon={<Clock size={14} aria-hidden />}>
              After their {weekdayDate(request.dueDate)} deadline
            </Badge>
          ) : (
            <span className="y-fg-2">· their deadline is {weekdayDate(request.dueDate)}</span>
          )}
        </p>
      </fieldset>

      {/* Samples */}
      <fieldset className="flex flex-col gap-3" data-field="samples" aria-describedby="samples-hint">
        <legend className="y-label mb-1 w-full">
          <span>Samples</span>
          <span className="y-micro y-fg-3 font-medium">
            {samples.length}/{MAX_SAMPLES} picked
          </span>
        </legend>
        <p id="samples-hint" className="y-micro y-fg-2 px-1">
          {videos.length
            ? `Pick 1 to 3. Closest matches to this ${format.noun[0]} are first.`
            : "Optional for now: your portfolio is empty."}
        </p>
        {videos.length === 0 ? (
          <p className="y-small y-fg-2 px-1">
            You can pitch without samples, but businesses pick creators whose work they can see.{" "}
            <Link href={paths.editProfile("portfolio")} className="font-semibold underline underline-offset-2">
              Add videos to your profile
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {ranked.map(({ video, tags }) => {
              const checked = samples.includes(video.id);
              const disabled = !checked && samples.length >= MAX_SAMPLES;
              return (
                <li key={video.id}>
                  <label
                    className={`y-tile flex h-full cursor-pointer flex-col gap-2 p-2 ${
                      checked ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""
                    } ${disabled ? "cursor-not-allowed opacity-55" : "y-hoverable"}`}
                  >
                    <span className="relative">
                      <VideoThumb video={video} frame="4:5" showHook={false} decorative />
                      <input
                        type="checkbox"
                        className="y-check absolute start-2 top-2"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleSample(video.id)}
                      />
                    </span>
                    <span className="y-micro y-clamp-2 px-1 font-semibold">{video.title}</span>
                    {tags.length ? (
                      <span className="y-micro y-fg-2 px-1 pb-1">{tags.slice(0, 2).join(" · ")}</span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {show("samples") ? (
          <p className="y-small flex items-center gap-1.5 px-1 font-medium text-(--y-danger)">
            <AlertCircle size={16} aria-hidden /> {show("samples")}
          </p>
        ) : null}
      </fieldset>

      <div className="flex flex-col gap-3 border-t border-(--b-line) pt-5">
        {attempted && errorCount > 0 ? (
          <p role="alert" className="y-small flex items-center gap-1.5 font-medium text-(--y-danger)">
            <AlertCircle size={16} aria-hidden />
            Fix {plural(errorCount, "thing")} above to preview your pitch.
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {onCancel ? (
            <PillButton variant="ghost" onClick={onCancel}>
              Cancel
            </PillButton>
          ) : (
            <p className="y-micro y-fg-2">You can edit or withdraw it until they shortlist you.</p>
          )}
          <PillButton variant="contrast" size="lg" arrow onClick={goPreview} className="ps-7">
            Preview pitch
          </PillButton>
        </div>
      </div>
    </div>
  );
}
