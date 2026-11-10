"use client";

import { AlertCircle, Ban, Check } from "lucide-react";
import { useState } from "react";

import { paymentLabel } from "@/components/domain/money";
import { TextArea, TextField } from "@/components/ui/field";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { money, moneyExact, plural, priceLimitError } from "@/lib/format";
import { GUIDANCE_NOTE, priceGuidance } from "@/lib/pricing";
import { campaignProgress, openSlotCount, productById } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import { PRICE_MAX_PER_YAPP, followerTiers, tierById } from "@/lib/taxonomy";
import type { CampaignTerms, Commission, ContentRequest, Creator, FollowerTierId } from "@/lib/types";

import { ChoiceTile, GroupError, ListEditor } from "./parts";
import { CAMPAIGN_FEE_PCT, perYapp, slotNet } from "./shared";

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
            ? `The campaign is closed, so the slot doesn't reopen. Its ${money(commission.price)} is refunded to your card in full.`
            : "The slot reopens for other creators automatically, first come first served. You don't need to do anything else."}
        </p>
        <p className="y-small y-fg-2">
          {closed ? "" : `The ${money(commission.price)} for this slot stays held. `}
          {creator.firstName} can&apos;t pick a slot on this campaign again.
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
  const next = tierId ? tierById[tierId] : undefined;
  const niche = productById(s, request.brief.productId)?.niche;
  const range = next ? priceGuidance(niche, next.id) : undefined;

  const confirm = () => {
    if (!tierId) return;
    const result = actions.changeCampaignTier(request.id, tierId);
    toast(
      result.ok
        ? { message: `Tier changed to ${tierById[tierId].label}. The price stays ${perYapp(terms.pricePerVideo)}.` }
        : { message: "The tier can only be changed once.", tone: "info" },
    );
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      width="md"
      title="Change follower tier"
      description={`Now ${current.label}. The tier decides who can pick a slot. You can change it once.`}
      footer={
        <div className="flex gap-2">
          <PillButton variant="contrast" size="lg" className="flex-1" disabled={!next} onClick={confirm}>
            {next ? "Change tier" : "Pick a tier"}
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
                label={`${tier.label} verified real followers`}
              >
                <span className="y-head">{tier.label}</span>
                <span className="y-micro y-fg-2">verified real followers</span>
              </ChoiceTile>
            ))}
        </div>

        {next && range ? (
          <div className="y-tile flex flex-col gap-2 p-4" aria-live="polite">
            <p className="y-small">
              No money moves: every slot keeps {perYapp(terms.pricePerVideo)}, and what&apos;s held stays the same.
            </p>
            <p className="y-micro y-fg-2">
              Usual at {next.label}: {money(range.low)}–{money(range.high)} per Yapp. You can raise the price for open
              slots from More.
            </p>
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Raise the price (open slots only; never lower)                              */
/* -------------------------------------------------------------------------- */

export function RaisePriceSheet({ request, onClose }: { request: CampaignRequest; onClose: () => void }) {
  const s = useDemo();
  const toast = useToast();
  const terms = request.campaign;
  const open = openSlotCount(s, request);
  const card = useCardLabel(terms.paymentMethodId);
  const niche = productById(s, request.brief.productId)?.niche;
  const range = priceGuidance(niche, terms.tierId);
  const [text, setText] = useState(String(Math.max(terms.pricePerVideo + 5, range.low)));
  const [attempted, setAttempted] = useState(false);
  const price = Math.round(Number(text));
  const error =
    text.trim() === "" || !Number.isFinite(price)
      ? "Enter the new price per Yapp."
      : price <= terms.pricePerVideo
        ? `Prices can only go up. Enter more than ${money(terms.pricePerVideo)}.`
        : priceLimitError(price);
  const topUp = error ? 0 : (price - terms.pricePerVideo) * open;
  const below = !error && price < range.low;

  const confirm = () => {
    if (error) {
      setAttempted(true);
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
      description={`Now ${perYapp(terms.pricePerVideo)}. Prices can go up for open slots, never down.`}
      footer={
        <div className="flex gap-2">
          <PillButton variant="contrast" size="lg" className="flex-1" onClick={confirm}>
            {topUp > 0 ? `Hold ${money(topUp)} more and raise` : "Raise price"}
          </PillButton>
          <PillButton variant="ghost" size="lg" onClick={onClose}>
            Cancel
          </PillButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          label="New price per Yapp (USD)"
          required
          type="number"
          inputMode="numeric"
          min={terms.pricePerVideo + 1}
          max={PRICE_MAX_PER_YAPP}
          step={5}
          className="max-w-xs"
          value={text}
          error={attempted ? error : undefined}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="flex flex-col gap-2 px-1" aria-live="polite">
          <p className="y-small">
            Usual at {tierById[terms.tierId].label}:{" "}
            <span className="y-num font-semibold">
              {money(range.low)}–{money(range.high)}
            </span>{" "}
            per Yapp
          </p>
          {below ? (
            <p className="y-small inline-flex items-center gap-1.5 font-medium text-(--y-danger)">
              <AlertCircle size={16} aria-hidden className="flex-none" />
              Still below the usual range.
            </p>
          ) : null}
          <p className="y-micro y-fg-2">{GUIDANCE_NOTE}</p>
        </div>
        {!error ? (
          <div className="y-tile flex flex-col gap-2 p-4">
            <p className="y-head y-num">
              {open
                ? `${plural(open, "open slot")} × ${money(price - terms.pricePerVideo)}: hold ${money(topUp)} more on ${card}`
                : "No slots are open right now, so nothing more is held today"}
            </p>
            <p className="y-micro y-fg-2">
              Slots already taken keep their price. A slot that reopens later is paid at the new price. Each creator
              receives {moneyExact(slotNet(price))} after the {CAMPAIGN_FEE_PCT}% Yapp fee.
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
  const refund = open * request.campaign.pricePerVideo;
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
