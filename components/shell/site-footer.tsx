"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Block } from "@/components/ui/block";
import { Lockup } from "@/components/ui/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { paths } from "@/lib/paths";

const columns = [
  {
    title: "For businesses",
    links: [
      { label: "Find creators", href: paths.creators },
      { label: "Place an order", href: paths.newOrder() },
      { label: "How it works", href: paths.howItWorks },
      { label: "Pricing", href: "/how-it-works#pricing" },
    ],
  },
  {
    title: "For creators",
    links: [
      { label: "Make videos on Yapp", href: paths.forCreators },
      { label: "Open orders", href: paths.explore("orders") },
      { label: "Creator payouts", href: "/for-creators#payouts" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help centre", href: "/how-it-works#faq" },
      { label: "Payment protection", href: "/how-it-works#protection" },
      { label: "Terms", href: paths.legal },
      { label: "Privacy", href: paths.legal },
    ],
  },
];

/** Always dark ("light black" #141416 in both themes), so the logo is the on-dark file. */
export function SiteFooter() {
  return (
    <footer className="px-(--y-gutter) pb-(--y-gutter)">
      <Block tone="night" pad="lg" className="mx-auto max-w-[1360px] overflow-hidden bg-(--y-footer)">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="flex flex-col gap-5 md:col-span-5">
            <p className="y-display y-title max-w-sm">
              Social videos for your app, made by people your customers trust.
            </p>
            <p className="y-small y-fg-2 flex max-w-sm items-start gap-2">
              <ShieldCheck size={18} className="mt-0.5 flex-none" aria-hidden />
              Every payment is held safely until you approve the work. Full refund if a creator
              doesn&apos;t deliver.
            </p>
            <ThemeToggle />
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2 md:col-span-2">
              <h2 className="y-eyebrow mb-1">{column.title}</h2>
              {column.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="y-small w-fit py-1 underline-offset-4 hover:text-(--y-neon) hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="mt-12 border-t border-(--b-line) pt-8">
          <Lockup size={80} tone="dark" className="h-12 w-auto md:h-20" />
        </div>
        <div className="y-micro y-fg-2 mt-6 flex flex-wrap justify-between gap-2">
          <span>© 2026 Line Node Technologies, Canada. All rights reserved.</span>
          <span>Prototype with demo data. All people and companies are fictional.</span>
        </div>
      </Block>
    </footer>
  );
}
