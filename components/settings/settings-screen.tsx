"use client";

import { CheckCircle2, TriangleAlert, Video } from "lucide-react";
import { useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { me } from "@/lib/selectors";
import { actions, useDemo, useHydrated } from "@/lib/store";
import { AUTO_APPROVE_DAYS } from "@/lib/taxonomy";
import type { Role } from "@/lib/types";

import { BrandAccounts } from "./brand-accounts";
import { CompanyProfileForm } from "./company-profile";
import { ConfirmSheet } from "./confirm-sheet";
import { SettingsSection, SwitchRow } from "./controls";
import { AccountControls, AlertControls, AvailabilityControls, IdVerificationRow } from "./creator-settings";
import { NotificationPrefsControls } from "./notification-prefs";
import { SectionNav, useSettingsSection, type SettingsAnchor } from "./section-nav";
import { TeamSection } from "./team";
import { UpgradeToBusiness } from "./upgrade-business";
import { YouForm } from "./you-form";

/**
 * /settings: one page for the whole account, one section at a time. Anchors
 * (`paths.settings("business")` etc.): you, business, brand (the accounts creators tag), team
 * (business accounts), notifications, making, account. Retired anchors from the old per-role settings are aliased.
 */
const aliases: Record<string, string> = {
  company: "business",
  availability: "making",
  alerts: "making",
  approvals: "notifications",
  danger: "account",
  handles: "brand",
};

function FormSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-13 w-full !rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SettingsScreen() {
  const s = useDemo();
  const hydrated = useHydrated();
  const account = me.account(s);
  const creator = me.creator(s);
  const isBusiness = account.kind === "business";

  const sections: SettingsAnchor[] = [
    { id: "you", label: "You" },
    { id: "business", label: "Business account" },
    { id: "brand", label: "Brand accounts" },
    ...(isBusiness ? [{ id: "team", label: "Team" }] : []),
    { id: "notifications", label: "Notifications" },
    { id: "making", label: "Making" },
    { id: "account", label: "Account" },
  ];
  const [section, setSection] = useSettingsSection(sections, aliases);

  return (
    <Page>
      <PageHeader title="Settings" />
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-3">
          <SectionNav sections={sections} active={section} onSelect={setSection} />
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:col-span-9">
          <div hidden={section !== "you"}>
            <SettingsSection id="you" title="You">
              {hydrated ? <YouForm key={account.id} /> : <FormSkeleton />}
            </SettingsSection>
          </div>

          <div hidden={section !== "business"}>
            {hydrated ? <BusinessAccountSection key={account.id} /> : (
              <SettingsSection id="business" title="Business account">
                <FormSkeleton rows={4} />
              </SettingsSection>
            )}
          </div>

          <div hidden={section !== "brand"}>
            <SettingsSection
              id="brand"
              title="Brand accounts"
              description="The accounts creators tag when they post a campaign video, one per platform. New orders fill them in for you, and saving one there updates it here."
            >
              {hydrated ? <BrandAccounts key={account.id} /> : <FormSkeleton rows={3} />}
            </SettingsSection>
          </div>

          {isBusiness ? (
            <div hidden={section !== "team"}>
              <SettingsSection
                id="team"
                title="Team"
                description="Everyone on the team can place orders, hire creators and approve work."
              >
                {hydrated ? <TeamSection /> : <FormSkeleton rows={2} />}
              </SettingsSection>
            </div>
          ) : null}

          <div hidden={section !== "notifications"}>
            <SettingsSection id="notifications" title="Notifications">
              {hydrated ? <Notifications key={account.id} hasCreator={Boolean(creator)} /> : <FormSkeleton rows={3} />}
            </SettingsSection>
          </div>

          <div hidden={section !== "making"}>
            <SettingsSection
              id="making"
              title="Making"
              description={creator ? "How you take on work as a creator." : undefined}
            >
              {!hydrated ? (
                <FormSkeleton rows={3} />
              ) : creator ? (
                <div className="flex flex-col gap-6">
                  <AvailabilityControls creator={creator} />
                  <div className="flex flex-col gap-4 border-t border-(--b-line) pt-5">
                    <h3 className="y-head">Opportunity alerts</h3>
                    <AlertControls key={creator.id} creator={creator} />
                  </div>
                  <div className="border-t border-(--b-line) pt-5">
                    <IdVerificationRow key={creator.id} creator={creator} />
                  </div>
                </div>
              ) : (
                <MakeVideosCta />
              )}
            </SettingsSection>
          </div>

          <div hidden={section !== "account"}>
            <SettingsSection id="account" title="Account">
              {hydrated ? <AccountControls key={account.id} /> : <FormSkeleton rows={3} />}
            </SettingsSection>
          </div>
        </div>
      </div>
    </Page>
  );
}

/** Business accounts edit the company; personal accounts can upgrade. */
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
        title="Upgrade to a business account"
        description="Order as a company. You keep everything you have now."
      >
        <UpgradeToBusiness />
      </SettingsSection>
    );
  }

  return (
    <SettingsSection id="business" title="Business account">
      <CompanyProfileForm />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--b-line) pt-5">
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

/** One side at a time: orders you place, or work you make (with a creator profile). */
function Notifications({ hasCreator }: { hasCreator: boolean }) {
  const s = useDemo();
  const toast = useToast();
  const prefs = me.settings(s).business;
  const [side, setSide] = useState<Role>("business");
  const shown: Role = hasCreator ? side : "business";

  return (
    <div className="flex flex-col gap-5">
      {hasCreator ? (
        <SegmentedToggle<Role>
          label="Which notifications"
          value={shown}
          onChange={setSide}
          options={[
            { value: "business", label: "Orders you place" },
            { value: "creator", label: "Work you make" },
          ]}
          className="w-fit max-w-full"
        />
      ) : null}
      {shown === "business" ? (
        <NotificationPrefsControls role="business" email={prefs.invoiceEmail}>
          <SwitchRow
            label="Remind me before a video auto-approves"
            icon={<CheckCircle2 size={18} />}
            description={`Videos approve automatically ${AUTO_APPROVE_DAYS} days after delivery. We'll nudge you 24 and 2 hours before.`}
            checked={prefs.autoApproveReminders}
            onChange={(on) => {
              actions.updateSettings("business", { autoApproveReminders: on });
              toast({
                message: on ? "Auto-approval reminders on" : "Auto-approval reminders off",
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
      <span aria-hidden className="y-tile grid size-12 flex-none place-items-center !rounded-full">
        <Video size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="y-head">Make videos on Yapp too</p>
        <p className="y-small y-fg-2">
          Set up a creator profile on this account to pitch on orders and take campaign slots.
        </p>
      </div>
      <PillButton variant="contrast" onClick={() => setOpen(true)}>
        Set up creator profile
      </PillButton>
      <CreatorSetupSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
