"use client";

import { ShieldCheck } from "lucide-react";

import { DetailRows } from "@/components/ui/data";
import { Note } from "@/components/ui/note";
import { money, moneyExact, moneyRange, plural } from "@/lib/format";
import { campaignPlatformById, FEE_PCT, nicheById, platformById, tierById } from "@/lib/taxonomy";

import { kindName, postedBudget, type Derived, type NewOrderForm } from "./model";

/** The live Summary beside the step (below it on phones). It reads the same values the step does. */
export function SummaryCard({ form, d }: { form: NewOrderForm; d: Derived }) {
  const campaign = form.kind === "campaign";
  const budget = postedBudget(form, d);
  const platforms = campaign
    ? form.campaignPlatforms.map((p) => campaignPlatformById[p].name).join(", ")
    : d.adCopy
      ? form.copyPlacements.map((p) => platformById[p].name).join(", ")
      : form.platforms.map((p) => platformById[p].name).join(", ");

  const rows: { label: React.ReactNode; value: React.ReactNode }[] = [
    { label: "Type", value: form.kind ? `${kindName(form.kind)}${d.adCopy ? " · ad copy" : ""}` : "—" },
    { label: "Category", value: form.category ? nicheById[form.category].name : "—" },
  ];
  if (d.productName) rows.push({ label: "Product", value: d.productName });
  if (campaign) rows.push({ label: "Follower tier", value: tierById[form.tierId].label });
  rows.push({ label: "Deadline", value: plural(form.deadlineDays, "day") });
  rows.push({ label: d.adCopy ? "Runs on" : "Platforms", value: platforms || "—" });

  return (
    <section className="y-nw-sum" data-tone="paper" aria-labelledby="nw-sum-title">
      <h2 id="nw-sum-title" className="y-nw-sum-h">
        Summary
      </h2>
      <div aria-live="polite">
        <p className="y-nw-sum-big y-num">
          {campaign ? money(d.campaign.total) : form.kind ? moneyRange(budget.min, budget.max) : "—"}
        </p>
        <p className="y-nw-sum-sub y-num">
          {campaign
            ? `${plural(form.videos, "Yapp")} × ${money(d.price)}`
            : form.kind
              ? "Budget · charged when you hire"
              : "Pick a type to see the total"}
        </p>
        {campaign ? (
          <p className="y-nw-sum-sub y-num">
            Each creator receives {moneyExact(d.campaign.perCreator)} after the {FEE_PCT}% Yapp fee
          </p>
        ) : null}
      </div>
      {form.kind ? (
        <Note icon={<ShieldCheck size={16} />} className="y-nw-sum-note">
          <b>Held safely by Yapp</b> ·{" "}
          {campaign
            ? "the full amount is held when you post, and each slot is paid out after you approve its video"
            : "held from when you hire, released only when you approve"}
        </Note>
      ) : null}
      <DetailRows rows={rows} className="y-nw-sum-rows" />
    </section>
  );
}
