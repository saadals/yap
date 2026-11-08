"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";

import { BusinessLogo } from "@/components/domain/business-logo";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { plural } from "@/lib/format";
import { businessById, creatorById } from "@/lib/selectors";
import { useDemo, type DemoState } from "@/lib/store";
import type { Account } from "@/lib/types";

import type { DemoAccountId } from "./auth-bits";

/** One line of what's waiting for this account, counted from the store. */
function waiting(s: DemoState, account: Account): string {
  const ordering = [
    s.requests.filter((r) => r.businessId === account.businessId && r.status === "open").length,
    s.commissions.filter((c) => c.businessId === account.businessId && c.status === "delivered").length,
  ];
  const making = account.creatorId
    ? [
        s.commissions.filter((c) => c.creatorId === account.creatorId && c.status === "offered").length,
        s.commissions.filter(
          (c) => c.creatorId === account.creatorId && (c.status === "in_progress" || c.status === "revision"),
        ).length,
      ]
    : [0, 0];
  // Lead with the side this account mostly uses: ordering for business accounts, making otherwise.
  const parts =
    account.kind === "business"
      ? [
          ordering[0] ? plural(ordering[0], "open order") : null,
          ordering[1] ? `${plural(ordering[1], "delivery", "deliveries")} to review` : null,
        ]
      : [
          making[0] ? `${plural(making[0], "offer")} waiting` : null,
          making[1] ? `${plural(making[1], "video")} in progress` : null,
        ];
  return parts.filter(Boolean).join(" · ");
}

/** "Explore the demo": the two seeded accounts, each one tap away. */
export function DemoAccounts({
  onPick,
  pending,
  id = "demo",
}: {
  onPick: (accountId: DemoAccountId) => void;
  /** Account currently signing in (shows a spinner on that tile). */
  pending?: DemoAccountId | null;
  id?: string;
}) {
  const s = useDemo();

  const tiles = (["nour", "layla"] as const).flatMap((accountId) => {
    const account = s.accounts.find((a) => a.id === accountId);
    if (!account) return [];
    const business = businessById(s, account.businessId);
    const creator = account.creatorId ? creatorById(s, account.creatorId) : undefined;
    const isBusiness = account.kind === "business";
    return [
      {
        id: accountId,
        name: account.firstName,
        title: isBusiness
          ? `Business account · ${business?.name ?? "Daftar"}`
          : creator
            ? `Personal account · makes videos as @${creator.handle}`
            : "Personal account",
        detail: waiting(s, account),
        avatar: (
          <span className="relative flex-none">
            <FaceAvatar id={account.creatorId ?? account.memberId ?? account.id} name="" size={56} />
            {isBusiness && business ? (
              <span className="absolute -end-1 -bottom-1 rounded-[11px] ring-[3px] ring-(--b-bg)">
                <BusinessLogo business={business} size={26} />
              </span>
            ) : null}
          </span>
        ),
      },
    ];
  });

  return (
    <Block
      tone="night"
      pad="md"
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex h-full scroll-mt-24 flex-col gap-5 lg:justify-center"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id={`${id}-title`} className="y-display y-title">
          Explore the demo
        </h2>
        <p className="y-small y-fg-2 max-w-[48ch]">
          Two ready-made accounts with real history. Both can order videos and make them. Nothing is
          real money, so try anything.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {tiles.map((tile) => {
          const busy = pending === tile.id;
          return (
            <li key={tile.id}>
              <button
                type="button"
                onClick={() => onPick(tile.id)}
                disabled={Boolean(pending)}
                aria-busy={busy || undefined}
                className="y-tile y-hoverable flex min-h-24 w-full items-center gap-4 p-4 text-start disabled:cursor-wait disabled:opacity-70"
              >
                {tile.avatar}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="y-head">{tile.name}</span>
                  <span className="y-small y-fg-2">{tile.title}</span>
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
                <span className="sr-only">{busy ? "Signing in…" : `Sign in as ${tile.name}`}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Block>
  );
}
