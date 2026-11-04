import { Page } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while a product loads (ids created in this browser exist only after hydration). */
export function EditorSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-3 px-1 pt-2 pb-6" aria-busy="true" aria-label="Loading product">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-72 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid gap-2 lg:grid-cols-12" aria-hidden>
        <div className="flex flex-col gap-2 lg:col-span-7 xl:col-span-8">
          {[0, 1, 2].map((key) => (
            <div key={key} data-tone="paper" className="y-block y-pad-md flex flex-col gap-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-13 w-full" />
              <Skeleton className="h-13 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
        <div className="hidden lg:col-span-5 lg:block xl:col-span-4">
          <div data-tone="mist" className="y-block y-pad-md flex flex-col gap-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      </div>
    </Page>
  );
}
