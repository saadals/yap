"use client";

import Link from "next/link";

import { Brand } from "@/components/ui/brand";
import { paths } from "@/lib/paths";

/**
 * The frame for sign-in and onboarding: no site navigation, just the logo (back to the landing
 * page) and one quiet way out. Signed-out visitors use these pages, so they can't sit in
 * <AppShell> (which signs a visitor in); they don't need <PublicShell>'s nav and footer either.
 */
export function FocusFrame({
  children,
  exit,
  centred = false,
  footer = true,
}: {
  children: React.ReactNode;
  /** The quiet link on the end side of the top bar. */
  exit?: { href: string; label: string };
  /** Centre the content vertically (the sign-in card). */
  centred?: boolean;
  /** The small links at the bottom (off when a sticky action bar owns the bottom edge). */
  footer?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className={`mx-auto flex w-full max-w-[calc(1200px+var(--y-gutter)*2)] flex-none items-center gap-3 px-(--y-gutter) ${
          centred && !exit ? "h-20 justify-center pt-6 md:h-24 md:pt-10" : "h-16 justify-between"
        }`}
      >
        <Brand href={paths.landing} />
        {exit ? (
          <Link href={exit.href} className="y-small y-fg-2 rounded-full px-3 py-2 font-medium hover:text-(--y-ink)">
            {exit.label}
          </Link>
        ) : null}
      </header>
      <main
        id="main"
        className={`flex w-full flex-1 flex-col px-(--y-gutter) ${centred ? "items-center pt-4 pb-6 md:pt-6 md:pb-10" : "pt-2 md:pt-6"}`}
      >
        {children}
      </main>
      {footer ? (
      <footer className="y-micro y-fg-2 flex flex-none flex-wrap items-center justify-center gap-x-4 gap-y-1 px-(--y-gutter) pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <span>Prototype with demo data</span>
        <Link href={paths.legal} className="y-link">
          Terms and privacy
        </Link>
        <Link href={paths.howItWorks} className="y-link">
          How Yapp works
        </Link>
      </footer>
      ) : null}
    </div>
  );
}
