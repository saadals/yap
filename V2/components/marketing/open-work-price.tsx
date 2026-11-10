import { creatorNet, money, moneyExact, moneyRange, netRange } from "@/lib/format";
import { isCampaign } from "@/lib/selectors";
import type { ContentRequest } from "@/lib/types";

/**
 * The price of an open order as a creator reads it, with their net beside it (round 3 answers,
 * item 6): "$120 per Yapp · you earn $96" for a campaign, "$150–300 · you earn $120–240" for a
 * custom order's budget. Amounts come from lib/format.
 */
export function OpenWorkPrice({ request }: { request: ContentRequest }) {
  if (isCampaign(request) && request.campaign) {
    const price = request.campaign.pricePerVideo;
    return (
      <span className="y-small y-num flex flex-col items-end text-end">
        <span className="font-semibold">{money(price)} per Yapp</span>
        <span className="y-micro y-fg-2">you earn {moneyExact(creatorNet(price))}</span>
      </span>
    );
  }
  return (
    <span className="y-small y-num flex flex-col items-end text-end">
      <span className="font-semibold">{moneyRange(request.budget.min, request.budget.max)}</span>
      <span className="y-micro y-fg-2">you earn {netRange(request.budget.min, request.budget.max)}</span>
    </span>
  );
}
