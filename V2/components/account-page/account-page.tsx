"use client";

import { usePathname } from "next/navigation";

import { AccountMenuBody } from "@/components/shell/account-menu";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { Page, PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { useMode } from "@/lib/mode";
import { me } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

/**
 * /account, "Me": the phone tab for everything that isn't in the tab bar (the mode switch, the
 * pages of the current mode, Productivity, settings, demo tools, and Log out, which asks first).
 * It renders the shell's `AccountMenuBody`, the same menu the desktop avatar opens in a sheet.
 */
export function AccountPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const mode = useMode(me.account(s), pathname);

  return (
    <AppShell>
      <Page width="narrow" className="!max-w-[calc(560px+var(--y-gutter)*2)]">
        <PageHeader title="Account" />
        <Block tone="paper" pad="sm" className="md:!p-4">
          {hydrated ? (
            <AccountMenuBody mode={mode} />
          ) : (
            <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
              <div className="flex items-center gap-3 px-1">
                <Skeleton className="size-12 !rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-16 w-full !rounded-(--y-r-tile)" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          )}
        </Block>
      </Page>
    </AppShell>
  );
}
