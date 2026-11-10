"use client";

import { MessagesSquare, Megaphone, RotateCcw, ShieldCheck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FaceAvatar } from "@/components/ui/face-avatar";
import { Page } from "@/components/ui/page";
import { money, plural } from "@/lib/format";
import { paths } from "@/lib/paths";
import { isAdCopy, me, startingPrice } from "@/lib/selectors";
import { useDemo } from "@/lib/store";
import {
  CAMPAIGN_MAX_VIDEOS,
  CAMPAIGN_MIN_VIDEOS,
  ORDER_DEADLINE_OPTIONS,
  ORDER_OPEN_DAYS,
  campaignPlatforms,
  followerTiers,
  orderKinds,
} from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

import { FlowActions, FlowBar } from "./flow-frame";
import { responseLabel } from "./helpers";
import { Disclosure } from "./parts";
import { median } from "./pitches-model";

type Way = "creator" | "custom" | "campaign";

type Option = {
  id: Way;
  title: string;
  body: string;
  meta: string;
  icon: React.ReactNode;
  href: string;
  cta: string;
};

/**
 * /orders/new without a type: "How do you want to work?" Three ways, in plain words, each with a
 * real number from the seed; a comparison behind a disclosure; one line on money. `?product=`,
 * `?creator=` and `?again=` (an earlier commission) carry through to whichever way is picked.
 */
