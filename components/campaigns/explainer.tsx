"use client";

import { Film, Pause, Play, RefreshCw, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { clock } from "@/lib/format";
import type { ProductAsset } from "@/lib/types";

import type { Explainer } from "./shared";
import { Spinner } from "./parts";

/** A believable length for a simulated upload: 30–90 seconds, stable for the same name. */
function durationFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 30 + (hash % 61);
}

/**
 * The explainer video: a simulated upload (pick a file, watch a progress bar) or a pick from the
 * product's footage files. Nothing leaves the browser.
 */
export function ExplainerField({
  value,
  onChange,
  footage,
  sampleName,
}: {
  value?: Explainer;
  onChange: (value: Explainer | undefined) => void;
  footage: ProductAsset[];
  sampleName: string;
}) {
  const [upload, setUpload] = useState<{ name: string; progress: number } | null>(null);
  const timer = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const pick = () => fileRef.current?.click();

  useEffect(() => () => window.clearInterval(timer.current), []);

  const start = (name: string) => {
    window.clearInterval(timer.current);
    let progress = 0;
    setUpload({ name, progress });
    timer.current = window.setInterval(() => {
      progress = Math.min(100, progress + 9);
      setUpload({ name, progress });
      if (progress >= 100) {
        window.clearInterval(timer.current);
        setUpload(null);
        onChange({ name, durationSec: durationFor(name), source: "upload" });
      }
    }, 110);
  };

  const cancel = () => {
    window.clearInterval(timer.current);
    setUpload(null);
  };

  if (upload) {
    return (
      <div className="y-tile flex flex-col gap-3 p-4" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <Spinner size={18} />
          <p className="y-small min-w-0 flex-1 truncate font-semibold">Uploading {upload.name}</p>
          <span className="y-small y-num y-fg-2">{upload.progress}%</span>
        </div>
        <div className="y-progress" aria-hidden>
          <span style={{ width: `${upload.progress}%` }} />
        </div>
        <PillButton size="sm" variant="ghost" className="w-fit" onClick={cancel}>
          Cancel upload
        </PillButton>
      </div>
    );
  }

  if (value) {
    return (
      <div className="y-tile flex flex-wrap items-center gap-3 p-3 ps-4">
        <span className="y-round flex-none" data-tone-btn="contrast" data-size="sm" aria-hidden>
          <Film size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="y-small truncate font-semibold">{value.name}</p>
          <p className="y-micro y-fg-2">
            {clock(value.durationSec)} · {value.source === "asset" ? "From your product files" : "Uploaded"}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="y-round"
            data-tone-btn="soft"
            data-size="sm"
            aria-label="Replace video"
            title="Replace video"
            onClick={pick}
          >
            <RefreshCw size={16} aria-hidden />
          </button>
          <button
            type="button"
            className="y-round"
            data-tone-btn="soft"
            data-size="sm"
            aria-label="Remove video"
            title="Remove video"
            onClick={() => onChange(undefined)}
          >
            <Trash2 size={16} aria-hidden />
          </button>
        </div>
        <FileInput inputRef={fileRef} onPick={start} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={pick} className="y-dropzone flex items-center gap-3 p-4 text-start font-semibold">
        <span className="y-round flex-none" data-tone-btn="contrast" data-size="sm" aria-hidden>
          <Upload size={18} />
        </span>
        <span className="min-w-0">
          <span className="block">Upload an explainer video</span>
          <span className="y-micro y-fg-2 block font-medium">A minute or two on what it is and who it&apos;s for</span>
        </span>
      </button>
      <FileInput inputRef={fileRef} onPick={start} />
      {footage.length ? (
        <div className="flex flex-col gap-2">
          <p className="y-micro y-fg-2 px-1">Or use one of your product files</p>
          {footage.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className="y-tile y-hoverable flex min-h-12 items-center gap-3 px-4 text-start"
              onClick={() =>
                onChange({ name: asset.name, durationSec: durationFor(asset.name), source: "asset", assetId: asset.id })
              }
            >
              <Film size={18} aria-hidden className="flex-none" />
              <span className="y-small min-w-0 flex-1 truncate font-semibold">{asset.name}</span>
              <span className="y-micro y-fg-2">{asset.size}</span>
            </button>
          ))}
        </div>
      ) : null}
      <button type="button" className="y-small y-fg-2 w-fit px-1 font-medium underline underline-offset-4" onClick={() => start(sampleName)}>
        No file handy? Use a sample video
      </button>
    </div>
  );
}

function FileInput({
  inputRef,
  onPick,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (name: string) => void;
}) {
  return (
    <input
      ref={inputRef}
      aria-hidden
      type="file"
      accept="video/*"
      className="sr-only"
      tabIndex={-1}
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onPick(file.name);
        event.target.value = "";
      }}
    />
  );
}

/** A simulated play tile for the explainer on the order page. */
export function ExplainerTile({ name, durationSec }: { name: string; durationSec: number }) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const toggle = () => {
    if (playing) {
      window.clearInterval(timer.current);
      setPlaying(false);
      return;
    }
    let at = elapsed >= durationSec ? 0 : elapsed;
    setElapsed(at);
    setPlaying(true);
    timer.current = window.setInterval(() => {
      at = Math.min(durationSec, at + 0.25);
      setElapsed(at);
      if (at >= durationSec) {
        window.clearInterval(timer.current);
        setPlaying(false);
      }
    }, 250);
  };

  return (
    <div className="y-tile flex flex-col gap-3 p-3 ps-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="y-round flex-none"
          data-tone-btn="contrast"
          aria-label={playing ? "Pause explainer" : "Play explainer"}
          aria-pressed={playing}
          onClick={toggle}
        >
          {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden className="y-flip" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="y-small font-semibold">Explainer from the business</p>
          <p className="y-micro y-fg-2 truncate">{name}</p>
        </div>
        <span className="y-small y-num y-fg-2 flex-none">
          {playing || elapsed > 0 ? `${clock(elapsed)} / ` : ""}
          {clock(durationSec)}
        </span>
      </div>
      {playing || elapsed > 0 ? (
        <div className="y-progress" aria-hidden>
          <span style={{ width: `${(elapsed / durationSec) * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
}
