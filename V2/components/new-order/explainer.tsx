"use client";

import { Film, RefreshCw, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { clock } from "@/lib/format";
import type { ProductAsset } from "@/lib/types";

import type { Explainer } from "./campaign-model";
import { Spinner } from "./parts";

/** A believable length for a simulated upload: 30–90 seconds, stable for the same name. */
function durationFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 30 + (hash % 61);
}

/**
 * The campaign's explainer video: a simulated upload (pick a file, watch it upload) or one of the
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
      progress = Math.min(100, progress + 12);
      setUpload({ name, progress });
      if (progress >= 100) {
        window.clearInterval(timer.current);
        setUpload(null);
        onChange({ name, durationSec: durationFor(name), source: "upload" });
      }
    }, 110);
  };

  const fileInput = (
    <input
      ref={fileRef}
      aria-hidden
      type="file"
      accept="video/*"
      className="sr-only"
      tabIndex={-1}
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) start(file.name);
        event.target.value = "";
      }}
    />
  );

  if (upload) {
    return (
      <div className="y-tile flex flex-col gap-3 p-4" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <Spinner size={16} />
          <p className="y-small min-w-0 flex-1 truncate font-semibold">Uploading {upload.name}</p>
          <span className="y-small y-num y-fg-2">{upload.progress}%</span>
        </div>
        <div className="y-progress" aria-hidden>
          <span style={{ width: `${upload.progress}%` }} />
        </div>
        <PillButton
          size="sm"
          variant="ghost"
          className="w-fit"
          onClick={() => {
            window.clearInterval(timer.current);
            setUpload(null);
          }}
        >
          Cancel upload
        </PillButton>
      </div>
    );
  }

  if (value) {
    return (
      <div className="y-tile flex items-center gap-3 p-3 ps-4">
        <Film size={18} aria-hidden className="flex-none" />
        <div className="min-w-0 flex-1">
          <p className="y-small truncate font-semibold">{value.name}</p>
          <p className="y-micro y-fg-2">
            {clock(value.durationSec)} · {value.source === "asset" ? "From your product files" : "Uploaded"}
          </p>
        </div>
        <button type="button" className="y-round" data-tone-btn="ghost" data-size="sm" aria-label="Replace video" title="Replace video" onClick={pick}>
          <RefreshCw size={16} aria-hidden />
        </button>
        <button
          type="button"
          className="y-round"
          data-tone-btn="ghost"
          data-size="sm"
          aria-label="Remove video"
          title="Remove video"
          onClick={() => onChange(undefined)}
        >
          <Trash2 size={16} aria-hidden />
        </button>
        {fileInput}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={pick} className="y-dropzone flex min-h-14 items-center gap-3 px-4 py-3 text-start">
        <Upload size={18} aria-hidden className="flex-none" />
        <span className="min-w-0">
          <span className="y-small block font-semibold">Upload an explainer video</span>
          <span className="y-micro y-fg-2 block">A minute or two on what it is and who it&apos;s for</span>
        </span>
      </button>
      {fileInput}
      {footage.map((asset) => (
        <button
          key={asset.id}
          type="button"
          className="y-tile y-hoverable flex min-h-12 items-center gap-3 px-4 text-start"
          onClick={() => onChange({ name: asset.name, durationSec: durationFor(asset.name), source: "asset", assetId: asset.id })}
        >
          <Film size={16} aria-hidden className="flex-none" />
          <span className="y-small min-w-0 flex-1 truncate">
            Use <span className="font-semibold">{asset.name}</span>
          </span>
          <span className="y-micro y-fg-2">{asset.size}</span>
        </button>
      ))}
      <button type="button" className="y-small y-fg-2 w-fit px-1 py-2 underline underline-offset-4" onClick={() => start(sampleName)}>
        No file handy? Use a sample video
      </button>
    </div>
  );
}
