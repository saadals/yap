"use client";

import { Compass, House, LifeBuoy } from "lucide-react";

import { PublicShell } from "@/components/shell/app-shell";
import { Character } from "@/components/ui/character";
import { List, Row } from "@/components/ui/list";
import { Page } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { defaultMode, homeFor, useRememberedMode } from "@/lib/mode";
import { paths } from "@/lib/paths";
import { usePrefs } from "@/lib/prefs";
import { me } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

/** A friendly 404: what happened, one way home, and two places people usually meant. */
export default function NotFound() {
  const s = useDemo();
  const { account } = usePrefs();
  const current = me.account(s);
  const remembered = useRememberedMode(current.id);
  const home = account ? homeFor(remembered ?? defaultMode(current)) : paths.landing;

  return (
    <PublicShell>
      <Page width="narrow" className="pb-8 md:pt-16">
        <div className="flex flex-col items-center gap-5 pt-6 text-center">
          <Character shape="gem" tint="coral" face="wow" look={-1} className="h-24 w-auto" />
          <p className="y-eyebrow">Page not found</p>
          <h1 className="y-display y-t-display max-w-[20ch] text-balance">This page went off script</h1>
          <p className="y-body y-fg-2 max-w-[46ch]">
            The link might be old, or the page has moved. Everything else is where you left it.
          </p>
          <PillButton href={home} variant="contrast" icon={<House size={17} aria-hidden />}>
            {account ? "Go to Home" : "Go to the home page"}
          </PillButton>
        </div>
        <div className="mx-auto mt-10 w-full max-w-[480px]">
          <List label="Other places to go">
            <Row
              href={paths.discover()}
              lead={<Compass size={19} aria-hidden />}
              title="Find creators"
              meta="Watch videos and compare prices"
            />
            <Row
              href={`${paths.howItWorks}#faq`}
              lead={<LifeBuoy size={19} aria-hidden />}
              title="Help and questions"
              meta="How ordering, payment and refunds work"
            />
          </List>
        </div>
      </Page>
    </PublicShell>
  );
}
