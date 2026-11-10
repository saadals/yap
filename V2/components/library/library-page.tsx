"use client";

import { Megaphone, Package, Search, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { useDemo, useHydrated } from "@/lib/store";
import type { Product } from "@/lib/types";

import { type LibraryItem, findItem, libraryItems, usageLabel } from "./data";
import { VideoSheet } from "./video-sheet";

function VideoCard({ item, href, onOpen }: { item: LibraryItem; href: string; onOpen: () => void }) {
  const UsageIcon = item.campaign ? Megaphone : ShieldCheck;
  return (
    <li className="min-w-0">
      <Link
        href={href}
        scroll={false}
        onClick={onOpen}
        className="group flex flex-col gap-2.5 rounded-(--y-r-tile)"
        aria-label={`${item.commission.title}, by ${item.creator?.name ?? "a creator"}, approved ${shortDate(item.approvedAt)}`}
      >
        <VideoThumb
          video={item.video}
          frame="9:16"
          showViews={false}
          playable
          decorative
          className="transition-transform duration-(--y-dur-2) group-hover:-translate-y-0.5"
        />
        <span className="flex min-w-0 flex-col gap-0.5 px-0.5">
          <span className="y-small y-clamp-2 font-medium">{item.commission.title}</span>
          <span className="y-micro y-fg-2 truncate">
            {item.creator?.name ?? "Creator"} · {shortDate(item.approvedAt)}
          </span>
          <span className="y-micro y-fg-2 mt-0.5 flex min-w-0 items-center gap-1">
            <UsageIcon size={12} aria-hidden className="flex-none" />
            <span className="truncate">{usageLabel(item)}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * /library: every approved video for the signed-in account's products, newest first, as a grid
 * of vertical cards. Filter by product (`?product=`), search, and open one (`?video=`, a delivery
 * or video id, so other pages can deep-link) in a sheet with the player, usage rights, files and
 * "Order more like this". Uses `useSearchParams`: render inside <Suspense>.
 */
export function LibraryPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  // True when this page opened the current video (so closing goes Back instead of piling history).
  const [pushed, setPushed] = useState(false);

  const header = (
    <PageHeader
      title="Library"
      description="Every video you approved, ready to post. Organic use on your own accounts is always included."
      actions={
        <PillButton href={paths.products} variant="soft" icon={<Package size={17} aria-hidden />}>
          Your products
        </PillButton>
      }
    />
  );

  if (!hydrated) return <LibrarySkeleton header={header} />;

  const items = libraryItems(s);
  const productParam = params.get("product");
  const products = [...new Map(items.filter((i) => i.product).map((i) => [i.product!.id, i.product!])).values()];
  const product: Product | undefined = products.find((p) => p.id === productParam);
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = items.filter(
    (item) =>
      (!product || item.product?.id === product.id) &&
      words.every((word) =>
        [item.commission.title, item.creator?.name, item.product?.name, item.video.title]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(word),
      ),
  );
  const open = findItem(items, params.get("video"));

  const hrefFor = (next: { product?: string; video?: string }) =>
    paths.library({ product: "product" in next ? next.product : product?.id, video: next.video });
  const close = () => {
    if (pushed) {
      setPushed(false);
      router.back();
    } else router.replace(hrefFor({ video: undefined }), { scroll: false });
  };

  if (!items.length) {
    return (
      <Page>
        {header}
        <Block tone="paper" pad="md">
          <EmptyState
            shape="gem"
            tint="mint"
            face="smile"
            title="Your approved videos land here"
            body="When you approve a video, the full-quality file and what you can do with it are saved here for good, ready to post or order again."
            action={
              <PillButton href={paths.newOrder()} variant="contrast" arrow>
                Start an order
              </PillButton>
            }
          />
        </Block>
      </Page>
    );
  }

  return (
    <Page>
      {header}

      <div className="flex flex-col gap-3 pb-5 md:flex-row md:items-center md:justify-between">
        {products.length > 1 ? (
          <div role="group" aria-label="Filter by product" className="y-scroll-x -mx-(--y-gutter) flex gap-2 px-(--y-gutter) md:mx-0 md:px-0">
            <FilterChip
              pressed={!product}
              count={items.length}
              onClick={() => router.replace(hrefFor({ product: undefined }), { scroll: false })}
              className="flex-none"
            >
              All
            </FilterChip>
            {products.map((p) => (
              <FilterChip
                key={p.id}
                pressed={product?.id === p.id}
                count={items.filter((i) => i.product?.id === p.id).length}
                onClick={() => router.replace(hrefFor({ product: p.id }), { scroll: false })}
                className="flex-none"
              >
                {p.name}
              </FilterChip>
            ))}
          </div>
        ) : (
          <p className="y-small y-fg-2">{plural(items.length, "approved video")}</p>
        )}
        <label className="relative block w-full md:w-72">
          <span className="sr-only">Search videos</span>
          <Search size={17} aria-hidden className="y-fg-2 pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search videos"
            className="y-input !ps-10 !pe-10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="y-round absolute end-1 top-1/2 -translate-y-1/2"
              data-tone-btn="ghost"
              data-size="sm"
              aria-label="Clear search"
            >
              <X size={16} aria-hidden />
            </button>
          ) : null}
        </label>
      </div>

      <p className="sr-only" aria-live="polite">
        {plural(shown.length, "video")} shown
      </p>

      {shown.length ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:gap-x-4 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((item) => (
            <VideoCard key={item.id} item={item} href={hrefFor({ video: item.id })} onOpen={() => setPushed(true)} />
          ))}
        </ul>
      ) : (
        <Block tone="paper" pad="md">
          <EmptyState
            shape="bean"
            tint="sun"
            title={query.trim() ? `No videos match “${query.trim()}”` : `No approved videos for ${product?.name ?? "this product"} yet`}
            body={
              query.trim()
                ? "Try a creator's first name or a product."
                : "Approve a delivery and it shows up here with its files and usage rights."
            }
            action={
              <PillButton
                variant="contrast"
                onClick={() => {
                  setQuery("");
                  router.replace(hrefFor({ product: undefined }), { scroll: false });
                }}
              >
                Show every video
              </PillButton>
            }
          />
        </Block>
      )}

      {open ? <VideoSheet key={open.id} item={open} onClose={close} /> : null}
    </Page>
  );
}

function LibrarySkeleton({ header }: { header: React.ReactNode }) {
  return (
    <Page>
      {header}
      <div aria-busy="true" aria-label="Loading your library" className="flex flex-col gap-5">
        <div className="flex gap-2" aria-hidden>
          <Skeleton className="h-10 w-20 !rounded-full" />
          <Skeleton className="h-10 w-36 !rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[9/16] w-full !rounded-(--y-r-tile)" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}
