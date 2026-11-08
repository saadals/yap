"use client";

import { ProfileHub } from "@/components/account/profile-hub";
import { AppShell } from "@/components/shell/app-shell";

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileHub />
    </AppShell>
  );
}
