"use client";

import { House } from "lucide-react";

import { MarketingMain } from "@/components/marketing/blocks";
import { PublicShell } from "@/components/shell/app-shell";
import { homeFor } from "@/components/shell/nav";
import { Block } from "@/components/ui/block";
import { Character } from "@/components/ui/character";
import { PillButton } from "@/components/ui/pill-button";
import { usePrefs } from "@/lib/prefs";

export default function NotFound() {
  const { role } = usePrefs();
  return (
    <PublicShell>
      <MarketingMain>
        <section aria-labelledby="not-found-title" className="grid gap-2 lg:grid-cols-12">
          <Block
            tone="paper"
            pad="lg"
            className="flex flex-col justify-center gap-6 lg:col-span-7 lg:min-h-[560px]"
          >
            <p className="y-chip w-fit">Error 404</p>
            <h1 id="not-found-title" className="y-display y-t-display max-w-[14ch]">
              This page <span className="y-strong">went off script</span>
            </h1>
            <p className="y-lead y-fg-2 max-w-[46ch]">
              The link might be old, or the page has moved. Everything else is where you left it.
            </p>
            <div className="flex flex-wrap gap-2">
              <PillButton href="/creators" variant="neon" size="lg" arrow>
                Find creators
              </PillButton>
              <PillButton
                href={homeFor(role)}
                variant="outline"
                size="lg"
                icon={<House size={18} aria-hidden />}
              >
                {role ? "Back to your home" : "Back to home"}
              </PillButton>
            </div>
          </Block>
          <Block
            tone="lavender"
            pad="lg"
            className="flex min-h-[320px] items-center justify-center overflow-hidden lg:col-span-5"
          >
            <div
              aria-hidden
              className="y-display y-num flex items-center gap-1 text-[120px] leading-none font-semibold tracking-[-0.06em] md:text-[168px]"
            >
              <span>4</span>
              <Character
                shape="ball"
                tint="sea"
                face="wow"
                look={-1}
                animate
                className="h-[0.78em] w-auto translate-y-[0.04em]"
              />
              <span>4</span>
            </div>
          </Block>
        </section>
      </MarketingMain>
    </PublicShell>
  );
}
