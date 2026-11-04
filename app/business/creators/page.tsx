"use client";

import { MailPlus, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { CollaboratorRow } from "@/components/business/collaborator-row";
import { InviteToRequestSheet } from "@/components/business/invite-sheet";
import { MessageCreatorButton } from "@/components/business/message-creator";
import { CreatorCard } from "@/components/domain/creator-card";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField } from "@/components/ui/field";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { cityById, creatorById, pastCollaborators, startingPrice } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import { creatorKindById, languageById } from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

type Tab = "saved" | "worked";
type Sort = "recent" | "rating" | "price";

export default function YourCreatorsPage() {
  return (
    <AppShell role="business">
      <Suspense fallback={<CreatorsSkeleton />}>
        <YourCreators />
      </Suspense>
    </AppShell>
  );
}

/** Lower-cased text a search can match: name, handle, city, kind, dialects, headline. */
function haystack(creator: Creator) {
  return [
    creator.name,
    creator.handle,
    cityById(creator.cityId)?.name ?? "",
    creatorKindById[creator.kind].name,
    creator.headline,
    ...creator.languages.flatMap((id) => [languageById[id].name, languageById[id].short]),
  ]
    .join(" ")
    .toLowerCase();
}

function sortCreators<T>(list: T[], sort: Sort, get: (item: T) => Creator): T[] {
  if (sort === "recent") return list;
  return [...list].sort((a, b) =>
    sort === "rating"
      ? get(b).rating - get(a).rating || get(b).reviewCount - get(a).reviewCount
      : startingPrice(get(a)) - startingPrice(get(b)),
  );
}

function CreatorsSkeleton() {
  return (
    <Page>
      <div className="flex flex-col gap-3 px-1 pt-2 pb-6" aria-busy="true" aria-label="Loading your creators">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden>
        {[0, 1, 2, 3].map((key) => (
          <div key={key} data-tone="paper" className="y-block flex flex-col gap-3 p-2 pb-4">
            <Skeleton className="aspect-[4/5] w-full !rounded-(--y-r-tile)" />
            <Skeleton className="mx-2 h-5 w-2/3" />
            <Skeleton className="mx-2 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </Page>
  );
}

function YourCreators() {
  const s = useDemo();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: Tab = params.get("tab") === "worked" ? "worked" : "saved";
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [inviting, setInviting] = useState<Creator | null>(null);

  const setTab = (next: Tab) =>
    router.replace(next === "worked" ? `${pathname}?tab=worked` : pathname, { scroll: false });

  const saved = s.savedCreatorIds
    .map((id) => creatorById(s, id))
    .filter((c): c is Creator => c !== undefined);
  const worked = pastCollaborators(s);
  const needle = query.trim().toLowerCase();
  const matches = (creator: Creator) => !needle || haystack(creator).includes(needle);
  const savedShown = sortCreators(saved.filter(matches), sort, (c) => c);
  const workedShown = sortCreators(
    worked.filter((entry) => matches(entry.creator)),
    sort,
    (entry) => entry.creator,
  );
  const total = tab === "saved" ? saved.length : worked.length;
  const shownCount = tab === "saved" ? savedShown.length : workedShown.length;

  if (!hydrated) return <CreatorsSkeleton />;

  return (
    <Page>
      <PageHeader
        title="Your creators"
        description="People you've saved and people you've worked with. Book someone again in two taps: your product context and feedback go with it."
        actions={
          <PillButton href="/creators" variant="neon" arrow icon={<Search size={18} aria-hidden />}>
            Find creators
          </PillButton>
        }
      />

      <Block tone="paper" pad="sm" className="mb-2 flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex flex-col gap-2">
          <span className="y-label" aria-hidden>
            Show
          </span>
          <SegmentedToggle
            label="Show"
            size="md"
            value={tab}
            onChange={setTab}
            options={[
              { value: "saved", label: `Saved · ${saved.length}` },
              { value: "worked", label: `Worked with · ${worked.length}` },
            ]}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label htmlFor="creator-search" className="y-label">
            Search
          </label>
          <div className="relative">
            <Search size={18} aria-hidden className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2" />
            <input
              id="creator-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, city or dialect"
              className="y-input !ps-12"
              autoComplete="off"
            />
          </div>
        </div>
        <SelectField
          label="Sort by"
          optionalLabel={false}
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          className="lg:w-56"
          options={[
            { value: "recent", label: tab === "saved" ? "Recently saved" : "Most recent" },
            { value: "rating", label: "Highest rated" },
            { value: "price", label: "Lowest starting price" },
          ]}
        />
      </Block>

      <p className="y-small y-fg-2 px-1 pt-2 pb-3" role="status" aria-live="polite">
        {needle
          ? `${shownCount} of ${total} match “${query.trim()}”`
          : tab === "saved"
            ? `${total} saved ${total === 1 ? "creator" : "creators"}`
            : `${total} ${total === 1 ? "creator" : "creators"} you've finished work with`}
      </p>

      {tab === "saved" ? (
        saved.length === 0 ? (
          <Block tone="paper" pad="md">
            <EmptyState
              shape="dome"
              tint="violet"
              face="smile"
              title="No saved creators yet"
              body="Tap the heart on any creator to keep them here for your next request."
              action={
                <PillButton href="/creators" variant="contrast" icon={<Search size={18} aria-hidden />}>
                  Browse creators
                </PillButton>
              }
            />
          </Block>
        ) : savedShown.length === 0 ? (
          <NoMatches query={query} onClear={() => setQuery("")} />
        ) : (
          <ul className="grid gap-x-2 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {savedShown.map((creator) => (
              <li key={creator.id} className="flex flex-col gap-2">
                <CreatorCard creator={creator} className="flex-1" />
                <div className="flex items-center gap-2">
                  <PillButton
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    icon={<MailPlus size={16} aria-hidden />}
                    onClick={() => setInviting(creator)}
                    aria-label={`Invite ${creator.firstName} to a request`}
                  >
                    Invite to a request
                  </PillButton>
                  <MessageCreatorButton creator={creator} iconOnly />
                </div>
              </li>
            ))}
          </ul>
        )
      ) : worked.length === 0 ? (
        <Block tone="paper" pad="md">
          <EmptyState
            shape="pill"
            tint="coral"
            face="calm"
            title="No finished commissions yet"
            body="When you approve a video, the creator shows up here so you can book them again with your product context and feedback."
            action={
              <PillButton href="/business/commissions" variant="contrast">
                See your commissions
              </PillButton>
            }
          />
        </Block>
      ) : workedShown.length === 0 ? (
        <NoMatches query={query} onClear={() => setQuery("")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {workedShown.map((entry) => (
            <li key={entry.creator.id}>
              <CollaboratorRow entry={entry} />
            </li>
          ))}
        </ul>
      )}

      <InviteToRequestSheet creator={inviting} onClose={() => setInviting(null)} />
    </Page>
  );
}

function NoMatches({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <Block tone="paper" pad="md">
      <EmptyState
        shape="ball"
        tint="sea"
        face="focus"
        title={`No one matches “${query.trim()}”`}
        body="Try a first name, a city like Riyadh, or a dialect like Khaleeji."
        action={
          <PillButton variant="outline" icon={<X size={16} aria-hidden />} onClick={onClear}>
            Clear search
          </PillButton>
        }
      />
    </Block>
  );
}
