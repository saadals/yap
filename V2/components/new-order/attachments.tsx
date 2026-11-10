"use client";

import { FileText, Film, Image as ImageIcon, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { attachmentCounter, attachmentMeta, checkBriefAttachments, type IncomingFile } from "@/lib/files";
import type { BriefAttachment } from "@/lib/types";

/** A reference video's length from its metadata (undefined when the browser can't read it). */
function durationOf(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (value?: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : undefined);
    video.onerror = () => done(undefined);
    window.setTimeout(() => done(undefined), 4000);
    video.src = url;
  });
}

const kindIcon = { document: FileText, video: Film, image: ImageIcon } as const;

/** Files to try when there's nothing on this device (nothing is uploaded either way). */
const SAMPLES: (IncomingFile & { label: string })[] = [
  { label: "Brand guide (PDF)", name: "Brand guide.pdf", bytes: 1_240_000, kind: "document" },
  { label: "App screenshot", name: "App screens.png", bytes: 640_000, kind: "image" },
  { label: "Reference clip (18 s)", name: "Reference clip.mp4", bytes: 6_400_000, kind: "video", durationSec: 18 },
];

/**
 * Brief attachments (simulated: only the name, size and length are kept, nothing leaves the
 * browser). Pick files or drop them, or add a sample. Every file is checked by
 * `checkBriefAttachments` (lib/files.ts): documents as PDF, DOC, DOCX, TXT or MD, one reference
 * video of at most 20 seconds, up to ten images, each at most 10 MB. Rejections are listed
 * together; the rest are still added.
 */
export function AttachmentsField({
  files,
  onChange,
}: {
  files: BriefAttachment[];
  onChange: (files: BriefAttachment[]) => void;
}) {
  const [rejected, setRejected] = useState<string[]>([]);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();

  const addIncoming = (incoming: IncomingFile[]) => {
    if (!incoming.length) return;
    const stamp = Date.now().toString(36);
    const result = checkBriefAttachments(files, incoming, (index) => `att-${stamp}-${index}`);
    setRejected(result.rejected);
    onChange(result.files);
  };

  const addFiles = async (list: File[]) => {
    if (!list.length) return;
    const incoming: IncomingFile[] = await Promise.all(
      list.map(async (file) => {
        const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : undefined;
        const durationSec = kind === "video" ? await durationOf(file) : undefined;
        return { name: file.name, bytes: file.size, kind, durationSec };
      }),
    );
    addIncoming(incoming);
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="y-dropzone flex min-h-16 items-center gap-3 px-4 py-3 text-start"
        data-over={over ? "true" : undefined}
        aria-describedby={hintId}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          void addFiles([...event.dataTransfer.files]);
        }}
      >
        <Upload size={18} aria-hidden className="flex-none" />
        <span className="flex min-w-0 flex-col">
          <span className="y-small font-semibold">Add files</span>
          <span id={hintId} className="y-micro y-fg-2">
            Brand guide or script (PDF, DOC, TXT), one reference video up to 20 seconds, up to 10 images. Each up to 10 MB.
          </span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,video/*,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const list = [...(event.target.files ?? [])];
          event.target.value = "";
          void addFiles(list);
        }}
      />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1">
        <span className="y-micro y-fg-2">No file handy? Add a sample:</span>
        {SAMPLES.map((sample) => (
          <button
            key={sample.name}
            type="button"
            className="y-link y-micro font-semibold"
            onClick={() => addIncoming([{ name: sample.name, bytes: sample.bytes, kind: sample.kind, durationSec: sample.durationSec }])}
          >
            {sample.label}
          </button>
        ))}
      </div>

      {files.length ? (
        <ul className="flex flex-col gap-1.5" aria-label="Attached files">
          {files.map((file) => {
            const Icon = kindIcon[file.kind];
            return (
              <li key={file.id} className="y-tile flex items-center gap-3 py-1.5 ps-3 pe-1.5">
                <Icon size={16} aria-hidden className="flex-none" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="y-small truncate font-semibold">{file.name}</span>
                  <span className="y-micro y-fg-2">{attachmentMeta(file)}</span>
                </span>
                <button
                  type="button"
                  className="y-round"
                  data-tone-btn="ghost"
                  data-size="sm"
                  aria-label={`Remove ${file.name}`}
                  title="Remove"
                  onClick={() => {
                    setRejected([]);
                    onChange(files.filter((f) => f.id !== file.id));
                  }}
                >
                  <X size={16} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {rejected.length ? (
        <ul className="y-small flex flex-col gap-1 px-1 font-medium text-(--y-danger)" role="alert" aria-label="Files not added">
          {rejected.map((message) => (
            <li key={message}>Not added: {message}</li>
          ))}
        </ul>
      ) : null}
      {files.length ? <p className="y-micro y-fg-2 y-num px-1">{attachmentCounter(files)}</p> : null}
    </div>
  );
}
