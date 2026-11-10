"use client";

import { Check, Download, FileVideo, Minus, Repeat2 } from "lucide-react";
import Link from "next/link";

import { VideoPlayer } from "@/components/domain/video-player";
import { PillButton } from "@/components/ui/pill-button";
import { KeyValues } from "@/components/ui/progress";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { clock, longDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { useDemo } from "@/lib/store";
import { formatById, languageById } from "@/lib/taxonomy";

import { type LibraryItem, usageLines } from "./data";

/** Where "Order more like this" goes: the same creator, with this job's brief (or this video as the idea). */
export function orderAgainHref(item: LibraryItem): string | undefined {
  if (!item.creator) return undefined;
  return item.commission.source === "campaign"
    ? paths.orderCreator(item.creator.handle, { product: item.commission.brief.productId, video: item.video.id })
    : paths.orderCreator(item.creator.handle, { again: item.commission.id });
}

/**
 * One approved video: the player, who made it and for what, usage rights in plain words, the files
 * (simulated download) and the next step, ordering more like it.
 */
export function VideoSheet({ item, onClose }: { item: LibraryItem; onClose: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const { commission, creator, product, video } = item;
  const again = orderAgainHref(item);
  const format = formatById[video.format];

  return (
    <Sheet
      open
      onClose={onClose}
      title={commission.title}
      description={`${creator?.name ?? "Creator"} · Approved ${longDate(item.approvedAt)}`}
      width="lg"
      footer={
        <div className="flex flex-wrap gap-2">
          {again ? (
            <PillButton href={again} variant="neon" icon={<Repeat2 size={17} aria-hidden />}>
              Order more like this
            </PillButton>
          ) : null}
          <PillButton href={paths.job(commission.id)} variant="soft">
            Open the job
          </PillButton>
        </div>
      }
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="md:w-[240px] md:flex-none">
          <VideoPlayer key={video.id} video={video} size="sm" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <KeyValues
            rows={[
              {
                label: "Made by",
                value: creator ? (
                  <Link href={paths.creator(creator.handle)} className="y-link">
                    {creator.name}
                  </Link>
                ) : (
                  "Creator"
                ),
              },
              {
                label: "For",
                value: product ? (
                  <Link href={paths.product(product.id)} className="y-link">
                    {product.name}
                  </Link>
                ) : (
                  "Your product"
                ),
              },
              { label: "Format", value: `${format?.name ?? "Video"} · ${clock(video.durationSec)}` },
              { label: "Language", value: languageById[video.lang]?.name ?? video.lang },
              {
                label: "Version",
                value: item.versions > 1 ? `${item.delivery.version} of ${item.versions}` : String(item.delivery.version),
              },
            ]}
          />

          <section aria-labelledby="usage-title" className="flex flex-col gap-3">
            <h3 id="usage-title" className="y-head">
              How you can use it
            </h3>
            <ul className="flex flex-col gap-3">
              {usageLines(s, item).map((line) => (
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

          <section aria-labelledby="files-title" className="flex flex-col gap-2">
            <h3 id="files-title" className="y-head">
              Files
            </h3>
            <ul className="flex flex-col">
              {item.files.map((file) => (
                <li key={file.name} className="flex items-center gap-3 border-t border-(--b-line) py-2.5 first:border-0">
                  <FileVideo size={18} aria-hidden className="y-fg-2 flex-none" />
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
        </div>
      </div>
    </Sheet>
  );
}
