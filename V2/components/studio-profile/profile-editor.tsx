"use client";

import "@/app/styles/studio-business.css";

import { AlertCircle, ExternalLink } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { SetupPrompt } from "@/components/studio-jobs/setup-prompt";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { paths } from "@/lib/paths";
import { me } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import type { Creator } from "@/lib/types";

import { AccountsSection } from "./accounts-section";
import { AddonsSection } from "./addons-section";
import {
  SECTIONS,
  SECTION_ALIASES,
  type SectionId,
  draftFrom,
  patchFrom,
  profileChecklist,
  sectionOfKey,
  strengthScore,
  useDraft,
  validate,
} from "./draft";
import { EquipmentSection } from "./equipment-section";
import { PackagesSection } from "./packages-section";
import { PortfolioSection } from "./portfolio-section";
import { CardPreview, StrengthCard } from "./preview";
import { ProfileSection } from "./profile-section";

/**
 * /studio/profile: your public creator profile, edited in place. Sections on one page (a side nav
 * on wide screens, a sticky jump row otherwise); profile, packages, add-ons and equipment save
 * together from one bar that appears when something changed; portfolio, connected accounts and
 * availability save as you go. A card preview and the profile strength follow your edits.
 */
export function ProfileEditorPage() {
  const s = useDemo();
  const hydrated = useHydrated();
  const [setupOpen, setSetupOpen] = useState(false);
  const creator = hydrated ? me.creator(s) : undefined;

  return (
    <Page>
      <PageHeader
        title="Your profile"
        description={creator ? "What brands see when they find you, read your pitch or check a campaign slot." : undefined}
        actions={
          creator ? (
            <PillButton href={paths.creator(creator.handle)} variant="outline" icon={<ExternalLink size={16} aria-hidden />}>
              View public profile
            </PillButton>
          ) : null
        }
      />
      {!hydrated ? (
        <EditorSkeleton />
      ) : creator ? (
        <Editor key={creator.id} creator={creator} />
      ) : (
        <SetupPrompt
          title="Show brands what you make"
          body="Your public profile holds your portfolio, prices and connected accounts. Set one up to pitch on orders and take campaign slots, from this same account."
          onSetUp={() => setSetupOpen(true)}
        />
      )}
      <CreatorSetupSheet open={setupOpen} onClose={() => setSetupOpen(false)} reason="to show brands your work" />
    </Page>
  );
}

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => window.location.hash.slice(1);
const serverHash = () => "";

/** The element a hash points at: a section, an alias of one, or "availability" inside Profile. */
const targetOf = (hash: string): string | undefined =>
  SECTIONS.some((x) => x.id === hash) ? hash : hash === "availability" ? "availability" : SECTION_ALIASES[hash];

