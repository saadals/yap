"use client";

import { Check, FileText, Film, ImageIcon, Plus, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import { FilterChip } from "@/components/ui/chip";
import { attachmentCounter, attachmentMeta, checkBriefAttachments, type IncomingFile } from "@/lib/files";
import { campaignPlatformById } from "@/lib/taxonomy";
import type { BriefAttachment, CampaignPlatformId, Reference } from "@/lib/types";

import { errorId, fieldId, handleError, HANDLE_RE, type FieldKey } from "./model";

/* -------------------------------------------------------------------------- */
/* Step card and fields                                                        */
/* -------------------------------------------------------------------------- */

/** The step's card: H2, a hint, then the fields 20px apart (`.nw` in the preview). */
export function StepCard({
  title,
  hint,
  headingRef,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  headingRef?: React.Ref<HTMLHeadingElement>;
  children: React.ReactNode;
}) {
  return (
    <section className="y-nw-card" aria-labelledby="nw-step-title" data-tone="paper">
      <div className="y-nw-card-h">
        <h2 id="nw-step-title" ref={headingRef} tabIndex={-1} className="y-nw-h2">
          {title}
        </h2>
        {hint ? <p className="y-nw-hint">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** A field's error under it, read out as soon as it appears. */
export function FieldError({ field, message }: { field: FieldKey | string; message?: string }) {
  if (!message) return null;
  return (
    <p id={errorId(field)} className="y-nw-err" role="alert">
      {message}
    </p>
  );
}

/**
 * A labelled field: label (with "· optional"), the control, a hint and the error. `htmlFor`
 * points at a single control; groups pass `group` and label themselves with `aria-labelledby`.
 */
export function Fld({
  field,
  label,
  optional = false,
  note,
  hint,
  error,
  group = false,
  labelId,
  aside,
  children,
  className = "",
}: {
  field: FieldKey | string;
  label: React.ReactNode;
  optional?: boolean;
  /** Small words after the label ("pick one or more"). */
  note?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  group?: boolean;
  labelId?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const Label = group ? "span" : "label";
  return (
    <div className={`y-nw-fld ${className}`}>
      <div className="y-nw-fld-top">
        <Label
          id={labelId}
          className="y-nw-lb"
          {...(group ? {} : { htmlFor: fieldId(field) })}
        >
          {label}
          {optional ? <small> · optional</small> : null}
          {note ? <small> · {note}</small> : null}
        </Label>
        {aside}
      </div>
      {children}
      {error ? <FieldError field={field} message={error} /> : null}
      {hint ? <small className="y-nw-small">{hint}</small> : null}
    </div>
  );
}

/** Props for a control inside `Fld`: id, invalid state and what describes it. */
export function controlProps(field: FieldKey | string, error?: string) {
  return {
    id: fieldId(field),
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? errorId(field) : undefined,
  };
}

/** A row of small pressed pills (formats, platforms, deadlines). */
export function PillGroup<T extends string | number>({
  field,
  labelId,
  options,
  selected,
  onToggle,
  error,
  multiple = false,
  checkmark = false,
}: {
  field: FieldKey | string;
  labelId: string;
  options: { value: T; label: React.ReactNode; aria?: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  error?: string;
  multiple?: boolean;
  checkmark?: boolean;
}) {
  return (
    <div
      id={fieldId(field)}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={error ? errorId(field) : undefined}
      data-invalid={error ? "true" : undefined}
      tabIndex={-1}
      className="y-nw-pills"
      data-multiple={multiple ? "true" : undefined}
    >
      {options.map((option) => {
        const on = selected.includes(option.value);
        return (
          <FilterChip
            key={String(option.value)}
            size="sm"
            pressed={on}
            onClick={() => onToggle(option.value)}
            icon={checkmark && on ? <Check size={14} strokeWidth={2.75} aria-hidden /> : undefined}
          >
            {option.label}
          </FilterChip>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Accounts creators should tag (campaigns)                                    */
/* -------------------------------------------------------------------------- */

/**
 * One row per chosen platform: the saved "@handle" with a "Saved" chip and Change, or an input with
 * an "@" prefix. A valid handle is saved on blur (and on Continue); an invalid one shows its error.
 */
export function HandleRows({
  platforms,
  handles,
  saved,
  error,
  onChange,
  onSave,
}: {
  platforms: CampaignPlatformId[];
  handles: Partial<Record<CampaignPlatformId, string>>;
  saved: Partial<Record<CampaignPlatformId, string>>;
  error: (field: FieldKey) => string | undefined;
  onChange: (platform: CampaignPlatformId, value: string) => void;
  onSave: (platform: CampaignPlatformId, value: string) => void;
}) {
  const [editing, setEditing] = useState<CampaignPlatformId[]>([]);
  const [touched, setTouched] = useState<CampaignPlatformId[]>([]);
  return (
    <div className="y-nw-handles">
      {platforms.map((platform) => {
        const name = campaignPlatformById[platform].name;
        const value = handles[platform] ?? "";
        const isSaved = Boolean(saved[platform]) && saved[platform] === value && !editing.includes(platform);
        const key = `handle-${platform}` as const;
        const message = error(key) ?? (touched.includes(platform) ? handleError(platform, value) : undefined);
        return (
          <div key={platform} className="y-nw-hrow-wrap">
            <div className="y-nw-hrow" data-saved={isSaved ? "true" : undefined}>
              <span className="y-nw-hp">{name}</span>
              {isSaved ? (
                <>
                  <span className="y-nw-hsaved">
                    @{value}
                    <small>Saved</small>
                  </span>
                  <button
                    type="button"
                    className="y-nw-link y-hit"
                    aria-label={`Change the ${name} account`}
                    onClick={() => {
                      setEditing((list) => [...list, platform]);
                      window.requestAnimationFrame(() =>
                        document.getElementById(`nwf-${key}`)?.focus(),
                      );
                    }}
                  >
                    Change
                  </button>
                </>
              ) : (
                <label className="y-nw-hin" data-invalid={message ? "true" : undefined}>
                  <span aria-hidden>@</span>
                  <input
                    id={`nwf-${key}`}
                    value={value}
                    placeholder="yourbrand"
                    maxLength={31}
                    autoComplete="off"
                    spellCheck={false}
                    aria-label={`${name} account creators should tag`}
                    aria-invalid={message ? true : undefined}
                    aria-describedby={message ? errorId(key) : undefined}
                    onChange={(event) => onChange(platform, event.target.value.replace(/^@+/, "").trim())}
                    onBlur={() => {
                      if (value && HANDLE_RE.test(value)) {
                        setEditing((list) => list.filter((p) => p !== platform));
                        setTouched((list) => list.filter((p) => p !== platform));
                        if (saved[platform] !== value) onSave(platform, value);
                      } else if (value) {
                        setTouched((list) => (list.includes(platform) ? list : [...list, platform]));
                      }
                    }}
                  />
                </label>
              )}
            </div>
            <FieldError field={key} message={message} />
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Attachments (Work spec 6.11.7)                                              */
/* -------------------------------------------------------------------------- */

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

/**
 * Drop zone or click; several files at once. Every file is checked in the browser (`lib/files.ts`):
 * each up to 10 MB, one reference video up to 20 seconds, up to ten images, documents as PDF, DOC,
 * DOCX, TXT or MD. Rejections are listed together under the files; the rest are still added.
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

  const add = async (list: File[]) => {
    if (!list.length) return;
    const incoming: IncomingFile[] = await Promise.all(
      list.map(async (file) => {
        const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : undefined;
        const durationSec = kind === "video" ? await durationOf(file) : undefined;
        return { name: file.name, bytes: file.size, kind, durationSec };
      }),
    );
    const stamp = Date.now().toString(36);
    const result = checkBriefAttachments(files, incoming, (index) => `att-${stamp}-${index}`);
    setRejected(result.rejected);
    onChange(result.files);
  };

  return (
    <div className="y-nw-att">
      <button
        type="button"
        className="y-nw-drop"
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
          void add([...event.dataTransfer.files]);
        }}
      >
        <Upload size={18} aria-hidden />
        <b>Add files</b>
        <span id={hintId}>
          Brand guide or script (PDF, DOC, TXT) · a reference video up to 20 seconds · up to 10 images
          <br />
          <span className="y-nw-muted">Each file up to 10 MB</span>
        </span>
      </button>
      <input
        ref={inputRef}
        id="nwf-attachments"
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,video/*,image/*"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const list = [...(event.target.files ?? [])];
          event.target.value = "";
          void add(list);
        }}
      />
      {files.length ? (
        <ul className="y-nw-attlist" aria-label="Attached files">
          {files.map((file) => {
            const Icon = kindIcon[file.kind];
            return (
              <li key={file.id} className="y-nw-att-i">
                <span className="y-nw-att-ic" aria-hidden>
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <b>{file.name}</b>
                  <small>{attachmentMeta(file)}</small>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
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
        <ul className="y-nw-err y-nw-rejected" role="alert" aria-label="Files not added">
          {rejected.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}
      <small className="y-nw-small y-num">{attachmentCounter(files)}</small>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* References (More detail)                                                    */
/* -------------------------------------------------------------------------- */

export function ReferenceEditor({ items, onChange }: { items: Reference[]; onChange: (items: Reference[]) => void }) {
  const baseId = useId();
  const update = (index: number, patch: Partial<Reference>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={item.id} className="y-nw-ref">
          <div className="flex items-center justify-between gap-2">
            <span className="y-nw-small">Reference {index + 1}</span>
            <button
              type="button"
              className="y-round"
              data-tone-btn="soft"
              data-size="sm"
              aria-label={`Remove reference ${index + 1}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
          <label className="sr-only" htmlFor={`${baseId}-${index}-label`}>
            Link or account for reference {index + 1}
          </label>
          <input
            id={`${baseId}-${index}-label`}
            className="y-input y-nw-input"
            placeholder="Link or account, e.g. tiktok.com/@shopowner"
            value={item.label}
            onChange={(event) => update(index, { label: event.target.value })}
          />
          <label className="sr-only" htmlFor={`${baseId}-${index}-note`}>
            What you like about reference {index + 1}
          </label>
          <input
            id={`${baseId}-${index}-note`}
            className="y-input y-nw-input"
            placeholder="What you like about it, e.g. the pace of the first 3 seconds"
            value={item.note ?? ""}
            onChange={(event) => update(index, { note: event.target.value })}
          />
        </div>
      ))}
      {items.length < 5 ? (
        <button
          type="button"
          className="y-nw-addline"
          onClick={() => onChange([...items, { id: `ref-${Date.now().toString(36)}`, label: "", note: "" }])}
        >
          <Plus size={16} aria-hidden />
          {items.length ? "Add another reference" : "Add a reference"}
        </button>
      ) : null}
    </div>
  );
}
