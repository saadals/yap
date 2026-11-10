"use client";

import { Check, FileText, Film, UploadCloud, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { Sheet, SheetActions } from "@/components/ui/sheet";
import { checkCopyDocument } from "@/lib/files";
import { clock, lengthLabel, plural, weekdayDate } from "@/lib/format";
import { openComments } from "@/lib/selectors";
import { actions, readDemo, sampleAdCopy } from "@/lib/store";
import { AUTO_APPROVE_DAYS, CAMPAIGN_RELEASE_DAYS } from "@/lib/taxonomy";

import { cash, sizeLabel, type Workspace } from "./helpers";

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
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32) || "yapp";

/**
 * Upload a version (Work spec 6.9.1, 6.10.4): the file (simulated upload), the checklist (built
 * from the brief, or from the brand's open comments on a revision) and a note. Send stays disabled
 * until there's a file and every item is ticked. Ad copy sends text, a document, or both. Campaign
 * slots upload a review copy the brand sees watermarked until they approve.
 */
export function DeliverSheet({ ws, open, onClose }: { ws: Workspace; open: boolean; onClose: () => void }) {
  const { commission, businessName: brand, latest, product, totals, slot, adCopy } = ws;
  const brief = commission.brief;
  const version = commission.deliveries.length + 1;
  const net = cash(totals.creatorEarns);

  // On a revision: the comments the brand sent with the change request (older data without the
  // mark: the brand's open ones).
  const stillOpen = commission.status === "revision" && latest ? openComments(latest) : [];
  const requested = stillOpen.filter((c) => c.requestedAt);
  const notes = requested.length ? requested : stillOpen.filter((c) => c.author === "business");
  const avoid = brief.avoid.length ? [`Nothing from the avoid list: ${brief.avoid.join(", ")}`] : [];
  const briefItems = adCopy
    ? [...(brief.copy?.pieces ?? []), ...brief.mustInclude, ...avoid]
    : [
        ...(brief.hook ? [`Hook: ${brief.hook}`] : []),
        ...brief.mustInclude,
        ...avoid,
        `${brief.aspect}, about ${lengthLabel(brief.durationSec)}`,
      ];
  const fromNotes = notes.length > 0;
  const checklist: { id: string; label: React.ReactNode }[] = fromNotes
    ? notes.map((c) => ({
        id: c.id,
        label: (
          <>
            <span className="y-ord-tchip" data-general={c.atSec === null ? "true" : undefined}>
              {c.atSec === null ? "General" : clock(c.atSec)}
            </span>{" "}
            {c.text}
          </>
        ),
      }))
    : briefItems.map((item) => ({ id: item, label: item }));

  const [uploads, setUploads] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const [note, setNote] = useState("");
  const [copy, setCopy] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [ticked, setTicked] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const noteId = useId();
  const copyId = useId();

  const uploading = uploads.some((u) => u.progress < 100);
  const hasFile = uploads.some((u) => u.progress >= 100);
  const hasWork = adCopy ? copy.trim().length > 0 || hasFile : hasFile;
  const allTicked = checklist.every((item) => ticked.includes(item.id));
  const ready = hasWork && !uploading && allTicked;

  useEffect(() => {
    if (!uploading) return;
    const timer = window.setInterval(() => {
      setUploads((list) =>
        list.map((u) => (u.progress >= 100 ? u : { ...u, progress: Math.min(100, u.progress + u.speed) })),
      );
    }, 160);
    return () => window.clearInterval(timer);
  }, [uploading]);

  const add = (incoming: { name: string; bytes: number }[]) => {
    // Ad copy takes documents only: PDF, DOC, DOCX or TXT.
    const problems = adCopy ? incoming.map(checkCopyDocument).filter((p): p is string => Boolean(p)) : [];
    const files = adCopy ? incoming.filter((f) => !checkCopyDocument(f)) : incoming;
    setFileError(problems.length ? problems.join(". ") : null);
    if (!files.length) return;
    setUploads((list) => [
      ...list,
      ...files.map((file) => ({
        id: `${file.name}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: sizeLabel(file.bytes),
        progress: 0,
        // Big files upload slower; keep it between about 2 and 6 seconds.
        speed: Math.max(4, Math.min(14, 9 - Math.log10(Math.max(file.bytes, 1)) + Math.random() * 6)),
      })),
    ]);
  };

  const addSample = () => {
    const base = slug(product?.name ?? commission.title);
    if (adCopy) {
      setCopy((text) => text || sampleAdCopy(product?.name ?? commission.title, version));
      add([{ name: `${base}_ad_copy_v${version}.docx`, bytes: 34_000 }]);
      return;
    }
    add([{ name: `${base}_v${version}.mp4`, bytes: 38_400_000 + version * 2_600_000 }]);
  };

  const send = () => {
    if (!ready) return;
    // Sending marks the previous version's open comments resolved.
    const id = actions.deliver({
      commissionId: commission.id,
      note: note.trim(),
      ...(adCopy ? { kind: "text" as const, text: copy.trim() } : {}),
      files: uploads.map((u) => ({ name: u.name, size: u.size, kind: adCopy ? ("document" as const) : ("video" as const) })),
    });
    if (!id) {
      setFileError("Couldn't send. Try again.");
      return;
    }
    const auto = readDemo().commissions.find((c) => c.id === commission.id)?.autoApproveAt;
    onClose();
    ws.confirm({
      title: `Version ${version} is with ${brand}`,
      body: slot ? (
        <>
          We&apos;ve let them know. They have <b>{AUTO_APPROVE_DAYS} days</b> to review; if they don&apos;t respond,
          it&apos;s approved automatically. Then you post it on your {slot.platformName}, and your <b>{net}</b> is released{" "}
          {CAMPAIGN_RELEASE_DAYS} days after we verify the post.
        </>
      ) : (
        <>
          We&apos;ve let them know. They have until <b>{auto ? weekdayDate(auto) : `${AUTO_APPROVE_DAYS} days from now`}</b>{" "}
          to review. If they don&apos;t respond, it&apos;s approved automatically and <b>{net}</b> is released to you.
        </>
      ),
    });
  };

  const missing: string[] = [];
  if (!hasWork) missing.push(adCopy ? "paste the copy or attach a document" : "add your video");
  if (!allTicked) missing.push(`tick ${fromNotes ? "every note" : "every item"}`);
  const title = version === 1 ? (adCopy ? "Send the copy" : "Upload version 1") : `Send version ${version}`;
  const done = uploads.filter((u) => u.progress >= 100);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={
        slot
          ? `${brand} sees a watermarked, low-quality copy until they approve.${slot.terms?.deadlineDays ? ` Deadline: ${plural(slot.terms.deadlineDays, "day")}, set by ${brand}.` : ""}`
          : adCopy
            ? `${brand} gets a notification and has ${AUTO_APPROVE_DAYS} days to review.`
            : `${brand} sees a watermarked copy until they approve. They have ${AUTO_APPROVE_DAYS} days to review.`
      }
      footer={
        <div className="flex flex-col gap-2">
          {!ready ? (
            <p className="y-micro y-fg-2 text-center" aria-live="polite">
              {uploading ? "Uploading… you can keep filling this in." : `To send, ${missing.join(" and ")}.`}
            </p>
          ) : null}
          <SheetActions>
            <PillButton variant="soft" onClick={onClose}>
              Cancel
            </PillButton>
            <PillButton variant="neon" disabled={!ready} onClick={send}>
              {version === 1 && adCopy ? "Send the copy" : `Send version ${version}`}
            </PillButton>
          </SheetActions>
        </div>
      }
    >
      <div className="flex flex-col gap-[18px]">
        {adCopy ? (
          <div className="y-ord-fld">
            <label htmlFor={copyId} className="y-ord-lb">
              The copy
            </label>
            <textarea
              id={copyId}
              className="y-input y-ord-textarea"
              rows={9}
              value={copy}
              onChange={(event) => setCopy(event.target.value)}
              placeholder={"Headlines\n1. …\n\nPrimary text\n1. …\n\nCalls to action\n…"}
            />
            <small>Paste it as you&apos;d hand it over, or attach a document below.</small>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div
            role="button"
            tabIndex={0}
            className="y-ord-drop"
            data-over={over ? "true" : undefined}
            data-ok={done.length ? "true" : undefined}
            aria-label={adCopy ? "Attach a document" : "Choose your video"}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
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
            {done.length ? (
              <>
                <b>
                  {done[0].name} · {done[0].size}
                </b>
                <span className="inline-flex items-center gap-1 font-medium text-(--y-success)">
                  <Check size={14} strokeWidth={3} aria-hidden /> Uploaded
                </span>
                <span className="y-micro">Drop or click to add another file</span>
              </>
            ) : (
              <>
                <UploadCloud size={26} aria-hidden className="mx-auto mb-1" />
                <b>{over ? "Drop to upload" : adCopy ? "Attach the copy as a document" : "Drop your video here"}</b>
                <span>{adCopy ? "PDF, DOC, DOCX or TXT · up to 10 MB" : "MP4 or MOV · 9:16 · up to 500 MB"}</span>
                <span className="y-micro">or click to choose from your computer</span>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={adCopy ? ".pdf,.doc,.docx,.txt" : "video/*,.srt,.vtt,.zip"}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              add(Array.from(event.target.files ?? []).map((f) => ({ name: f.name, bytes: f.size })));
              event.target.value = "";
            }}
          />
          <button type="button" className="y-ord-inline-link y-hit y-small w-fit self-center !ms-0" onClick={addSample}>
            No file handy? Use a sample
          </button>

          {uploads.length ? (
            <ul className="flex flex-col gap-2" aria-label="Files in this version">
              {uploads.map((upload) => (
                <li key={upload.id} className="y-ord-upload">
                  {adCopy ? <FileText size={18} aria-hidden className="flex-none" /> : <Film size={18} aria-hidden className="flex-none" />}
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
                    onClick={() => setUploads((list) => list.filter((u) => u.id !== upload.id))}
                  >
                    <X size={18} aria-hidden />
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

        {checklist.length ? (
          <fieldset className="y-ord-fld">
            <legend className="y-ord-lb mb-2">
              {fromNotes ? "Their notes · tick what you fixed" : "The brief · tick what you covered"}
            </legend>
            <ul className="flex flex-col gap-2">
              {checklist.map((item) => (
                <li key={item.id}>
                  <label className="y-ord-chk">
                    <input
                      type="checkbox"
                      checked={ticked.includes(item.id)}
                      onChange={() =>
                        setTicked((list) => (list.includes(item.id) ? list.filter((v) => v !== item.id) : [...list, item.id]))
                      }
                    />
                    <span>{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}

        <div className="y-ord-fld">
          <label htmlFor={noteId} className="y-ord-lb">
            Note for {brand} <span className="y-fg-2 font-normal">· optional</span>
          </label>
          <textarea
            id={noteId}
            className="y-input y-ord-textarea"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              fromNotes ? "e.g. Moved the hook up and kept the reminder on screen a second longer." : "Anything they should know before watching?"
            }
          />
        </div>
      </div>
    </Sheet>
  );
}
