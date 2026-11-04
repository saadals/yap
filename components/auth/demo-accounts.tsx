"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { plural } from "@/lib/format";
import { businessById, creatorById, memberById } from "@/lib/selectors";
import { ME, useDemo } from "@/lib/store";
import type { Role } from "@/lib/types";

/** "Explore the demo": the two seeded accounts, each one tap away. */
export function DemoAccounts({
  onPick,
  pending,
  preferred,
  id = "demo",
}: {
  onPick: (role: Role) => void;
  /** Role currently signing in (shows a spinner on that tile). */
  pending?: Role | null;
  preferred?: Role | null;
  id?: string;
}) {
  const s = useDemo();
  const business = businessById(s, ME.businessId);
  const member = memberById(s, ME.memberId);
  const creator = creatorById(s, ME.creatorId);

  const openRequests = s.requests.filter(
    (r) => r.businessId === ME.businessId && r.status === "open",
  ).length;
  const toReview = s.commissions.filter(
    (c) => c.businessId === ME.businessId && c.status === "delivered",
  ).length;
  const offers = s.commissions.filter(
    (c) => c.creatorId === ME.creatorId && c.status === "offered",
  ).length;
  const active = s.commissions.filter(
    (c) => c.creatorId === ME.creatorId && ["in_progress", "revision"].includes(c.status),
  ).length;

  const tiles: {
    role: Role;
    title: string;
    who: string;
    detail: string;
    avatar: React.ReactNode;
  }[] = [
    {
      role: "business",
      title: `${business?.name ?? "Daftar"} (business) — ${member?.name.split(" ")[0] ?? "Nour"}`,
      who: `${member?.name ?? "Nour Haddad"}, ${member?.title ?? "Growth lead"}`,
      detail: [
        openRequests ? plural(openRequests, "open request") : null,
        toReview ? `${plural(toReview, "delivery", "deliveries")} to review` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      avatar: (
        <span className="relative flex-none">
          <FaceAvatar id={ME.memberId} name="" size={56} />
          <span className="absolute -end-1 -bottom-1 rounded-[11px] ring-[3px] ring-(--b-bg)">
            <BusinessLogo
              business={business ?? { name: "Daftar", monogram: "D", brandColor: "#0F7A5C" }}
              size={26}
            />
          </span>
        </span>
      ),
    },
    {
      role: "creator",
      title: `${creator?.firstName ?? "Layla"} (creator)`,
      who: `@${creator?.handle ?? "laylatalks"} · presenter in Dubai`,
      detail: [
        offers ? `${plural(offers, "new offer")} waiting` : null,
        active ? `${plural(active, "commission")} in progress` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      avatar: <FaceAvatar id={ME.creatorId} name="" size={56} className="flex-none" />,
    },
  ];
  const ordered = preferred === "creator" ? [tiles[1], tiles[0]] : tiles;

  return (
    <Block
      tone="night"
      pad="md"
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex h-full scroll-mt-24 flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id={`${id}-title`} className="y-display y-title">
          Explore the demo
        </h2>
        <p className="y-small y-fg-2 max-w-[48ch]">
          Two ready-made accounts with real history: requests, pitches, deliveries and payouts.
          Nothing is real money, so try anything.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {ordered.map((tile) => {
          const busy = pending === tile.role;
          return (
            <li key={tile.role}>
              <button
                type="button"
                onClick={() => onPick(tile.role)}
                disabled={Boolean(pending)}
                aria-busy={busy || undefined}
                className="y-tile y-hoverable flex min-h-24 w-full items-center gap-4 p-4 text-start disabled:cursor-wait disabled:opacity-70"
              >
                {tile.avatar}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="y-head">{tile.title}</span>
                  <span className="y-small y-fg-2 truncate">{tile.who}</span>
                  {tile.detail ? <span className="y-micro y-fg-3">{tile.detail}</span> : null}
                </span>
                <span
                  aria-hidden
                  className="grid size-11 flex-none place-items-center rounded-full bg-(--b-fg) text-(--b-bg)"
                >
                  {busy ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <ArrowRight size={18} className="y-flip" />
                  )}
                </span>
                <span className="sr-only">
                  {busy ? "Signing in…" : `Sign in as ${tile.role === "business" ? "the business" : "the creator"}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Block>
  );
}
