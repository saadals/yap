"use client";

import { Sheet } from "@/components/ui/sheet";

import { AccountConfirms, AccountIdentity, AccountRows, useAccountConfirm } from "./account-menu";

/**
 * The account menu on phones (Profile → Account): the same rows as the desktop dropdown, plus More.
 * Log out and Reset ask first, in a confirmation that replaces the sheet.
 */
export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [confirm, setConfirm] = useAccountConfirm();
  return (
    <>
      <Sheet open={open} onClose={onClose} title="Account" width="sm">
        <div className="y-acct-sheet">
          <AccountIdentity size={52} />
          <nav aria-label="Account" className="flex flex-col">
            <AccountRows
              showMore
              onDone={onClose}
              onConfirm={(which) => {
                onClose();
                setConfirm(which);
              }}
            />
          </nav>
        </div>
      </Sheet>
      <AccountConfirms which={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
