/**
 * Hook for searching via Jahia's augmented-search GraphQL endpoint.
 *
 * Augmented search provides:
 * - Full-text indexing (Elasticsearch under the hood)
 * - Server-side pagination with totalHits count
 * - Highlighted excerpts in results
 *
 * This driver is only used when the site has the
 * `jmix:augmentedSearchIndexableSite` mixin (checked by useIsAugmentedAvailable).
 */
import { useLazyQuery } from "@apollo/client";
import { useRef, useState } from "react";
import { SEARCH_QUERY } from "./augmentedSearchQuery.ts";
import type { SearchHit, ContentSearchDriver } from "../shared/searchTypes.ts";
import { getSiteKey, getSearchLanguage } from "../shared/navigationUtils.ts";

const PAGE_SIZE = 10;

export const useAugmentedSearch = (): ContentSearchDriver => {
  const [allHits, setAllHits] = useState<SearchHit[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);
  // Tracks the current accumulated hits count without needing a state read inside onCompleted.
  const allHitsRef = useRef<SearchHit[]>(allHits);
  allHitsRef.current = allHits;

  const [runSearch, { loading }] = useLazyQuery<{
    search: { results: { totalHits: number; hits: SearchHit[] } };
  }>(SEARCH_QUERY, {
    fetchPolicy: "network-only",
    onCompleted: (result) => {
      const newHits = result?.search?.results?.hits ?? [];
      const total = result?.search?.results?.totalHits ?? 0;
      const page = pageRef.current;
      const nextHits =
        page === 0 ? newHits : [...allHitsRef.current, ...newHits];
      setTotalHits(total);
      setHasMore(nextHits.length < total);
      setAllHits(nextHits);
    },
  });

  return {
    hits: allHits,
    totalHits,
    loading,
    hasMore,
    search: (query, page) => {
      pageRef.current = page;
      void runSearch({
        variables: {
          q: query,
          siteKeys: [getSiteKey()],
          language: getSearchLanguage(),
          size: PAGE_SIZE,
          page,
        },
      });
    },
    reset: () => {
      setAllHits([]);
      setTotalHits(0);
      setHasMore(false);
    },
  };
};
