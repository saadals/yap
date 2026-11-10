"use client";

import { Search, ShieldCheck, Wallet } from "lucide-react";
import { useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { Block } from "@/components/ui/block";
import { Character } from "@/components/ui/character";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { AUTO_APPROVE_DAYS, SERVICE_FEE_RATE } from "@/lib/taxonomy";
import { useDemo } from "@/lib/store";

import { WorkList, WorkRow } from "@/components/find-work/work-row";
import { openSummary, sortItems, workItems } from "@/components/find-work/work-items";
import { paths } from "@/lib/paths";

const points = [
  {
    icon: Search,
    title: "Find work that fits",
    body: "Briefs and campaigns from tech brands, ranked by the languages and formats you make.",
  },
  {
    icon: Wallet,
    title: "You keep 100% of your price",
    body: `The brand pays Yapp's ${Math.round(SERVICE_FEE_RATE * 100)}% fee on top. Nothing comes out of your pay.`,
  },
  {
    icon: ShieldCheck,
    title: "Paid when the brand approves",
    body: `The money is held before you start. It's yours when they approve, or ${AUTO_APPROVE_DAYS} days after you deliver if they don't reply.`,
  },
];

/**
 * Studio without a creator profile: the case for making videos on Yapp in three points, how much
 * is open right now, and the setup (green). Once the profile exists, Studio Today takes over.
 */
export function StudioWelcome() {
  const s = useDemo();
  const [setupOpen, setSetupOpen] = useState(false);
  const items = workItems(s).filter((i) => !i.hidden);
  const preview = sortItems(items, "newest").slice(0, 3);

  return (
    <Page>
      <Block tone="paper" pad="lg" className="flex flex-col gap-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-[56ch] flex-col gap-2">
            <p className="y-eyebrow y-fg-2">Studio</p>
            <h1 className="y-display y-t-display">Make videos for tech brands, from this account</h1>
            <p className="y-body y-fg-2">
              Set up a creator profile and you can pitch on briefs and take campaign slots. Same login; switch
              back to ordering any time.
            </p>
          </div>
          <Character shape="dome" tint="violet" face="smile" look={-1} className="hidden h-28 w-auto flex-none md:block" />
        </div>

        <ul className="grid gap-5 md:grid-cols-3">
          {points.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3 md:flex-col">
              <span className="grid size-10 flex-none place-items-center rounded-full bg-(--y-mist)" aria-hidden>
                <Icon size={18} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="y-head">{title}</span>
                <span className="y-small y-fg-2">{body}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-4 border-t border-(--b-line) pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="y-body">
            <span className="font-semibold">{openSummary(items)}</span> are open right now.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <PillButton href={paths.findWork()} variant="ghost">
              Look around first
            </PillButton>
            <PillButton variant="neon" arrow className="justify-between ps-5" onClick={() => setSetupOpen(true)}>
              Set up your creator profile
            </PillButton>
          </div>
        </div>
      </Block>

      {preview.length ? (
        <section aria-labelledby="open-h" className="flex flex-col gap-3 pt-8">
          <h2 id="open-h" className="y-head">
            Open right now
          </h2>
          <WorkList label="Open right now">
            {preview.map((item) => (
              <WorkRow key={item.id} item={item} compact />
            ))}
          </WorkList>
        </section>
      ) : null}

      <CreatorSetupSheet
        open={setupOpen}
        reason="to make videos in Studio"
        onClose={() => setSetupOpen(false)}
        onDone={() => setSetupOpen(false)}
      />
    </Page>
  );
}
