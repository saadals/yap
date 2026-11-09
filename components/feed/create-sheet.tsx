"use client";

import { Plus, Video } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CreatorSetupSheet } from "@/components/account/creator-setup-sheet";
import { Sheet } from "@/components/ui/sheet";
import { paths } from "@/lib/paths";
import { me } from "@/lib/selectors";
import { useDemo } from "@/lib/store";

function OptionBody({
  icon,
  neon = false,
  title,
  body,
}: {
  icon: React.ReactNode;
  neon?: boolean;
  title: string;
  body: string;
}) {
  return (
    <>
      <span
        aria-hidden
        className={`grid size-11 flex-none place-items-center rounded-[14px] ${
          neon ? "bg-(--y-neon) text-(--y-on-color)" : "bg-(--y-ink) text-(--y-paper)"
        }`}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="y-body font-semibold">{title}</span>
        <span className="y-small y-fg-2">{body}</span>
      </span>
    </>
  );
}

/**
 * The "+" button's choice. Every account can order and make (one account type), so both options
 * always show; making without a creator profile starts by setting one up.
 */
export function CreateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useDemo();
  const router = useRouter();
  const makes = Boolean(me.creator(s));
  const [setupOpen, setSetupOpen] = useState(false);

  const makeBody = (
    <OptionBody
      icon={<Video size={20} aria-hidden />}
      neon
      title="Make a Yapp"
      body="Film or upload a video for an order you took"
    />
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Create" description="What do you want to do?" width="sm">
        <div className="y-create-options flex flex-col gap-2">
          <Link href={paths.newOrder()} className="y-create-option" onClick={onClose}>
            <OptionBody
              icon={<Plus size={20} aria-hidden />}
              title="New order"
              body="Ask creators for Yapps for your product"
            />
          </Link>
          {makes ? (
            <Link href={paths.work("making")} className="y-create-option" onClick={onClose}>
              {makeBody}
            </Link>
          ) : (
            <button
              type="button"
              className="y-create-option"
              onClick={() => {
                onClose();
                setSetupOpen(true);
              }}
            >
              {makeBody}
            </button>
          )}
        </div>
      </Sheet>
      <CreatorSetupSheet
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onDone={() => {
          setSetupOpen(false);
          router.push(paths.work("making"));
        }}
        reason="to make Yapps"
      />
    </>
  );
}
