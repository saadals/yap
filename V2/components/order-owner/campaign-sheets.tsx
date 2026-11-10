"use client";

import { AlertCircle, AlertTriangle, Ban, Check, Clock, Users } from "lucide-react";
import { useState } from "react";

import { paymentLabel } from "@/components/domain/money";
import { TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { clock, money, plural, priceLimitError } from "@/lib/format";
import { GUIDANCE_NOTE, priceGuidance, rangePosition } from "@/lib/pricing";
import {
  campaignMoney,
  campaignProgress,
  me,
  openComments,
  openSlotCount,
  platformList,
  productById,
} from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { CHANGE_NOTE_MIN_CHARS, PRICE_MAX_PER_YAPP, followerTiers, tierById } from "@/lib/taxonomy";
import type { Commission, Creator, FollowerTierId } from "@/lib/types";

import { ChoiceTile, GroupError, ListEditor } from "./parts";
import { perYapp, qualifyingCreators, raiseTopUp, type CampaignRequest } from "./shared";

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
/* Review copies: request changes, reject                                      */
/* -------------------------------------------------------------------------- */

/**
 * Request changes on a review copy: the open comments on it go along (ticked, untick any that
 * aren't changes), plus a note. The creator keeps the slot and uploads a new copy. Campaign slots
 * don't run out of rounds: past the included ones, rejecting hands the slot to someone else.
 */
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
  const latest = commission.deliveries[commission.deliveries.length - 1];
  const notes = latest ? openComments(latest) : [];
  const [unticked, setUnticked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const ticked = notes.filter((n) => !unticked.includes(n.id));
  const left = commission.revisionsIncluded - commission.revisionsUsed;
  const error =
    ticked.length || note.trim().length >= CHANGE_NOTE_MIN_CHARS
      ? null
      : ticked.length === 0 && notes.length
        ? "Tick a comment or say what to change in a sentence or two."
        : "Say what to change in a sentence or two.";
  const send = () => {
    if (error) {
      setTried(true);
      return;
    }
    const result = actions.requestRevision(commission.id, { commentIds: ticked.map((n) => n.id), note: note.trim() });
    if (!result.ok) {
      toast({ message: "This copy isn't waiting for review any more.", tone: "info" });
      onClose();
      return;
    }
    toast({ message: `Sent to ${creator.firstName}. The new copy comes back here for review.` });
    onClose();
  };
  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title={`Request changes from ${creator.firstName}`}
      description={`${creator.firstName} keeps slot ${commission.campaignSlot} and uploads a new review copy.`}
      footer={<Footer action="Send changes" onAction={send} cancel="Cancel" onCancel={onClose} />}
    >
      <div className="flex flex-col gap-5">
        {notes.length ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="y-label mb-2">Send these comments</legend>
            {notes.map((n) => (
              <ChoiceTile
                key={n.id}
                type="checkbox"
                checked={!unticked.includes(n.id)}
                onChange={() =>
                  setUnticked((list) => (list.includes(n.id) ? list.filter((id) => id !== n.id) : [...list, n.id]))
                }
                label={`Send the comment: ${n.text}`}
              >
                <span className="y-small">
                  <span className="y-micro y-num y-fg-2 me-1.5 font-semibold">{n.atSec === null ? "General" : clock(n.atSec)}</span>
                  {n.text}
                </span>
              </ChoiceTile>
            ))}
          </fieldset>
        ) : null}
        <TextArea
          label={notes.length ? "Anything else?" : `What should ${creator.firstName} change?`}
          required={!notes.length}
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
            This uses 1 of the {plural(left, "round")} of changes left on this slot.
          </p>
        ) : (
          <p className="y-small inline-flex items-start gap-2">
            <AlertTriangle size={16} aria-hidden className="mt-0.5 flex-none text-(--y-warning)" />
            You&apos;ve used the {plural(commission.revisionsIncluded, "included round")} of changes. You can still ask; if
            this copy still isn&apos;t right after that, rejecting it gives the slot to another creator.
          </p>
        )}
      </div>
    </Sheet>
  );
}

