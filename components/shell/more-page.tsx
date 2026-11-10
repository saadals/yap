"use client";

import {
  Building2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Compass,
  DollarSign,
  FileText,
  Globe,
  Info,
  LayoutGrid,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { paths } from "@/lib/paths";

import { DEFAULT_REGION, currencies, regions, setRegion, useRegion, type RegionId } from "./region";
import { audiences, services } from "./services";
import { COPYRIGHT, PROTOTYPE_NOTE } from "./site-footer";

type Row = { label: string; href: string; icon: React.ReactNode };

const icon = (Icon: typeof Compass) => <Icon size={20} aria-hidden />;

/**
 * Groups with a destination only (round 3 answers, item 41): rows for the native app, Appearance,
 * the social links and every page that doesn't exist yet are left out.
 */
const groups: { title: string; rows: Row[] }[] = [
  {
    title: "Services",
    rows: [...services, ...audiences].map((entry) => ({
      label: entry.title,
      href: entry.href,
      icon: <entry.icon size={20} aria-hidden />,
    })),
  },
  {
    title: "Product",
    rows: [
      { label: "Discover", href: paths.discover, icon: icon(Compass) },
      { label: "How it works", href: paths.howItWorks, icon: icon(LayoutGrid) },
      { label: "For creators", href: paths.forCreators, icon: icon(UserRound) },
    ],
  },
  { title: "Help", rows: [{ label: "FAQ", href: paths.faq, icon: icon(CircleHelp) }] },
  { title: "Company", rows: [{ label: "About us", href: paths.about, icon: icon(Building2) }] },
  { title: "Legal", rows: [{ label: "All legal documents", href: paths.legal, icon: icon(FileText) }] },
];

/**
 * /more (phones): what the desktop footer holds, as grouped rows (Site-wide 5.6.2), plus Region and
 * Currency as preferences remembered on this device. On desktop "/more" goes to "/".
 */
export function MorePage() {
  const region = useRegion();
  const regionId = useId();
  return (
    <div className="y-more">
      <h1 className="y-display y-t-display px-1">More</h1>

      {groups.map((group) => (
        <section key={group.title} className="y-more-group" aria-labelledby={`more-${group.title}`}>
          <h2 id={`more-${group.title}`} className="y-eyebrow">
            {group.title}
          </h2>
          <ul className="y-more-card">
            {group.rows.map((row) => (
              <li key={row.label} className="contents">
                <Link href={row.href} className="y-more-row">
                  {row.icon}
                  <span className="y-more-grow">{row.label}</span>
                  <ChevronRight size={18} aria-hidden className="y-fg-3 y-flip" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="y-more-group" aria-labelledby="more-preferences">
        <h2 id="more-preferences" className="y-eyebrow">
          Preferences
        </h2>
        <div className="y-more-card">
          <div className="y-more-row">
            <Globe size={20} aria-hidden />
            <label htmlFor={regionId} className="y-more-grow">
              Region
            </label>
            <span className="y-more-select">
              <span aria-hidden>{regions.find((r) => r.id === region)?.name}</span>
              <ChevronDown size={16} aria-hidden />
              <select
                id={regionId}
                value={region}
                onChange={(event) => setRegion((event.target.value as RegionId) || DEFAULT_REGION)}
              >
                {regions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </span>
          </div>
          <div className="y-more-row">
            <DollarSign size={20} aria-hidden />
            <span className="y-more-grow">Currency</span>
            <span className="y-more-value">{currencies[0].name}</span>
          </div>
        </div>
        <p className="y-small y-fg-2 flex items-start gap-2 px-1">
          <Info size={16} aria-hidden className="mt-0.5 flex-none" />
          Remembered on this device. Prices are in US dollars for now.
        </p>
      </section>

      <p className="y-more-copy">
        {COPYRIGHT}
        <br />
        {PROTOTYPE_NOTE}
      </p>
    </div>
  );
}
