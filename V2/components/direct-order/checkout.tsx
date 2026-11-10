"use client";

import { Clock, Info, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PriceSummary } from "@/components/domain/money";
import { Rating } from "@/components/domain/stars";
import { VideoThumb } from "@/components/domain/video-thumb";
import { FlowBar } from "@/components/new-order/flow-frame";
import { availabilityLabel, responseLabel, tierName } from "@/components/new-order/helpers";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { KeyValues } from "@/components/ui/progress";
import { useToast } from "@/components/ui/toast";
import { moneyExact, shortDate, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { featuredVideo } from "@/lib/selectors";
import { accountOwning, actions, useDemo } from "@/lib/store";
import type { Commission, Creator, Video } from "@/lib/types";

import { derive, deliverablesLabel, detailFields, fieldTodo, initDraft, toOffer, validate, type Draft, type FieldId } from "./model";
import {
  AddonsSection,
  BriefSection,
  DetailsSection,
  MessageSection,
  PackageSection,
  PaymentSection,
  ProductSection,
  type SectionProps,
} from "./sections";

/**
 * Checkout for one creator: package and timing, product (with its learnings), the essentials of
 * the brief (the rest behind "More details"), extras, a message and the card. The summary rail
 * (sticky on desktop, a bar on phones) holds the total and the one green action, "Send offer".
 * Sending creates the job (`actions.sendOffer`) and opens it.
 */
export function Checkout({
  creator,
  repeat,
  repeatMissing,
  packageId,
  productId,
  video,
}: {
  creator: Creator;
  repeat: Commission | null;
  repeatMissing: boolean;
  packageId: string | null;
  productId: string | null;
  video: Video | null;
}) {
  const s = useDemo();
  const router = useRouter();
  const toast = useToast();
  const [d, setD] = useState<Draft>(() => initDraft(s, creator, { packageId, repeat, productId, video }));
  const [tried, setTried] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const x = derive(s, creator, d, repeat);
  const errors = validate(s, creator, d, x);
  const missing = (Object.keys(errors) as FieldId[]).filter((f) => errors[f]);
  const valid = missing.length === 0;

  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const errorFor = (field: FieldId) => (tried ? (errors[field] ?? null) : null);

  const jumpTo = (field: FieldId) => {
    if (detailFields.includes(field)) setDetailsOpen(true);
    window.setTimeout(() => {
      const target = document.querySelector<HTMLElement>(`[data-field="${field}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      (target?.querySelector<HTMLElement>("input, textarea, button") ?? target)?.focus({ preventScroll: true });
    }, 60);
  };

  const submit = () => {
    if (sending) return;
    if (!valid) {
      setTried(true);
      if (missing[0]) jumpTo(missing[0]);
      return;
    }
    setSending(true);
    const id = actions.sendOffer(toOffer(creator, d, x, repeat));
    const owner = accountOwning(s, { creatorId: creator.id });
    toast({
      message: owner
        ? `Offer sent to ${creator.firstName}. Switch to ${owner.firstName}'s account to accept it.`
        : `Offer sent to ${creator.firstName}. They usually reply ${responseLabel(creator.responseHours)}.`,
    });
    router.push(paths.job(id));
  };

  const props: SectionProps = { s, creator, d, x, set, replace: setD, errorFor, repeat };
  const total = moneyExact(x.totals.total);
  const showcase = video ?? featuredVideo(s, creator);

  const todo =
    tried && missing.length ? (
      <div className="flex flex-col gap-1.5" aria-live="polite">
        <span className="y-micro y-fg-2">To send the offer:</span>
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {missing.map((field) => (
            <li key={field}>
              <button type="button" className="y-link y-small font-semibold" onClick={() => jumpTo(field)}>
                {fieldTodo[field]}
              </button>
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const summary = (withAction: boolean) => (
    <Block tone="paper" pad="md" className="flex flex-col gap-5" aria-label="Order summary">
      <div className="flex items-center gap-3">
        {showcase ? (
          <Link href={paths.creator(creator.handle)} className="w-12 flex-none overflow-hidden rounded-(--y-r-sm)" aria-label={`${creator.name}'s profile`}>
            <VideoThumb video={showcase} frame="9:16" showHook={false} showMeta={false} decorative />
          </Link>
        ) : (
          <FaceAvatar id={creator.id} name="" size={44} />
        )}
        <div className="min-w-0 flex-1">
          <p className="y-small truncate font-semibold">{creator.name}</p>
          <p className="y-micro y-fg-2 flex flex-wrap items-center gap-x-1.5">
            <Rating value={creator.rating} count={creator.reviewCount} className="!text-xs" />
            <span>· {creator.onTimeRate}% on time</span>
          </p>
        </div>
      </div>
      <KeyValues
        className="border-t border-(--b-line) pt-4"
        rows={[
          { label: "Package", value: tierName[x.pkg.tier] },
          { label: "Deliverables", value: deliverablesLabel(d) },
          { label: "Due", value: weekdayDate(x.dueDate) },
          { label: "Revisions", value: x.revisions },
        ]}
      />
      <PriceSummary
        price={x.pkg.price}
        priceLabel={`${tierName[x.pkg.tier]} package`}
        addons={x.addonPrices}
        showRights={false}
        className="border-t border-(--b-line) pt-4"
      />
      {withAction ? (
        <div className="flex flex-col gap-3">
          <PillButton
            variant="neon"
            size="lg"
            arrow
            className="w-full justify-between ps-6"
            aria-disabled={!valid || sending ? "true" : undefined}
            onClick={submit}
          >
            Send offer · {total}
          </PillButton>
          {todo}
        </div>
      ) : null}
      <p className="y-micro y-fg-2 flex items-start gap-2">
        <ShieldCheck size={15} aria-hidden className="mt-px flex-none" />
        <span>
          Your card is authorized now, not charged. When {creator.firstName} accepts, it&apos;s charged and held until you
          approve the video. If {creator.firstName} declines, nothing is charged.
        </span>
      </p>
    </Block>
  );

  return (
    <>
      <Page>
        <PageHeader
          back={{ href: paths.creator(creator.handle), label: `${creator.firstName}'s profile` }}
          title={repeat ? `Order from ${creator.firstName} again` : `Order from ${creator.firstName}`}
          description={`Send an offer. ${creator.firstName} accepts or declines, usually ${responseLabel(creator.responseHours)}.`}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 [&>*]:min-w-0">
          <div className="flex flex-col gap-3 lg:col-span-8">
            {repeat ? (
              <Notice icon={<RotateCcw size={16} aria-hidden />}>
                Ready from{" "}
                <Link href={paths.job(repeat.id)} className="y-link font-semibold">
                  {repeat.title}
                </Link>
                : same brief, product and learnings. Change anything, then send.
              </Notice>
            ) : null}
            {repeatMissing ? (
              <Notice icon={<Info size={16} aria-hidden />}>
                We couldn&apos;t find that earlier job, so this is a fresh brief. Your product is still filled in.
              </Notice>
            ) : null}
            {!creator.available ? (
              <Notice icon={<Clock size={16} aria-hidden />}>
                <span className="font-semibold">{availabilityLabel(creator)}.</span> You can still send an offer; the due date
                counts from when {creator.firstName} is free.
              </Notice>
            ) : null}

            <PackageSection {...props} />
            <ProductSection {...props} />
            <BriefSection {...props} video={video} />
            <DetailsSection {...props} open={detailsOpen} onToggle={setDetailsOpen} />
            <AddonsSection {...props} />
            <MessageSection {...props} />
            <PaymentSection {...props} />

            <div className="lg:hidden">{summary(false)}</div>
          </div>
          <aside className="hidden lg:col-span-4 lg:block" aria-label="Order summary">
            <div className="y-rail">{summary(true)}</div>
          </aside>
        </div>
      </Page>

      <div className="lg:hidden">
        <FlowBar width="wide">
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="y-micro y-fg-2">
              {tried && missing.length ? fieldTodo[missing[0]] : `Due ${shortDate(x.dueDate)}`}
            </span>
            <span className="y-small y-num truncate font-semibold">{total} total</span>
          </span>
          <PillButton variant="neon" size="lg" arrow aria-disabled={!valid || sending ? "true" : undefined} onClick={submit}>
            Send offer
          </PillButton>
        </FlowBar>
      </div>
    </>
  );
}

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="y-tile y-small flex items-start gap-2.5 p-3 ps-4" role="status">
      <span className="mt-0.5 flex-none">{icon}</span>
      <p className="min-w-0">{children}</p>
    </div>
  );
}
