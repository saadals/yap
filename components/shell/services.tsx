import { Clapperboard, Cpu, FlaskConical, Rocket, Send, type LucideIcon } from "lucide-react";

import { paths } from "@/lib/paths";

/**
 * What Yapp offers brands: the Services menu, the footer's Services column, the More page and the
 * service pages all read this one list (Site-wide 5.8.1; round 3 answers, item 37). Creator
 * Network, Amplified ads and For growth agencies are hidden until the product can do them: they are
 * not listed here, so nothing links to them.
 */
export type ServiceSlug = "ugc-ads" | "native-posts" | "hook-lab" | "go-to-market";
export type AudienceSlug = "tech-teams";

export type ServiceEntry = {
  slug: string;
  href: string;
  title: string;
  /** One line, for the menu and the More page. */
  description: string;
  icon: LucideIcon;
  badge?: string;
};

export const services: (ServiceEntry & { slug: ServiceSlug })[] = [
  {
    slug: "ugc-ads",
    href: paths.service("ugc-ads"),
    title: "UGC ads",
    description: "Scroll-stopping videos built for paid social",
    icon: Clapperboard,
    badge: "Most popular",
  },
  {
    slug: "native-posts",
    href: paths.service("native-posts"),
    title: "Native posts",
    description: "Creators post your product on their own accounts",
    icon: Send,
  },
  {
    slug: "hook-lab",
    href: paths.service("hook-lab"),
    title: "Hook Lab",
    description: "Several openings for one ad, ready to test",
    icon: FlaskConical,
  },
  {
    slug: "go-to-market",
    href: paths.service("go-to-market"),
    title: "Go to market",
    description: "Ten or more creators on one launch brief",
    icon: Rocket,
  },
];

export const audiences: (ServiceEntry & { slug: AudienceSlug })[] = [
  {
    slug: "tech-teams",
    href: paths.audience("tech-teams"),
    title: "For tech teams",
    description: "Apps, SaaS, AI tools and gadgets",
    icon: Cpu,
  },
];

/** True on a service or audience page: the Services trigger shows the green dot there. */
export const isServicesPath = (pathname: string) =>
  pathname.startsWith("/services/") || pathname.startsWith("/for/");
