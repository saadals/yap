"use client";

import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { StarInput } from "@/components/domain/stars";
import { TextArea } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { addDays } from "@/lib/clock";
import { clock, plural, weekdayDate } from "@/lib/format";
import { actions } from "@/lib/store";
import { addonById, CAMPAIGN_RELEASE_DAYS, includedRights } from "@/lib/taxonomy";

import { DeliverSheet } from "./deliver-sheet";
import { cash, revisionsLeft, type Job, type SheetName } from "./helpers";

type SheetProps = { job: Job; open: boolean; onClose: () => void; onActed: () => void };

/** Every sheet on the job page. Each remounts when opened so its form starts fresh. */
export function JobSheets({
  job,
  sheet,
  sheetKey,
  onClose,
  onApproved,
  onActed,
}: {
  job: Job;
  sheet: SheetName | null;
  sheetKey: number;
  onClose: () => void;
  onApproved: () => void;
  /** After an action that moves the job on: bring the stage panel into view. */
  onActed: () => void;
}) {
  const props = (name: SheetName) => ({ job, open: sheet === name, onClose, onActed });
  return (
    <>
      <DeliverSheet key={`deliver-${sheetKey}`} {...props("deliver")} />
      <RequestChangesSheet key={`changes-${sheetKey}`} {...props("requestChanges")} />
      {job.slot ? (
        <ApproveSlotSheet key={`approve-${sheetKey}`} job={job} open={sheet === "approve"} onClose={onClose} onApproved={onApproved} />
      ) : (
        <ApproveSheet key={`approve-${sheetKey}`} job={job} open={sheet === "approve"} onClose={onClose} onApproved={onApproved} />
      )}
      <DeclineSheet key={`decline-${sheetKey}`} {...props("decline")} />
      <WithdrawSheet key={`withdraw-${sheetKey}`} {...props("withdraw")} />
      <ExtendSheet key={`extend-${sheetKey}`} {...props("extend")} />
      <DisputeSheet key={`dispute-${sheetKey}`} {...props("dispute")} />
      <CancelSheet key={`cancel-${sheetKey}`} {...props("cancel")} />
      <RejectSheet key={`reject-${sheetKey}`} {...props("reject")} />
      <RemoveCreatorSheet key={`remove-${sheetKey}`} {...props("removeCreator")} />
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
    <fieldset className="flex flex-col gap-1.5">
      <legend className="y-label mb-2">{legend}</legend>
      {options.map((option) => (
        <label
          key={String(option.value)}
          className={`y-tile flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2.5 ${
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
            <span className="y-small font-medium">{option.label}</span>
            {option.detail ? <span className="y-micro y-fg-2">{option.detail}</span> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function Footer({ primary, secondary }: { primary: React.ReactNode; secondary?: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {secondary}
      {primary}
    </div>
  );
}

function Line({ label, value, strong }: { label: React.ReactNode; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={strong ? "y-head" : "y-small y-fg-2"}>{label}</span>
      <span className={strong ? "y-display y-num text-[26px] leading-none tracking-[-0.02em]" : "y-small y-num font-medium"}>{value}</span>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-(--y-r-tile) bg-(--y-warning-soft) p-4 text-(--y-warning)">
      <AlertTriangle size={18} aria-hidden className="mt-0.5 flex-none" />
      <div className="y-small font-medium">{children}</div>
    </div>
  );
}

function Point({ children }: { children: React.ReactNode }) {
  return (
    <li className="y-small flex items-start gap-2.5">
      <CheckCircle2 size={17} aria-hidden className="mt-px flex-none" />
      <span>{children}</span>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Ordering side: approve, ask for changes                                     */
/* -------------------------------------------------------------------------- */

function ApproveSheet({ job, open, onClose, onApproved }: Omit<SheetProps, "onActed"> & { onApproved: () => void }) {
  const toast = useToast();
  const { commission: c, creatorName, latest, totals } = job;
  const unsent = latest ? latest.comments.filter((m) => !m.resolved).length : 0;
  const adRights = c.addons.filter((a) => a.id === "ad-rights-90" || a.id === "ad-rights-365");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Approve version ${latest?.version ?? 1}?`}
      description={`The payment held since you hired ${creatorName} is released to them straight away. This can't be undone.`}
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
                actions.approve(c.id);
                toast({ message: `Approved. ${cash(totals.creatorEarns)} was released to ${creatorName}.` });
                onApproved();
                onClose();
              }}
            >
              Approve and release {cash(totals.creatorEarns)} to {creatorName}
            </PillButton>
          }
        />
      }
    >
      <div className="flex flex-col gap-6">
        <div className="y-tile flex flex-col gap-3 p-5">
          <Line label={`${creatorName} receives`} value={cash(totals.creatorEarns)} strong />
          <Line label={`Yapp service fee (${Math.round(c.feeRate * 100)}%)`} value={cash(totals.fee)} />
          <div className="border-t border-(--b-line) pt-3">
            <Line label="Charged when you hired, held since" value={cash(totals.total)} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="y-label">What you get</h3>
          <ul className="flex flex-col gap-2">
            <Point>The final files for version {latest?.version ?? 1}, ready to post. They also go to your Library.</Point>
            <Point>{includedRights}</Point>
            {adRights.map((addon) => (
              <Point key={addon.id}>
                {addonById[addon.id].name}: {addonById[addon.id].description.toLowerCase()}
              </Point>
            ))}
          </ul>
        </div>
        {unsent ? (
          <Warning>
            Your {plural(unsent, "open note")} on this version won&apos;t be sent as change requests. Approving finishes
            the job as it is. Choose &ldquo;Ask for changes&rdquo; instead if you want them made.
          </Warning>
        ) : null}
      </div>
    </Sheet>
  );
}

