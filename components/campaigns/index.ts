/**
 * UGC campaigns (PM spec "UGC Campaign Flow"). Public surface used by routes:
 * - <CampaignWizard />: full page for /orders/new?type=campaign (renders its own focused AppShell;
 *   reads ?product= from the URL; must sit inside <Suspense>).
 * - <CampaignOrderView request />: the body of /orders/[id] for a campaign. The owner manages it
 *   (slots, review copies, tier, close); everyone else reads it and takes a slot.
 */
export { CampaignWizard } from "./campaign-wizard";
export { CampaignOrderView } from "./campaign-order-view";
