"use client";

import { Ban, Check } from "lucide-react";
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
import type { CampaignTerms, Commission, ContentRequest, Creator, FollowerTierId } from "@/lib/types";

import { ChoiceTile, GroupError, ListEditor } from "./parts";
import { perYapp } from "./shared";

export type CampaignRequest = ContentRequest & { campaign: CampaignTerms };

function useCardLabel(methodId: string) {
  const s = useDemo();
  const method = s.paymentMethods.find((m) => m.id === methodId);
  return method ? paymentLabel(method) : "your card";
}

/* -------------------------------------------------------------------------- */
/* Remove a creator from a slot                                                */
/* -------------------------------------------------------------------------- */

export function RemoveCreatorSheet({
  commission,
  creator,
  closed = false,
  onClose,
}: {
  commission: Commission;
  creator: Creator;
  /** On a closed campaign the slot can't reopen: its money is refunded instead. */
  closed?: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const slot = commission.campaignSlot;
  return (
    <Sheet
      open
      onClose={onClose}
      side="center"
      width="sm"
      title={`Remove ${creator.firstName} from slot ${slot}?`}
      description="Only possible before they upload a review copy."
      footer={
        <div className="flex gap-2">
          <PillButton
            variant="contrast"
            size="lg"
            className="flex-1"
            onClick={() => {
              actions.removeCampaignCreator(commission.id);
              toast({
                message: closed
                  ? `${creator.firstName} removed. The slot's money is on its way back to your card.`
                  : `${creator.firstName} removed. Slot ${slot} is open again.`,
              });
              onClose();
            }}
          >
            Remove creator
          </PillButton>
          <PillButton variant="ghost" size="lg" onClick={onClose} data-autofocus>
            Keep {creator.firstName}
          </PillButton>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="y-body">
          {closed
            ? `The campaign is closed, so the slot doesn't reopen. Its ${money(commission.price)} is refunded to your card with its fee.`
            : "The slot reopens for other creators automatically, first come first served. You don't need to do anything else."}
        </p>
        <p className="y-small y-fg-2">
          {closed ? "" : `The ${money(commission.price)} for this slot stays held with its fee. `}
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

  const confirmLabel = !next
    ? "Pick a tier"
    : diff > 0
      ? `Hold ${money(diff)} more and change`
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
      title="Change follower tier"
      description={`Now ${current.label} at ${perYapp(terms.pricePerVideo)}. You can change it once.`}
      footer={
        <div className="flex gap-2">
          <PillButton variant="contrast" size="lg" className="flex-1" disabled={!next} onClick={confirm}>
            {confirmLabel}
          </PillButton>
          <PillButton variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </PillButton>
        </div>
      }
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
                label={`${tier.label}, ${perYapp(tier.pricePerVideo)}${tier.placeholder ? ", price to be confirmed" : ""}`}
              >
                <span className="y-head">{tier.label}</span>
                <span className="y-small y-num">{perYapp(tier.pricePerVideo)}</span>
                {tier.placeholder ? <span className="y-chip mt-1 w-fit !bg-(--b-bg)">Price to be confirmed</span> : null}
              </ChoiceTile>
            ))}
        </div>

        {next ? (
          <div className="y-tile flex flex-col gap-2 p-4" aria-live="polite">
            {open ? (
              <>
                <p className="y-small">
                  New price for the {plural(open, "open slot")}:{" "}
                  <span className="font-semibold">{perYapp(next.pricePerVideo)}</span>
                </p>
                <p className="y-head y-num">
                  {diff > 0 ? `Hold ${money(diff)} more on ${card}` : diff < 0 ? `${money(-diff)} back to your card` : "No change to what's held"}
                </p>
                {diff !== 0 ? <p className="y-micro y-fg-2">Includes the {Math.round(CAMPAIGN_FEE_RATE * 100)}% service fee.</p> : null}
              </>
            ) : (
              <p className="y-small">
                No slots are open right now, so nothing changes today. A slot that reopens uses the new price.
              </p>
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
  // Unpicked slots come back in full, with their share of the service fee.
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
        <div className="flex gap-2">
          <PillButton
            variant="contrast"
            size="lg"
            className="flex-1"
            icon={<Ban size={18} aria-hidden />}
            onClick={() => {
              actions.closeCampaign(request.id);
              toast({
                message: refund ? `Campaign closed. ${money(refund)} is on its way back to your card.` : "Campaign closed.",
              });
              onClose();
            }}
          >
            Close campaign
          </PillButton>
          <PillButton variant="ghost" size="lg" onClick={onClose} data-autofocus>
            Keep it open
          </PillButton>
        </div>
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
/* Edit details                                                                */
/* -------------------------------------------------------------------------- */

export function EditCampaignSheet({ request, onClose }: { request: CampaignRequest; onClose: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(request.title);
  const [points, setPoints] = useState(request.brief.mustInclude);
  const [avoid, setAvoid] = useState(request.brief.avoid);
  const [attempted, setAttempted] = useState(false);
  const titleError = title.trim().length < 4 ? "Give the campaign a short title creators will see." : undefined;
  const pointsError = points.some((x) => x.trim()) ? undefined : "Keep at least one talking point.";

  const save = () => {
    if (titleError || pointsError) {
      setAttempted(true);
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
    toast({ message: "Saved. Creators see the new details." });
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title="Edit details"
      description="The tier, the number of videos and the upload deadline aren't edited here."
      footer={
        <div className="flex gap-2">
          <PillButton variant="contrast" size="lg" className="flex-1" onClick={save}>
            Save changes
          </PillButton>
          <PillButton variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </PillButton>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <TextField
          label="Title"
          required
          value={title}
          maxLength={80}
          error={attempted ? titleError : undefined}
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="flex flex-col gap-3">
          <h3 className="y-head">Talking points</h3>
          <ListEditor
            label="Talking points"
            items={points}
            onChange={setPoints}
            placeholder="Add a talking point"
            marker={<Check size={16} strokeWidth={2.75} />}
            invalid={attempted && Boolean(pointsError)}
          />
          <GroupError message={attempted ? pointsError : undefined} />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="y-head">
            Restrictions <span className="y-small y-fg-3 ms-1 font-medium">Optional</span>
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
  const [attempted, setAttempted] = useState(false);
  const error = text.trim().length < 8 ? "Write a sentence the next creators should know." : undefined;
  const save = () => {
    if (error) {
      setAttempted(true);
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
      footer={
        <div className="flex gap-2">
          <PillButton variant="contrast" size="lg" className="flex-1" onClick={save}>
            Save learning
          </PillButton>
          <PillButton variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </PillButton>
        </div>
      }
    >
      <TextArea
        label="Learning"
        required
        rows={4}
        placeholder="e.g. Videos that open on the WhatsApp message got approved fastest."
        value={text}
        error={attempted ? error : undefined}
        onChange={(event) => setText(event.target.value)}
        data-autofocus
      />
    </Sheet>
  );
}
