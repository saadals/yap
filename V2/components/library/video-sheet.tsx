"use client";

import { Archive, Check, Copy, Download, FileText, FileVideo, Minus, Repeat2 } from "lucide-react";
import Link from "next/link";

import { VideoPlayer } from "@/components/domain/video-player";
import { PillButton } from "@/components/ui/pill-button";
import { KeyValues } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { clock, longDate, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { formatById, jobTypeById, languageById, platformById } from "@/lib/taxonomy";
import type { DeliveryFile } from "@/lib/types";

import { type CopyItem, type LibraryItem, type VideoItem, usageLines } from "./data";

/**
 * Where "Order more like this" goes. Videos: the same creator, with this job's brief (a campaign
 * video becomes the idea for a direct order). Ad copy is only ever a custom order, so it starts a
 * new one from this job's brief.
 */
export function orderAgainHref(item: LibraryItem): string | undefined {
  if (item.kind === "copy") return paths.newOrder({ type: "custom", again: item.commission.id });
  if (!item.creator) return undefined;
  return item.commission.source === "campaign"
    ? paths.orderCreator(item.creator.handle, { product: item.commission.brief.productId, video: item.video.id })
    : paths.orderCreator(item.creator.handle, { again: item.commission.id });
}

/** The older way to copy, for browsers that refuse the Clipboard API (no permission, not https). */
function copyWithSelection(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

/** Copy the text to the clipboard and say so (or say why not). Call from event handlers only. */
export function useCopyText() {
  const toast = useToast();
  return async (text: string) => {
    let ok = false;
    try {
      // Some browsers leave the promise pending while they ask for permission: don't wait forever.
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error("timeout")), 1500)),
      ]);
      ok = true;
    } catch {
      ok = copyWithSelection(text);
    }
    toast(
      ok
        ? { message: "Copied to the clipboard", tone: "success" }
        : { message: "Your browser blocked copying. Select the text and copy it instead.", tone: "info" },
    );
  };
}

function FileIcon({ file }: { file: DeliveryFile }) {
  const Icon = file.kind === "archive" ? Archive : file.kind === "document" || /\.(docx?|pdf|txt|md)$/i.test(file.name) ? FileText : FileVideo;
  return <Icon size={18} aria-hidden className="y-fg-2 flex-none" />;
}

function Files({ files }: { files: DeliveryFile[] }) {
  const toast = useToast();
  return (
    <section aria-labelledby="files-title" className="flex flex-col gap-2">
      <h3 id="files-title" className="y-head">
        Files
      </h3>
      <ul className="flex flex-col">
        {files.map((file) => (
          <li key={file.name} className="flex items-center gap-3 border-t border-(--b-line) py-2.5 first:border-0">
            <FileIcon file={file} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="y-small truncate font-medium" title={file.name}>
                {file.name}
              </span>
              <span className="y-micro y-fg-2">{file.size}</span>
            </span>
            <PillButton
              variant="ghost"
              size="sm"
              icon={<Download size={16} aria-hidden />}
              aria-label={`Download ${file.name}`}
              onClick={() => toast({ message: `Downloading ${file.name}` })}
            >
              Download
            </PillButton>
          </li>
        ))}
      </ul>
    </section>
  );
}

