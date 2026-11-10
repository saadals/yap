"use client";

import { PublicShell } from "@/components/shell/app-shell";
import { PhoneOnly } from "@/components/shell/home-route";
import { MorePage } from "@/components/shell/more-page";

/** Phones only: on desktop the footer holds these links, so "/more" goes to "/" (Site-wide 5.6.2). */
export default function MoreRoute() {
  return (
    <PhoneOnly>
      <PublicShell footer="none">
        <MorePage />
      </PublicShell>
    </PhoneOnly>
  );
}