function ApproveSlotSheet({ job, open, onClose, onApproved }: Omit<SheetProps, "onActed"> & { onApproved: () => void }) {
  const toast = useToast();
  const { commission: c, creatorName, latest, slot } = job;
  const [rating, setRating] = useState(0);
  const unsent = latest ? latest.comments.filter((m) => !m.resolved).length : 0;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Approve this video?"
      description={`The full-quality file unlocks for you, and ${creatorName} posts it next. This can't be undone.`}
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
                actions.approve(c.id, { rating: rating || undefined });
                toast({ message: `Approved. The full-quality file is unlocked, and ${creatorName} posts it next.` });
                onApproved();
                onClose();
              }}
            >
              Approve video
            </PillButton>
          }
        />
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="y-label">
            <span>Rate {creatorName}</span>
            <span className="y-micro y-fg-3 font-medium">Optional</span>
          </span>
          <StarInput value={rating} onChange={setRating} label={`Rate ${creatorName}`} size={28} />
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="y-label">What happens next</h3>
          <ul className="flex flex-col gap-2">
            <Point>The full-quality file, without the watermark, is yours to download.</Point>
            <Point>{includedRights}</Point>
            <Point>
              {creatorName} posts it on their {slot?.platformName ?? "own"} account, tagging {slot?.brandHandle ?? "you"}, with the
              paid-partnership label.
            </Point>
            <Point>
              Their {cash(c.price)} stays held in your campaign until {CAMPAIGN_RELEASE_DAYS} days after we verify the post,
              and is paid only if it&apos;s still up.
            </Point>
          </ul>
        </div>
        {unsent ? (
          <Warning>
            Your {plural(unsent, "open note")} on this copy won&apos;t be sent. Approving accepts the video as it is.
          </Warning>
        ) : null}
      </div>
    </Sheet>
  );
}

