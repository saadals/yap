"use client";

import { Block } from "@/components/ui/block";
import type { CharacterShape, CharacterTint } from "@/components/ui/character";
import { EmptyState } from "@/components/ui/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { paths } from "@/lib/paths";

/**
 * What a Studio page shows to an account without a creator profile: what the page is for and one
 * green button that opens `CreatorSetupSheet`. The page keeps the sheet mounted itself, so a
 * TikTok connection that finishes after the profile exists isn't cut short when the page switches
 * to its real content.
 */
export function SetupPrompt({
  title,
  body,
  onSetUp,
  shape = "bean",
  tint = "violet",
}: {
  title: string;
  body: string;
  onSetUp: () => void;
  shape?: CharacterShape;
  tint?: CharacterTint;
}) {
  return (
    <Block tone="paper" pad="lg">
      <EmptyState
        title={title}
        body={body}
        shape={shape}
        tint={tint}
        face="smile"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <PillButton variant="neon" arrow onClick={onSetUp}>
              Set up your creator profile
            </PillButton>
            <PillButton variant="ghost" href={paths.findWork()}>
              See open work first
            </PillButton>
          </div>
        }
      />
    </Block>
  );
}
