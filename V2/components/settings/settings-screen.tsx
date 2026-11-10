"use client";

import { CheckCircle2, PenLine, TriangleAlert, Video } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { AppShell } from "@/components/shell/app-shell";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { useMode, type Mode } from "@/lib/mode";
import { paths } from "@/lib/paths";
import { me } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { AUTO_APPROVE_DAYS } from "@/lib/taxonomy";

import { BrandAccounts } from "./brand-accounts";
import { CompanyProfileForm } from "./company-profile";
import { ConfirmSheet } from "./confirm-sheet";
import { SettingsSection, SwitchRow } from "./controls";
import { AlertControls, AvailabilityControls, IdVerificationRow } from "./creator-settings";
import { NotificationPrefsControls } from "./notification-prefs";
import { SecurityControls } from "./security";
import { TeamSection } from "./team";
import { UpgradeToBusiness } from "./upgrade-business";
import { YouForm } from "./you-form";

type Anchor = { id: string; label: string };

/**
 * /settings: every setting on one page, in sections, with an anchored nav (a sticky column on
 * desktop, a row of chips on phones). Anchors: account, notifications, brand (the accounts creators
 * tag on campaigns), business (team inside it), studio, security. V1's anchors still land in the
 * right place: you → account, handles → brand, team → business, making / availability / alerts →
 * studio, danger → security. There is no Appearance section: dark mode is paused (light only).
 */
const sections: Anchor[] = [
  { id: "account", label: "Account" },
  { id: "notifications", label: "Notifications" },
  { id: "brand", label: "Brand accounts" },
  { id: "business", label: "Business account" },
  { id: "studio", label: "Studio" },
  { id: "security", label: "Sign-in and security" },
];

/** V1 anchors and where they live in V2 (`team` and `alerts` are headings inside their sections). */
const aliases: Record<string, string> = {
  you: "account",
  approvals: "notifications",
  handles: "brand",
  "brand-accounts": "brand",
  appearance: "account",
  company: "business",
  making: "studio",
  availability: "studio",
  danger: "security",
};

export function SettingsScreen() {
  const s = useDemo();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const account = me.account(s);
  const mode = useMode(account, pathname);

  return (
    <AppShell>
      <Page>
        <PageHeader title="Settings" description="Your account, notifications and how you work on Yapp." />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_minmax(0,760px)] lg:gap-10">
          <SettingsNav />
          {hydrated ? (
            <Sections key={account.id} mode={mode} />
          ) : (
            <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading settings">
              {[0, 1, 2].map((index) => (
                <div key={index} className="y-block flex flex-col gap-4 p-6" data-tone="paper">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-11 w-full !rounded-(--y-r-field)" />
                  <Skeleton className="h-11 w-full !rounded-(--y-r-field)" />
                </div>
              ))}
            </div>
          )}
        </div>
      </Page>
    </AppShell>
  );
}

