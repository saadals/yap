export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`y-skel block ${className}`} />;
}

/** Skeleton shaped like a stacked job card. */
export function JobCardSkeleton() {
  return (
    <div data-tone="paper" className="y-block y-pad-md flex flex-col gap-4" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 !rounded-[14px]" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <Skeleton className="h-10 w-16" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-11 w-28" />
      </div>
    </div>
  );
}
