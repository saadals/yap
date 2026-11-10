"use client";

import {
  ChevronDown,
  Download,
  Film,
  Image as ImageIcon,
  KeyRound,
  Lightbulb,
  Palette,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { paymentLabel } from "@/components/domain/money";
import { Block } from "@/components/ui/block";
import { useToast } from "@/components/ui/toast";
import { plural, quoted, shortDate, timeOf, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { creatorById } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import {
  addonById,
  aspects,
  AUTO_APPROVE_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  platformById,
} from "@/lib/taxonomy";
import type { ProductAsset } from "@/lib/types";

import { cash, type Job } from "./helpers";

/**
 * The side rail (desktop: sticky 340px; phones: the "Details" view): money, dates, revisions, the
 * brief, the product and its learnings, files, and the quiet actions (extend, cancel, dispute).
 * Facts the stage panel already says (due date while working, the approve-by date, revisions
 * while reviewing) are left out here: say it once.
 */
export function Rail({ job }: { job: Job }) {
  const { commission: c, side } = job;
  const ended = c.status === "completed" || c.status === "cancelled" || c.status === "declined";
  return (
    <div className="flex flex-col gap-2">
      <Block tone="paper" pad="md" className="flex flex-col gap-5">
        <h2 className="y-head">Details</h2>
        {side === "creator" && c.status === "offered" ? null : <Money job={job} />}
        <Dates job={job} />
        <Revisions job={job} ended={ended} />
      </Block>
      <Block tone="paper" pad="none" className="overflow-hidden">
        <Brief job={job} />
        <ProductSection job={job} />
        <Files job={job} />
      </Block>
      <QuietActions job={job} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-t border-(--b-line) pt-4 first:border-t-0 first:pt-0" aria-label={title}>
      <h3 className="y-micro y-fg-2 font-medium tracking-[0.02em] uppercase">{title}</h3>
      {children}
    </section>
  );
}

function KV({ rows }: { rows: { label: React.ReactNode; value: React.ReactNode; strong?: boolean }[] }) {
  return (
    <dl className="y-kv">
      {rows.map((row, index) => (
        <div key={index} className="contents">
          <dt className={row.strong ? "!text-(--b-fg) font-medium" : ""}>{row.label}</dt>
          <dd className={`y-num ${row.strong ? "font-semibold" : ""}`}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------------------------------------------------- */

function Money({ job }: { job: Job }) {
  const s = useDemo();
  const { commission: c, side, slot, creatorName, businessName, totals } = job;
  const method = s.paymentMethods.find((m) => m.id === c.payment.methodId);
  const status = c.payment.status;
  const fee = `Service fee (${Math.round(c.feeRate * 100)}%)`;
  const addons = c.addons.map((a) => ({ label: `+ ${addonById[a.id].name}`, value: cash(a.price) }));

  const rows =
    side === "business"
      ? slot
        ? [
            { label: "Price per video", value: cash(c.price) },
            { label: fee, value: cash(totals.fee) },
            { label: "Held in your campaign", value: cash(totals.total), strong: true },
          ]
        : [
            { label: `${creatorName}'s price`, value: cash(c.price) },
            ...addons,
            { label: fee, value: cash(totals.fee) },
            { label: "Total", value: cash(totals.total), strong: true },
          ]
      : [{ label: slot ? "Slot price" : "Your price", value: cash(c.price) }, ...addons, { label: "You earn", value: cash(totals.creatorEarns), strong: true }];

  const releaseOn = c.withdrawableFrom;
  const line =
    side === "business"
      ? {
          authorized: `Authorized${method ? ` on ${paymentLabel(method)}` : ""}. Charged only if ${creatorName} accepts.`,
          held: slot
            ? `Held in your campaign. Paid to ${creatorName} ${CAMPAIGN_RELEASE_DAYS} days after their post of the approved video is verified.`
            : `Held safely${method ? ` (${paymentLabel(method)})` : ""}. Released to ${creatorName} only when you approve.`,
          pending: `Approved and still held. Paid to ${creatorName} ${releaseOn ? `on ${weekdayDate(releaseOn)}` : `${CAMPAIGN_RELEASE_DAYS} days after the post is verified`} if it's still up.`,
          released: `Released to ${creatorName}${c.completedAt && !slot ? ` on ${shortDate(c.completedAt)}` : ""}.`,
          refunded: c.acceptedAt ? "Refunded to your card, service fee included." : "The authorization was released. You weren't charged.",
          returned: "Back in your campaign hold for another creator.",
        }[status]
      : {
          authorized: `Authorized by ${businessName}. Held for you when you accept.`,
          held: slot
            ? `Held by Yapp from the campaign budget. Released ${CAMPAIGN_RELEASE_DAYS} days after your post is verified.`
            : `Held safely. Paid to you when ${businessName} approves, or ${AUTO_APPROVE_DAYS} days after delivery.`,
          pending: `Pending. Released ${releaseOn ? `on ${weekdayDate(releaseOn)}` : `${CAMPAIGN_RELEASE_DAYS} days after we verify your post`} if it's still up.`,
          released: "Paid to you. It's in your earnings.",
          refunded: `Refunded to ${businessName}.`,
          returned: "Back with the campaign.",
        }[status];

  return (
    <Section title="Money">
      <KV rows={rows} />
      {side === "creator" ? (
        <p className="y-micro y-fg-2">You keep 100%. {slot ? "The brand" : businessName} pays Yapp&apos;s fee.</p>
      ) : null}
      <p className="y-small inline-flex items-start gap-2">
        <ShieldCheck size={16} aria-hidden className="mt-px flex-none" />
        <span>{line}</span>
      </p>
    </Section>
  );
}

function Dates({ job }: { job: Job }) {
  const { commission: c, side, slot, latest, noun } = job;
  const ended = c.status === "completed" || c.status === "cancelled" || c.status === "declined";
  // The stage panel states the due date while work is under way.
  const panelSaysDue = c.status === "in_progress" || c.status === "revision" || (side === "creator" && c.status === "offered");
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  const rows: { label: string; at: string }[] = slot
    ? [
        { label: "Slot taken", at: c.createdAt },
        ...(latest ? [{ label: `${Noun} ${latest.version} uploaded`, at: latest.deliveredAt }] : []),
        ...(c.completedAt && c.status === "completed" ? [{ label: "Approved", at: c.completedAt }] : []),
        ...(c.post?.at ? [{ label: "Posted", at: c.post.at }] : []),
        ...(c.post?.verifiedAt ? [{ label: "Verified", at: c.post.verifiedAt }] : []),
        ...(c.payment.status === "released" && c.withdrawableFrom ? [{ label: "Paid", at: c.withdrawableFrom }] : []),
      ]
    : [
        { label: c.source === "request" ? "Hired" : "Offer sent", at: c.createdAt },
        ...(c.acceptedAt && c.source !== "request" ? [{ label: "Accepted", at: c.acceptedAt }] : []),
        ...(!ended && !panelSaysDue ? [{ label: "Due", at: c.dueDate }] : []),
        ...(latest ? [{ label: `${Noun} ${latest.version} delivered`, at: latest.deliveredAt }] : []),
        ...(c.completedAt && c.status === "completed" ? [{ label: "Approved", at: c.completedAt }] : []),
      ];
  return (
    <Section title="Dates">
      <KV
        rows={rows.map((row) => ({
          label: row.label,
          value: (
            <>
              {weekdayDate(row.at)}
              <span className="y-fg-2 font-normal"> · {timeOf(row.at)}</span>
            </>
          ),
        }))}
      />
    </Section>
  );
}

function Revisions({ job, ended }: { job: Job; ended: boolean }) {
  const { commission: c, side, slot } = job;
  // While the ordering side reviews, the stage panel says how many are left.
  // Offers say what's included; while the ordering side reviews, the stage panel says what's left.
  if (ended || c.status === "offered" || (side === "business" && c.status === "delivered")) return null;
  const extra = c.revisionsUsed - c.revisionsIncluded;
  return (
    <Section title={slot ? "Change rounds" : "Revisions"}>
      <KV
        rows={[
          {
            label: "Used",
            value: extra > 0 ? `${c.revisionsIncluded} of ${c.revisionsIncluded}, plus ${extra} extra` : `${c.revisionsUsed} of ${c.revisionsIncluded}`,
          },
        ]}
      />
    </Section>
  );
}

/* -------------------------------------------------------------------------- */

function Disclosure({ title, meta, children, open = false }: { title: string; meta?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-t border-(--b-line) first:border-t-0" open={open}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-(--b-chip)/40 md:px-6 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="y-small font-medium">{title}</span>
          {meta ? <span className="y-micro y-fg-2 truncate">{meta}</span> : null}
        </span>
        <ChevronDown size={16} aria-hidden className="y-fg-3 flex-none transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-4 px-5 pb-5 md:px-6">{children}</div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h4 className="y-micro y-fg-2">{label}</h4>
      <div className="y-small">{children}</div>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 ps-4 marker:text-(--b-fg-3)">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Brief({ job }: { job: Job }) {
  const { brief } = job.commission;
  const aspect = aspects.find((a) => a.id === brief.aspect);
  return (
    <Disclosure title="Brief" meta={brief.goal}>
      <Field label="Goal">{brief.goal}</Field>
      <Field label="Key message">
        <span className="font-medium">{quoted(brief.keyMessage)}</span>
      </Field>
      <Field label="Who it's for">{brief.audience}</Field>
      {brief.mustInclude.length ? (
        <Field label={job.slot ? "Talking points" : "Must include"}>
          <Bullets items={brief.mustInclude} />
        </Field>
      ) : null}
      {brief.avoid.length ? (
        <Field label="Please avoid">
          <Bullets items={brief.avoid} />
        </Field>
      ) : null}
      <Field label="Platforms">{brief.platforms.map((id) => platformById[id].name).join(", ")}</Field>
      <Field label="Aspect ratio">{aspect ? `${aspect.name} (${aspect.use})` : brief.aspect}</Field>
      {job.slot ? (
        <Field label="Posting">
          On {job.slot.platformName}, tagging {job.slot.brandHandle}, with the {job.slot.disclosure.toLowerCase()}.
        </Field>
      ) : null}
      {brief.references.length ? (
        <Field label="References">
          <Bullets items={brief.references.map((r) => (r.note ? `${r.label}: ${r.note}` : r.label))} />
        </Field>
      ) : null}
      {brief.notes ? <Field label="Notes">{brief.notes}</Field> : null}
    </Disclosure>
  );
}

function ProductSection({ job }: { job: Job }) {
  const s = useDemo();
  const { product, side, commission: c } = job;
  if (!product) return null;
  const learnings = product.learnings;
  return (
    <Disclosure
      title={product.name}
      meta={learnings.length ? `Product · ${plural(learnings.length, "learning")} carried` : "Product"}
    >
      <p className="y-small y-fg-2">{product.oneLiner}</p>
      {learnings.length ? (
        <div className="flex flex-col gap-2">
          <h4 className="y-micro y-fg-2 inline-flex items-center gap-1.5">
            <Lightbulb size={13} aria-hidden /> What worked before
          </h4>
          <ul className="flex flex-col gap-2">
            {learnings.map((learning) => {
              const by = learning.creatorId ? creatorById(s, learning.creatorId) : undefined;
              const here = learning.sourceCommissionId === c.id;
              return (
                <li key={learning.id} className="y-tile flex flex-col gap-0.5 p-3">
                  <p className="y-small">{learning.text}</p>
                  <p className="y-micro y-fg-2">
                    {here ? "From this job" : by ? `From work with ${by.firstName}` : "Saved by the team"} · {shortDate(learning.createdAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="y-micro y-fg-2">
          {side === "business" ? "Nothing saved yet. Learnings you save after a job show up here next time." : "No learnings saved for this product yet."}
        </p>
      )}
      {side === "business" ? (
        <Link href={paths.product(product.id)} className="y-small y-link w-fit font-medium">
          Open the product
        </Link>
      ) : null}
    </Disclosure>
  );
}

const assetIcon: Record<ProductAsset["kind"], React.ReactNode> = {
  logo: <ImageIcon size={16} aria-hidden />,
  screens: <ImageIcon size={16} aria-hidden />,
  "demo-account": <KeyRound size={16} aria-hidden />,
  "brand-guide": <Palette size={16} aria-hidden />,
  footage: <Film size={16} aria-hidden />,
};

function Files({ job }: { job: Job }) {
  const toast = useToast();
  const { commission: c, side, product, latest, slot, noun } = job;
  const assets = (product?.assets ?? []).filter((a) => side === "creator" || a.kind !== "demo-account");
  const preview = Boolean(latest?.reviewCopy) && side === "business" && latest?.status !== "approved";
  const delivered = latest?.files ?? [];
  const count = delivered.length + assets.length;
  if (!count) return null;
  const rows: { key: string; name: string; meta: string; icon: React.ReactNode; message: string; copy?: boolean }[] = [
    ...delivered.map((file) => ({
      key: `d-${file.name}`,
      name: file.name,
      meta: `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${latest?.version} · ${file.size}${preview ? " · watermarked preview" : slot && latest?.status === "approved" ? " · full quality" : ""}`,
      icon: <Film size={16} aria-hidden />,
      message: preview ? `Downloading the watermarked preview of ${file.name}` : `Downloading ${file.name}`,
    })),
    ...assets.map((asset) => ({
      key: asset.id,
      name: asset.name,
      meta: `From ${job.businessName} · ${asset.size}`,
      icon: assetIcon[asset.kind],
      message: asset.kind === "demo-account" ? "Demo login copied. Use it only for filming." : `Downloading ${asset.name}`,
      copy: asset.kind === "demo-account",
    })),
  ];
  return (
    <Disclosure
      title="Files"
      meta={[delivered.length ? plural(delivered.length, "delivered file") : null, assets.length ? plural(assets.length, "product file") : null]
        .filter(Boolean)
        .join(" · ")}
    >
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li key={row.key} className="y-tile flex items-center gap-3 py-2 ps-3 pe-1.5">
            <span className="flex-none">{row.icon}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="y-small truncate font-medium">{row.name}</span>
              <span className="y-micro y-fg-2 truncate">{row.meta}</span>
            </span>
            <button
              type="button"
              className="y-round flex-none !bg-transparent hover:!bg-(--b-bg)"
              data-tone-btn="soft"
              data-size="sm"
              aria-label={row.copy ? `Copy ${row.name}` : `Download ${row.name}`}
              title={row.copy ? "Copy" : "Download"}
              onClick={() => toast({ message: row.message, tone: "info" })}
            >
              {row.copy ? <KeyRound size={16} aria-hidden /> : <Download size={16} aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
      {c.deliveries.length > 1 ? (
        <p className="y-micro y-fg-2">Earlier versions are in the timeline.</p>
      ) : null}
    </Disclosure>
  );
}

/* -------------------------------------------------------------------------- */

function QuietActions({ job }: { job: Job }) {
  const toast = useToast();
  const { commission: c, side, slot } = job;
  const working = c.status === "in_progress" || c.status === "revision";
  // The stage panel offers "Extend deadline" while the first version is being made.
  const canExtend = !slot && side === "business" && c.status === "revision";
  const canCancel = !slot && side === "business" && c.status === "in_progress" && c.deliveries.length === 0;
  const canDispute = working || c.status === "delivered";
  const links: { label: string; run: () => void }[] = [
    ...(canExtend ? [{ label: "Extend deadline", run: () => job.openSheet("extend") }] : []),
    ...(canCancel ? [{ label: "Cancel and refund", run: () => job.openSheet("cancel") }] : []),
    ...(canDispute ? [{ label: "Open a dispute", run: () => job.openSheet("dispute") }] : []),
    {
      label: "Get help",
      run: () =>
        toast({
          message:
            c.status === "disputed"
              ? "Yapp support is already on it. Replies arrive in the timeline."
              : "Yapp support replies in your messages within a few hours.",
          tone: "info",
        }),
    },
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 py-1" role="group" aria-label="More actions">
      {links.map((link) => (
        <button key={link.label} type="button" className="y-small y-fg-2 min-h-9 font-medium hover:text-(--b-fg,var(--y-ink)) pointer-coarse:min-h-11" onClick={link.run}>
          {link.label}
        </button>
      ))}
    </div>
  );
}
