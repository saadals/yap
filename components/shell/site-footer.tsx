"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Block } from "@/components/ui/block";
import { BrandMark } from "@/components/ui/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const columns = [
  {
    title: "For businesses",
    links: [
      { label: "Find creators", href: "/creators" },
      { label: "Post a request", href: "/business/requests/new" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Pricing", href: "/how-it-works#pricing" },
    ],
  },
  {
    title: "For creators",
    links: [
      { label: "Become a creator", href: "/for-creators" },
      { label: "Open requests", href: "/creator/opportunities" },
      { label: "Creator payouts", href: "/for-creators#payouts" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help centre", href: "/how-it-works#faq" },
      { label: "Payment protection", href: "/how-it-works#protection" },
      { label: "Terms", href: "/how-it-works#faq" },
      { label: "Privacy", href: "/how-it-works#faq" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="px-(--y-gutter) pb-(--y-gutter)">
      <Block tone="night" pad="lg" className="mx-auto max-w-[1360px] overflow-hidden">
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
              <h2 className="y-micro y-fg-3 mb-1">{column.title}</h2>
              {column.links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="y-small w-fit py-1 underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <div className="mt-12 flex items-end gap-3 border-t border-(--b-line) pt-6">
          <BrandMark size={64} />
          <span
            className="y-display text-[64px] leading-[0.8] font-bold tracking-[-0.05em] md:text-[132px]"
            style={{ fontFamily: "var(--y-font-display), sans-serif" }}
          >
            yapp
          </span>
        </div>
        <div className="y-micro y-fg-3 mt-6 flex flex-wrap justify-between gap-2">
          <span>© 2026 Yapp. Made for teams building in the Arab world.</span>
          <span>Prototype with demo data. All people and companies are fictional.</span>
        </div>
      </Block>
    </footer>
  );
}