function Editor({ creator }: { creator: Creator }) {
  const s = useDemo();
  const toast = useToast();
  const { draft, set, dirty, reset, commit } = useDraft(draftFrom(creator));
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [attempted, setAttempted] = useState(false);
  const [active, setActive] = useState<SectionId>("about");
  const hash = useSyncExternalStore(subscribeHash, readHash, serverHash);

  const errors = validate(draft);
  const errorKeys = Object.keys(errors);
  const show = (key: string) => (attempted || touched.has(key) ? (errors[key] ?? null) : null);
  const touch = (key: string) => setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
  const shownBySection = (id: SectionId) => (attempted ? errorKeys.filter((key) => sectionOfKey(key) === id).length : 0);

  // The live version of the profile: saved fields from the store, draft fields from the form.
  const live: Creator = { ...creator, ...patchFrom(draft) };
  const checklist = profileChecklist(s, live);
  const score = strengthScore(checklist);

  // Unsaved edits: warn before the tab closes or reloads.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // The page renders after hydration, so a link like /studio/profile#accounts scrolls here.
  useEffect(() => {
    const id = targetOf(hash);
    if (id) window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
  }, [hash]);

  // Which section is on screen (for the nav): the first one crossing the upper part of the view.
  useEffect(() => {
    const nodes = SECTIONS.map((x) => document.getElementById(x.id)).filter((n): n is HTMLElement => Boolean(n));
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // At the very bottom the last sections can't reach the top band: take the last one on screen.
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        const shown = SECTIONS.filter((x) => visible.has(x.id));
        const pick = atBottom ? shown[shown.length - 1] : shown[0];
        if (pick) setActive(pick.id);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const save = () => {
    if (errorKeys.length) {
      setAttempted(true);
      const first = SECTIONS.find((x) => errorKeys.some((key) => sectionOfKey(key) === x.id));
      if (first) document.getElementById(first.id)?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    const patch = patchFrom(draft);
    actions.updateCreator(creator.id, patch);
    commit(draftFrom({ ...creator, ...patch }));
    setAttempted(false);
    setTouched(new Set());
    toast({ message: "Profile saved. Brands see the changes now." });
  };

  const discard = () => {
    reset();
    setAttempted(false);
    setTouched(new Set());
  };

  const props = { draft, set, show, touch };

  return (
    <>
      <StrengthCompact score={score} items={checklist} />
      <nav aria-label="Profile sections" className="sb-jump y-scroll-x -mx-(--y-gutter) mb-4 px-(--y-gutter) py-2 xl:hidden">
        <div className="flex w-max gap-1">
          {SECTIONS.map((x) => (
            <a key={x.id} href={`#${x.id}`} aria-current={active === x.id ? "true" : undefined} onClick={() => setActive(x.id)}>
              {x.label}
              {shownBySection(x.id) ? <AlertCircle size={13} aria-label="has something to fix" className="text-(--y-danger)" /> : null}
            </a>
          ))}
        </div>
      </nav>

      <div className={`grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[168px_minmax(0,1fr)_300px] ${dirty || attempted ? "pb-28" : ""}`}>
        <nav aria-label="Profile sections" className="sb-nav y-rail hidden xl:block">
          <ul className="flex flex-col gap-0.5">
            {SECTIONS.map((x) => (
              <li key={x.id}>
                <a href={`#${x.id}`} aria-current={active === x.id ? "true" : undefined} onClick={() => setActive(x.id)}>
                  {x.label}
                  {shownBySection(x.id) ? <AlertCircle size={14} aria-label="has something to fix" className="text-(--y-danger)" /> : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-3">
          <ProfileSection creator={creator} {...props} errorCount={shownBySection("about")} />
          <PortfolioSection creator={creator} />
          <PackagesSection creator={creator} {...props} errorCount={shownBySection("packages")} />
          <AddonsSection creator={creator} {...props} errorCount={shownBySection("addons")} />
          <AccountsSection creator={creator} />
          <EquipmentSection draft={draft} set={set} />
        </div>

        <aside aria-label="Preview and profile strength" className="y-rail hidden flex-col gap-4 lg:flex">
          <CardPreview creator={live} />
          <StrengthCard score={score} items={checklist} />
        </aside>
      </div>

      {dirty || (attempted && errorKeys.length) ? (
        <div role="region" aria-label="Unsaved changes" className="sb-savebar y-bar flex items-center gap-3 py-2.5 ps-5 pe-2.5">
          <p className="y-small min-w-0 flex-1 truncate" aria-live="polite">
            {attempted && errorKeys.length ? (
              <span className="flex items-center gap-1.5 font-medium text-(--y-danger)">
                <AlertCircle size={16} aria-hidden className="flex-none" />
                Fix {errorKeys.length === 1 ? "1 thing" : `${errorKeys.length} things`} to save
              </span>
            ) : (
              <>
                <span className="font-semibold sm:hidden">Unsaved</span>
                <span className="hidden font-semibold sm:inline">Unsaved changes</span>
                <span className="y-fg-2 hidden sm:inline"> · brands see them once you save</span>
              </>
            )}
          </p>
          <PillButton variant="ghost" size="sm" onClick={discard} disabled={!dirty}>
            Discard
          </PillButton>
          <PillButton variant="neon" onClick={save}>
            Save changes
          </PillButton>
        </div>
      ) : null}
    </>
  );
}

/** Phones and tablets: the strength as one line that opens to what's missing. */
function StrengthCompact({ score, items }: { score: number; items: ReturnType<typeof profileChecklist> }) {
  return (
    <div className="mb-3 lg:hidden">
      <StrengthCard score={score} items={items} compact />
    </div>
  );
}

function EditorSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]" aria-busy="true" aria-label="Loading your profile">
      <div className="flex flex-col gap-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} data-tone="paper" className="y-block y-pad-md flex flex-col gap-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </div>
      <div className="hidden lg:block" aria-hidden>
        <Skeleton className="aspect-[4/5] w-full !rounded-(--y-r-block)" />
      </div>
    </div>
  );
}
