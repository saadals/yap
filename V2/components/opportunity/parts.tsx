"use client";

import { BadgeCheck, Download, FileText, Image as ImageIcon, Lock, MoreHorizontal, Pause, Play, PlayCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { KeyValues } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { attachmentMeta } from "@/lib/files";
import { clock } from "@/lib/format";
import { paths } from "@/lib/paths";
import { reliabilityFigures } from "@/lib/selectors";
import type { BriefAttachment, Business } from "@/lib/types";

import "@/app/styles/studio-work.css";

/**
 * Who's asking, as one quiet line: logo, name, verified, payment verified. How reliably the brand
 * works with creators sits in `BrandRecord` (five figures, never a star rating: feedback about
 * brands is private).
 */
export function BrandLine({ business, extra }: { business: Business; extra?: string }) {
  const meta = [business.paymentVerified ? "Payment verified" : "New on Yapp", extra].filter(Boolean).join(" · ");
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BusinessLogo business={business} size={40} />
      <div className="min-w-0">
        <p className="y-small flex items-center gap-1.5 font-semibold">
          <span className="truncate">{business.name}</span>
          {business.verified ? <BadgeCheck size={15} aria-label="Verified business" className="flex-none" /> : null}
        </p>
        <p className="y-micro y-fg-2">{meta}</p>
      </div>
    </div>
  );
}

/**
 * The brand's five reliability figures (Pays on time, Review speed, Hire rate, Auto-approved,
 * Shares results), each "—" until Yapp has enough data. Brands never get stars.
 */
export function BrandRecord({ business }: { business: Business }) {
  const figures = reliabilityFigures(business);
  const unknown = figures.every((f) => !f.known);
  return (
    <Block as="section" aria-labelledby="brand-record-h" tone="paper" pad="md" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id="brand-record-h" className="y-head">
          How {business.name} works with creators
        </h2>
        <p className="y-micro y-fg-2">Worked out by Yapp from their orders. Brands have no star rating.</p>
      </div>
      <KeyValues
        rows={figures.map((f) => ({
          label: <span title={f.hint}>{f.label}</span>,
          value: f.known ? (
            <span className="y-num">{f.value}</span>
          ) : (
            <span className="y-fg-2">
              {f.value}
              <span className="sr-only"> not enough data yet</span>
            </span>
          ),
        }))}
      />
      {unknown ? (
        <p className="y-micro y-fg-2 flex items-start gap-1.5">
          <Lock size={13} aria-hidden className="mt-0.5 flex-none" />
          Figures appear after {business.name}&apos;s first few hires.
        </p>
      ) : null}
    </Block>
  );
}

/** A section card with a small title. */
export function Section({
  title,
  id,
  icon,
  children,
  className = "",
  action,
}: {
  title: string;
  id: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <Block as="section" aria-labelledby={id} tone="paper" pad="md" className={`flex flex-col gap-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="y-head flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Block>
  );
}

export function Bullets({ items, marker }: { items: string[]; marker?: React.ReactNode }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="y-small flex items-start gap-2.5">
          {marker ?? <span aria-hidden className="mt-[7px] size-1.5 flex-none rounded-full bg-current" />}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** The "⋯" menu (Not interested, and so on). Closes on Escape and outside clicks. */
export function MoreMenu({
  label = "More actions",
  items,
}: {
  label?: string;
  items: { label: string; icon?: React.ReactNode; onSelect: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  if (!items.length) return null;
  return (
    <div ref={ref} className="relative flex-none">
      <button
        type="button"
        className="y-round"
        data-tone-btn="ghost"
        data-size="sm"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={18} aria-hidden />
      </button>
      {open ? (
        <div role="menu" className="sw-menu y-enter">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The phone's sticky action bar (glass) at the bottom edge: the order page has no tab bar. Hidden from 1024px. */
export function ActionBar({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div role="region" aria-label={label} className="sw-actionbar y-bar">
      {children}
    </div>
  );
}

/** Someone else's order that this viewer can't see (a draft, invite-only). */
export function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <Page width="narrow">
      <h1 className="sr-only">{title}</h1>
      <Block tone="paper" pad="md">
        <EmptyState
          title={title}
          body={body}
          action={
            <PillButton href={paths.findWork()} variant="contrast" arrow>
              Find work
            </PillButton>
          }
        />
      </Block>
    </Page>
  );
}

/** The brand's explainer video, simulated: a play button, a clock and a progress bar. */
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
    let t = elapsed >= durationSec ? 0 : elapsed;
    setElapsed(t);
    setPlaying(true);
    timer.current = window.setInterval(() => {
      t = Math.min(durationSec, t + 0.25);
      setElapsed(t);
      if (t >= durationSec) {
        window.clearInterval(timer.current);
        setPlaying(false);
      }
    }, 250);
  };

  return (
    <div className="y-tile flex flex-col gap-3 p-3 ps-3.5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="y-round flex-none"
          data-tone-btn="contrast"
          aria-label={playing ? "Pause the explainer" : "Play the explainer"}
          aria-pressed={playing}
          onClick={toggle}
        >
          {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden className="y-flip" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="y-small font-semibold">Explainer from the brand</p>
          <p className="y-micro y-fg-2 truncate">{name}</p>
        </div>
        <span className="y-small y-num y-fg-2 flex-none" aria-live="off">
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

/**
 * The files a brand attached to the brief (documents, one short reference video, images), visible
 * before anyone pitches or picks. Downloads are simulated.
 */
export function BriefFiles({ files, brandName }: { files: BriefAttachment[]; brandName: string }) {
  const toast = useToast();
  if (!files.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="y-micro y-fg-2">Files from {brandName}</h3>
      <ul className="flex flex-col gap-1.5">
        {files.map((file) => (
          <li key={file.id} className="y-tile flex items-center gap-3 py-2 ps-3.5 pe-2">
            <span className="flex-none" aria-hidden>
              {file.kind === "video" ? (
                <PlayCircle size={18} />
              ) : file.kind === "image" ? (
                <ImageIcon size={18} />
              ) : (
                <FileText size={18} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="y-small block truncate font-semibold">{file.name}</span>
              <span className="y-micro y-fg-2 block">{attachmentMeta(file)}</span>
            </span>
            <button
              type="button"
              className="y-round flex-none"
              data-tone-btn="ghost"
              data-size="sm"
              aria-label={`Download ${file.name}`}
              onClick={() => toast({ message: "Files are simulated in this demo, so there's nothing to download." })}
            >
              <Download size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
