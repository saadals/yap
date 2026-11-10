"use client";

import { useRef, useState } from "react";

import { AppShell, PublicShell } from "@/components/shell/app-shell";
import { WidePage } from "@/components/ui/page";
import { usePrefs } from "@/lib/prefs";
import { useDemo } from "@/lib/store";
import type { NicheId } from "@/lib/types";

import { Cabinet } from "./cabinet";
import { categoryDemand } from "./data";
import { ExploreStrip, type StripControl } from "./explore-strip";
import { HeroIntro } from "./hero";
import { BrandBand, ClosingBar, Comparison, GetTheApp, HowItWorks, Reviews } from "./sections";
import { SidePanel, type PanelView } from "./side-panel";
import { Stories } from "./stories";

/**
 * Discover: the desktop home when signed in (served at "/") and the page at /discover (signed-out
 * visitors and phones). It brings its own shell: AppShell when signed in, PublicShell when signed
 * out, both with the full footer. Render it bare.
 *
 * Signed in, the three sales sections (How it works, the comparison with its trust cards, the
 * closing bar) are left out (round 3 answers, item 43); before hydration the `y-session` class on
 * <html> hides them so a signed-in visitor never sees them flash.
 */
export function DiscoverPage() {
  const { account } = usePrefs();
  const signedIn = Boolean(account);
  const content = <DiscoverContent signedIn={signedIn} />;
  return signedIn ? (
    <AppShell footer="full">{content}</AppShell>
  ) : (
    <PublicShell footer="full">{content}</PublicShell>
  );
}

function DiscoverContent({ signedIn }: { signedIn: boolean }) {
  const s = useDemo();
  const [view, setView] = useState<PanelView | null>(null);
  const strip = useRef<StripControl | null>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const categories = categoryDemand(s);

  /** A hot-categories row: scroll to the explore strip and bring that category to the middle. */
  const jumpToCategory = (id: NicheId) => {
    strip.current?.centre(id);
    const node = exploreRef.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = node.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <div className="y-dsc">
      <WidePage className="y-dsc-page">
        <div className="y-dsc-hero">
          <HeroIntro s={s} onOpenOrder={(id) => setView({ kind: "order", id })} />
          <div className="y-dsc-hero-r">
            <Cabinet
              categories={categories}
              onOpenMetric={(id) => setView({ kind: "metric", id })}
              onJumpCategory={jumpToCategory}
            />
          </div>
        </div>

        {signedIn ? null : <HowItWorks />}
        <BrandBand s={s} />
        <GetTheApp />
        <div ref={exploreRef}>
          <ExploreStrip
            s={s}
            categories={categories}
            controlRef={strip}
            onOpenCreator={(id) => setView({ kind: "creator", id })}
          />
        </div>
        <Stories s={s} onOpen={(index) => setView({ kind: "story", index })} />
        <Reviews s={s} onOpenCreator={(id) => setView({ kind: "creator", id })} />
        {signedIn ? null : <Comparison />}
        {signedIn ? null : <ClosingBar />}
      </WidePage>
      <SidePanel s={s} view={view} onClose={() => setView(null)} onOpen={setView} />
    </div>
  );
}
