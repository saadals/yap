"use client";

import {
  Check,
  ChevronDown,
  Download,
  FileText,
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
import { attachmentMeta } from "@/lib/files";
import {
  addonById,
  aspects,
  AUTO_APPROVE_DAYS,
  CAMPAIGN_RELEASE_DAYS,
  platformById,
  usageById,
} from "@/lib/taxonomy";
import type { ProductAsset } from "@/lib/types";

import { cash, possessive, type Job } from "./helpers";

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
        {side === "creator" && c.status === "offered" ? null : <Included job={job} />}
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
  // A direct offer withdrawn or declined before it was accepted was only ever authorized.
  const neverCharged = !slot && c.source !== "request" && !c.acceptedAt;
  const status = neverCharged && c.payment.status === "refunded" ? "authorized" : c.payment.status;
  const ended = c.status === "declined" || c.status === "cancelled";
  const addons = c.addons.map((a) => ({ label: addonById[a.id]?.name ?? "Add-on", value: cash(a.price) }));

  // The brand pays the listed price and nothing on top; the creator sees Yapp's 20% come off it.
  const rows =
    side === "business"
      ? slot
        ? [{ label: "Price per Yapp", value: cash(totals.total), strong: true }]
        : addons.length
          ? [{ label: `${possessive(creatorName)} price`, value: cash(c.price) }, ...addons, { label: "Total", value: cash(totals.total), strong: true }]
          : [{ label: `${possessive(creatorName)} price`, value: cash(totals.total), strong: true }]
      : [
          { label: slot ? "Price per Yapp" : "Price", value: cash(c.price) },
          ...addons,
          { label: `Yapp fee (${Math.round(c.feeRate * 100)}%)`, value: `−${cash(totals.fee)}` },
          { label: "You earn", value: cash(totals.creatorEarns), strong: true },
        ];

  const releaseOn = c.withdrawableFrom ? weekdayDate(c.withdrawableFrom) : undefined;
  const paidOn = c.completedAt ? shortDate(c.completedAt) : undefined;
  const [word, rest]: [string, string] =
    side === "business"
      ? {
          authorized: ended
            ? (["Released", "You weren't charged."] as [string, string])
            : (["Authorized", `${method ? `On ${paymentLabel(method)}. ` : ""}Charged only if ${creatorName} accepts.`] as [string, string]),
          held:
            c.status === "disputed"
              ? (["Held", "While Yapp support looks into it."] as [string, string])
              : slot
                ? (["Held in your campaign", `Paid to ${creatorName} ${CAMPAIGN_RELEASE_DAYS} days after their post is verified.`] as [string, string])
                : (["Held since you hired", `${method ? `${paymentLabel(method)}. ` : ""}Released to ${creatorName} when you approve.`] as [string, string]),
          pending: [
            "Approved, still held",
            `Paid to ${creatorName} ${releaseOn ? `on ${releaseOn}` : `${CAMPAIGN_RELEASE_DAYS} days after the post is verified`} if it's still up.`,
          ] as [string, string],
          released: ["Paid", `Released to ${creatorName}${paidOn && !slot ? ` on ${paidOn}` : ""}.`] as [string, string],
          refunded: ["Refunded", `The ${cash(totals.total)} went back to your card.`] as [string, string],
          returned: ["Back in your campaign", "The slot reopened for another creator."] as [string, string],
        }[status]
      : {
          authorized: ended
            ? (["Not charged", "Nothing was paid on this offer."] as [string, string])
            : (["Authorized", `By ${businessName}. Held for you when you accept.`] as [string, string]),
          held:
            c.status === "disputed"
              ? (["Held", "While Yapp support looks into it."] as [string, string])
              : slot
                ? (["Reserved for you", `Paid ${CAMPAIGN_RELEASE_DAYS} days after your post is verified.`] as [string, string])
                : (["Held by Yapp", `Paid to you when ${businessName} approves, or ${AUTO_APPROVE_DAYS} days after delivery.`] as [string, string]),
          pending:
            c.post?.status === "removed"
              ? (["On hold", "Your post is down."] as [string, string])
              : ([
                  "Pending",
                  `Released ${releaseOn ? `on ${releaseOn}` : `${CAMPAIGN_RELEASE_DAYS} days after we verify your post`} if it's still up.`,
                ] as [string, string]),
          released: ["Paid", "It's in your earnings."] as [string, string],
          refunded: ["Refunded", `The payment went back to ${businessName}.`] as [string, string],
          returned: ["Back with the campaign", "This slot ended without a payment."] as [string, string],
        }[status];

  return (
    <Section title="Money">
      <KV rows={rows} />
      <p className="y-small inline-flex items-start gap-2">
        <ShieldCheck size={16} aria-hidden className="mt-px flex-none" />
        <span>
          <span className="font-medium">{word}</span>
          <span className="y-fg-2"> · {rest}</span>
        </span>
      </p>
    </Section>
  );
}