function UsageList({ item }: { item: LibraryItem }) {
  return (
    <section aria-labelledby="usage-title" className="flex flex-col gap-3">
      <h3 id="usage-title" className="y-head">
        How you can use it
      </h3>
      <ul className="flex flex-col gap-3">
        {usageLines(item).map((line) => (
          <li key={line.title} className="flex items-start gap-3">
            <span
              aria-hidden
              className={`mt-0.5 grid size-6 flex-none place-items-center rounded-full ${
                line.included ? "bg-(--y-success-soft) text-(--y-success)" : "bg-(--b-chip) text-(--b-fg-2)"
              }`}
            >
              {line.included ? <Check size={14} strokeWidth={2.5} /> : <Minus size={14} strokeWidth={2.5} />}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="y-small font-medium">
                <span className="sr-only">{line.included ? "Included: " : "Not included: "}</span>
                {line.title}
              </span>
              <span className="y-small y-fg-2">{line.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Footer({ item }: { item: LibraryItem }) {
  const again = orderAgainHref(item);
  return (
    <div className="flex flex-wrap gap-2">
      {again ? (
        <PillButton href={again} variant="neon" icon={<Repeat2 size={17} aria-hidden />}>
          Order more like this
        </PillButton>
      ) : null}
      <PillButton href={paths.job(item.commission.id)} variant="soft">
        Open the job
      </PillButton>
    </div>
  );
}

const madeBy = (item: LibraryItem) =>
  item.creator ? (
    <Link href={paths.creator(item.creator.handle)} className="y-link">
      {item.creator.name}
    </Link>
  ) : (
    "Creator"
  );
const madeFor = (item: LibraryItem) =>
  item.product ? (
    <Link href={paths.product(item.product.id)} className="y-link">
      {item.product.name}
    </Link>
  ) : (
    "Your product"
  );
const versionOf = (item: LibraryItem) =>
  item.versions > 1 ? `${item.delivery.version} of ${item.versions}` : String(item.delivery.version);

function VideoBody({ item }: { item: VideoItem }) {
  const { video } = item;
  const format = formatById[video.format];
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <div className="md:w-[240px] md:flex-none">
        <VideoPlayer key={video.id} video={video} size="sm" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <KeyValues
          rows={[
            { label: "Made by", value: madeBy(item) },
            { label: "For", value: madeFor(item) },
            { label: "Format", value: `${format?.name ?? "Video"} · ${clock(video.durationSec)}` },
            { label: "Language", value: languageById[video.lang]?.name ?? video.lang },
            { label: "Version", value: versionOf(item) },
          ]}
        />
        <UsageList item={item} />
        <Files files={item.files} />
      </div>
    </div>
  );
}

function CopyBody({ item }: { item: CopyItem }) {
  const copyText = useCopyText();
  const spec = item.commission.brief.copy;
  const placements = (spec?.placements ?? []).map((id) => platformById[id]?.name ?? id);
  const lines = item.text ? item.text.split("\n").length : 0;
  // One column: the copy is the work, so it leads at full width; the details follow.
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="copy-title" className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 id="copy-title" className="y-head">
            The copy
          </h3>
          {item.text ? (
            <PillButton variant="soft" size="sm" icon={<Copy size={16} aria-hidden />} onClick={() => copyText(item.text)}>
              Copy text
            </PillButton>
          ) : null}
        </div>
        {item.text ? (
          <div
            tabIndex={0}
            aria-label={`The approved copy, ${plural(lines, "line")}`}
            className="y-tile y-small max-h-[44vh] overflow-auto p-4 whitespace-pre-wrap md:max-h-[380px]"
          >
            {item.text}
          </div>
        ) : (
          <p className="y-small y-fg-2 y-tile p-4">Delivered as a document only. Download it below.</p>
        )}
      </section>

      <KeyValues
        rows={[
          { label: "Written by", value: madeBy(item) },
          { label: "For", value: madeFor(item) },
          { label: "Job type", value: jobTypeById["ad-copy"].name },
          ...(placements.length ? [{ label: "Runs on", value: placements.join(", ") }] : []),
          { label: "Version", value: versionOf(item) },
        ]}
      />
      {spec?.pieces.length ? (
        <section aria-labelledby="pieces-title" className="flex flex-col gap-2">
          <h3 id="pieces-title" className="y-head">
            What you asked for
          </h3>
          <ul className="y-small y-fg-2 flex list-disc flex-col gap-1 ps-5">
            {spec.pieces.map((piece) => (
              <li key={piece}>{piece}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <UsageList item={item} />
      {item.files.length ? <Files files={item.files} /> : null}
    </div>
  );
}

/**
 * One approved item. A video: the player, who made it and for what, usage rights in plain words,
 * the files (simulated download, raw footage included). Ad copy: the text with "Copy text", what
 * was asked for, usage, the documents. Both end on the next step, ordering more like it.
 */
export function VideoSheet({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const { commission, creator } = item;
  return (
    <Sheet
      open
      onClose={onClose}
      title={commission.title}
      description={`${creator?.name ?? "Creator"} · Approved ${longDate(item.approvedAt)}`}
      width="lg"
      footer={<Footer item={item} />}
    >
      {item.kind === "video" ? <VideoBody item={item} /> : <CopyBody item={item} />}
    </Sheet>
  );
}
