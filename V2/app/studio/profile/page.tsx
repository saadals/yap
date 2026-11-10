"use client";

import { AppShell } from "@/components/shell/app-shell";
import { ProfileEditorPage } from "@/components/studio-profile/profile-editor";

export default function StudioProfileRoute() {
  return (
    <AppShell>
      <ProfileEditorPage />
    </AppShell>
  );
}
