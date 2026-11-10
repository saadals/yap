import { HomeRoute } from "@/components/shell/home-route";

/**
 * "/": the bubble landing signed out; signed in, Discover on desktop (Work for an account that only
 * makes videos) and the feed on phones. See `HomeRoute`.
 */
export default function RootPage() {
  return <HomeRoute />;
}
