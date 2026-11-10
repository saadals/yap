import { paths } from "@/lib/paths";
import { me } from "@/lib/selectors";
import type { DemoState } from "@/lib/store";

/** The layout switch (round 3 answers, item 54): phones below it, desktop at and above. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

export type DesktopHome = "discover" | "work";

/**
 * Where a signed-in account lands on desktop (answers, items 11 and 43): Discover, except an
 * account that only makes videos (a personal account with a creator profile, like Layla) goes to
 * Work. Such an account can still open Discover at /discover.
 */
export function desktopHomeOf(s: DemoState): DesktopHome {
  const account = me.account(s);
  return account.kind === "personal" && account.creatorId ? "work" : "discover";
}

/** The Discover link for this account: "/" when "/" is Discover, "/discover" otherwise. */
export const discoverHrefFor = (s: DemoState, signedIn: boolean) =>
  signedIn && desktopHomeOf(s) === "discover" ? paths.landing : paths.discover;