export function RejectSheet({
  commission,
  creator,
  request,
  onClose,
}: {
  commission: Commission;
  creator: Creator;
  request: CampaignRequest;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const slot = commission.campaignSlot;
  const closed = request.status === "closed";
  // A slot picked before a price raise reopens at the current price; the difference is held.
  const reprice = raiseTopUp(1, commission.price, request.campaign.pricePerVideo);
  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title={`Reject ${creator.firstName}'s video?`}
      description={
        closed
          ? `The campaign is closed, so the slot doesn't reopen: its ${money(commission.price)} goes back to your card in full.`
          : reprice
            ? `Slot ${slot} reopens for another creator straight away at ${perYapp(request.campaign.pricePerVideo)}. Its money stays held, and ${money(reprice)} more is held for the new price.`
            : `Slot ${slot} reopens for another creator straight away, and its money stays held in your campaign.`
      }
      footer={
        <Footer
          action="Reject video"
          onAction={() => {
            actions.rejectCampaignVideo(commission.id, reason.trim());
            toast({
              message: closed
                ? `Rejected. ${money(commission.price)} is on its way back to your card.`
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
          If a few changes would fix it, &ldquo;Request changes&rdquo; keeps {creator.firstName} on the slot. Once rejected,{" "}
          {creator.firstName} can&apos;t pick another slot on this campaign.
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
  request,
  onClose,
}: {
  commission: Commission;
  creator: Creator;
  request: CampaignRequest;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const slot = commission.campaignSlot;
  const closed = request.status === "closed";
  const reprice = raiseTopUp(1, commission.price, request.campaign.pricePerVideo);
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
            ? `The campaign is closed, so the slot doesn't reopen: its ${money(commission.price)} goes back to your card in full.`
            : reprice
              ? `The slot reopens for other creators automatically, first come, first served, at ${perYapp(request.campaign.pricePerVideo)}. Its ${money(commission.price)} stays held and ${money(reprice)} more is held for the new price.`
              : `The slot reopens for other creators automatically, first come, first served. Its ${money(commission.price)} stays held.`}{" "}
          {creator.firstName} can&apos;t pick a slot on this campaign again.
        </p>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Raise the price (unpicked slots only; never lower)                          */
/* -------------------------------------------------------------------------- */

/**
 * The price per Yapp can only go up after posting. The new price applies to unpicked slots (and
 * any slot that reopens); the difference for each is held on the campaign's card now. Taken slots
 * keep the price they were picked at. The guidance range is advice and never blocks.
 */
export function RaisePriceSheet({ request, onClose }: { request: CampaignRequest; onClose: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const terms = request.campaign;
  const open = openSlotCount(s, request);
  const card = useCardLabel(terms.paymentMethodId);
  const range = priceGuidance(productById(s, request.brief.productId)?.niche, terms.tierId);
  const [text, setText] = useState(() => String(Math.min(PRICE_MAX_PER_YAPP, Math.max(terms.pricePerVideo + 10, range.low))));
  const [tried, setTried] = useState(false);
  const price = Math.round(Number(text));
  const error =
    text.trim() === "" || !Number.isFinite(price)
      ? "Enter the new price per Yapp."
      : price <= terms.pricePerVideo
        ? `Prices can only go up. Enter more than ${money(terms.pricePerVideo)}.`
        : priceLimitError(price);
  const topUp = error ? 0 : raiseTopUp(open, terms.pricePerVideo, price);
  const below = !error && rangePosition(price, range) === "below";

  const confirm = () => {
    if (error) {
      setTried(true);
      return;
    }
    const result = actions.raiseCampaignPrice(request.id, price);
    toast(
      result.ok
        ? {
            message: result.topUp
              ? `Price raised to ${perYapp(price)}. ${money(result.topUp)} more is held.`
              : `Price raised to ${perYapp(price)}.`,
          }
        : { message: "That price can't be set.", tone: "info" },
    );
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title="Raise the price"
      description={`Now ${perYapp(terms.pricePerVideo)}. The price can go up for unpicked slots, never down.`}
      footer={
        <Footer
          action={topUp > 0 ? `Raise and hold ${money(topUp)} more` : "Raise the price"}
          onAction={confirm}
          cancel="Cancel"
          onCancel={onClose}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <TextField
          label="New price per Yapp ($)"
          required
          inputMode="numeric"
          className="max-w-xs"
          value={text}
          data-autofocus
          error={tried ? error : undefined}
          onChange={(event) => setText(event.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
        />
        <div className="flex flex-col gap-1.5 px-1" aria-live="polite">
          <p className="y-small">
            Usual at {tierById[terms.tierId].label}:{" "}
            <span className="y-num font-semibold">
              {money(range.low)}–{money(range.high)}
            </span>{" "}
            per Yapp
          </p>
          {below ? (
            <p className="y-small inline-flex items-center gap-1.5 font-medium text-(--y-warning)">
              <AlertCircle size={16} aria-hidden className="flex-none" />
              Still under the usual range. You can go ahead anyway.
            </p>
          ) : null}
          <p className="y-micro y-fg-2">{GUIDANCE_NOTE}</p>
        </div>
        {!error ? (
          <div className="y-tile flex flex-col gap-2 p-4" aria-live="polite">
            {open ? (
              <>
                <p className="y-small">
                  {plural(open, "unpicked slot")} × {money(price - terms.pricePerVideo)}
                </p>
                <p className="y-head y-num">
                  {money(topUp)} more held on {card}
                </p>
              </>
            ) : (
              <p className="y-small">Every slot is picked right now, so nothing more is held today. A slot that reopens uses the new price.</p>
            )}
            <p className="y-micro y-fg-2">Slots already picked keep their price and their creator.</p>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Change who can pick (tier, once; no money moves)                            */
/* -------------------------------------------------------------------------- */

export function ChangeTierSheet({ request, onClose }: { request: CampaignRequest; onClose: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const terms = request.campaign;
  const current = tierById[terms.tierId];
  const [tierId, setTierId] = useState<FollowerTierId | null>(null);
  const next = tierId ? tierById[tierId] : undefined;
  const niche = productById(s, request.brief.productId)?.niche;
  const range = next ? priceGuidance(niche, next.id) : undefined;
  const self = me.ids(s).creatorId;

  const confirm = () => {
    if (!tierId) return;
    const result = actions.changeCampaignTier(request.id, tierId);
    toast(
      result.ok
        ? { message: `Now open to creators with ${tierById[tierId].label} followers. The price stays ${perYapp(terms.pricePerVideo)}.` }
        : { message: "Who can pick can only be changed once.", tone: "info" },
    );
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title="Change who can pick"
      description={`Now creators with ${current.label} verified real followers on ${platformList(terms.platforms)}. You can change this once.`}
      footer={<Footer action={next ? `Open it to ${next.label}` : "Pick a tier"} onAction={confirm} cancel="Cancel" onCancel={onClose} disabled={!next} />}
    >
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="New follower tier" className="grid gap-2 sm:grid-cols-2">
          {followerTiers
            .filter((tier) => tier.id !== terms.tierId)
            .map((tier) => {
              const count = qualifyingCreators(s, terms, tier, self);
              return (
                <ChoiceTile
                  key={tier.id}
                  name="new-tier"
                  checked={tierId === tier.id}
                  onChange={() => setTierId(tier.id)}
                  label={`${tier.label} verified real followers, ${plural(count, "creator")} on Yapp`}
                >
                  <span className="y-head">{tier.label}</span>
                  <span className="y-micro y-fg-2 inline-flex items-center gap-1">
                    <Users size={13} aria-hidden />{" "}
                    {count === 0 ? "Nobody qualifies yet" : count === 1 ? "1 creator qualifies today" : `${count} creators qualify today`}
                  </span>
                </ChoiceTile>
              );
            })}
        </div>

        {next && range ? (
          <div className="y-tile flex flex-col gap-2 p-4" aria-live="polite">
            <p className="y-small">
              No money moves: every slot keeps {perYapp(terms.pricePerVideo)}, and what&apos;s held stays the same. Creators
              already on a slot keep it.
            </p>
            <p className="y-micro y-fg-2">
              Usual at {next.label}: {money(range.low)}–{money(range.high)} per Yapp.
              {rangePosition(terms.pricePerVideo, range) === "below" ? " Your price is under that; you can raise it from More." : ""}
            </p>
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
  // Unpicked slots come back in full: the price paid for each.
  const refund = campaignMoney(s, request).open;
  const inWork = progress.taken - progress.approved;
  return (
    <Sheet
      open
      onClose={onClose}
      side="center"
      width="sm"
      title="Close this campaign?"
      description="New creators can't pick a slot after this."
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
            ? `The ${plural(open, "unpicked slot")} ${open === 1 ? "is" : "are"} refunded in full: ${money(refund)} back to your card.`
            : "There are no unpicked slots to refund."}
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
      description="Approved videos keep what they were made against. The number of videos, the platforms, the usage and the upload deadline stay as posted."
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