/** Highlights the section under the header while scrolling; links jump to the anchors. */
function SettingsNav() {
  const [active, setActive] = useState(sections[0].id);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      let current = sections[0].id;
      for (const item of sections) {
        const element = document.getElementById(item.id);
        if (element && element.getBoundingClientRect().top <= 140) current = item.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = sections[sections.length - 1].id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    frame = window.requestAnimationFrame(measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <nav aria-label="Settings sections" className="lg:sticky lg:top-[84px] lg:self-start">
      <ul className="y-scroll-x -mx-(--y-gutter) flex gap-1.5 px-(--y-gutter) pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:px-0">
        {sections.map((section) => (
          <li key={section.id} className="flex-none">
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? "true" : undefined}
              onClick={() => setActive(section.id)}
              className="y-settings-link"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Sections({ mode }: { mode: Mode }) {
  const s = useDemo();
  const account = me.account(s);
  const creator = me.creator(s);

  // The sections mount after hydration, too late for the browser's own jump to `#section`. V1's
  // anchors are mapped to where those settings live now.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const id = aliases[hash] ?? hash;
    if (!id) return;
    // Personal accounts have no team yet: `#team` lands on the upgrade.
    const target = document.getElementById(id) ?? (id === "team" ? document.getElementById("business") : null);
    target?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <SettingsSection id="account" title="Account" description="The person behind this account.">
        <YouForm />
      </SettingsSection>

      <SettingsSection id="notifications" title="Notifications">
        <Notifications hasCreator={Boolean(creator)} startOn={mode} />
      </SettingsSection>

      <SettingsSection
        id="brand"
        title="Brand accounts"
        description="The accounts creators tag when they post a UGC campaign video, one per platform. New campaigns start with these, and changing one there saves it here."
      >
        <BrandAccounts key={account.id} />
      </SettingsSection>

      <BusinessAccountSection />

      <SettingsSection
        id="studio"
        title="Studio"
        description={creator ? "How you take on work as a creator." : undefined}
        action={
          creator ? (
            <PillButton href={paths.studioProfile()} variant="ghost" size="sm" icon={<PenLine size={15} aria-hidden />}>
              Edit your profile
            </PillButton>
          ) : undefined
        }
      >
        {creator ? (
          <div className="flex flex-col gap-6">
            <AvailabilityControls creator={creator} />
            <div id="alerts" className="flex scroll-mt-20 flex-col gap-4 border-t border-(--y-line) pt-5">
              <AlertControls key={creator.id} creator={creator} />
            </div>
            <div className="border-t border-(--y-line) pt-5">
              <IdVerificationRow key={creator.id} creator={creator} />
            </div>
          </div>
        ) : (
          <MakeVideosCta />
        )}
      </SettingsSection>

      <SettingsSection id="security" title="Sign-in and security">
        <SecurityControls />
      </SettingsSection>
    </div>
  );
}

/** Business accounts edit the company and the team; personal accounts can upgrade. */
function BusinessAccountSection() {
  const s = useDemo();
  const toast = useToast();
  const account = me.account(s);
  const business = me.business(s);
  const [closing, setClosing] = useState(false);

  if (account.kind !== "business") {
    return (
      <SettingsSection
        id="business"
        title="Business account"
        description="Order as a company: invoices with your company name and tax ID, and a team. You keep everything you have now."
      >
        <UpgradeToBusiness />
      </SettingsSection>
    );
  }

  return (
    <SettingsSection id="business" title="Business account" description="How creators see your company on orders.">
      <CompanyProfileForm />
      <div className="flex flex-col gap-4 border-t border-(--y-line) pt-5">
        <div className="flex flex-col gap-1">
          <h3 id="team" className="y-head scroll-mt-20">
            Team
          </h3>
          <p className="y-small y-fg-2">Everyone on the team can place orders, hire creators and approve work.</p>
        </div>
        <TeamSection />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--y-line) pt-5">
        <div className="min-w-0">
          <p className="y-small font-semibold">Close {business.name}</p>
          <p className="y-micro y-fg-2">Open orders must finish first. Receipts stay available for 7 years.</p>
        </div>
        <PillButton variant="ghost" size="sm" icon={<TriangleAlert size={16} aria-hidden />} onClick={() => setClosing(true)}>
          Close business account
        </PillButton>
      </div>
      <ConfirmSheet
        open={closing}
        onClose={() => setClosing(false)}
        title={`Close ${business.name}?`}
        description="Your team loses access to its orders and messages. This can't be undone."
        confirmLabel="Close business account"
        typed={business.name.toUpperCase()}
        onConfirm={() => {
          setClosing(false);
          toast({
            message: `This is a demo, so ${business.name} stays open. In the live product it would close once open work is settled.`,
            tone: "info",
          });
        }}
      />
    </SettingsSection>
  );
}

/** One side at a time: what you order, or what you make (with a creator profile). */
function Notifications({ hasCreator, startOn }: { hasCreator: boolean; startOn: Mode }) {
  const s = useDemo();
  const toast = useToast();
  const prefs = me.settings(s).business;
  const [picked, setPicked] = useState<Mode | null>(null);
  const shown: Mode = hasCreator ? (picked ?? startOn) : "order";

  return (
    <div className="flex flex-col gap-4">
      {hasCreator ? (
        <Tabs<Mode>
          label="Which notifications"
          value={shown}
          onSelect={setPicked}
          items={[
            { id: "order", label: "Ordering" },
            { id: "studio", label: "Studio" },
          ]}
        />
      ) : null}
      {shown === "order" ? (
        <NotificationPrefsControls role="business" email={prefs.invoiceEmail}>
          <SwitchRow
            label="Remind me before a video approves itself"
            icon={<CheckCircle2 size={18} />}
            description={`A video approves itself ${AUTO_APPROVE_DAYS} days after delivery if you don't respond. We'll remind you 48 hours, 24 hours and 2 hours before.`}
            checked={prefs.autoApproveReminders}
            onChange={(on) => {
              actions.updateSettings("business", { autoApproveReminders: on });
              toast({
                message: on ? "Approval reminders on" : "Approval reminders off",
                action: { label: "Undo", onClick: () => actions.updateSettings("business", { autoApproveReminders: !on }) },
              });
            }}
          />
        </NotificationPrefsControls>
      ) : (
        <NotificationPrefsControls role="creator" />
      )}
    </div>
  );
}

function MakeVideosCta() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span aria-hidden className="y-tile grid size-11 flex-none place-items-center !rounded-full">
        <Video size={20} />
      </span>
      <div className="min-w-[200px] flex-1">
        <p className="y-head">Make videos on Yapp too</p>
        <p className="y-small y-fg-2">
          Set up a creator profile on this account to pitch on custom orders and pick Yapps in UGC campaigns.
        </p>
      </div>
      <PillButton variant="contrast" onClick={() => setOpen(true)}>
        Set up creator profile
      </PillButton>
      <CreatorSetupSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
