"use client";

import { MailPlus, MessageCircle, Search, UserRound, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { CollaboratorRow } from "@/components/business/collaborator-row";
import { InviteToRequestSheet } from "@/components/business/invite-sheet";
import { useMessageCreator } from "@/components/business/message-creator";
import { RowMenu } from "@/components/business/row-menu";
import { CreatorCard } from "@/components/domain/creator-card";
import { AppShell } from "@/components/shell/app-shell";
import { Block } from "@/components/ui/block";
import { EmptyState } from "@/components/ui/empty-state";
import { Page, PageHeader } from "@/components/ui/page";
import { PillButton } from "@/components/ui/pill-button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { paths } from "@/lib/paths";
import { cityById, creatorById, me, pastCollaborators, savedCreatorIds, startingPrice } from "@/lib/selectors";
import { useDemo, useHydrated } from "@/lib/store";
import { creatorKindById, languageById } from "@/lib/taxonomy";
import type { Creator } from "@/lib/types";

type Tab = "saved" | "worked";
type Sort = "recent" | "rating" | "price";

export default function SavedCreatorsPage() {
  return (
    <AppShell>
      <Suspense fallback={<CreatorsSkeleton />}>
        <SavedCreators />
      </Suspense>
    </AppShell>
  );
}

/** Lower-cased text a search can match: name, handle, city, kind, languages, headline. */
function haystack(creator: Creator) {
  return [
    creator.name,
    creator.handle,
    cityById(creator.cityId)?.name ?? "",
    creatorKindById[creator.kind].name,
    creator.headline,
    ...creator.languages.map((id) => languageById[id].name),
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

function SavedCreators() {
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

  const myCreatorId = me.ids(s).creatorId;
  const saved = savedCreatorIds(s)
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
        description="Book someone again and your product context and learnings go with them."
        actions={
          <PillButton href={paths.explore("creators")} variant="neon" arrow icon={<Search size={18} aria-hidden />}>
            Find creators
          </PillButton>
        }
      />

      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
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
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          <div className="relative min-w-[13rem] flex-1">
            <Search size={18} aria-hidden className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search creators"
              aria-label="Search by name, city or language"
              className="y-input !ps-12"
              autoComplete="off"
            />
          </div>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            aria-label="Sort by"
            className="y-input !w-auto flex-1 sm:flex-none"
          >
            <option value="recent">{tab === "saved" ? "Recently saved" : "Most recent"}</option>
            <option value="rating">Highest rated</option>
            <option value="price">Lowest price</option>
          </select>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {needle ? `${shownCount} of ${total} match “${query.trim()}”` : ""}
      </p>

      {tab === "saved" ? (
        saved.length === 0 ? (
          <Block tone="paper" pad="md">
            <EmptyState
              shape="dome"
              tint="violet"
              face="smile"
              title="No saved creators yet"
              body="Tap the heart on any creator to keep them here for your next order."
              action={
                <PillButton href={paths.explore("creators")} variant="contrast" icon={<Search size={18} aria-hidden />}>
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
                <SavedActions
                  creator={creator}
                  own={creator.id === myCreatorId}
                  onInvite={() => setInviting(creator)}
                />
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
            title="No finished work yet"
            body="When you approve a video, the creator shows up here so you can book them again with your product context and feedback."
            action={
              <PillButton href={paths.work("ordered")} variant="contrast">
                See what you ordered
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

/** Under a saved creator's card: invite (primary) and a More menu for the rest. */
function SavedActions({ creator, own, onInvite }: { creator: Creator; own: boolean; onInvite: () => void }) {
  const message = useMessageCreator(creator);
  // Your own creator profile (if you saved it): no inviting or messaging yourself.
  if (own) {
    return (
      <PillButton variant="outline" size="sm" href={paths.creator(creator.handle)} icon={<UserRound size={16} aria-hidden />}>
        Your public profile
      </PillButton>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <PillButton
        variant="outline"
        size="sm"
        className="flex-1"
        icon={<MailPlus size={16} aria-hidden />}
        onClick={onInvite}
        aria-label={`Invite ${creator.firstName} to a custom order`}
      >
        Invite to a custom order
      </PillButton>
      <RowMenu
        label={`More for ${creator.firstName}`}
        items={[
          {
            label: message.label,
            icon: <MessageCircle size={16} aria-hidden />,
            href: message.href,
            onSelect: message.start,
          },
          { label: "View profile", icon: <UserRound size={16} aria-hidden />, href: paths.creator(creator.handle) },
        ]}
      />
      {message.sheet}
    </div>
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
        body="Try a first name, a city like Toronto, or a language like Spanish."
        action={
          <PillButton variant="outline" icon={<X size={16} aria-hidden />} onClick={onClear}>
            Clear search
          </PillButton>
        }
      />
    </Block>
  );
}
