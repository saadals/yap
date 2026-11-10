/**
 * UGC campaigns (PM spec "UGC Campaign Flow"). Public surface used by routes:
 * - <CampaignOrderView request />: the body of /orders/[id] for a campaign. The owner manages it
 *   (slots, review copies, tier, close); everyone else reads it and picks a slot.
 * New campaigns are posted from the one new-order form (components/new-order).
 */
export { CampaignOrderView } from "./campaign-order-view";