function RequestChangesSheet({ job, open, onClose, onActed }: SheetProps) {
  const toast = useToast();
  const { commission: c, creator, creatorName, latest, slot, noun } = job;
  const notes = latest ? latest.comments.filter((m) => !m.resolved) : [];
  const left = revisionsLeft(c);
  const extraPrice = creator?.addons.find((a) => a.id === "extra-revision")?.price;
  const [message, setMessage] = useState("");
  const [tried, setTried] = useState(false);
  const valid = notes.length > 0 || message.trim().length >= 10;

  const submit = () => {
    setTried(true);
    if (!valid || !latest) return;
    const extraLine =
      left === 0 && !slot
        ? `This is an extra round beyond the ${plural(c.revisionsIncluded, "revision")} included${
            extraPrice ? `. Happy to pay your ${cash(extraPrice)} extra-revision price` : ""
          }.`
        : "";
    actions.requestRevision(c.id, [message.trim(), extraLine].filter(Boolean).join("\n\n"));
    toast({ message: `Changes sent to ${creatorName}. ${noun.charAt(0).toUpperCase()}${noun.slice(1)} ${latest.version + 1} comes back here.` });
    onClose();
    onActed();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ask for changes"
      description={`${creatorName} gets your notes with their timestamps and starts on ${noun} ${(latest?.version ?? 0) + 1}.`}
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
            <span>
              Notes on {noun} {latest?.version}
            </span>
            <span className="y-micro y-fg-2 font-medium">{notes.length}</span>
          </h3>
          {notes.length ? (
            <ul className="flex flex-col gap-1.5">
              {notes.map((note) => (
                <li key={note.id} className="y-tile flex items-start gap-3 p-3">
                  <span className="y-num y-small flex-none font-semibold">{clock(note.atSec)}</span>
                  <span className="y-small">{note.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="y-small y-fg-2">
              No notes on the video yet. Notes pinned to the second are the clearest way to ask. Close this to add some, or
              describe what to change below.
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
            <Clock size={17} aria-hidden className="mt-px flex-none" />
            <span>
              This uses 1 of your {plural(left, slot ? "change round" : "revision")} left.
              {slot ? "" : " Changes usually come back within 2 days."}
            </span>
          </p>
        ) : slot ? (
          <Warning>
            You&apos;ve used the {plural(c.revisionsIncluded, "included change round")}. You can still ask. If this copy still
            isn&apos;t right after that, rejecting it gives the slot to another creator.
          </Warning>
        ) : (
          <Warning>
            <p>
              You&apos;ve used all {plural(c.revisionsIncluded, "included revision")}. Another round costs{" "}
              {extraPrice ? `${cash(extraPrice)} (${creatorName}'s extra-revision price)` : `an extra fee you agree with ${creatorName}`}.
              You can still send this: we add a line saying you&apos;re happy to cover it, and {creatorName} confirms in the
              timeline.
            </p>
            <p className="pt-2">
              If the video doesn&apos;t match what you agreed,{" "}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => {
                  onClose();
                  job.openSheet("dispute");
                }}
              >
                open a dispute
              </button>{" "}
              instead. The payment stays held while we look.
            </p>
          </Warning>
        )}
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Campaign slots: reject, remove                                              */
/* -------------------------------------------------------------------------- */

function RejectSheet({ job, open, onClose, onActed }: SheetProps) {
  const toast = useToast();
  const { commission: c, creatorName } = job;
  const [reason, setReason] = useState("");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Reject this video?"
      description={
        job.slot?.request?.status === "closed"
          ? "The campaign is closed, so the slot's money is refunded to your card with its fee."
          : "The slot goes to another creator automatically, and its money stays held in your campaign."
      }
      width="md"
      footer={
        <Footer
          secondary={
            <PillButton variant="ghost" onClick={onClose}>
              Keep reviewing
            </PillButton>
          }
          primary={
            <PillButton
              variant="contrast"
              size="lg"
              onClick={() => {
                actions.rejectCampaignVideo(c.id, reason.trim());
                toast({ message: "Video rejected. The slot is open for another creator." });
                onClose();
                onActed();
              }}
            >
              Reject video
            </PillButton>
          }
        />
      }
    >
      <div className="flex flex-col gap-5">
        <TextArea
          label={`Why isn't it right? (shared with ${creatorName})`}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          hint="A kind, specific line helps them on the next campaign."
          placeholder="e.g. We needed the app on screen in the first five seconds."
        />
        <p className="y-small y-fg-2">
          If a few changes would fix it, &ldquo;Ask for changes&rdquo; keeps {creatorName} on the slot. Once rejected,{" "}
          {creatorName} can&apos;t take another slot on this campaign.
        </p>
      </div>
    </Sheet>
  );
}

function RemoveCreatorSheet({ job, open, onClose, onActed }: SheetProps) {
  const toast = useToast();
  const { commission: c, creatorName } = job;
  const [reason, setReason] = useState("");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Remove ${creatorName} from this slot?`}
      description={
        job.slot?.request?.status === "closed"
          ? "The campaign is closed, so the slot's money is refunded to your card with its fee."
          : "The slot reopens for another creator automatically, and its money stays held in your campaign."
      }
      width="md"
      footer={
        <Footer
          secondary={
            <PillButton variant="ghost" onClick={onClose}>
              Keep {creatorName}
            </PillButton>
          }
          primary={
            <PillButton
              variant="contrast"
              size="lg"
              onClick={() => {
                actions.removeCampaignCreator(c.id, reason.trim());
                toast({ message: `${creatorName} was removed. The slot is open again.` });
                onClose();
                onActed();
              }}
            >
              Remove creator
            </PillButton>
          }
        />
      }
    >
      <div className="flex flex-col gap-5">
        <TextArea
          label="Reason (only you see this)"
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          hint="We tell them politely that you went with another creator."
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

function DeclineSheet({ job, open, onClose, onActed }: SheetProps) {
  const toast = useToast();
  const { commission: c, businessName } = job;
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const needsNote = reason === "Something else";
  const valid = Boolean(reason) && (!needsNote || note.trim().length >= 5);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Decline this offer?"
      description={`We tell ${businessName} and release the authorization on their card. Nothing is charged.`}
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
                actions.declineOffer(c.id, needsNote ? text : text ? `${reason}. ${text}` : reason);
                toast({ message: `Offer declined. ${businessName} has been told.` });
                onClose();
                onActed();
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
          hint="A kind line keeps the door open. Suggest other dates or a scope that would work."
          placeholder="e.g. I'm fully booked until the 20th, but I'd love to do this after that."
        />
      </div>
    </Sheet>
  );
}

function WithdrawSheet({ job, open, onClose, onActed }: SheetProps) {
  const toast = useToast();
  const { commission: c, creatorName, totals } = job;
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
                actions.withdrawOffer(c.id);
                toast({ message: `Offer withdrawn. The ${cash(totals.total)} authorization was released.` });
                onClose();
                onActed();
              }}
            >
              Withdraw offer
            </PillButton>
          }
        />
      }
    >
      <p className="y-body y-fg-2">
        The {cash(totals.total)} authorization on your card is released right away. You can send {creatorName} a new offer any
        time.
      </p>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Production                                                                  */
/* -------------------------------------------------------------------------- */

function ExtendSheet({ job, open, onClose }: Omit<SheetProps, "onActed">) {
  const toast = useToast();
  const { commission: c, creatorName } = job;
  const [days, setDays] = useState<number | null>(2);
  const options = [1, 2, 3, 7].map((d) => ({
    value: d,
    label: `+${plural(d, "day")}`,
    detail: `New due date ${weekdayDate(addDays(c.dueDate, d))}`,
  }));
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Extend the deadline"
      description={`Due ${weekdayDate(c.dueDate)} now. ${creatorName} is told straight away.`}
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
                const next = weekdayDate(addDays(c.dueDate, days));
                actions.extendDeadline(c.id, days, "business");
                toast({ message: `Due date moved to ${next}. ${creatorName} has been told.` });
                onClose();
              }}
            >
              {days ? `Move to ${weekdayDate(addDays(c.dueDate, days))}` : "Pick a new date"}
            </PillButton>
          }
        />
      }
    >
      <div className="flex flex-col gap-5">
        <RadioTiles legend="How much more time?" name="extend-days" options={options} value={days} onChange={setDays} />
        <p className="y-micro y-fg-2 inline-flex items-start gap-1.5">
          <ShieldCheck size={14} aria-hidden className="mt-px flex-none" />
          The payment stays held. Nothing changes on price.
        </p>
      </div>
    </Sheet>
  );
}

const disputeReasons = {
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

function DisputeSheet({ job, open, onClose, onActed }: SheetProps) {
  const toast = useToast();
  const { commission: c, side, otherName } = job;
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [tried, setTried] = useState(false);
  const detailsError = tried && details.trim().length < 20 ? "Tell us a little more (at least 20 characters) so we can help quickly." : null;
  const reasonError = tried && !reason ? "Pick what's going wrong." : null;

  const submit = () => {
    setTried(true);
    if (!reason || details.trim().length < 20) return;
    actions.openDispute(c.id, reason, details.trim(), side);
    toast({ message: "Yapp support has joined this job. The payment stays held meanwhile." });
    onClose();
    onActed();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Open a dispute"
      description="Yapp support joins this job, reads the brief, the versions and the messages, and replies within 24 hours."
      width="md"
      footer={
        <Footer
          secondary={
            <PillButton
              variant="ghost"
              onClick={() => {
                onClose();
                job.focusComposer();
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
            name="dispute-reason"
            options={disputeReasons[side].map((r) => ({ value: r, label: r }))}
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
          error={detailsError}
          hint="Dates, what was agreed and what you've tried so far."
        />
        <p className="y-small inline-flex items-start gap-2">
          <ShieldCheck size={17} aria-hidden className="mt-px flex-none" />
          {side === "business"
            ? "Your payment stays held while we look into it. If the work wasn't delivered as agreed, you get a full refund."
            : "The payment stays held while we look into it. If you delivered what was agreed, you get paid."}
        </p>
      </div>
    </Sheet>
  );
}

const cancelReasons = ["Our plans changed", "We found another way to make it", "The creator asked to cancel", "Something else"];

function CancelSheet({ job, open, onClose, onActed }: SheetProps) {
  const toast = useToast();
  const { commission: c, creatorName, totals } = job;
  const [reason, setReason] = useState<string | null>(null);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Cancel this job?"
      description={`${creatorName} hasn't delivered yet, so you get a full refund of ${cash(totals.total)}, service fee included.`}
      width="md"
      footer={
        <Footer
          secondary={
            <PillButton variant="ghost" onClick={onClose}>
              Keep the job
            </PillButton>
          }
          primary={
            <PillButton
              variant="contrast"
              size="lg"
              disabled={!reason}
              onClick={() => {
                if (!reason) return;
                actions.cancelCommission(c.id, reason, "business");
                toast({ message: `Cancelled. ${cash(totals.total)} refunded to your card.` });
                onClose();
                onActed();
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
          {creatorName} may already have started. A quick message to say thanks goes a long way, and you can always work
          together again.
        </p>
      </div>
    </Sheet>
  );
}
