"use client";

import { ExternalLink, Video } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { StrengthList, StrengthMeter, profileChecklist, strengthScore } from "@/components/creator/profile-strength";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { FaceAvatar } from "@/components/ui/face-avatar";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";
import { me } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import type { Creator } from "@/lib/types";

import { AboutSection } from "./about-section";
import { AddonsSection } from "./addons-section";
import { AvailabilitySection } from "./availability-section";
import { ConnectedAccounts } from "./connected-accounts";
import { EquipmentSection } from "./equipment-section";
import { PackagesEditor } from "./packages-editor";
import { PortfolioManager } from "./portfolio-manager";
import { ProfileAccordion } from "./section";
import { SkillsSection } from "./skills-section";

/** Collapsible sections, in page order. Links like `paths.editProfile("accounts")` open one. */
const SECTION_IDS = ["about", "accounts", "skills", "portfolio", "packages", "addons", "equipment"];

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => window.location.hash.slice(1);
const serverHash = () => "";

/** Scroll a section's top into view once the accordion has re-rendered. */
function reveal(id: string, onlyIfHidden = false) {
  window.requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (!el) return;
    if (onlyIfHidden && el.getBoundingClientRect().top >= 96) return;
    el.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function SectionsSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading your profile">
      {[0, 1, 2].map((i) => (
        <div key={i} data-tone="paper" className="y-block y-pad-md flex flex-col gap-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/**
 * /profile/edit: the creator profile editor (portfolio, packages, add-ons, availability, skills,
 * equipment, connected accounts) with the strength meter. Without a creator profile it offers
 * the setup sheet instead.
 */
export function EditProfile() {
  const s = useDemo();
  const hydrated = useHydrated();
  const creator = me.creator(s);

  if (!hydrated) {
    return (
      <Page>
        <PageHeader title="Edit profile" back={{ href: paths.profile, label: "Profile" }} />
        <SectionsSkeleton />
      </Page>
    );
  }
  if (!creator) return <NoCreatorProfile />;
  return <Editor key={creator.id} creator={creator} />;
}

function NoCreatorProfile() {
  const [open, setOpen] = useState(false);
  return (
    <Page>
      <PageHeader title="Edit profile" back={{ href: paths.profile, label: "Profile" }} />
      <Block tone="paper" pad="lg">
        <EmptyState
          title="Make videos on Yapp too"
          body="Your public profile shows your work, prices and connected accounts. Set one up to pitch on orders and take campaign slots. Your name and email live in Settings."
          shape="bean"
          tint="violet"
          face="smile"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <PillButton variant="neon" arrow icon={<Video size={18} aria-hidden />} onClick={() => setOpen(true)}>
                Set up creator profile
              </PillButton>
              <PillButton variant="ghost" href={paths.settings("you")}>
                Edit your details
              </PillButton>
            </div>
          }
        />
      </Block>
      <CreatorSetupSheet open={open} onClose={() => setOpen(false)} />
    </Page>
  );
}

function Editor({ creator }: { creator: Creator }) {
  const s = useDemo();
  const checklist = profileChecklist(s, creator);
  const score = strengthScore(checklist);
  const open = checklist.filter((i) => !i.done);

  // One section open at a time. A hash in the URL (from another page or the back button) wins.
  const hash = useSyncExternalStore(subscribeHash, readHash, serverHash);
  const [accordion, setAccordion] = useState<{ openId: string | null; hash: string }>({
    openId: "about",
    hash: "",
  });
  let openId = accordion.openId;
  if (accordion.hash !== hash) {
    openId = SECTION_IDS.includes(hash) ? hash : accordion.openId;
    setAccordion({ openId, hash });
  }
  const openSection = (id: string | null, onlyIfHidden = false) => {
    setAccordion((a) => ({ ...a, openId: id }));
    if (id) reveal(id, onlyIfHidden);
  };

  useEffect(() => {
    if (SECTION_IDS.includes(hash)) reveal(hash);
  }, [hash]);

  return (
    <Page>
      <PageHeader
        title="Edit profile"
        description="What people see when they find you, read your pitch or check a campaign slot."
        back={{ href: paths.profile, label: "Profile" }}
        actions={
          <PillButton href={paths.creator(creator.handle)} variant="outline" icon={<ExternalLink size={16} aria-hidden />}>
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
                    {open.length === 1 ? "One thing" : `${open.length} things`} left. Complete profiles get
                    invited to more orders.
                  </p>
                  <StrengthList
                    items={open}
                    onPick={(item) => {
                      const id = item.href.split("#")[1];
                      if (id && SECTION_IDS.includes(id)) openSection(id);
                    }}
                  />
                </>
              ) : (
                <p className="y-small">
                  Everything buyers look for is there. Keep your portfolio fresh with your latest work.
                </p>
              )}
            </Block>
            <AvailabilitySection creator={creator} />
          </div>
        </aside>

        <div className="flex flex-col gap-2 lg:order-1 lg:col-span-8">
          <ProfileAccordion value={{ openId, toggle: (id) => openSection(openId === id ? null : id, true) }}>
            <AboutSection creator={creator} />
            <ConnectedAccounts creator={creator} />
            <SkillsSection creator={creator} />
            <PortfolioManager creator={creator} />
            <PackagesEditor creator={creator} />
            <AddonsSection creator={creator} />
            <EquipmentSection creator={creator} />
          </ProfileAccordion>
        </div>
      </div>
    </Page>
  );
}
