"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";
import { commissionById, creatorByHandle, me, videoById } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import type { Creator } from "@/lib/types";

import { Checkout } from "./checkout";

/**
 * /creators/[handle]/order: the direct order. `?package=` preselects a package, `?product=` a
 * product, `?again=` a previous commission with this creator (prefills everything), `?video=` the
 * video that inspired it (added as a reference). Gates: loading, unknown handle, own profile.
 */
export function DirectOrderPage() {
  return (
    <AppShell focus>
      <Suspense fallback={<CheckoutSkeleton />}>
        <Route />
      </Suspense>
    </AppShell>
  );
}

function Route() {
  const params = useParams<{ handle: string }>();
  const search = useSearchParams();
  const s = useDemo();
  const hydrated = useHydrated();
  const handle = decodeURIComponent(params.handle ?? "");
  const creator = creatorByHandle(s, handle);

  if (!hydrated) return <CheckoutSkeleton />;
  if (!creator) return <NotFound handle={handle} />;
  // No self-dealing: nobody orders from their own creator profile.
  if (me.creator(s)?.id === creator.id) return <OwnProfile creator={creator} />;

  const againId = search.get("again");
  const packageId = search.get("package");
  const productId = search.get("product");
  const videoId = search.get("video");
  const candidate = againId ? commissionById(s, againId) : undefined;
  const repeat =
    candidate && candidate.businessId === me.ids(s).businessId && candidate.creatorId === creator.id && candidate.source !== "campaign"
      ? candidate
      : null;
  const video = videoId ? videoById(s, videoId) : undefined;

  return (
    <Checkout
      key={`${s.activeAccountId}|${creator.id}|${repeat?.id ?? ""}|${packageId ?? ""}|${productId ?? ""}|${video?.id ?? ""}`}
      creator={creator}
      repeat={repeat}
      repeatMissing={Boolean(againId) && !repeat}
      packageId={packageId}
      productId={productId}
      video={video ?? null}
    />
  );
}

function NotFound({ handle }: { handle: string }) {
  return (
    <Page width="narrow">
      <Block tone="paper" pad="lg">
        <EmptyState
          title="We couldn't find that creator"
          body={`There's no creator at @${handle}. They may have changed their handle. Browse creators to find someone who fits.`}
          action={
            <PillButton href={paths.discover()} variant="contrast" arrow>
              Browse creators
            </PillButton>
          }
        />
      </Block>
    </Page>
  );
}

function OwnProfile({ creator }: { creator: Creator }) {
  return (
    <Page width="narrow">
      <Block tone="paper" pad="lg" className="flex flex-col items-center gap-5 text-center">
        <FaceAvatar id={creator.id} name="" size={72} />
        <div className="flex flex-col gap-2">
          <h1 className="y-display y-title">This is your own profile</h1>
          <p className="y-body y-fg-2 mx-auto max-w-[48ch]">
            You can&apos;t order from yourself. Keep your profile fresh in Studio so others can order from you.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <PillButton href={paths.studioProfile()} variant="neon" arrow>
            Edit your profile in Studio
          </PillButton>
          <PillButton href={paths.creator(creator.handle)} variant="ghost">
            Back to the profile
          </PillButton>
        </div>
      </Block>
    </Page>
  );
}

function CheckoutSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-3 pb-6" aria-busy="true" aria-label="Loading the order">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-3 lg:col-span-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="y-block y-pad-md flex flex-col gap-3" data-tone="paper">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-24 w-full !rounded-(--y-r-tile)" />
            </div>
          ))}
        </div>
        <div className="hidden lg:col-span-4 lg:block">
          <div className="y-block y-pad-md flex flex-col gap-3" data-tone="paper">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-32 w-full !rounded-(--y-r-tile)" />
          </div>
        </div>
      </div>
    </Page>
  );
}
