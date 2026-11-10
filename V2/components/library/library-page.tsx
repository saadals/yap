"use client";

import { Clapperboard, Copy, Megaphone, Package, Search, ShieldCheck, Type, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { VideoThumb } from "@/components/domain/video-thumb";
import { Block } from "@/components/ui/block";
import { FilterChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader, SectionLabel } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { plural, shortDate } from "@/lib/format";
import { paths } from "@/lib/paths";
import { useDemo, useHydrated } from "@/lib/store";
import type { Product } from "@/lib/types";

import { type CopyItem, type LibraryItem, type VideoItem, findItem, libraryItems, usageLabel } from "./data";
import { VideoSheet, useCopyText } from "./video-sheet";

type Kind = "all" | "video" | "copy";

function VideoCard({ item, href, onOpen }: { item: VideoItem; href: string; onOpen: () => void }) {
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
 * Ad copy as a card: the first lines of the copy (it is the work, so it shows), what it was for,
 * and "Copy text" beside the link that opens it in full.
 */
function CopyCard({ item, href, onOpen }: { item: CopyItem; href: string; onOpen: () => void }) {
  const copyText = useCopyText();
  const preview = item.text || item.files.map((f) => f.name).join("\n");
  return (
    <li className="min-w-0">
      <Block tone="paper" pad="none" className="flex h-full flex-col overflow-hidden">
        <Link
          href={href}
          scroll={false}
          onClick={onOpen}
          className="group flex flex-1 flex-col gap-3 p-4 pb-3"
          aria-label={`${item.commission.title}, ad copy by ${item.creator?.name ?? "a creator"}, approved ${shortDate(item.approvedAt)}`}
        >
          <span
            aria-hidden
            className="y-tile block h-[132px] overflow-hidden transition-transform duration-(--y-dur-2) group-hover:-translate-y-0.5"
          >
            <span
              className="y-micro block h-full p-3 leading-[1.55] whitespace-pre-line text-(--y-ink-2)"
              style={{ maskImage: "linear-gradient(to bottom, black 62%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black 62%, transparent)" }}
            >
              {preview}
            </span>
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="y-small y-clamp-2 font-medium">{item.commission.title}</span>
            <span className="y-micro y-fg-2 truncate">
              {item.creator?.name ?? "Creator"} · {shortDate(item.approvedAt)}
            </span>
            <span className="y-micro y-fg-2 mt-0.5 flex min-w-0 items-center gap-1">
              <ShieldCheck size={12} aria-hidden className="flex-none" />
              <span className="truncate">{usageLabel(item)}</span>
            </span>
          </span>
        </Link>
        {item.text ? (
          <div className="flex border-t border-(--b-line) px-2 py-1.5">
            <PillButton
              variant="ghost"
              size="sm"
              icon={<Copy size={15} aria-hidden />}
              onClick={() => copyText(item.text)}
              aria-label={`Copy text of ${item.commission.title}`}
            >
              Copy text
            </PillButton>
          </div>
        ) : null}
      </Block>
    </li>
  );
}

const matchesWords = (item: LibraryItem, words: string[]) =>
  words.every((word) =>
    [
      item.commission.title,
      item.creator?.name,
      item.product?.name,
      item.kind === "video" ? item.video.title : `ad copy ${item.text}`,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(word),
  );

/**
 * /library: everything approved for the signed-in account's products, newest first. Videos as a
 * grid of vertical cards; ad copy (`delivery.kind === "text"`) as copy cards in their own section,
 * with a Videos / Copy switch once there is copy. Filter by product (`?product=`), search, and open
 * one (`?video=`, a delivery or video id, so other pages can deep-link) in a sheet with usage
 * rights, files and "Order more like this". Uses `useSearchParams`: render inside <Suspense>.
 */
export function LibraryPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  // True when this page opened the current item (so closing goes Back instead of piling history).
  const [pushed, setPushed] = useState(false);

  const header = (
    <PageHeader
      title="Library"
      description="Everything you approved, ready to use. Each order's usage rights are included, and every video comes with its raw footage."
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
  const filtered = items.filter((item) => (!product || item.product?.id === product.id) && matchesWords(item, words));
  const videos = filtered.filter((item): item is VideoItem => item.kind === "video");
  const copies = filtered.filter((item): item is CopyItem => item.kind === "copy");
  const hasBoth = items.some((i) => i.kind === "copy") && items.some((i) => i.kind === "video");
  const view: Kind = hasBoth ? kind : "all";
  const showVideos = view !== "copy" && videos.length > 0;
  const showCopy = view !== "video" && copies.length > 0;
  const shownCount = (view !== "copy" ? videos.length : 0) + (view !== "video" ? copies.length : 0);
  const open = findItem(items, params.get("video"));

  const hrefFor = (next: { product?: string; video?: string }) =>
    paths.library({ product: "product" in next ? next.product : product?.id, video: next.video });
  const close = () => {
    if (pushed) {
      setPushed(false);
      router.back();
    } else router.replace(hrefFor({ video: undefined }), { scroll: false });
  };
  const opened = () => setPushed(true);

  if (!items.length) {
    return (
      <Page>
        {header}
        <Block tone="paper" pad="md">
          <EmptyState
            icon={<Clapperboard size={22} aria-hidden />}
            title="What you approve lands here"
            body="When you approve a video or ad copy, the full-quality files and what you can do with them are saved here for good, ready to post or order again."
            action={
              <PillButton href={paths.newOrder()} variant="neon" arrow>
                Start an order
              </PillButton>
            }
          />
        </Block>
      </Page>
    );
  }

  const countLine =
    items[0].kind === "copy"
      ? `${plural(items.length, "piece", "pieces")} of ad copy`
      : plural(items.length, "approved video");

  return (
    <Page>
      {header}

      {hasBoth ? (
        <Tabs
          label="Show"
          value={view}
          onSelect={(id) => setKind(id)}
          items={[
            { id: "all" as const, label: "All", count: videos.length + copies.length },
            { id: "video" as const, label: "Videos", count: videos.length },
            { id: "copy" as const, label: "Copy", count: copies.length },
          ]}
          className="mb-4"
        />
      ) : null}

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
        ) : hasBoth ? (
          // The tabs above already carry the counts.
          <span />
        ) : (
          <p className="y-small y-fg-2">{countLine}</p>
        )}
        <label className="relative block w-full md:w-72">
          <span className="sr-only">Search the library</span>
          <Search size={17} aria-hidden className="y-fg-2 pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the library"
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
        {plural(shownCount, "item")} shown
      </p>

      {showVideos ? (
        <ul aria-label="Videos" className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:gap-x-4 lg:grid-cols-4 xl:grid-cols-5">
          {videos.map((item) => (
            <VideoCard key={item.id} item={item} href={hrefFor({ video: item.id })} onOpen={opened} />
          ))}
        </ul>
      ) : null}

      {showCopy ? (
        <section aria-labelledby="copy-title">
          {showVideos ? (
            <SectionLabel id="copy-title">
              <span className="inline-flex items-center gap-2">
                <Type size={17} aria-hidden /> Ad copy
              </span>
            </SectionLabel>
          ) : (
            <h2 id="copy-title" className="sr-only">
              Ad copy
            </h2>
          )}
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {copies.map((item) => (
              <CopyCard key={item.id} item={item} href={hrefFor({ video: item.id })} onOpen={opened} />
            ))}
          </ul>
        </section>
      ) : null}

      {!showVideos && !showCopy ? (
        <Block tone="paper" pad="md">
          <EmptyState
            icon={<Search size={22} aria-hidden />}
            title={
              query.trim()
                ? `Nothing matches “${query.trim()}”`
                : `Nothing approved for ${product?.name ?? "this product"} ${view === "copy" ? "in ad copy " : view === "video" ? "in videos " : ""}yet`
            }
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
                  setKind("all");
                  router.replace(hrefFor({ product: undefined }), { scroll: false });
                }}
              >
                Show everything
              </PillButton>
            }
          />
        </Block>
      ) : null}

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
