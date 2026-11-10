"use client";

import Link from "next/link";

import { Brand, Lockup } from "@/components/ui/brand";
import { paths } from "@/lib/paths";

import { regionName, useRegion } from "./region";
import { audiences, services } from "./services";

/** Which footer a shell draws (Site-wide 5.6.1; round 3 answers, item 40). Phones never get one. */
export type FooterKind = "full" | "compact" | "none";

export const COPYRIGHT = "© 2026 Line Node Technologies, Canada. All rights reserved.";
export const PROTOTYPE_NOTE = "Prototype with demo data. All people and companies are fictional.";

/**
 * The Site-wide list of footer columns, with only the links whose page exists (answers, item 22):
 * the rest of the preview's links (careers, press, help centre, pricing, the five policies…) come
 * back when their pages do. Legal is one link to the index of every document.
 */
const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Services",
    links: [...services, ...audiences].map((entry) => ({ label: entry.title, href: entry.href })),
  },
  {
    title: "Product",
    links: [
      { label: "Discover", href: paths.discover },
      { label: "Work", href: paths.work() },
      { label: "How it works", href: paths.howItWorks },
    ],
  },
  { title: "Company", links: [{ label: "About us", href: paths.about }] },
  {
    title: "Resources",
    links: [
      { label: "FAQ", href: paths.faq },
      { label: "For creators", href: paths.forCreators },
    ],
  },
  { title: "Legal", links: [{ label: "All legal documents", href: paths.legal }] },
];

/** The dark footer of the previews: public pages, the landing's other pages and Discover. Desktop only. */
export function SiteFooter() {
  const region = useRegion();
  return (
    <footer className="y-foot max-lg:hidden" data-tone="night">
      <div className="y-foot-in">
        <div className="y-foot-top">
          <div className="y-foot-brand">
            <Brand href={paths.landing} tone="dark" />
            <p>Short videos from real creators, for tech brands across the US &amp; Canada.</p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title} className="y-foot-col">
              <h2>{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="y-foot-bot">
          <span>{COPYRIGHT}</span>
          <span>{PROTOTYPE_NOTE}</span>
          <span>{regionName(region)} · English</span>
        </div>
      </div>
    </footer>
  );
}

/** One quiet row under signed-in pages on desktop: the logo, the legal link and the © line. */
export function CompactFooter() {
  return (
    <footer className="y-foot-compact max-lg:hidden">
      <div className="y-foot-compact-in">
        <Link href={paths.landing} aria-label="Yapping home" className="y-foot-compact-logo">
          <Lockup size={24} tone="light" />
        </Link>
        <Link href={paths.legal} className="y-foot-compact-link">
          All legal documents
        </Link>
        <span className="y-foot-compact-copy">{COPYRIGHT}</span>
      </div>
    </footer>
  );
}

/** Draws the footer a shell asked for. */
export function ShellFooter({ kind }: { kind: FooterKind }) {
  if (kind === "full") return <SiteFooter />;
  if (kind === "compact") return <CompactFooter />;
  return null;
}
