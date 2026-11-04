"use client";

import { Check, MailPlus, Plus, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { moneyRange, plural } from "@/lib/format";
import { myPitchFor, pitchesForRequest, productById, requestsForBusiness } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { Creator } from "@/lib/types";

/** Pick one of your open requests and invite this creator to pitch on it. */
export function InviteToRequestSheet({
  creator,
  onClose,
}: {
  creator: Creator | null;
  onClose: () => void;
}) {
  const s = useDemo();
  const toast = useToast();
  const open = requestsForBusiness(s).filter((r) => r.status === "open");

  return (
    <Sheet
      open={creator !== null}
      onClose={onClose}
      title={creator ? `Invite ${creator.firstName} to a request` : "Invite to a request"}
      description={
        creator
          ? `${creator.firstName} gets a notification and can pitch with an angle, a price and samples.`
          : undefined
      }
      footer={
        <div className="flex justify-end">
          <PillButton
            href={creator ? `/business/requests/new?creator=${creator.id}` : "/business/requests/new"}
            variant="outline"
            icon={<Plus size={16} aria-hidden />}
          >
            {creator ? `New request inviting ${creator.firstName}` : "Post a new request"}
          </PillButton>
        </div>
      }
    >
      {creator ? (
        open.length ? (
          <ul className="flex flex-col gap-2" aria-label="Your open requests">
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
                    <Badge tone="info" icon={<Send size={14} aria-hidden className="y-flip" />} className="self-start sm:self-center">
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
            <p className="y-small font-semibold">You have no open requests</p>
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
