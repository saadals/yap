"use client";

import { AlertTriangle, Check, FileVideo, UploadCloud, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Celebrate } from "@/components/ui/celebrate";
import { TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { clock, plural, weekdayDate } from "@/lib/format";
import { actions } from "@/lib/store";

import { autoApproveDate, cash, sizeLabel, type Workspace } from "./helpers";

type Upload = {
  id: string;
  name: string;
  size: string;
  progress: number;
  /** Percentage points per tick (simulated network speed). */
  speed: number;
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "video";

/**
 * Creator uploads the next version: files (drag and drop or picker, simulated upload), a note to
 * the client, the brief checklist and, for revisions, the client's open notes to tick off.
 * Campaign slots upload a review copy, which the business sees watermarked until they approve.
 */
export function DeliverSheet({ ws, open, onClose }: { ws: Workspace; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const { commission, businessName, latest, product, totals, slot } = ws;
  const version = commission.deliveries.length + 1;
  const earns = slot ? commission.price : totals.creatorEarns;
  const what = slot ? (version === 1 ? "your review copy" : `review copy ${version}`) : `version ${version}`;
  const What = what.charAt(0).toUpperCase() + what.slice(1);
  const mustInclude = commission.brief.mustInclude;
  const openNotes =
    commission.status === "revision" && latest
      ? latest.comments.filter((c) => !c.resolved && c.author === "business")
      : [];

  const [uploads, setUploads] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState("");
  const [ticked, setTicked] = useState<string[]>([]);
  const [notesDone, setNotesDone] = useState<string[]>([]);
  const [warned, setWarned] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const checklistId = useId();

  const uploading = uploads.some((u) => u.progress < 100);
  const ready = uploads.length > 0 && !uploading;
  const missingBrief = mustInclude.filter((item) => !ticked.includes(item));
  const missingNotes = openNotes.filter((c) => !notesDone.includes(c.id));
  const missing = missingBrief.length + missingNotes.length;

  useEffect(() => {
    if (!uploading) return;
    const timer = window.setInterval(() => {
      setUploads((list) =>
        list.map((u) => (u.progress >= 100 ? u : { ...u, progress: Math.min(100, u.progress + u.speed) })),
      );
    }, 160);
    return () => window.clearInterval(timer);
  }, [uploading]);

  const add = (files: { name: string; bytes: number }[]) => {
    if (!files.length) return;
    setUploads((list) => [
      ...list,
      ...files.map((file) => ({
        id: `${file.name}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: sizeLabel(file.bytes),
        progress: 0,
        // Big files upload slower; keep it between ~2s and ~6s.
        speed: Math.max(4, Math.min(14, 9 - Math.log10(Math.max(file.bytes, 1)) + Math.random() * 6)),
      })),
    ]);
  };

  const addSample = () =>
    add([{ name: `${slug(product?.name ?? commission.title)}-v${version}.mp4`, bytes: 48_600_000 + version * 1_300_000 }]);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const submit = () => {
    if (!ready) return;
    if (missing > 0 && !warned) {
      setWarned(true);
      return;
    }
    if (latest) {
      for (const id of notesDone) actions.updateComment(commission.id, latest.id, id, { resolved: true });
    }
    actions.deliver({
      commissionId: commission.id,
      note: note.trim(),
      files: uploads.map((u) => ({ name: u.name, size: u.size })),
    });
    toast({ message: `${What} sent to ${businessName} for review` });
    setDone(version);
  };

  if (done !== null) {
    const auto = autoApproveDate(commission, latest);
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={slot ? "Review copy uploaded" : `Version ${done} delivered`}
        hideTitle
        side="center"
        width="sm"
        footer={
          <PillButton variant="contrast" size="lg" className="w-full" onClick={onClose}>
            Done
          </PillButton>
        }
      >
        <div className="flex flex-col items-center gap-4 pb-2 text-center" role="status">
          <Celebrate className="h-32 w-52" />
          <p className="y-display y-title" aria-hidden>
            {slot ? "Your review copy" : `Version ${done}`} is with {businessName}
          </p>
          <p className="y-body y-fg-2 max-w-[40ch]">
            We&apos;ve let them know.{" "}
            {slot
              ? `They see it watermarked. ${auto ? `If they don't respond by ${weekdayDate(auto)}, it's approved automatically` : "Once they approve"} and ${cash(earns)} goes to your wallet as pending.`
              : auto
                ? `They have until ${weekdayDate(auto)} to review. If they don't respond, it's approved automatically and ${cash(earns)} is released to you.`
                : `You're paid ${cash(earns)} as soon as they approve.`}
          </p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Upload ${what}`}
      description={
        slot
          ? `${businessName} sees a watermarked, low-quality copy until they approve it. They have 3 days to review.`
          : `${businessName} gets a notification and has 3 days to review.`
      }
      width="lg"
      footer={
        <div className="flex flex-col gap-2">
          {!ready ? (
            <p className="y-micro y-fg-2 text-center" aria-live="polite">
              {uploading ? "Uploading… you can keep filling this in." : "Add your video to continue."}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <PillButton variant="ghost" onClick={onClose}>
              Cancel
            </PillButton>
            <PillButton variant="contrast" size="lg" disabled={!ready} onClick={submit}>
              {warned && missing > 0 ? (slot ? "Upload anyway" : "Deliver anyway") : slot ? `Send ${what} for review` : `Send version ${version} for review`}
            </PillButton>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <div
            className="y-dropzone flex flex-col items-center gap-3 px-5 py-8 text-center"
            data-over={over ? "true" : undefined}
            onDragEnter={(event) => {
              event.preventDefault();
              setOver(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!over) setOver(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setOver(false);
              add(Array.from(event.dataTransfer.files).map((f) => ({ name: f.name, bytes: f.size })));
            }}
          >
            <UploadCloud size={30} aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="y-small font-semibold">{over ? "Drop to upload" : "Drag your video and files here"}</p>
              <p className="y-micro y-fg-2">MP4 or MOV up to 2 GB. Add subtitles, raw footage or hooks too.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <PillButton size="sm" variant="contrast" onClick={() => inputRef.current?.click()}>
                Choose files
              </PillButton>
              <PillButton size="sm" variant="ghost" onClick={addSample}>
                No file handy? Use a sample
              </PillButton>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="video/*,image/*,.zip,.srt,.vtt,.pdf"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                add(Array.from(event.target.files ?? []).map((f) => ({ name: f.name, bytes: f.size })));
                event.target.value = "";
              }}
            />
          </div>

          {uploads.length ? (
            <ul className="flex flex-col gap-2" aria-label="Files in this version">
              {uploads.map((upload) => (
                <li key={upload.id} className="y-tile flex items-center gap-3 py-2 ps-4 pe-2">
                  <FileVideo size={20} aria-hidden className="flex-none" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="y-small truncate font-semibold">{upload.name}</span>
                      <span className="y-micro y-num y-fg-2 flex-none">
                        {upload.progress < 100 ? `${Math.floor(upload.progress)}%` : upload.size}
                      </span>
                    </div>
                    {upload.progress < 100 ? (
                      <div
                        className="y-progress"
                        role="progressbar"
                        aria-label={`Uploading ${upload.name}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.floor(upload.progress)}
                      >
                        <span style={{ width: `${upload.progress}%` }} />
                      </div>
                    ) : (
                      <span className="y-micro inline-flex items-center gap-1 font-semibold text-(--y-success)">
                        <Check size={12} strokeWidth={3} aria-hidden /> Uploaded
                      </span>
                    )}
                  </div>
                  <RoundIconButton
                    size="sm"
                    label={`Remove ${upload.name}`}
                    className="!bg-(--b-bg)"
                    onClick={() => setUploads((list) => list.filter((u) => u.id !== upload.id))}
                  >
                    <X size={18} aria-hidden />
                  </RoundIconButton>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {uploads.length && !uploading ? `${plural(uploads.length, "file")} uploaded` : ""}
          </p>
        </div>

        <TextArea
          label={`Note to ${businessName}`}
          hint="What's in this version and anything you'd like them to look at."
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            openNotes.length
              ? "e.g. Slowed the WhatsApp moment down and re-recorded the ending as you asked."
              : "e.g. Here's version 1. I went with the shop-counter setting and kept it under 45 seconds."
          }
        />

        {openNotes.length ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="y-label mb-1">Changes {businessName} asked for</legend>
            <p className="y-micro y-fg-3 mb-1 px-1">Tick each one you&apos;ve addressed. They&apos;re marked done for {businessName}.</p>
            {openNotes.map((comment) => (
              <label key={comment.id} className="y-tile flex cursor-pointer items-start gap-3 p-3">
                <input
                  type="checkbox"
                  className="y-check mt-0.5"
                  checked={notesDone.includes(comment.id)}
                  onChange={() => setNotesDone((list) => toggle(list, comment.id))}
                />
                <span className="y-small">
                  <span className="y-num font-semibold">{clock(comment.atSec)}</span> · {comment.text}
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}

        {mustInclude.length ? (
          <fieldset className="flex flex-col gap-2" aria-describedby={`${checklistId}-hint`}>
            <legend className="y-label mb-1">{slot ? "Talking points" : "Brief checklist"}</legend>
            <p id={`${checklistId}-hint`} className="y-micro y-fg-3 mb-1 px-1">
              Tick what&apos;s in this version. {businessName} checks these first.
            </p>
            {mustInclude.map((item) => (
              <label key={item} className="y-tile flex cursor-pointer items-start gap-3 p-3">
                <input
                  type="checkbox"
                  className="y-check mt-0.5"
                  checked={ticked.includes(item)}
                  onChange={() => setTicked((list) => toggle(list, item))}
                />
                <span className="y-small">{item}</span>
              </label>
            ))}
          </fieldset>
        ) : null}

        {warned && missing > 0 ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-(--y-r-tile) bg-(--y-warning-soft) p-4 text-(--y-warning)"
          >
            <AlertTriangle size={20} aria-hidden className="mt-0.5 flex-none" />
            <p className="y-small font-medium">
              {plural(missing, "item")} {missing === 1 ? "isn't" : "aren't"} ticked yet
              {missingNotes.length ? ` (${plural(missingNotes.length, "requested change")})` : ""}. Versions that miss
              the brief usually come back for changes. Tick them, or deliver anyway.
            </p>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
