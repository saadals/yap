"use client";

import { AlertTriangle, Ban, Check, Clock } from "lucide-react";
import { useState } from "react";

import { paymentLabel } from "@/components/domain/money";
import { TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { money, plural } from "@/lib/format";
import { campaignProgress, openSlotCount, withCampaignFee } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { CAMPAIGN_FEE_RATE, followerTiers, tierById } from "@/lib/taxonomy";
import type { Commission, Creator, FollowerTierId } from "@/lib/types";

import { ChoiceTile, GroupError, ListEditor } from "./parts";
import { perVideo, type CampaignRequest } from "./shared";

function Footer({ action, onAction, cancel, onCancel, disabled }: {
  action: string;
  onAction: () => void;
  cancel: string;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <PillButton variant="contrast" size="lg" className="flex-1" disabled={disabled} onClick={onAction}>
        {action}
      </PillButton>
      <PillButton variant="ghost" size="lg" onClick={onCancel}>
        {cancel}
      </PillButton>
    </div>
  );
}

function useCardLabel(methodId: string) {
  const s = useDemo();
  const method = s.paymentMethods.find((m) => m.id === methodId);
  return method ? paymentLabel(method) : "your card";
}

/* -------------------------------------------------------------------------- */
/* Review copies: ask for changes, reject                                      */
/* -------------------------------------------------------------------------- */

export function ChangesSheet({
  commission,
  creator,
  onClose,
}: {
  commission: Commission;
  creator: Creator;
  onClose: () => void;
}) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const left = commission.revisionsIncluded - commission.revisionsUsed;
  const error = note.trim().length < 10 ? "Say what to change in a sentence or two." : null;
  const send = () => {
    if (error) {
      setTried(true);
      return;
    }
    actions.requestRevision(commission.id, note.trim());
    toast({ message: `Sent to ${creator.firstName}. The new copy comes back here for review.` });
    onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title={`Ask ${creator.firstName} for changes`}
      description={`${creator.firstName} keeps slot ${commission.campaignSlot} and uploads a new review copy.`}
      footer={<Footer action="Send changes" onAction={send} cancel="Cancel" onCancel={onClose} />}
    >
      <div className="flex flex-col gap-5">
        <TextArea
          label={`What should ${creator.firstName} change?`}
          required
          rows={4}
          value={note}
          data-autofocus
          error={tried ? error : null}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. Show the WhatsApp send in the first five seconds, and end on 'Send your first invoice free'."
        />
        {left > 0 ? (
          <p className="y-small inline-flex items-start gap-2">
            <Clock size={16} aria-hidden className="mt-0.5 flex-none" />
            This uses 1 of {plural(left, "change round")} left on this slot.
          </p>
        ) : (
          <p className="y-small inline-flex items-start gap-2">
            <AlertTriangle size={16} aria-hidden className="mt-0.5 flex-none text-(--y-warning)" />
            You&apos;ve used the {plural(commission.revisionsIncluded, "included change round")}. You can still ask; if this
            copy still isn&apos;t right after that, rejecting it gives the slot to another creator.
          </p>
        )}
      </div>
    </Sheet>
  );
}