export function Chooser({ params }: { params: URLSearchParams }) {
  const s = useDemo();
  const router = useRouter();
  const ids = me.ids(s);
  const others = s.creators.filter((c) => c.id !== ids.creatorId && c.packages.length);
  const productParam = params.get("product") ?? undefined;
  const product = s.products.find((p) => p.id === productParam && p.businessId === ids.businessId);

  // Ordering again from a finished job, or arriving from a creator's profile (never yourself).
  const againParam = params.get("again");
  const again = s.commissions.find((c) => c.id === againParam && c.businessId === ids.businessId);
  const creatorParam = params.get("creator");
  const named: Creator | undefined =
    s.creators.find((c) => (c.handle === creatorParam || c.id === creatorParam) && c.id !== ids.creatorId) ??
    (again && again.creatorId !== ids.creatorId ? s.creators.find((c) => c.id === again.creatorId) : undefined);
  const productId = product?.id ?? again?.brief.productId;

  const cheapest = Math.min(...others.map(startingPrice));
  // Creators who could pick a campaign slot today: a verified account inside a follower tier.
  const minFollowers = Math.min(...followerTiers.map((t) => t.min));
  const canPick = others.filter((c) =>
    (c.socials ?? []).some((a) => a.verified && campaignPlatforms.some((p) => p.id === a.platform) && a.followers >= minFollowers),
  ).length;
  const shortest = ORDER_DEADLINE_OPTIONS[0];
  const longest = ORDER_DEADLINE_OPTIONS[ORDER_DEADLINE_OPTIONS.length - 1];
  const replyHours = Math.max(1, Math.round(median(others.map((c) => c.responseHours))));
  const days = others.flatMap((c) => c.packages.map((p) => p.deliveryDays));
  const fastest = Math.min(...days);
  const slowest = Math.max(...days);
  // Packages are for videos: ad copy is ordered again as a custom order, with the writer invited.
  const againAdCopy = again ? isAdCopy(again) : false;
  const repeatOfNamed = again && named && !againAdCopy && again.creatorId === named.id ? again.id : undefined;

  const options: Option[] = [
    named
      ? {
          id: "creator",
          title: repeatOfNamed ? `Order from ${named.firstName} again` : `Order from ${named.firstName}`,
          body: `Pick one of ${named.firstName}'s packages and send the brief. It starts when ${named.firstName} accepts.`,
          meta: `From ${money(startingPrice(named))} · usually replies ${responseLabel(named.responseHours)}`,
          icon: <FaceAvatar id={named.id} name="" size={28} />,
          href: paths.orderCreator(named.handle, { product: productId, again: repeatOfNamed }),
          cta: repeatOfNamed ? `Order from ${named.firstName} again` : `Order from ${named.firstName}`,
        }
      : {
          id: "creator",
          title: "Pick a creator",
          body: "Browse portfolios and order from one creator at their package price. It starts when they accept.",
          meta: `Packages from ${money(cheapest)} · ${plural(others.length, "creator")} to choose from`,
          icon: <UserRound size={20} aria-hidden />,
          href: paths.discover(),
          cta: "Browse creators",
        },
    {
      id: "custom",
      title: orderKinds.custom.name,
      body: "Describe the video or the ad copy you need. Creators pitch an idea and a price, and you pick one.",
      meta: `${plural(others.length, "creator")} could pitch · you set the budget and the deadline`,
      icon: <MessagesSquare size={20} aria-hidden />,
      href: paths.newOrder({ type: "custom", product: productId, creator: named?.handle, again: again?.id }),
      cta: "Write the brief",
    },
    {
      id: "campaign",
      title: orderKinds.campaign.name,
      body: `${CAMPAIGN_MIN_VIDEOS} or more creators each make a video and post it on their own account, at a price per Yapp you set. First come, first served.`,
      meta: `${plural(canPick, "creator")} with verified accounts can pick · ${CAMPAIGN_MIN_VIDEOS} to ${CAMPAIGN_MAX_VIDEOS} Yapps`,
      icon: <Megaphone size={20} aria-hidden />,
      href: paths.newOrder({ type: "campaign", product: productId }),
      cta: "Set up the campaign",
    },
  ];

  const [choice, setChoice] = useState<Way | null>(againAdCopy ? "custom" : named ? "creator" : null);
  const [tried, setTried] = useState(false);
  const chosen = options.find((o) => o.id === choice);

  const compare: { label: string; values: [string, string, string] }[] = [
    {
      label: "Who makes it",
      values: [named ? named.name : "The creator you choose", "The creator you hire from the pitches", `${CAMPAIGN_MIN_VIDEOS} to ${CAMPAIGN_MAX_VIDEOS} creators, one video each`],
    },
    {
      label: "Who posts it",
      values: ["You, on your accounts and ads", "You, on your accounts and ads", "Each creator, on their own account, tagging yours"],
    },
    {
      label: "How the price is set",
      values: ["The creator's package price", "Creators pitch a price within your budget", "You set one price per Yapp"],
    },
    {
      label: "How fast",
      values: [
        `Starts when they accept; ${fastest}–${slowest} days to deliver`,
        `Pitches usually within ${plural(replyHours, "hour")}; you give ${shortest}–${longest} days to deliver`,
        `Creators upload within the ${shortest}–${longest} days you set; open for ${ORDER_OPEN_DAYS} days`,
      ],
    },
    {
      label: "Best for",
      values: ["You know whose style you want", "You want ideas and a choice", "Reach and social proof from many voices"],
    },
  ];

  return (
    <>
      <Page width="narrow">
        <div className="flex flex-col gap-4 pb-6">
          <Link
            href={paths.orders()}
            className="y-round flex-none"
            data-tone-btn="soft"
            data-size="sm"
            aria-label="Close"
            title="Close"
          >
            <X size={18} aria-hidden />
          </Link>
          <div className="flex flex-col gap-1.5">
            <h1 className="y-display y-t-display">How do you want to work?</h1>
            <p className="y-body y-fg-2">
              {again ? (
                <span className="inline-flex items-center gap-1.5">
                  <RotateCcw size={15} aria-hidden /> More like “{again.title}”. The brief comes with you.
                </span>
              ) : product ? (
                `For ${product.name}. Its audience, tone and learnings come with you.`
              ) : (
                "Three ways to get videos or ad copy made. Pick the one that fits."
              )}
            </p>
          </div>
        </div>

        {tried && !chosen ? (
          <p className="y-small mb-3 font-medium text-(--y-danger) md:hidden" role="status">
            Pick one to continue.
          </p>
        ) : null}
        <div role="radiogroup" aria-label="How you want to work" className="flex flex-col gap-3">
          {options.map((option) => {
            const checked = choice === option.id;
            return (
              <label
                key={option.id}
                className={`y-block y-hoverable relative flex cursor-pointer items-start gap-4 p-5 md:p-6 ${
                  checked ? "shadow-[inset_0_0_0_2px_var(--y-ink),var(--y-shadow-card)]" : ""
                }`}
                data-tone="paper"
              >
                <span className="y-round flex-none" data-tone-btn={checked ? "contrast" : "soft"} aria-hidden>
                  {option.icon}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="y-title">{option.title}</span>
                  <span className="y-body y-fg-2">{option.body}</span>
                  <span className="y-small mt-2 font-medium">{option.meta}</span>
                </span>
                <input
                  type="radio"
                  name="order-way"
                  className="y-check mt-1 !rounded-full"
                  checked={checked}
                  onChange={() => {
                    setChoice(option.id);
                    setTried(false);
                  }}
                  aria-label={`${option.title}. ${option.body}`}
                />
              </label>
            );
          })}
        </div>

        <div className="mt-3">
          <Disclosure title="Compare the three" summary="Who makes it, who posts it, price, speed, best for">
            <table className="hidden w-full border-collapse text-start md:table">
              <thead>
                <tr>
                  <th className="w-[22%]" />
                  {options.map((o) => (
                    <th key={o.id} scope="col" className="y-small px-2 pb-2 text-start align-bottom font-semibold">
                      {o.id === "creator" ? (named ? `Order from ${named.firstName}` : "Pick a creator") : o.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compare.map((row) => (
                  <tr key={row.label} className="border-t border-(--b-line)">
                    <th scope="row" className="y-small y-fg-2 py-3 pe-2 text-start align-top font-normal">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td key={index} className="y-small px-2 py-3 align-top">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-col gap-5 md:hidden">
              {compare.map((row) => (
                <div key={row.label} className="flex flex-col gap-1.5">
                  <h3 className="y-small font-semibold">{row.label}</h3>
                  <dl className="flex flex-col gap-1">
                    {row.values.map((value, index) => (
                      <div key={index} className="grid grid-cols-[7.5rem_1fr] gap-2">
                        <dt className="y-micro y-fg-2 pt-0.5">
                          {index === 0 ? (named ? `From ${named.firstName}` : "Pick a creator") : index === 1 ? orderKinds.custom.name : orderKinds.campaign.name}
                        </dt>
                        <dd className="y-small">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </Disclosure>
        </div>

        <p className="y-small y-fg-2 mt-5 mb-8 flex items-start gap-2 px-1">
          <ShieldCheck size={16} aria-hidden className="mt-0.5 flex-none" />
          You pay the listed price. Payment is held until you approve.
        </p>
      </Page>

      <FlowBar width="narrow">
        <FlowActions
          hint={tried && !chosen ? "Pick one to continue" : chosen ? chosen.title : null}
          continueLabel={chosen ? chosen.cta : "Continue"}
          blocked={!chosen}
          onContinue={() => {
            if (!chosen) {
              setTried(true);
              return;
            }
            router.push(chosen.href);
          }}
        />
      </FlowBar>
    </>
  );
}
