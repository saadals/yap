"use client";

import { useParams } from "next/navigation";

import { CreatorProfile, normalizeHandle } from "@/components/discovery/profile";
import { PublicShell } from "@/components/shell/app-shell";
import { SiteFooter } from "@/components/shell/site-footer";
import { Page } from "@/components/ui/page";

export default function CreatorProfilePage() {
  const params = useParams<{ handle: string }>();
  const handle = normalizeHandle(params.handle);
  // The footer is rendered here (not by the shell) so the spacer after it keeps its last line
  // clear of the fixed mobile commission bar.
  return (
    <PublicShell bottomBar={false} footer="none">
      <Page>
        <CreatorProfile key={handle} handle={handle} />
      </Page>
      <div className="pt-10">
        <SiteFooter />
      </div>
      <div aria-hidden className="h-24 lg:hidden" />
    </PublicShell>
  );
}