export function RejectSheet({
  commission,
  creator,
  closed,
  onClose,
}: {
  commission: Commission;
  creator: Creator;
  closed: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const slot = commission.campaignSlot;
  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title={`Reject ${creator.firstName}'s video?`}
      description={
        closed
          ? "The campaign is closed, so the slot's money goes back to your card with its fee."
          : `Slot ${slot} reopens for another creator straight away, and its money stays held in your campaign.`
      }
      footer={
        <Footer
          action="Reject video"
          onAction={() => {
            actions.rejectCampaignVideo(commission.id, reason.trim());
            toast({
              message: closed
                ? `Rejected. ${money(withCampaignFee(commission.price).total)} is on its way back to your card.`
                : `Rejected. Slot ${slot} is open again.`,
            });
            onClose();
          }}
          cancel="Keep reviewing"
          onCancel={onClose}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <TextArea
          label={`Why isn't it right? (shared with ${creator.firstName})`}
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          hint="A kind, specific line helps them on their next campaign."
          placeholder="e.g. We needed the app on screen in the first five seconds."
        />
        <p className="y-small y-fg-2">
          If a few changes would fix it, &ldquo;Ask for changes&rdquo; keeps {creator.firstName} on the slot. Once rejected,{" "}
          {creator.firstName} can&apos;t take another slot on this campaign.
        </p>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Remove a creator before they upload                                         */
/* -------------------------------------------------------------------------- */

export function RemoveCreatorSheet({
  commission,
  creator,
  closed,
  onClose,
}: {
  commission: Commission;
  creator: Creator;
  closed: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const slot = commission.campaignSlot;
  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title={`Remove ${creator.firstName} from slot ${slot}?`}
      description="Only possible before they upload a review copy."
      footer={
        <Footer
          action="Remove creator"
          onAction={() => {
            actions.removeCampaignCreator(commission.id, reason.trim());
            toast({
              message: closed
                ? `${creator.firstName} removed. The slot's money is on its way back to your card.`
                : `${creator.firstName} removed. Slot ${slot} is open again.`,
            });
            onClose();
          }}
          cancel={`Keep ${creator.firstName}`}
          onCancel={onClose}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <TextArea
          label="Reason (for your records)"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Missed the upload deadline."
        />
        <p className="y-small y-fg-2">
          {closed
            ? `The campaign is closed, so the slot doesn't reopen: its ${money(commission.price)} goes back to your card with its fee.`
            : `The slot reopens for other creators automatically, first come, first served. Its ${money(commission.price)} stays held.`}{" "}
          {creator.firstName} can&apos;t take a slot on this campaign again.
        </p>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Change tier (once)                                                          */
/* -------------------------------------------------------------------------- */

export function ChangeTierSheet({ request, onClose }: { request: CampaignRequest; onClose: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const terms = request.campaign;
  const current = tierById[terms.tierId];
  const [tierId, setTierId] = useState<FollowerTierId | null>(null);
  const open = openSlotCount(s, request);
  const card = useCardLabel(terms.paymentMethodId);
  const next = tierId ? tierById[tierId] : undefined;
  // The card difference for the open slots, with their share of the service fee.
  const subtotal = next ? (next.pricePerVideo - terms.pricePerVideo) * open : 0;
  const diff = Math.sign(subtotal) * withCampaignFee(Math.abs(subtotal)).total;

  const label = !next
    ? "Pick a tier"
    : diff > 0
      ? `Change and hold ${money(diff)} more`
      : diff < 0
        ? `Change and refund ${money(-diff)}`
        : "Change tier";

  const confirm = () => {
    if (!tierId) return;
    const result = actions.changeCampaignTier(request.id, tierId);
    if (!result.ok) {
      toast({ message: "The tier can only be changed once.", tone: "info" });
      onClose();
      return;
    }
    toast({
      message:
        result.diff > 0
          ? `Tier changed. ${money(result.diff)} more is held.`
          : result.diff < 0
            ? `Tier changed. ${money(-result.diff)} is on its way back to your card.`
            : "Tier changed.",
    });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title="Change the follower tier"
      description={`Now ${current.label} at ${perVideo(terms.pricePerVideo)}. You can change it once.`}
      footer={<Footer action={label} onAction={confirm} cancel="Cancel" onCancel={onClose} disabled={!next} />}
    >
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="New follower tier" className="grid gap-2 sm:grid-cols-2">
          {followerTiers
            .filter((tier) => tier.id !== terms.tierId)
            .map((tier) => (
              <ChoiceTile
                key={tier.id}
                name="new-tier"
                checked={tierId === tier.id}
                onChange={() => setTierId(tier.id)}
                label={`${tier.label} followers, ${perVideo(tier.pricePerVideo)}${tier.placeholder ? ", price to be confirmed" : ""}`}
              >
                <span className="y-head">{tier.label}</span>
                <span className="y-small y-num y-fg-2">{perVideo(tier.pricePerVideo)}</span>
                {tier.placeholder ? <span className="y-micro y-fg-2">Price to be confirmed</span> : null}
              </ChoiceTile>
            ))}
        </div>

        {next ? (
          <div className="y-tile flex flex-col gap-2 p-4" aria-live="polite">
            {open ? (
              <>
                <p className="y-small">
                  New price for the {plural(open, "open slot")}: <span className="font-semibold">{perVideo(next.pricePerVideo)}</span>
                </p>
                <p className="y-head y-num">
                  {diff > 0 ? `${money(diff)} more held on ${card}` : diff < 0 ? `${money(-diff)} back to ${card}` : "No change to what's held"}
                </p>
                {diff !== 0 ? <p className="y-micro y-fg-2">Includes the {Math.round(CAMPAIGN_FEE_RATE * 100)}% service fee.</p> : null}
              </>
            ) : (
              <p className="y-small">No slots are open right now, so nothing changes today. A slot that reopens uses the new price.</p>
            )}
            <p className="y-micro y-fg-2">Slots already taken keep their price and their creator.</p>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Close the campaign                                                          */
/* -------------------------------------------------------------------------- */

export function CloseCampaignSheet({ request, onClose }: { request: CampaignRequest; onClose: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const open = openSlotCount(s, request);
  const progress = campaignProgress(s, request);
  // Untaken slots come back in full, with their share of the service fee.
  const refund = withCampaignFee(open * request.campaign.pricePerVideo).total;
  const inWork = progress.taken - progress.approved;
  return (
    <Sheet
      open
      onClose={onClose}
      side="center"
      width="sm"
      title="Close this campaign?"
      description="New creators can't take a slot after this."
      footer={
        <Footer
          action={refund ? `Close and refund ${money(refund)}` : "Close campaign"}
          onAction={() => {
            actions.closeCampaign(request.id);
            toast({ message: refund ? `Campaign closed. ${money(refund)} is on its way back to your card.` : "Campaign closed." });
            onClose();
          }}
          cancel="Keep it open"
          onCancel={onClose}
        />
      }
    >
      <ul className="flex flex-col gap-2">
        <li className="y-body flex gap-2">
          <Check size={18} aria-hidden className="mt-1 flex-none" />
          {open
            ? `The ${plural(open, "open slot")} ${open === 1 ? "is" : "are"} refunded with ${open === 1 ? "its" : "their"} fee: ${money(refund)} back to your card.`
            : "There are no open slots to refund."}
        </li>
        <li className="y-body flex gap-2">
          <Check size={18} aria-hidden className="mt-1 flex-none" />
          {inWork
            ? `${plural(inWork, "creator")} already filming carry on, and you still review their videos.`
            : "Approved videos and their posts aren't affected."}
        </li>
      </ul>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit what creators were told                                                */
/* -------------------------------------------------------------------------- */

export function EditCampaignSheet({ request, onClose }: { request: CampaignRequest; onClose: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(request.title);
  const [points, setPoints] = useState(request.brief.mustInclude);
  const [avoid, setAvoid] = useState(request.brief.avoid);
  const [tried, setTried] = useState(false);
  const titleError = title.trim().length < 4 ? "Give the campaign a short title creators will see." : undefined;
  const pointsError = points.some((x) => x.trim()) ? undefined : "Keep at least one talking point.";

  const save = () => {
    if (titleError || pointsError) {
      setTried(true);
      return;
    }
    actions.updateRequest(request.id, {
      title: title.trim(),
      brief: {
        ...request.brief,
        mustInclude: points.map((x) => x.trim()).filter(Boolean),
        avoid: avoid.map((x) => x.trim()).filter(Boolean),
      },
    });
    toast({ message: "Saved. Creators still filming see the new details." });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title="Edit what creators are told"
      description="Approved videos keep what they were made against. The tier, the number of videos and the upload deadline stay as posted."
      footer={<Footer action="Save changes" onAction={save} cancel="Cancel" onCancel={onClose} />}
    >
      <div className="flex flex-col gap-6">
        <TextField
          label="Title"
          required
          value={title}
          maxLength={80}
          error={tried ? titleError : undefined}
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="flex flex-col gap-3">
          <h3 className="y-label">Talking points</h3>
          <ListEditor
            label="Talking points"
            items={points}
            onChange={setPoints}
            placeholder="Add a talking point"
            marker={<Check size={16} strokeWidth={2.75} />}
            invalid={tried && Boolean(pointsError)}
          />
          <GroupError message={tried ? pointsError : undefined} />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="y-label">
            <span>Restrictions</span>
            <span className="y-micro y-fg-3 font-medium">Optional</span>
          </h3>
          <ListEditor
            label="Restrictions"
            items={avoid}
            onChange={setAvoid}
            placeholder="Add a restriction"
            marker={<Ban size={16} strokeWidth={2.5} />}
          />
        </div>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Save a learning to the product                                              */
/* -------------------------------------------------------------------------- */

export function LearningSheet({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [tried, setTried] = useState(false);
  const error = text.trim().length < 8 ? "Write a sentence the next creators should know." : undefined;
  const save = () => {
    if (error) {
      setTried(true);
      return;
    }
    actions.addLearning(productId, text.trim());
    toast({ message: `Saved to ${productName}. It carries into your next brief.` });
    onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title="Save a learning"
      description={`What worked, or what to avoid next time. It's added to ${productName}.`}
      footer={<Footer action="Save learning" onAction={save} cancel="Cancel" onCancel={onClose} />}
    >
      <TextArea
        label="Learning"
        required
        rows={4}
        placeholder="e.g. Videos that open on the WhatsApp message got approved fastest."
        value={text}
        error={tried ? error : undefined}
        onChange={(event) => setText(event.target.value)}
        data-autofocus
      />
    </Sheet>
  );
}