/** What comes with the work, in the price: raw footage (video) and the order's usage option. */
function Included({ job }: { job: Job }) {
  const usage = usageById[job.commission.brief.usage];
  const items = [...(job.adCopy ? [] : ["Raw footage"]), `Usage: ${usage.name}`];
  return (
    <Section title="Included in the price">
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="y-small inline-flex items-start gap-2">
            <Check size={15} strokeWidth={2.5} aria-hidden className="mt-0.5 flex-none" />
            {item}
          </li>
        ))}
      </ul>
      <p className="y-micro y-fg-2">
        {job.side === "business" ? usage.description : `${job.businessName} may use it for ${usage.phrase}.`}
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
  const placements = brief.copy?.placements ?? [];
  return (
    <Disclosure title="Brief" meta={brief.goal}>
      <Field label="Goal">{brief.goal}</Field>
      <Field label="Key message">
        <span className="font-medium">{quoted(brief.keyMessage)}</span>
      </Field>
      {brief.hook ? <Field label={job.adCopy ? "The opening" : "The hook"}>{quoted(brief.hook)}</Field> : null}
      {job.adCopy && brief.copy?.pieces.length ? (
        <Field label="What to write">
          <Bullets items={brief.copy.pieces} />
        </Field>
      ) : null}
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
      {job.adCopy ? (
        placements.length ? (
          <Field label={`Where ${job.side === "business" ? "you'll" : `${job.businessName} will`} run it`}>
            {placements.map((id) => platformById[id]?.name ?? id).join(", ")}
          </Field>
        ) : null
      ) : (
        <>
          {job.slot ? null : <Field label="Platforms">{brief.platforms.map((id) => platformById[id].name).join(", ")}</Field>}
          <Field label="Aspect ratio">{aspect ? `${aspect.name} (${aspect.use})` : brief.aspect}</Field>
        </>
      )}
      {job.slot ? (
        <Field label="Posting">
          {job.side === "creator" ? "You post it" : `${job.creatorName} posts it`} on {job.slot.platformName}, tagging{" "}
          {job.slot.brandHandle}, with the {job.slot.disclosure.toLowerCase()}.
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
  const attachments = c.brief.attachments ?? [];
  const preview = Boolean(latest?.reviewCopy) && side === "business" && latest?.status !== "approved";
  const delivered = latest?.files ?? [];
  const count = delivered.length + assets.length + attachments.length;
  if (!count) return null;
  const rows: { key: string; name: string; meta: string; icon: React.ReactNode; message: string; copy?: boolean }[] = [
    ...delivered.map((file) => ({
      key: `d-${file.name}`,
      name: file.name,
      meta: `${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${latest?.version} · ${file.size}${preview ? " · watermarked preview" : slot && latest?.status === "approved" ? " · full quality" : ""}`,
      icon: file.kind === "document" ? <FileText size={16} aria-hidden /> : <Film size={16} aria-hidden />,
      message: preview ? `Downloading the watermarked preview of ${file.name}` : `Downloading ${file.name}`,
    })),
    ...attachments.map((file) => ({
      key: file.id,
      name: file.name,
      meta: `With the brief · ${attachmentMeta(file)}`,
      icon: file.kind === "video" ? <Film size={16} aria-hidden /> : file.kind === "image" ? <ImageIcon size={16} aria-hidden /> : <FileText size={16} aria-hidden />,
      message: `Downloading ${file.name}`,
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
      meta={[
        delivered.length ? plural(delivered.length, "delivered file") : null,
        attachments.length ? plural(attachments.length, "brief file") : null,
        assets.length ? plural(assets.length, "product file") : null,
      ]
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
