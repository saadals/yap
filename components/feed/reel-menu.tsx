"use client";

import { EyeOff, Flag, Link2, MoreHorizontal, Pencil, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PillButton } from "@/components/ui/pill-button";
import { RoundIconButton } from "@/components/ui/round-icon-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { paths } from "@/lib/paths";
import { absoluteUrl } from "@/lib/site";
import { actions } from "@/lib/store";

import type { CampaignItem, OrderItem } from "./feed-items";

const rowClass =
  "y-body flex min-h-12 w-full items-center gap-3 rounded-(--y-r-tile) px-3 text-start font-medium hover:bg-(--b-chip) focus-visible:bg-(--b-chip)";

/**
 * ⋯ on an order reel. Someone else's order: Not interested (hides it, with undo), Share, Report.
 * Your own order (shown after publishing): Edit, Close (confirmed first), Share.
 */
export function ReelMenu({ item }: { item: OrderItem | CampaignItem }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const { request, own } = item;
  const campaign = item.kind === "campaign";
  const canClose = own && request.status !== "closed";

  const close = () => {
    setOpen(false);
    setConfirming(false);
  };

  const share = () => {
    close();
    const url = absoluteUrl(paths.order(request.id));
    const copy = navigator.clipboard?.writeText(url);
    if (!copy) {
      toast({ message: "Couldn't copy the link from this browser", tone: "info" });
      return;
    }
    copy.then(
      () => toast({ message: "Link copied" }),
      () => toast({ message: "Couldn't copy the link from this browser", tone: "info" }),
    );
  };

  const hide = () => {
    close();
    actions.hideRequest(request.id);
    toast({
      message: "Hidden from your feed",
      action: { label: "Undo", onClick: () => actions.unhideRequest(request.id) },
    });
  };

  const report = () => {
    close();
    toast({ message: "Thanks, we'll take a look", tone: "info" });
  };

  const closeOrder = () => {
    close();
    if (campaign) actions.closeCampaign(request.id);
    else actions.closeRequest(request.id);
    toast({ message: campaign ? "Campaign closed. Open slots are refunded" : "Order closed" });
  };

  return (
    <>
      <RoundIconButton
        label={own ? "Manage your order" : "More options"}
        tone="soft"
        size="sm"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <MoreHorizontal size={20} aria-hidden />
      </RoundIconButton>

      <Sheet
        open={open}
        onClose={close}
        title={confirming ? (campaign ? "Close this campaign?" : "Close this order?") : request.title}
        description={
          confirming
            ? campaign
              ? "No one new can pick a slot and open slots are refunded to your card. Videos already in progress carry on."
              : "Creators can't pitch on it any more. You can reopen it from the order page."
            : undefined
        }
        side="center"
        width="sm"
        footer={
          confirming ? (
            <div className="flex flex-wrap justify-end gap-2">
              <PillButton variant="ghost" onClick={() => setConfirming(false)}>
                Keep it open
              </PillButton>
              <PillButton variant="contrast" onClick={closeOrder}>
                {campaign ? "Close campaign" : "Close order"}
              </PillButton>
            </div>
          ) : undefined
        }
      >
        {confirming ? null : (
          <ul className="flex flex-col gap-1">
            {own ? (
              <>
                <li>
                  <Link href={paths.order(request.id)} className={rowClass} onClick={close}>
                    <Pencil size={18} aria-hidden /> Edit
                  </Link>
                </li>
                {canClose ? (
                  <li>
                    <button type="button" className={rowClass} onClick={() => setConfirming(true)}>
                      <XCircle size={18} aria-hidden /> {campaign ? "Close campaign" : "Close order"}
                    </button>
                  </li>
                ) : null}
              </>
            ) : (
              <li>
                <button type="button" className={rowClass} onClick={hide}>
                  <EyeOff size={18} aria-hidden /> Not interested
                </button>
              </li>
            )}
            <li>
              <button type="button" className={rowClass} onClick={share}>
                <Link2 size={18} aria-hidden /> Share
              </button>
            </li>
            {own ? null : (
              <li>
                <button type="button" className={rowClass} onClick={report}>
                  <Flag size={18} aria-hidden /> Report
                </button>
              </li>
            )}
          </ul>
        )}
      </Sheet>
    </>
  );
}
