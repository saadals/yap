import { Block } from "@/components/ui/block";
import { platformList } from "@/components/domain/chips";
import { compact, monthYearOf } from "@/lib/format";
import { campaignPlatformById, formatById, nicheById } from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

/**
 * Bio plus the facts a brand checks before ordering. Connected accounts show the platform and
 * verified real followers only, never a handle or a link out (everything stays on Yapp).
 */
export function AboutBlock({ creator }: { creator: Creator }) {
  const verifiedSocials = (creator.socials ?? []).filter((social) => social.verified);
  const facts = [
    { label: "Formats", value: creator.formats.map((id) => formatById[id].name).join(", ") },
    { label: "Categories", value: creator.niches.map((id) => nicheById[id].name).join(", ") },
    { label: "Makes videos for", value: platformList(creator.platforms) },
    { label: "Equipment", value: creator.equipment.join(", ") },
    {
      label: "Verified followers",
      value: verifiedSocials
        .map((social) => `${compact(social.followers)} on ${campaignPlatformById[social.platform].name}`)
        .join(" · "),
    },
    { label: "On Yapp since", value: monthYearOf(creator.memberSince) },
  ].filter((fact) => fact.value);

  return (
    <Block tone="paper" pad="md" className="flex flex-col gap-5" aria-labelledby="about-heading">
      <div className="flex flex-col gap-2">
        <h2 id="about-heading" className="y-display y-title">
          About {creator.firstName}
        </h2>
        <p className={`y-body max-w-[62ch] ${creator.bio ? "" : "y-fg-2"}`}>
          {creator.bio || `${creator.firstName} hasn't written a bio yet.`}
        </p>
      </div>
      <dl className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-0.5">
            <dt className="y-micro y-fg-2">{fact.label}</dt>
            <dd className="y-small">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </Block>
  );
}
