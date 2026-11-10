"use client";

import { Check, MailPlus, Plus, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { moneyRange, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { isCampaign, myPitchFor, pitchesForRequest, productById, requestsForBusiness } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { Creator } from "@/lib/types";

/**
 * Pick one of the account's open custom orders and invite this creator to pitch on it.
 * Campaigns are first come, first served, so nobody is invited to those.
 */
export function InviteToRequestSheet({
  creator,
  onClose,
}: {
  creator: Creator | null;
  onClose: () => void;
}) {
  const s = useDemo();
  const toast = useToast();
  const open = requestsForBusiness(s).filter((r) => r.status === "open" && !isCampaign(r));

  return (
    <Sheet
      open={creator !== null}
      onClose={onClose}
      title={creator ? `Invite ${creator.firstName} to a custom order` : "Invite to a custom order"}
      description={
        creator
          ? `${creator.firstName} gets a notification and can pitch with an angle, a price and samples.`
          : undefined
      }
      footer={
        <div className="flex justify-end">
          <PillButton
            href={paths.newOrder({ type: "custom", creator: creator?.id })}
            variant="outline"
            icon={<Plus size={16} aria-hidden />}
          >
            {creator ? `New custom order inviting ${creator.firstName}` : "Post a new custom order"}
          </PillButton>
        </div>
      }
    >
      {creator ? (
        open.length ? (
          <ul className="flex flex-col gap-2" aria-label="Your open custom orders">
            {open.map((request) => {
              const product = productById(s, request.brief.productId);
              const pitch = myPitchFor(s, request.id, creator.id);
              const invited = request.invitedCreatorIds.includes(creator.id);
              const count = pitchesForRequest(s, request.id).length;
              return (
                <li key={request.id} className="y-tile flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="y-small font-semibold">{request.title}</p>
                    <p className="y-micro y-fg-2">
                      {product?.name ?? "Product"} · {moneyRange(request.budget.min, request.budget.max)} ·{" "}
                      {plural(count, "pitch", "pitches")}
                    </p>
                  </div>
                  {pitch ? (
                    <Badge tone="neutral" icon={<Send size={14} aria-hidden className="y-flip" />} className="self-start sm:self-center">
                      Already pitched
                    </Badge>
                  ) : invited ? (
                    <Badge tone="success" icon={<Check size={14} aria-hidden />} className="self-start sm:self-center">
                      Invited
                    </Badge>
                  ) : (
                    <PillButton
                      variant="contrast"
                      size="sm"
                      icon={<MailPlus size={16} aria-hidden />}
                      className="self-start sm:self-center"
                      onClick={() => {
                        actions.inviteToRequest(request.id, creator.id);
                        toast({ message: `Invited ${creator.firstName} to pitch on “${request.title}”` });
                      }}
                    >
                      Invite
                    </PillButton>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="y-tile flex flex-col gap-2 p-4">
            <p className="y-small font-semibold">You have no open custom orders</p>
            <p className="y-small y-fg-2">
              Post one and invite {creator.firstName} from there, or send a direct offer from their
              profile.
            </p>
          </div>
        )
      ) : null}
    </Sheet>
  );
}
