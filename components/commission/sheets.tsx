"use client";

import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { StarInput } from "@/components/domain/stars";
import { Celebrate } from "@/components/ui/celebrate";
import { TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { addDays } from "@/lib/clock";
import { clock, plural, weekdayDate } from "@/lib/format";
import { actions } from "@/lib/store";
import { addonById, includedRights } from "@/lib/taxonomy";

import { DeliverSheet } from "./deliver-sheet";
import { cash, revisionsLeft, type SheetName, type Workspace } from "./helpers";
import { ReviewSheet } from "./review-sheet";

type SheetProps = { ws: Workspace; open: boolean; onClose: () => void };

/** All workspace sheets. Each one remounts when opened so its form starts fresh. */
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
      <CelebrateSheet key={`celebrate-${sheetKey}`} {...props("celebrate")} />
      <DeclineSheet key={`decline-${sheetKey}`} {...props("decline")} />
      <WithdrawSheet key={`withdraw-${sheetKey}`} {...props("withdraw")} />
      <ExtendSheet key={`extend-${sheetKey}`} {...props("extend")} />
      <ReportSheet key={`report-${sheetKey}`} {...props("report")} />
      <CancelSheet key={`cancel-${sheetKey}`} {...props("cancel")} />
      <ClientFeedbackSheet key={`clientFeedback-${sheetKey}`} {...props("clientFeedback")} />
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
    <fieldset className="flex flex-col gap-2">
      <legend className="y-label mb-2">{legend}</legend>
      {options.map((option) => (
        <label
          key={String(option.value)}
          className={`y-tile flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 ${
            value === option.value ? "shadow-[inset_0_0_0_2px_var(--b-fg)]" : ""
          }`}
        >
          <input
            type="radio"
            name={name}
            className="y-check !rounded-full"
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className="flex flex-1 flex-col">
            <span className="y-small font-semibold">{option.label}</span>
            {option.detail ? <span className="y-micro y-fg-2">{option.detail}</span> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function Footer({
  primary,
  secondary,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{secondary}{primary}</div>;
}

function Row({ label, value, strong }: { label: React.ReactNode; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={strong ? "y-head" : "y-small y-fg-2"}>{label}</span>
      <span
        className={
          strong
            ? "y-display y-num text-[28px] leading-none font-semibold tracking-[-0.02em]"
            : "y-small y-num font-semibold"
        }
      >
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Business: request changes / approve / celebrate                             */
/* -------------------------------------------------------------------------- */

function RequestChangesSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const { commission, creator, creatorName, latest } = ws;
  const notes = latest ? latest.comments.filter((c) => !c.resolved) : [];
  const left = revisionsLeft(commission);
  const extraPrice = creator?.addons.find((a) => a.id === "extra-revision")?.price;
  const [message, setMessage] = useState("");
  const [tried, setTried] = useState(false);
  const valid = notes.length > 0 || message.trim().length >= 10;

  const submit = () => {
    setTried(true);
    if (!valid || !latest) return;
    const extraLine =
      left === 0
        ? `This is an extra round beyond the ${plural(commission.revisionsIncluded, "revision")} included${
            extraPrice ? `. Happy to pay your ${cash(extraPrice)} extra-revision price` : ""
          }.`
        : "";
    const body = [message.trim(), extraLine].filter(Boolean).join("\n\n");
    actions.requestRevision(commission.id, body);
    toast({
      message: `Changes sent to ${creatorName}. You'll get version ${latest.version + 1} to review.`,
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Request changes"
      description={`${creatorName} gets your notes with their timestamps and starts on version ${(latest?.version ?? 0) + 1}.`}
      width="md"
      footer={
        <Footer
          secondary={
            <PillButton variant="ghost" onClick={onClose}>
              Keep reviewing
            </PillButton>
          }
          primary={
            <PillButton variant="contrast" size="lg" onClick={submit} disabled={tried && !valid}>
              Send {notes.length ? plural(notes.length, "note") : "changes"} to {creatorName}
            </PillButton>
          }
        />
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h3 className="y-label">
            <span>Notes on version {latest?.version}</span>
            <span className="y-micro y-fg-3 font-medium">{notes.length}</span>
          </h3>
          {notes.length ? (
            <ul className="flex flex-col gap-2">
              {notes.map((note) => (
                <li key={note.id} className="y-tile flex items-start gap-3 p-3">
                  <span className="y-num y-small flex-none font-semibold">{clock(note.atSec)}</span>
                  <span className="y-small">{note.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="y-small y-fg-2">
              You haven&apos;t added notes on the video. Notes pinned to the exact second are the clearest way to ask
              for changes. Close this to add some, or describe what to change below.
            </p>
          )}
        </div>

        <TextArea
          label={`Message to ${creatorName}`}
          required={notes.length === 0}
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          error={tried && !valid ? "Add a note on the video or write at least a sentence about what to change." : null}
          hint={notes.length ? "Anything that isn't tied to one moment." : "Tell them what to change."}
          placeholder="e.g. Overall it's great. Mainly the pacing in the middle, and let's end on the app icon."
        />

        {left > 0 ? (
          <p className="y-small inline-flex items-start gap-2">
            <Clock size={18} aria-hidden className="mt-px flex-none" />
            <span>
              This uses 1 of your {plural(left, "revision round")} left. Revisions are usually back within 2 days.
            </span>
          </p>
        ) : (
          <div
            role="note"
            className="flex items-start gap-3 rounded-(--y-r-tile) bg-(--y-warning-soft) p-4 text-(--y-warning)"
          >
            <AlertTriangle size={20} aria-hidden className="mt-0.5 flex-none" />
            <p className="y-small font-medium">
              You&apos;ve used all {plural(commission.revisionsIncluded, "included revision")}. An extra round costs{" "}
              {extraPrice ? `${cash(extraPrice)} (${creatorName}'s extra-revision price)` : `an extra fee you agree with ${creatorName}`}.
              You can still send this: we&apos;ll add a line saying you&apos;re happy to cover it, and {creatorName}{" "}
              confirms in Messages.
            </p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function ApproveSheet({ ws, open, onClose }: SheetProps) {
  const { commission, creatorName, latest, totals } = ws;
  const unsent = latest ? latest.comments.filter((c) => !c.resolved).length : 0;
  const adRights = commission.addons.filter((a) => a.id === "ad-rights-90" || a.id === "ad-rights-365");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Approve version ${latest?.version ?? 1}?`}
      description={`Payment is released to ${creatorName} straight away. This can't be undone.`}
      width="md"
      footer={
        <Footer
          secondary={
            <PillButton variant="ghost" onClick={onClose}>
              Not yet
            </PillButton>
          }
          primary={
            <PillButton
              variant="contrast"
              size="lg"
              onClick={() => {
                actions.approve(commission.id);
                ws.openSheet("celebrate");
              }}
            >
              Approve and release {cash(totals.creatorEarns)}
            </PillButton>
          }
        />
      }
    >
      <div className="flex flex-col gap-6">
        <div className="y-tile flex flex-col gap-3 p-5">
          <Row label={`${creatorName} receives`} value={cash(totals.creatorEarns)} />
          <Row label={`Yapp service fee (${Math.round(commission.feeRate * 100)}%)`} value={cash(totals.fee)} />
          <div className="border-t border-(--b-line) pt-3">
            <Row label="Total charged" value={cash(totals.total)} strong />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="y-label">What you get</h3>
          <ul className="flex flex-col gap-2">
            <li className="y-small flex items-start gap-2.5">
              <CheckCircle2 size={18} aria-hidden className="mt-px flex-none" />
              The final files for version {latest?.version ?? 1}, ready to post.
            </li>
            <li className="y-small flex items-start gap-2.5">
              <CheckCircle2 size={18} aria-hidden className="mt-px flex-none" />
              {includedRights}
            </li>
            {adRights.map((addon) => (
              <li key={addon.id} className="y-small flex items-start gap-2.5">
                <CheckCircle2 size={18} aria-hidden className="mt-px flex-none" />
                {addonById[addon.id].name}: {addonById[addon.id].description.toLowerCase()}
              </li>
            ))}
          </ul>
        </div>

        {unsent ? (
          <div
            role="note"
            className="flex items-start gap-3 rounded-(--y-r-tile) bg-(--y-warning-soft) p-4 text-(--y-warning)"
          >
            <AlertTriangle size={20} aria-hidden className="mt-0.5 flex-none" />
            <p className="y-small font-medium">
              Your {plural(unsent, "note")} on this version won&apos;t be sent as change requests. Approving
              finishes the commission as it is. Choose &ldquo;Request changes&rdquo; instead if you want them made.
            </p>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

function CelebrateSheet({ ws, open, onClose }: SheetProps) {
  const { commission, creatorName, totals } = ws;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Done! ${creatorName} has been paid.`}
      hideTitle
      side="center"
      width="sm"
      footer={
        <div className="flex flex-col gap-2">
          <PillButton variant="contrast" size="lg" onClick={() => ws.openSheet("review")}>
            Leave a review
          </PillButton>
          <PillButton
            variant="ghost"
            onClick={() => {
              onClose();
              ws.showTab("files");
            }}
          >
            Go to the final files
          </PillButton>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4 pb-2 text-center" role="status">
        <Celebrate className="h-32 w-52" />
        <p className="y-display y-title" aria-hidden>
          Done! {creatorName} has been paid.
        </p>
        <p className="y-body y-fg-2 max-w-[40ch]">
          {cash(totals.creatorEarns)} was released to {creatorName}. The video is yours to post
          {commission.addons.some((a) => a.id.startsWith("ad-rights")) ? " and run as an ad" : ""}.
        </p>
        <p className="y-small max-w-[40ch]">
          Got a minute? A quick review helps {creatorName}, and the learnings you save carry into your next brief.
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
      description={`We'll tell ${businessName} and release the authorisation on their card. Nothing is charged.`}
      width="md"
      footer={
        <Footer
          secondary={
            <PillButton variant="ghost" onClick={onClose}>
              Keep the offer
            </PillButton>
          }
          primary={
            <PillButton
              variant="contrast"
              size="lg"
              disabled={!valid}
              onClick={() => {
                if (!reason) return;
                const text = note.trim();
                actions.declineOffer(
                  commission.id,
                  needsNote ? text : text ? `${reason}. ${text}` : reason,
                );
                toast({ message: `Offer declined. ${businessName} has been told.` });
                onClose();
              }}
            >
              Decline offer
            </PillButton>
          }
        />
      }
    >
      <div className="flex flex-col gap-6">
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
      side="center"
      width="sm"
      footer={
        <Footer
          secondary={
            <PillButton variant="ghost" onClick={onClose}>
              Keep the offer
            </PillButton>
          }
          primary={
            <PillButton
              variant="contrast"
              size="lg"
              onClick={() => {
                actions.withdrawOffer(commission.id);
                toast({ message: `Offer withdrawn. The ${cash(totals.total)} authorisation was released.` });
                onClose();
              }}
            >
              Withdraw offer
            </PillButton>
          }
        />
      }
    >
      <p className="y-body y-fg-2">
        The {cash(totals.total)} authorisation on your card is released right away. You can send {creatorName} a new
        offer any time.
      </p>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Production                                                                  */
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
        <Footer
          secondary={
            <PillButton variant="ghost" onClick={onClose}>
              Cancel
            </PillButton>
          }
          primary={
            <PillButton
              variant="contrast"
              size="lg"
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
          }
        />
      }
    >
      <div className="flex flex-col gap-5">
        <RadioTiles legend="How much more time?" name="extend-days" options={options} value={days} onChange={setDays} />
        <p className="y-micro y-fg-2 inline-flex items-start gap-1.5">
          <ShieldCheck size={14} aria-hidden className="mt-px flex-none" />
          Payment stays protected. Nothing changes on price.
        </p>
      </div>
    </Sheet>
  );
}

const reportReasons = {
  business: [
    "It wasn't delivered on time",
    "The video doesn't match the brief",
    "The creator isn't responding",
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
  const { commission, role, otherName } = ws;
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [tried, setTried] = useState(false);
  const detailsError =
    tried && details.trim().length < 20 ? "Tell us a little more (at least 20 characters) so we can help quickly." : null;
  const reasonError = tried && !reason ? "Pick what's going wrong." : null;

  const submit = () => {
    setTried(true);
    if (!reason || details.trim().length < 20) return;
    actions.openDispute(commission.id, reason, details.trim(), role);
    toast({ message: "Yapp support has joined your conversation. Payment stays protected meanwhile." });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Report a problem"
      description="Support joins this commission's conversation, reads the brief, versions and messages, and replies within 24 hours."
      width="md"
      footer={
        <Footer
          secondary={
            <PillButton
              variant="ghost"
              onClick={() => {
                onClose();
                ws.goToMessages();
              }}
            >
              Message {otherName} first
            </PillButton>
          }
          primary={
            <PillButton variant="contrast" size="lg" onClick={submit}>
              Ask Yapp for help
            </PillButton>
          }
        />
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <RadioTiles
            legend="What's going wrong?"
            name="report-reason"
            options={reportReasons[role].map((r) => ({ value: r, label: r }))}
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
          {role === "business"
            ? "Your payment stays held while we look into it. If the work wasn't delivered as agreed, you get a full refund."
            : "The payment stays held while we look into it. If you delivered what was agreed, you get paid."}
        </p>
      </div>
    </Sheet>
  );
}

const cancelReasons = [
  "Our plans changed",
  "We found another way to make it",
  "The creator asked to cancel",
  "Something else",
];

function CancelSheet({ ws, open, onClose }: SheetProps) {
  const toast = useToast();
  const { commission, creatorName, totals } = ws;
  const [reason, setReason] = useState<string | null>(null);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Cancel this commission?"
      description={`${creatorName} hasn't delivered yet, so you get a full refund of ${cash(totals.total)}.`}
      width="md"
      footer={
        <Footer
          secondary={
            <PillButton variant="ghost" onClick={onClose}>
              Keep the commission
            </PillButton>
          }
          primary={
            <PillButton
              variant="contrast"
              size="lg"
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
          }
        />
      }
    >
      <div className="flex flex-col gap-5">
        <RadioTiles
          legend="Why are you cancelling?"
          name="cancel-reason"
          options={cancelReasons.map((r) => ({ value: r, label: r }))}
          value={reason}
          onChange={setReason}
        />
        <p className="y-small y-fg-2">
          {creatorName} may already have started. A quick message to say thanks goes a long way, and you can always
          work together again.
        </p>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Creator: rate the client                                                    */
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
      description="Private: only Yapp sees this. It helps us send you good clients and coach the others."
      width="sm"
      footer={
        <Footer
          secondary={
            <PillButton variant="ghost" onClick={onClose}>
              Not now
            </PillButton>
          }
          primary={
            <PillButton
              variant="contrast"
              size="lg"
              disabled={!rating}
              onClick={() => {
                actions.leaveClientFeedback(commission.id, rating, text.trim());
                toast({ message: "Thanks. Your rating stays private." });
                onClose();
              }}
            >
              Send rating
            </PillButton>
          }
        />
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="y-label">
            <span>How was working with {businessName}?</span>
            <span className="y-micro y-fg-3 font-medium">Required</span>
          </span>
          <StarInput value={rating} onChange={setRating} label={`Rate ${businessName}`} size={34} />
        </div>
        <TextArea
          label="Anything we should know?"
          rows={3}
          value={text}
          onChange={(event) => setText(event.target.value)}
          hint="Was the brief clear? Did they reply quickly? Were notes fair?"
          placeholder="e.g. Clear brief, fast replies, and the notes were specific."
        />
      </div>
    </Sheet>
  );
}
