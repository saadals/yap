import { Block } from "@/components/ui/block";
import { Page } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while search params resolve (auth and onboarding pages). */
export function AuthSkeleton({ variant = "auth" }: { variant?: "auth" | "wizard" }) {
  return (
    <Page>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12" aria-busy="true" aria-label="Loading">
        <Block
          tone="paper"
          pad="lg"
          className={`flex flex-col gap-5 ${variant === "auth" ? "lg:col-span-7" : "lg:col-span-8 lg:col-start-5"}`}
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-13 w-full !rounded-full" />
          <Skeleton className="h-13 w-full !rounded-full" />
          <Skeleton className="h-14 w-full !rounded-full" />
        </Block>
        <Block
          tone="mist"
          pad="lg"
          className={`hidden min-h-80 lg:block ${variant === "auth" ? "lg:col-span-5" : "lg:col-span-4 lg:row-start-1"}`}
        >
          <span className="sr-only">Loading</span>
        </Block>
      </div>
    </Page>
  );
}
