"use client";

import { ExternalLink } from "lucide-react";

import { AboutSection } from "@/components/creator/profile/about-section";
import { AddonsSection } from "@/components/creator/profile/addons-section";
import { AvailabilitySection } from "@/components/creator/profile/availability-section";
import { EquipmentSection } from "@/components/creator/profile/equipment-section";
import { PackagesEditor } from "@/components/creator/profile/packages-editor";
import { PortfolioManager } from "@/components/creator/profile/portfolio-manager";
import { SkillsSection } from "@/components/creator/profile/skills-section";
import { StrengthList, StrengthMeter, profileChecklist, strengthScore } from "@/components/creator/profile-strength";
import { Block } from "@/components/ui/block";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppShell } from "@/components/shell/app-shell";
import { me } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";

export default function CreatorProfilePage() {
  return (
    <AppShell role="creator">
      <Profile />
    </AppShell>
  );
}

const sectionLinks = [
  { href: "#about", label: "About" },
  { href: "#skills", label: "Languages and formats" },
  { href: "#portfolio", label: "Portfolio" },
  { href: "#packages", label: "Packages" },
  { href: "#addons", label: "Add-ons" },
  { href: "#equipment", label: "Equipment" },
  { href: "#availability", label: "Availability" },
];

function SectionsSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading your profile">
      {[0, 1, 2].map((i) => (
        <div key={i} data-tone="paper" className="y-block y-pad-md flex flex-col gap-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ))}
    </div>
  );
}

function Profile() {
  const s = useDemo();
  const hydrated = useHydrated();
  const creator = me.creator(s);
  const checklist = profileChecklist(s, creator);
  const score = strengthScore(checklist);
  const open = checklist.filter((i) => !i.done);

  return (
    <Page>
      <PageHeader
        title="Your profile"
        description="What businesses see when they find you or read your pitch. Each section saves on its own."
        actions={
          <PillButton
            href={`/creators/${creator.handle}`}
            variant="outline"
            icon={<ExternalLink size={16} aria-hidden />}
          >
            View public profile
          </PillButton>
        }
      />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 [&>*]:min-w-0">
        <aside className="flex flex-col gap-2 lg:order-2 lg:col-span-4" aria-label="Profile strength">
          <div className="flex flex-col gap-2 lg:sticky lg:top-24">
            <Block tone="lavender" pad="md" className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FaceAvatar id={creator.id} name="" size={48} />
                  <div>
                    <h2 className="y-head">Profile strength</h2>
                    <p className="y-small y-fg-2">@{creator.handle}</p>
                  </div>
                </div>
                <span className="y-display y-num text-[44px] leading-none font-semibold tracking-[-0.04em]">
                  {score}
                  <span className="text-xl">%</span>
                </span>
              </div>
              <StrengthMeter value={score} label="Profile strength" />
              {open.length ? (
                <>
                  <p className="y-small">
                    {open.length === 1 ? "One thing" : `${open.length} things`} left. Complete profiles
                    get invited to more requests.
                  </p>
                  <StrengthList items={open} />
                </>
              ) : (
                <p className="y-small">
                  Everything businesses look for is there. Keep your portfolio fresh with your latest work.
                </p>
              )}
            </Block>
            <nav aria-label="Profile sections" className="hidden lg:block">
              <Block tone="paper" pad="sm" className="flex flex-col">
                <ul className="flex flex-col">
                  {sectionLinks.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="y-small flex min-h-11 items-center rounded-full px-4 font-medium hover:bg-(--b-chip)"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </Block>
            </nav>
          </div>
        </aside>

        <div className="flex flex-col gap-2 lg:order-1 lg:col-span-8">
          {hydrated ? (
            <>
              <AboutSection creator={creator} />
              <SkillsSection creator={creator} />
              <PortfolioManager creator={creator} />
              <PackagesEditor creator={creator} />
              <AddonsSection creator={creator} />
              <EquipmentSection creator={creator} />
              <AvailabilitySection creator={creator} />
            </>
          ) : (
            <SectionsSkeleton />
          )}
        </div>
      </div>
    </Page>
  );
}
