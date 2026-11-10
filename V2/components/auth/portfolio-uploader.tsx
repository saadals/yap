"use client";

import { CircleCheck, Film, Trash2, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { SelectField, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { formatById, formats } from "@/lib/taxonomy";
import type { FormatId, NicheId, Scene, Tint, Video } from "@/lib/types";

export const MAX_SAMPLES = 3;

export type Sample = {
  id: string;
  fileName: string;
  sizeLabel: string;
  /** 0–100; uploads advance in the onboarding flow. */
  progress: number;
  title: string;
  format: FormatId | "";
  durationSec: number;
  tints: [Tint, Tint];
};

const palettes: [Tint, Tint][] = [
  ["violet", "sea"],
  ["sun", "coral"],
  ["mint", "sea"],
  ["blush", "violet"],
];

const sceneFor: Record<FormatId, Scene> = {
  "app-demo": "split",
  "screen-walkthrough": "screen",
  unboxing: "desk",
  "problem-solution": "street",
  comparison: "split",
  testimonial: "selfie",
  "talking-head": "selfie",
  voiceover: "screen",
  "hook-pack": "selfie",
  // Never a portfolio video format (pickers offer video formats only); kept for the type.
  "ad-copy": "desk",
};

function sizeLabel(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 / 1024))} MB`;
}

/** Title from a file name: "my_app-demo.mp4" → "My app demo". */
function titleFrom(fileName: string) {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
}

/** Build a sample in an event handler (ids and durations may use the clock/random there). */
export function makeSample(
  file: { name: string; size: number },
  index: number,
  defaultFormat: FormatId | "",
): Sample {
  return {
    id: `up-${Date.now().toString(36)}-${index}`,
    fileName: file.name,
    sizeLabel: sizeLabel(file.size),
    progress: 0,
    title: titleFrom(file.name).slice(0, 60),
    format: defaultFormat,
    durationSec: 20 + Math.round(Math.random() * 40),
    tints: palettes[index % palettes.length],
  };
}

/** A generated thumbnail for an uploaded sample (no real media in the prototype). */
export function sampleVideo(sample: Sample, faceId: string, niche: NicheId): Video {
  const format = sample.format || "app-demo";
  return {
    id: sample.id,
    creatorId: faceId,
    title: sample.title || sample.fileName,
    hook: sample.title || formatById[format].name,
    lang: "en",
    format,
    durationSec: sample.durationSec,
    aspect: "9:16",
    tints: sample.tints,
    scene: sceneFor[format],
    niche,
    script: [],
  };
}

export function PortfolioUploader({
  samples,
  onAdd,
  onChange,
  onRemove,
  faceId,
  niche,
  formatOptions,
  errors,
}: {
  samples: Sample[];
  onAdd: (files: { name: string; size: number }[]) => void;
  onChange: (id: string, patch: Partial<Sample>) => void;
  onRemove: (id: string) => void;
  faceId: string;
  niche: NicheId;
  /** Formats offered in each sample's select (the creator's chosen formats first). */
  formatOptions: FormatId[];
  errors: Record<string, string | null | undefined>;
}) {
  const inputId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const room = MAX_SAMPLES - samples.length;
  const uploaded = samples.filter((sample) => sample.progress >= 100).length;

  const accept = (files: File[]) => {
    if (room <= 0) {
      setFileError(`You can add up to ${MAX_SAMPLES} samples. Remove one to add another.`);
      return;
    }
    const videos = files.filter(
      (file) => file.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(file.name),
    );
    const tooBig = videos.filter((file) => file.size > 500 * 1024 * 1024);
    const ok = videos.filter((file) => file.size <= 500 * 1024 * 1024).slice(0, room);
    if (files.length > 0 && videos.length === 0) {
      setFileError("That isn't a video. Use an MP4, MOV or WebM file.");
      return;
    }
    if (tooBig.length > 0) setFileError("Files over 500 MB are too large. Export a shorter or smaller cut.");
    else if (videos.length > ok.length) setFileError(`Only the first ${ok.length} were added: up to ${MAX_SAMPLES} samples.`);
    else setFileError(null);
    if (ok.length) onAdd(ok.map((file) => ({ name: file.name, size: file.size })));
  };

  const ordered = [
    ...formatOptions,
    ...formats.map((f) => f.id).filter((id) => !formatOptions.includes(id)),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div
        className="y-dropzone flex flex-col items-center gap-3 px-5 py-8 text-center"
        data-over={over || undefined}
        aria-disabled={room <= 0 || undefined}
        onDragEnter={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = room > 0 ? "copy" : "none";
          if (!over) setOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          accept(Array.from(event.dataTransfer.files));
        }}
      >
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-(--b-bg) text-(--b-fg)"
        >
          <Upload size={24} />
        </span>
        <div className="flex flex-col gap-1">
          <p className="y-head">{over ? "Drop to upload" : "Drag your best videos here"}</p>
          <p className="y-small y-fg-2">
            MP4, MOV or WebM, up to 500 MB each. {room > 0 ? `${room} of ${MAX_SAMPLES} slots left.` : "All 3 slots used."}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <PillButton
            variant="contrast"
            size="sm"
            disabled={room <= 0}
            onClick={() => inputRef.current?.click()}
            aria-describedby={fileError ? `${inputId}-error` : undefined}
          >
            Choose files
          </PillButton>
          <PillButton
            variant="ghost"
            size="sm"
            disabled={room <= 0}
            onClick={() => {
              setFileError(null);
              const n = samples.length + 1;
              const name = ["app-demo-budget-app.mp4", "screen-walkthrough-onboarding.mov", "testimonial-sleep-ring.mp4"][n % 3];
              onAdd([{ name, size: (38 + n * 17) * 1024 * 1024 }]);
            }}
          >
            No video handy? Add a demo clip
          </PillButton>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="video/*,.mp4,.mov,.m4v,.webm"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose video files"
          onChange={(event) => {
            accept(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>
      {fileError ? (
        <p id={`${inputId}-error`} role="alert" className="y-small px-1 font-medium text-(--y-danger)">
          {fileError}
        </p>
      ) : null}

      <p id={statusId} className="sr-only" aria-live="polite">
        {samples.length ? `${uploaded} of ${samples.length} samples uploaded.` : ""}
      </p>

      {samples.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label="Your samples">
          {samples.map((sample) => {
            const done = sample.progress >= 100;
            if (!done) {
              return (
                <li key={sample.id} className="y-tile flex items-center gap-3 p-3 ps-4">
                  <Film size={20} aria-hidden className="flex-none" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="y-small truncate font-medium" dir="auto">
                        {sample.fileName}
                      </span>
                      <span className="y-micro y-fg-2 y-num flex-none">
                        {sample.progress}% of {sample.sizeLabel}
                      </span>
                    </div>
                    <div
                      className="y-progress"
                      role="progressbar"
                      aria-label={`Uploading ${sample.fileName}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={sample.progress}
                    >
                      <span style={{ width: `${sample.progress}%` }} />
                    </div>
                  </div>
                  <RoundIconButton
                    label={`Cancel upload of ${sample.fileName}`}
                    size="sm"
                    tone="outline"
                    onClick={() => onRemove(sample.id)}
                  >
                    <X size={16} aria-hidden />
                  </RoundIconButton>
                </li>
              );
            }
            return (
              <li
                key={sample.id}
                className="y-tile y-enter grid grid-cols-[80px_minmax(0,1fr)] gap-x-4 gap-y-3 p-3 sm:grid-cols-[128px_minmax(0,1fr)]"
              >
                <div className="sm:row-span-2">
                  <VideoThumb
                    video={sampleVideo(sample, faceId, niche)}
                    showHook={false}
                    decorative
                  />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <p className="y-micro y-fg-2 flex min-w-0 items-center gap-1.5 pt-1">
                    <CircleCheck size={14} aria-hidden className="flex-none text-(--y-success)" />
                    <span className="truncate" dir="auto">
                      Uploaded · {sample.fileName}
                    </span>
                  </p>
                  <RoundIconButton
                    label={`Remove ${sample.title || sample.fileName}`}
                    size="sm"
                    tone="outline"
                    onClick={() => onRemove(sample.id)}
                  >
                    <Trash2 size={16} aria-hidden />
                  </RoundIconButton>
                </div>
                <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
                  <TextField
                    label="Title"
                    required
                    maxLength={60}
                    placeholder="e.g. Budget app demo in Spanish"
                    value={sample.title}
                    error={errors[`title-${sample.id}`]}
                    onChange={(event) => onChange(sample.id, { title: event.target.value })}
                  />
                  <SelectField
                    label="Format"
                    required
                    value={sample.format}
                    error={errors[`format-${sample.id}`]}
                    onChange={(event) =>
                      onChange(sample.id, { format: event.target.value as FormatId })
                    }
                    options={[
                      { value: "", label: "Choose a format" },
                      ...ordered.map((id) => ({ value: id, label: formatById[id].name })),
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
