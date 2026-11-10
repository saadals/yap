import type { Metadata } from "next";

import { ServicePage } from "@/components/marketing/service-page";

export const metadata: Metadata = {
  title: "For tech teams",
  description: "Short creator videos for apps, SaaS, AI tools, fintech, gadgets, gaming, health tech and e-commerce tech.",
};

export default function TechTeamsPage() {
  return <ServicePage slug="tech-teams" />;
}
