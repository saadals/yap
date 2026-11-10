import { Clapperboard, Cpu, FlaskConical, Rocket, Send, type LucideIcon } from "lucide-react";

import { paths } from "@/lib/paths";

/**
 * What Yapp offers brands (round 3 answers, item 37): the Services index and the five service pages
 * read this one list. Creator Network, Amplified ads and For growth agencies are hidden until the
 * product can do them, so they aren't listed here and nothing links to them.
 */
export type ServiceSlug = "ugc-ads" | "native-posts" | "hook-lab" | "go-to-market";
export type AudienceSlug = "tech-teams";
export type CatalogueSlug = ServiceSlug | AudienceSlug;

/** Which kind of order a service runs on (interface names from `orderKinds`). */
export type ServiceOrderKind = "custom" | "campaign" | "both";

export type ServiceEntry = {
  slug: CatalogueSlug;
  href: string;
  title: string;
  /** One line, for the index. */
  description: string;
  icon: LucideIcon;
  runsOn: ServiceOrderKind;
};

export const services: ServiceEntry[] = [
  {
    slug: "ugc-ads",
    href: paths.service("ugc-ads"),
    title: "UGC ads",
    description: "Scroll-stopping videos built for paid social",
    icon: Clapperboard,
    runsOn: "custom",
  },
  {
    slug: "native-posts",
    href: paths.service("native-posts"),
    title: "Native posts",
    description: "Creators post your product on their own accounts",
    icon: Send,
    runsOn: "campaign",
  },
  {
    slug: "hook-lab",
    href: paths.service("hook-lab"),
    title: "Hook Lab",
    description: "Several openings for one ad, ready to test",
    icon: FlaskConical,
    runsOn: "custom",
  },
  {
    slug: "go-to-market",
    href: paths.service("go-to-market"),
    title: "Go to market",
    description: "Ten or more creators on one launch brief",
    icon: Rocket,
    runsOn: "campaign",
  },
  {
    slug: "tech-teams",
    href: paths.forTechTeams,
    title: "For tech teams",
    description: "Apps, SaaS, AI tools and gadgets, explained by creators",
    icon: Cpu,
    runsOn: "both",
  },
];

export const serviceBySlug = Object.fromEntries(services.map((entry) => [entry.slug, entry])) as Record<
  CatalogueSlug,
  ServiceEntry
>;
