import { Skeleton } from "@/components/ui/skeleton";

/** Card-shaped placeholder that matches <CreatorCard>. */
export function CreatorCardSkeleton() {
  return (
    <div data-tone="paper" className="y-block flex flex-col overflow-hidden" aria-hidden>
      <div className="p-2 pb-0">
        <Skeleton className="aspect-[4/5] w-full !rounded-(--y-r-tile)" />
      </div>
      <div className="flex flex-col gap-3 p-4 pt-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 !rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex items-end justify-between border-t border-(--b-line) pt-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

export function CreatorGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <CreatorCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Whole browse page placeholder (Suspense fallback). */
export function BrowseSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading creators">
      <div data-tone="paper" className="y-block y-pad-lg flex flex-col gap-4" aria-hidden>
        <Skeleton className="h-10 w-3/4 max-w-xl" />
        <Skeleton className="h-4 w-1/2 max-w-md" />
        <Skeleton className="h-14 w-full max-w-3xl !rounded-full" />
      </div>
      <div data-tone="paper" className="y-block y-pad-sm flex gap-4" aria-hidden>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex w-20 flex-none flex-col items-center gap-2 py-2">
            <Skeleton className="size-6 !rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="pt-4">
        <CreatorGridSkeleton />
      </div>
    </div>
  );
}

/** Profile placeholder while hydrating. */
export function ProfileSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-12" aria-busy="true" aria-label="Loading profile">
      <div className="flex flex-col gap-2 lg:col-span-8">
        <div data-tone="paper" className="y-block y-pad-lg flex flex-col gap-4 md:flex-row" aria-hidden>
          <Skeleton className="size-28 flex-none !rounded-full" />
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        </div>
        <div data-tone="paper" className="y-block y-pad-md grid grid-cols-2 gap-4 md:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div data-tone="paper" className="y-block y-pad-md" aria-hidden>
          <Skeleton className="aspect-[16/9] w-full !rounded-(--y-r-tile)" />
        </div>
      </div>
      <div className="hidden lg:col-span-4 lg:block" aria-hidden>
        <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-14 w-full !rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Checkout placeholder while hydrating. */
export function CheckoutSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-12" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-2 lg:col-span-8">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} data-tone="paper" className="y-block y-pad-md flex flex-col gap-4" aria-hidden>
            <Skeleton className="h-6 w-48" />
            <div className="grid gap-2 md:grid-cols-3">
              <Skeleton className="h-36 w-full !rounded-(--y-r-tile)" />
              <Skeleton className="h-36 w-full !rounded-(--y-r-tile)" />
              <Skeleton className="h-36 w-full !rounded-(--y-r-tile)" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden lg:col-span-4 lg:block" aria-hidden>
        <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-14 w-full !rounded-full" />
        </div>
      </div>
    </div>
  );
}
