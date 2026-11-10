"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";

import { PillButton } from "@/components/ui/pill-button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { plural } from "@/lib/format";
import { omit } from "@/lib/omit";
import { paths } from "@/lib/paths";
import { commissionsForBusiness, isActive, isCampaign, requestsForBusiness } from "@/lib/selectors";
import { actions, useDemo } from "@/lib/store";
import type { Product } from "@/lib/types";

/**
 * Delete a product, with Undo. Blocked while creators work from its brief (a job in progress, an
 * open request, a running campaign or a draft): the sheet lists those instead.
 */
export function DeleteProductSheet({
  product,
  open,
  onClose,
  onDeleted,
}: {
  product: Product;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const s = useDemo();
  const toast = useToast();
  const activeWork = commissionsForBusiness(s).filter((c) => c.brief.productId === product.id && isActive(c));
  const liveRequests = requestsForBusiness(s).filter(
    (r) =>
      r.brief.productId === product.id &&
      (r.status === "open" || r.status === "draft" || (isCampaign(r) && r.status === "hired")),
  );
  const blocked = activeWork.length > 0 || liveRequests.length > 0;

  const remove = () => {
    const snapshot = product;
    onClose();
    onDeleted();
    actions.deleteProduct(snapshot.id);
    toast({
      message: `Deleted ${snapshot.name}`,
      action: { label: "Undo", onClick: () => actions.saveProduct(omit(snapshot, ["businessId", "updatedAt"])) },
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      side="center"
      width="sm"
      title={blocked ? "This product is still in use" : `Delete ${product.name}?`}
      footer={
        blocked ? (
          <div className="flex justify-end">
            <PillButton variant="contrast" onClick={onClose}>
              Got it
            </PillButton>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <PillButton variant="outline" onClick={onClose}>
              Keep it
            </PillButton>
            <PillButton variant="contrast" icon={<Trash2 size={16} aria-hidden />} onClick={remove}>
              Delete product
            </PillButton>
          </div>
        )
      }
    >
      {blocked ? (
        <div className="flex flex-col gap-4">
          <p className="y-small y-fg-2">
            Creators are working from this brief right now. You can delete it once these are finished or closed.
          </p>
          <ul className="flex flex-col gap-2">
            {activeWork.map((c) => (
              <li key={c.id}>
                <Link href={paths.job(c.id)} className="y-tile y-hoverable flex flex-col p-3">
                  <span className="y-small font-medium">{c.title}</span>
                  <span className="y-micro y-fg-2">Job in progress</span>
                </Link>
              </li>
            ))}
            {liveRequests.map((r) => (
              <li key={r.id}>
                <Link
                  href={r.status === "draft" && !isCampaign(r) ? paths.newOrder({ draft: r.id }) : paths.order(r.id)}
                  className="y-tile y-hoverable flex flex-col p-3"
                >
                  <span className="y-small font-medium">{r.title}</span>
                  <span className="y-micro y-fg-2">
                    {r.status === "draft" ? "Draft order" : isCampaign(r) ? "Running campaign" : "Open for pitches"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="y-small y-fg-2">
          This removes its brief context, {plural(product.assets.length, "file")} and{" "}
          {plural(product.learnings.length, "learning")}. Finished jobs keep their own copy of the brief.
        </p>
      )}
    </Sheet>
  );
}
