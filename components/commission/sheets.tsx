"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { StarInput } from "@/components/domain/stars";
import { Checklist, DetailRows } from "@/components/ui/data";
import { TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet, SheetActions } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { addDays } from "@/lib/clock";
import { clock, plural, weekdayDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { openComments } from "@/lib/selectors";
import { actions } from "@/lib/store";
import {
  CAMPAIGN_RELEASE_DAYS,
  CHANGE_NOTE_MIN_CHARS,
  COMMENTS_OPEN_DAYS,
  FEE_PCT,
  usageById,
} from "@/lib/taxonomy";

import { DeliverSheet } from "./deliver-sheet";
import { cash, revisionsLeft, scrollMotion, type SheetName, type Workspace } from "./helpers";
import { PostLinkSheet } from "./post-link-sheet";
import { ReviewSheet, useReviewForm } from "./review-sheet";

type SheetProps = { ws: Workspace; open: boolean; onClose: () => void };

/** Every sheet on the order page. Each one remounts when opened, so its form starts fresh. */
export function WorkspaceSheets({
  ws,
  sheet,
  sheetKey,
  onClose,
}: {
  ws: Workspace;
  sheet: SheetName | null;
  sheetKey: number;
  onClose: () => void;
}) {
  const props = (name: SheetName) => ({ ws, open: sheet === name, onClose });
  return (
    <>
      <DeliverSheet key={`deliver-${sheetKey}`} {...props("deliver")} />
      <ReviewSheet key={`review-${sheetKey}`} {...props("review")} />
      <RequestChangesSheet key={`requestChanges-${sheetKey}`} {...props("requestChanges")} />
      <ApproveSheet key={`approve-${sheetKey}`} {...props("approve")} />
      <DeclineSheet key={`decline-${sheetKey}`} {...props("decline")} />
      <WithdrawSheet key={`withdraw-${sheetKey}`} {...props("withdraw")} />
      <ExtendSheet key={`extend-${sheetKey}`} {...props("extend")} />
      <ReportSheet key={`report-${sheetKey}`} {...props("report")} />
      <CancelSheet key={`cancel-${sheetKey}`} {...props("cancel")} />
      <ClientFeedbackSheet key={`clientFeedback-${sheetKey}`} {...props("clientFeedback")} />
      <RejectSheet key={`reject-${sheetKey}`} {...props("reject")} />
      <RemoveCreatorSheet key={`removeCreator-${sheetKey}`} {...props("removeCreator")} />
      {ws.slot ? <PostLinkSheet key={`postLink-${sheetKey}`} {...props("postLink")} /> : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                 */
/* -------------------------------------------------------------------------- */

type Option<T extends string | number> = { value: T; label: string; detail?: string };

function RadioTiles<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="y-ord-fld">
      <legend className="y-ord-lb mb-2">{legend}</legend>
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label key={String(option.value)} className="y-ord-chk" data-checked={value === option.value ? "true" : undefined}>
            <input type="radio" name={name} checked={value === option.value} onChange={() => onChange(option.value)} />
            <span>
              <b className="font-semibold">{option.label}</b>
              {option.detail ? <small className="y-fg-2 block">{option.detail}</small> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" className="y-ord-warn">
      <AlertTriangle size={18} aria-hidden className="mt-0.5 flex-none" />
      <p>{children}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Approve (custom order: approve, then review; campaign slot: approve to post) */
/* -------------------------------------------------------------------------- */

function ApproveSheet(props: SheetProps) {
  return props.ws.slot ? <ApproveSlotSheet {...props} /> : <ApproveWorkSheet {...props} />;
}

/** Work spec 6.10.1 and 6.10.2: step 1 releases the payment, step 2 is the review. */
function ApproveWorkSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const form = useReviewForm(ws);
  const { commission: c, creator, creatorName: name, latest, totals, adCopy } = ws;
  const net = cash(totals.creatorEarns);
  const unsent = latest ? openComments(latest).length : 0;

  const finish = () => {
    onClose();
    ws.confirm({
      title: `Approved · ${cash(totals.total)} released`,
      body: (
        <>
          {name} has been paid <b>{net}</b> after the {FEE_PCT}% Yapp fee.{" "}
          {adCopy ? "The final copy is in Files." : "Your clean file and raw footage are in Files."}
        </>
      ),
      link: creator ? { label: "Order a variation", href: paths.orderCreator(creator.handle, { again: c.id }) } : undefined,
    });
  };

  if (step === 2) {
    return (
      <Sheet
        open={open}
        onClose={finish}
        title={`Review ${name}`}
        description={`Approved. ${net} is on its way to ${name}. Your review helps other brands choose.`}
        step={{ current: 2, total: 2 }}
        footer={
          <SheetActions>
            <PillButton variant="soft" onClick={finish}>
              Skip for now
            </PillButton>
            <PillButton
              variant="contrast"
              disabled={!form.valid}
              onClick={() => {
                const saved = form.submit();
                if (saved === null) return;
                toast({
                  message: saved
                    ? `Review posted. ${plural(saved, "learning")} saved to ${ws.product?.name ?? "your product"} for next time.`
                    : `Review posted to ${name}'s profile.`,
                });
                finish();
              }}
            >
              Post review
            </PillButton>
          </SheetActions>
        }
      >
        {form.fields}
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Approve version ${latest?.version ?? 1}?`}
      description={`Payment is released to ${name} straight away. This can't be undone.`}
      step={{ current: 1, total: 2 }}
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Not yet
          </PillButton>
          <PillButton
            variant="neon"
            onClick={() => {
              actions.approve(c.id);
              setStep(2);
            }}
          >
            Approve and release payment
          </PillButton>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="y-tile px-4 py-1.5">
          <DetailRows
            rows={[
              { label: "You pay", value: cash(totals.total) },
              { label: `${name} receives`, value: net },
              { label: `Yapp fee (${Math.round(c.feeRate * 100)}%)`, value: cash(totals.fee) },
            ]}
          />
        </div>
        <Checklist
          look="circle"
          items={[
            adCopy
              ? "You get the final copy and its document, ready to use."
              : "You get the clean file, without the watermark, plus raw footage.",
            `Usage rights start today: ${usageById[c.brief.usage].phrase}.`,
            `Comments stay open for ${COMMENTS_OPEN_DAYS} days, for final feedback and small questions.`,
          ]}
        />
        {unsent ? (
          <Warning>
            {plural(unsent, "open comment")} on this version won&apos;t be sent as changes. Approving finishes the order as
            it is; choose &ldquo;Request changes&rdquo; instead if you want them made.
          </Warning>
        ) : null}
      </div>
    </Sheet>
  );
}

/** Work spec 6.9.2: approving a campaign slot moves the creator on to posting; pay comes later. */
function ApproveSlotSheet({ ws, open, onClose }: SheetProps) {
  const { commission: c, creatorName: name, latest, slot, totals } = ws;
  const [rating, setRating] = useState(0);
  const net = cash(totals.creatorEarns);
  const unsent = latest ? openComments(latest).length : 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Approve version ${latest?.version ?? 1}?`}
      description={`The clean file unlocks for you, and ${name} posts it next. This can't be undone.`}
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Not yet
          </PillButton>
          <PillButton
            variant="neon"
            onClick={() => {
              actions.approve(c.id, { rating: rating || undefined });
              onClose();
              ws.confirm({
                title: `Approved · ${name} posts it next`,
                body: (
                  <>
                    The clean file and raw footage are in Files. {name} posts it on their {slot?.platformName ?? "account"}{" "}
                    and is paid <b>{net}</b> {CAMPAIGN_RELEASE_DAYS} days after we verify the post.
                  </>
                ),
              });
            }}
          >
            Approve and move to posting
          </PillButton>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="y-tile px-4 py-1.5">
          <DetailRows
            rows={[
              { label: "You paid", value: `${cash(totals.total)} · held` },
              { label: `${name} receives`, value: net },
              { label: `Yapp fee (${Math.round(c.feeRate * 100)}%)`, value: cash(totals.fee) },
            ]}
          />
        </div>
        <Checklist
          look="circle"
          items={[
            "You get the clean file, without the watermark, plus raw footage.",
            `Usage rights start today: ${usageById[c.brief.usage].phrase}.`,
            `${name} posts it on their ${slot?.platformName ?? "own"} account, tagging ${slot?.brandHandle ?? "you"}, with the paid-partnership label.`,
            `The payment stays held until ${CAMPAIGN_RELEASE_DAYS} days after we verify the post, and is released only if it's still up.`,
          ]}
        />
        <div className="y-ord-fld">
          <span className="y-ord-lb">
            Rate {name} <span className="y-fg-2 font-normal">· optional</span>
          </span>
          <StarInput value={rating} onChange={setRating} label={`Rate ${name}`} size={30} />
        </div>
        {unsent ? (
          <Warning>
            {plural(unsent, "open comment")} on this version won&apos;t be sent. Approving accepts the video as it is;
            choose &ldquo;Request changes&rdquo; instead if you want them made.
          </Warning>
        ) : null}
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Request changes                                                             */
/* -------------------------------------------------------------------------- */

type OutOfRevisions = "extra" | "approve" | "dispute";

/**
 * Work spec 6.10.3 with the round 3 answers, item 39: the open comments to send, an optional note,
 * and what happens. With the included revisions used, three ways on: approve, a paid extra
 * revision by agreement, or a dispute.
 */
function RequestChangesSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const { commission: c, creator, creatorName: name, latest, slot, adCopy } = ws;
  const notes = latest ? openComments(latest) : [];
  const left = revisionsLeft(c);
  const extraPrice = creator?.addons.find((a) => a.id === "extra-revision")?.price;
  const [message, setMessage] = useState("");
  const [tried, setTried] = useState(false);
  const [path, setPath] = useState<OutOfRevisions>("extra");
  // Every open comment starts ticked; untick the ones that aren't changes.
  const [unticked, setUnticked] = useState<string[]>([]);
  const ticked = notes.filter((n) => !unticked.includes(n.id));
  const valid = ticked.length > 0 || message.trim().length >= CHANGE_NOTE_MIN_CHARS;
  const out = left === 0 && !slot;
  const next = (latest?.version ?? 0) + 1;

  const submit = () => {
    setTried(true);
    if (out && path === "approve") {
      ws.openSheet("approve");
      return;
    }
    if (out && path === "dispute") {
      ws.openSheet("report");
      return;
    }
    if (!valid || !latest) {
      toast({ message: `Pick a comment or write what to change (${CHANGE_NOTE_MIN_CHARS}+ characters)`, tone: "info" });
      document.querySelector<HTMLTextAreaElement>('[role="dialog"] textarea')?.focus();
      return;
    }
    const extraLine = out
      ? `This is an extra revision beyond the ${plural(c.revisionsIncluded, "included one")}${
          extraPrice ? `. Happy to pay your ${cash(extraPrice)} extra-revision price` : ". Happy to agree a price for it"
        }.`
      : "";
    const body = [message.trim(), extraLine].filter(Boolean).join("\n\n");
    const result = actions.requestRevision(c.id, { commentIds: ticked.map((n) => n.id), note: body });
    if (!result.ok) {
      toast({
        message:
          result.reason === "pick_or_note"
            ? `Pick a comment or write what to change (${CHANGE_NOTE_MIN_CHARS}+ characters)`
            : "Couldn't send. Try again.",
        tone: "info",
      });
      return;
    }
    toast({ message: `Changes sent · ${name} is on version ${next}` });
    onClose();
  };

  const description = out
    ? `You've used the ${plural(c.revisionsIncluded, "included revision")} on this order.`
    : `${name} gets your notes${adCopy ? "" : " with their timestamps"} and starts on version ${next}. ${
        slot ? "" : `${Math.max(0, left - 1)} of ${c.revisionsIncluded} revisions left after this.`
      }`.trim();

  const primary =
    out && path === "approve" ? "Approve instead" : out && path === "dispute" ? "Open a dispute" : `Send to ${name}`;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Request changes"
      description={description}
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton variant="contrast" onClick={submit}>
            {primary}
          </PillButton>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-[18px]">
        {out ? (
          <RadioTiles
            legend="How do you want to go on?"
            name="out-of-revisions"
            value={path}
            onChange={setPath}
            options={[
              {
                value: "approve",
                label: "Approve it as it is",
                detail: `The payment is released to ${name}.`,
              },
              {
                value: "extra",
                label: "Agree a paid extra revision",
                detail: extraPrice
                  ? `${name}'s extra-revision price is ${cash(extraPrice)}. They confirm in Messages before starting.`
                  : `You agree the price with ${name} in Messages before they start.`,
              },
              {
                value: "dispute",
                label: "Open a dispute",
                detail: "Yapp support looks at the brief and the versions. A person replies within 48 hours.",
              },
            ]}
          />
        ) : null}

        {!out || path === "extra" ? (
          <>
            <fieldset className="y-ord-fld">
              <legend className="y-ord-lb mb-2">Send these comments</legend>
              {notes.length ? (
                <ul className="flex flex-col gap-2">
                  {notes.map((note) => (
                    <li key={note.id}>
                      <label className="y-ord-chk">
                        <input
                          type="checkbox"
                          checked={!unticked.includes(note.id)}
                          onChange={(event) =>
                            setUnticked((list) =>
                              event.target.checked ? list.filter((id) => id !== note.id) : [...list, note.id],
                            )
                          }
                        />
                        <span>
                          <span className="y-ord-tchip" data-general={note.atSec === null ? "true" : undefined}>
                            {note.atSec === null ? "General" : clock(note.atSec)}
                          </span>{" "}
                          {note.text}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="y-small y-fg-2">
                  No open comments on this version. {adCopy ? "" : "Comments pinned to a moment are the clearest way to ask for changes. "}
                  Close this to add some, or write what to change below.
                </p>
              )}
            </fieldset>

            <TextArea
              label={ticked.length ? "Anything else?" : "What should change?"}
              required={ticked.length === 0}
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              error={tried && !valid ? `Pick a comment or write what to change (${CHANGE_NOTE_MIN_CHARS}+ characters).` : null}
              hint={ticked.length ? undefined : `Tell them what to change, in ${CHANGE_NOTE_MIN_CHARS} characters or more.`}
              placeholder="e.g. Keep the ending, just tighten the first three seconds."
            />

            <Checklist
              look="circle"
              items={[`The auto-approval timer stops until version ${next} arrives.`, "Payment stays held."]}
            />

            {out ? (
              <Warning>
                We add a line saying you&apos;re happy to pay for the extra revision
                {extraPrice ? ` (${cash(extraPrice)})` : ""}, and {name} confirms in Messages.
              </Warning>
            ) : slot && left === 0 ? (
              <Warning>
                You&apos;ve used the {plural(c.revisionsIncluded, "included revision")}. You can still ask. If it still
                isn&apos;t right after that, rejecting it gives the slot to another creator.
              </Warning>
            ) : null}
          </>
        ) : null}
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Campaign slots: reject, remove creator                                      */
/* -------------------------------------------------------------------------- */

function RejectSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const { commission, creatorName } = ws;
  const [reason, setReason] = useState("");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Reject this video?"
      description={
        ws.slot?.request?.status === "closed"
          ? "The campaign is closed, so the slot's money is refunded to your card in full."
          : "The slot goes to another creator automatically, and its money stays held in your campaign."
      }
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Keep reviewing
          </PillButton>
          <PillButton
            variant="contrast"
            onClick={() => {
              actions.rejectCampaignVideo(commission.id, reason.trim());
              toast({ message: "Video rejected. The slot is open for another creator." });
              onClose();
              window.scrollTo({ top: 0, behavior: scrollMotion() });
            }}
          >
            Reject video
          </PillButton>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <TextArea
          label={`Why isn't it right? (shared with ${creatorName})`}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          hint="Optional. A kind, specific line helps them on the next campaign."
          placeholder="e.g. We needed the app on screen in the first five seconds."
        />
        <p className="y-small y-fg-2">
          If a few changes would fix it, &ldquo;Request changes&rdquo; keeps {creatorName} on the slot. Once rejected,{" "}
          {creatorName} can&apos;t take another slot on this campaign.
        </p>
      </div>
    </Sheet>
  );
}

function RemoveCreatorSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const { commission, creatorName } = ws;
  const [reason, setReason] = useState("");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Remove ${creatorName} from this slot?`}
      description={
        ws.slot?.request?.status === "closed"
          ? "The campaign is closed, so the slot's money is refunded to your card in full."
          : "The slot reopens for another creator automatically, and its money stays held in your campaign."
      }
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Keep {creatorName}
          </PillButton>
          <PillButton
            variant="contrast"
            onClick={() => {
              actions.removeCampaignCreator(commission.id, reason.trim());
              toast({ message: `${creatorName} was removed. The slot is open again.` });
              onClose();
              window.scrollTo({ top: 0, behavior: scrollMotion() });
            }}
          >
            Remove creator
          </PillButton>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <TextArea
          label="Reason (only you see this)"
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          hint="Optional. We tell them politely that you went with another creator."
        />
        <p className="y-small y-fg-2">
          {creatorName} hasn&apos;t uploaded anything yet. They won&apos;t be able to take another slot on this campaign.
        </p>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Offers                                                                      */
/* -------------------------------------------------------------------------- */

const declineReasons = [
  "I'm booked on these dates",
  "The budget doesn't work for this scope",
  "It isn't the right fit for my style",
  "The brief needs more detail",
  "Something else",
];

function DeclineSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const { commission, businessName } = ws;
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const needsNote = reason === "Something else";
  const valid = Boolean(reason) && (!needsNote || note.trim().length >= 5);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Decline this offer?"
      description={`We'll tell ${businessName} and release the authorization on their card. Nothing is charged.`}
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Keep the offer
          </PillButton>
          <PillButton
            variant="contrast"
            disabled={!valid}
            onClick={() => {
              if (!reason) return;
              const text = note.trim();
              actions.declineOffer(commission.id, needsNote ? text : text ? `${reason}. ${text}` : reason);
              toast({ message: `Offer declined. ${businessName} has been told.` });
              onClose();
            }}
          >
            Decline offer
          </PillButton>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <RadioTiles
          legend="Why are you declining?"
          name="decline-reason"
          options={declineReasons.map((r) => ({ value: r, label: r }))}
          value={reason}
          onChange={setReason}
        />
        <TextArea
          label={`Note to ${businessName}`}
          required={needsNote}
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          hint="A kind line keeps the door open for next time. Suggest other dates or a scope that would work."
          placeholder="e.g. I'm fully booked until the 20th, but I'd love to do this after that."
        />
      </div>
    </Sheet>
  );
}

function WithdrawSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const { commission, creatorName, totals } = ws;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Withdraw this offer?"
      description={`${creatorName} won't be able to accept it any more.`}
      width="sm"
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Keep the offer
          </PillButton>
          <PillButton
            variant="contrast"
            onClick={() => {
              actions.withdrawOffer(commission.id);
              toast({ message: `Offer withdrawn. The ${cash(totals.total)} authorization was released.` });
              onClose();
            }}
          >
            Withdraw offer
          </PillButton>
        </SheetActions>
      }
    >
      <p className="y-body y-fg-2">
        The {cash(totals.total)} authorization on your card is released right away. You can send {creatorName} a new offer
        any time.
      </p>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* While it runs: extend, report, cancel                                       */
/* -------------------------------------------------------------------------- */

function ExtendSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const { commission, creatorName } = ws;
  const [days, setDays] = useState<number | null>(2);
  const options = [1, 2, 3, 7].map((d) => ({
    value: d,
    label: `+${plural(d, "day")}`,
    detail: `New due date ${weekdayDate(addDays(commission.dueDate, d))}`,
  }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Extend the deadline"
      description={`Currently due ${weekdayDate(commission.dueDate)}. ${creatorName} is told straight away.`}
      width="sm"
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Cancel
          </PillButton>
          <PillButton
            variant="contrast"
            disabled={!days}
            onClick={() => {
              if (!days) return;
              const next = weekdayDate(addDays(commission.dueDate, days));
              actions.extendDeadline(commission.id, days, "business");
              toast({ message: `Due date moved to ${next}. ${creatorName} has been told.` });
              onClose();
            }}
          >
            {days ? `Move to ${weekdayDate(addDays(commission.dueDate, days))}` : "Pick a new date"}
          </PillButton>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <RadioTiles legend="How much more time?" name="extend-days" options={options} value={days} onChange={setDays} />
        <p className="y-micro y-fg-2 inline-flex items-start gap-1.5">
          <ShieldCheck size={14} aria-hidden className="mt-px flex-none" />
          Payment stays held. Nothing changes on price.
        </p>
      </div>
    </Sheet>
  );
}

const reportReasons = {
  business: [
    "It wasn't delivered on time",
    "The work doesn't match the brief",
    "The creator isn't responding",
    "We've used the included revisions and can't agree",
    "A payment or billing problem",
    "Something else",
  ],
  creator: [
    "The client isn't responding",
    "The brief changed after we agreed",
    "Asked for work outside the agreement",
    "A payment problem",
    "Something else",
  ],
};

function ReportSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const { commission, side, otherName } = ws;
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [tried, setTried] = useState(false);
  const detailsError =
    tried && details.trim().length < 20 ? "Tell us a little more (at least 20 characters) so we can help quickly." : null;
  const reasonError = tried && !reason ? "Pick what's going wrong." : null;

  const submit = () => {
    setTried(true);
    if (!reason || details.trim().length < 20) return;
    actions.openDispute(commission.id, reason, details.trim(), side);
    toast({ message: "Yapp support has joined your conversation. Payment stays held meanwhile." });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Get help from Yapp"
      description="Support joins this order's conversation and reads the brief, the versions, the comments and your messages. A person replies within 48 hours."
      footer={
        <SheetActions>
          <PillButton
            variant="soft"
            onClick={() => {
              onClose();
              ws.goToMessages();
            }}
          >
            Message {otherName} first
          </PillButton>
          <PillButton variant="contrast" onClick={submit}>
            Open a dispute
          </PillButton>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-2">
          <RadioTiles
            legend="What's going wrong?"
            name="report-reason"
            options={reportReasons[side].map((r) => ({ value: r, label: r }))}
            value={reason}
            onChange={setReason}
          />
          {reasonError ? (
            <p role="alert" className="y-small px-1 font-medium text-(--y-danger)">
              {reasonError}
            </p>
          ) : null}
        </div>
        <TextArea
          label="What happened?"
          required
          rows={4}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          onBlur={() => details && setTried(true)}
          error={detailsError}
          hint="Dates, what was agreed and what you've tried so far."
        />
        <p className="y-small inline-flex items-start gap-2">
          <ShieldCheck size={18} aria-hidden className="mt-px flex-none" />
          {side === "business"
            ? "Your payment stays held while we look into it. If the work wasn't delivered as agreed, you get a full refund."
            : "The payment stays held while we look into it. If you delivered what was agreed, you get paid."}
        </p>
      </div>
    </Sheet>
  );
}

const cancelReasons = ["Our plans changed", "We found another way to make it", "The creator asked to cancel", "Something else"];

function CancelSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const { commission, creatorName, totals } = ws;
  const [reason, setReason] = useState<string | null>(null);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Cancel this order?"
      description={`${creatorName} hasn't delivered yet, so you get a full refund of ${cash(totals.total)}.`}
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Keep the order
          </PillButton>
          <PillButton
            variant="contrast"
            disabled={!reason}
            onClick={() => {
              if (!reason) return;
              actions.cancelCommission(commission.id, reason, "business");
              toast({ message: `Cancelled. ${cash(totals.total)} refunded to your card.` });
              onClose();
            }}
          >
            Cancel and refund {cash(totals.total)}
          </PillButton>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <RadioTiles
          legend="Why are you cancelling?"
          name="cancel-reason"
          options={cancelReasons.map((r) => ({ value: r, label: r }))}
          value={reason}
          onChange={setReason}
        />
        <p className="y-small y-fg-2">
          {creatorName} may already have started. A quick message to say thanks goes a long way, and you can always work
          together again.
        </p>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Creator: rate the client (private)                                          */
/* -------------------------------------------------------------------------- */

function ClientFeedbackSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const { commission, businessName } = ws;
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Rate ${businessName}`}
      description="Private: only Yapp sees this. Brands are shown to creators by how reliably they review and pay, never by a star rating."
      width="sm"
      footer={
        <SheetActions>
          <PillButton variant="soft" onClick={onClose}>
            Not now
          </PillButton>
          <PillButton
            variant="contrast"
            disabled={!rating}
            onClick={() => {
              actions.leaveClientFeedback(commission.id, rating, text.trim());
              toast({ message: "Thanks. Your rating stays private." });
              onClose();
            }}
          >
            Send rating
          </PillButton>
        </SheetActions>
      }
    >
      <div className="flex flex-col gap-[18px]">
        <div className="y-ord-fld">
          <span className="y-ord-lb">How was working with {businessName}?</span>
          <StarInput value={rating} onChange={setRating} label={`Rate ${businessName}`} size={34} />
        </div>
        <TextArea
          label="Anything we should know?"
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          hint="Was the brief clear? Did they reply quickly? Were the comments fair?"
          placeholder="e.g. Clear brief, fast replies, and the comments were specific."
        />
      </div>
    </Sheet>
  );
}
