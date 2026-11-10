"use client";

import { AlertTriangle, Check, FileText, FileVideo, UploadCloud, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { checkCopyDocument } from "@/lib/files";
import { clock, plural, weekdayDate } from "@/lib/format";
import { openComments, requestedComments } from "@/lib/selectors";
import { actions, sampleAdCopy } from "@/lib/store";
import { AUTO_APPROVE_DAYS, CAMPAIGN_RELEASE_DAYS } from "@/lib/taxonomy";

import { cash, deliveryFileKind, sizeLabel, type Job } from "./helpers";

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
 * The creator sends the next version. Video jobs: files (drag and drop, the picker, or a generated
 * sample; the upload is simulated). Ad copy: the copy typed in and/or a document (PDF, DOC, DOCX,
 * TXT). Then a note and a checklist: the comments the brand sent with its change request, or the
 * brief. Campaign slots upload a review copy, which the brand sees watermarked. The store marks
 * what was still open on the previous version resolved.
 */
export function DeliverSheet({
  job,
  open,
  onClose,
  onActed,
}: {
  job: Job;
  open: boolean;
  onClose: () => void;
  onActed: () => void;
}) {
  const toast = useToast();
  const { commission: c, businessName, latest, product, totals, slot, adCopy } = job;
  const version = c.deliveries.length + 1;
  const earns = totals.creatorEarns;
  const what = slot
    ? version === 1
      ? "your review copy"
      : `review copy ${version}`
    : adCopy && version === 1
      ? "the copy"
      : `version ${version}`;
  const What = what.charAt(0).toUpperCase() + what.slice(1);
  const brief = c.brief;
  const briefItems = adCopy ? [...(brief.copy?.pieces ?? []), ...brief.mustInclude] : brief.mustInclude;
  // On a revision: the comments the brand sent with its request (older data: its open ones).
  const stillOpen = c.status === "revision" && latest ? openComments(latest) : [];
  const sent = c.status === "revision" && latest ? requestedComments(latest).filter((m) => !m.resolved) : [];
  const asked = sent.length ? sent : stillOpen.filter((m) => m.author === "business");

  const [uploads, setUploads] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState("");
  const [copy, setCopy] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [ticked, setTicked] = useState<string[]>([]);
  const [warned, setWarned] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const checklistId = useId();
  const copyId = useId();

  const uploading = uploads.some((u) => u.progress < 100);
  const hasFile = uploads.some((u) => u.progress >= 100);
  const hasWork = adCopy ? copy.trim().length > 0 || hasFile : hasFile;
  const ready = hasWork && !uploading;
  const missingBrief = briefItems.filter((item) => !ticked.includes(item)).length;
  const missingAsked = asked.filter((m) => !ticked.includes(m.id)).length;
  const missing = missingBrief + missingAsked;

  useEffect(() => {
    if (!uploading) return;
    const timer = window.setInterval(() => {
      setUploads((list) => list.map((u) => (u.progress >= 100 ? u : { ...u, progress: Math.min(100, u.progress + u.speed) })));
    }, 160);
    return () => window.clearInterval(timer);
  }, [uploading]);

  const add = (incoming: { name: string; bytes: number }[]) => {
    if (!incoming.length) return;
    // Ad copy takes documents only: PDF, DOC, DOCX or TXT, up to 10 MB.
    const problems = adCopy ? incoming.map(checkCopyDocument).filter((p): p is string => Boolean(p)) : [];
    const files = adCopy ? incoming.filter((f) => !checkCopyDocument(f)) : incoming;
    setFileError(problems.length ? `${problems.join(". ")}.` : null);
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

  const addSample = () => {
    const base = slug(product?.name ?? c.title);
    if (adCopy) {
      setCopy((text) => text || sampleAdCopy(product?.name ?? c.title, version));
      add([{ name: `${base}-ad-copy-v${version}.docx`, bytes: 34_000 }]);
      return;
    }
    add([
      {
        name: `${base}-${slot ? "review-copy-" : ""}v${version}_${brief.aspect.replace(":", "x")}.mp4`,
        bytes: (slot ? 11_200_000 : 48_600_000) + version * 1_300_000,
      },
    ]);
  };

  const toggle = (value: string) => setTicked((list) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]));

  const submit = () => {
    if (!ready) return;
    if (missing > 0 && !warned) {
      setWarned(true);
      return;
    }
    const files = uploads
      .filter((u) => u.progress >= 100)
      .map((u) => ({ name: u.name, size: u.size, kind: adCopy ? ("document" as const) : deliveryFileKind(u.name) }));
    const id = actions.deliver({
      commissionId: c.id,
      note: note.trim(),
      files,
      ...(adCopy ? { kind: "text" as const, text: copy.trim() } : {}),
    });
    if (!id) {
      setFileError("That didn't send. Check the files and try again.");
      return;
    }
    toast({ message: `${What} sent to ${businessName}` });
    setDone(version);
  };

  if (done !== null) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={slot ? "Review copy uploaded" : adCopy ? "Copy sent" : `Version ${done} delivered`}
        hideTitle
        side="center"
        width="sm"
        footer={
          <PillButton
            variant="contrast"
            size="lg"
            className="w-full"
            onClick={() => {
              onClose();
              onActed();
            }}
          >
            Done
          </PillButton>
        }
      >
        <div className="flex flex-col items-center gap-3 pt-2 pb-2 text-center" role="status">
          <p className="y-display y-title" aria-hidden>
            {slot ? "Your review copy" : adCopy && done === 1 ? "The copy" : `Version ${done}`} is with {businessName}
          </p>
          <p className="y-body y-fg-2 max-w-[40ch]">
            We&apos;ve let them know. They have {AUTO_APPROVE_DAYS} days to review it.{" "}
            {slot
              ? `Once it's approved, you post it, and your ${cash(earns)} is released ${CAMPAIGN_RELEASE_DAYS} days after we verify the post.`
              : `If they don't respond in time, it approves itself and ${cash(earns)} is released to you.`}
          </p>
        </div>
      </Sheet>
    );
  }

  const dropzone = (
    <div
      className="y-dropzone flex flex-col items-center gap-3 px-5 py-7 text-center"
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
      {adCopy ? <FileText size={28} aria-hidden /> : <UploadCloud size={28} aria-hidden />}
      <div className="flex flex-col gap-1">
        <p className="y-small font-medium">
          {over ? "Drop to upload" : adCopy ? "Or attach it as a document" : "Drag your video and files here"}
        </p>
        <p className="y-micro y-fg-2">
          {adCopy ? "PDF, DOC, DOCX or TXT, up to 10 MB." : "MP4 or MOV up to 2 GB. Add subtitles, hooks and the raw footage too."}
        </p>
        {!adCopy && brief.aspect === "9:16" ? (
          <p className="y-micro y-fg-2">Filming 1080 × 1920? Keep faces and captions inside the middle 880 × 1600.</p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <PillButton size="sm" variant="contrast" onClick={() => inputRef.current?.click()}>
          {adCopy ? "Choose a document" : "Choose files"}
        </PillButton>
        <PillButton size="sm" variant="ghost" onClick={addSample}>
          No file handy? Use a sample
        </PillButton>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={adCopy ? ".pdf,.doc,.docx,.txt" : "video/*,image/*,.zip,.srt,.vtt,.pdf"}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          add(Array.from(event.target.files ?? []).map((f) => ({ name: f.name, bytes: f.size })));
          event.target.value = "";
        }}
      />
    </div>
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={adCopy ? (version === 1 ? "Send the copy" : `Send ${what}`) : `Upload ${what}`}
      description={
        slot
          ? `${businessName} sees a watermarked, low-quality copy until they approve it. Due ${weekdayDate(c.dueDate)}.`
          : `${businessName} gets a notification and has ${AUTO_APPROVE_DAYS} days to review.`
      }
      width="lg"
      footer={
        <div className="flex flex-col gap-2">
          {!ready ? (
            <p className="y-micro y-fg-2 text-center sm:text-end" aria-live="polite">
              {uploading ? "Uploading… you can keep filling this in." : adCopy ? "Paste the copy or attach a document to continue." : "Add your video to continue."}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <PillButton variant="ghost" onClick={onClose}>
              Cancel
            </PillButton>
            <PillButton variant="contrast" size="lg" disabled={!ready} onClick={submit}>
              {warned && missing > 0 ? "Send it anyway" : `Send ${what} for review`}
            </PillButton>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-7">
        {adCopy ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={copyId} className="y-label">
              <span>The copy</span>
            </label>
            <textarea
              id={copyId}
              name="deliver-copy"
              className="y-input min-h-48"
              rows={9}
              value={copy}
              onChange={(event) => setCopy(event.target.value)}
              placeholder={"Headlines\n1. …\n\nPrimary text\n1. …\n\nCalls to action\n…"}
            />
            <p className="y-micro y-fg-2 px-1">Paste it the way you&apos;d hand it over. {businessName} reads it here and comments.</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {dropzone}

          {uploads.length ? (
            <ul className="flex flex-col gap-1.5" aria-label={`Files in ${what}`}>
              {uploads.map((upload) => (
                <li key={upload.id} className="y-tile flex items-center gap-3 py-2 ps-4 pe-2">
                  {adCopy ? <FileText size={18} aria-hidden className="flex-none" /> : <FileVideo size={18} aria-hidden className="flex-none" />}
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="y-small truncate font-medium">{upload.name}</span>
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
                      <span className="y-micro inline-flex items-center gap-1 font-medium text-(--y-success)">
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
                    <X size={16} aria-hidden />
                  </RoundIconButton>
                </li>
              ))}
            </ul>
          ) : null}
          {fileError ? (
            <p role="alert" className="y-small px-1 font-medium text-(--y-danger)">
              {fileError}
            </p>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {uploads.length && !uploading ? `${plural(uploads.length, "file")} uploaded` : ""}
          </p>
        </div>

        <TextArea
          label={`Note to ${businessName}`}
          hint="What's in this version and anything you'd like them to look at."
          rows={3}
          name="deliver-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={
            asked.length
              ? adCopy
                ? "e.g. Dropped 'stress-free' and tightened headline 3."
                : "e.g. Held the send screen longer and re-recorded the ending as you asked."
              : adCopy
                ? "e.g. Five headlines and five primary texts, all under the Meta limits."
                : "e.g. Here's version 1. I went with the shop-counter setting and kept it under 45 seconds."
          }
        />

        {asked.length ? (
          <fieldset className="flex flex-col gap-1.5">
            <legend className="y-label mb-1">Changes {businessName} asked for</legend>
            <p className="y-micro y-fg-2 mb-1 px-1">Tick each one this version covers. Sending marks them done for {businessName}.</p>
            {asked.map((comment) => (
              <label key={comment.id} className="y-tile flex cursor-pointer items-start gap-3 p-3">
                <input type="checkbox" className="y-check mt-0.5" checked={ticked.includes(comment.id)} onChange={() => toggle(comment.id)} />
                <span className="y-small">
                  <span className="y-num font-semibold">{comment.atSec === null ? "General" : clock(comment.atSec)}</span> · {comment.text}
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}

        {briefItems.length ? (
          <fieldset className="flex flex-col gap-1.5" aria-describedby={`${checklistId}-hint`}>
            <legend className="y-label mb-1">{slot ? "Talking points" : adCopy ? "What to write" : "Brief checklist"}</legend>
            <p id={`${checklistId}-hint`} className="y-micro y-fg-2 mb-1 px-1">
              Tick what&apos;s in this version. {businessName} checks these first.
            </p>
            {briefItems.map((item) => (
              <label key={item} className="y-tile flex cursor-pointer items-start gap-3 p-3">
                <input type="checkbox" className="y-check mt-0.5" checked={ticked.includes(item)} onChange={() => toggle(item)} />
                <span className="y-small">{item}</span>
              </label>
            ))}
          </fieldset>
        ) : null}

        {warned && missing > 0 ? (
          <div role="alert" className="flex items-start gap-3 rounded-(--y-r-tile) bg-(--y-warning-soft) p-4 text-(--y-warning)">
            <AlertTriangle size={18} aria-hidden className="mt-0.5 flex-none" />
            <p className="y-small font-medium">
              {plural(missing, "item")} {missing === 1 ? "isn't" : "aren't"} ticked yet
              {missingAsked ? ` (${plural(missingAsked, "requested change")})` : ""}. Versions that miss the brief usually come
              back for changes. Tick them, or send it anyway.
            </p>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
