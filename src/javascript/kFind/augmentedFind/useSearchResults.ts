import { useLazyQuery } from "@apollo/client";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import {
  SEARCH_QUERY,
  SITE_INDEX_QUERY,
  type SearchHit,
} from "../shared/searchQuery.ts";
import { getSiteKey, getSearchLanguage } from "../shared/searchUtils.ts";

// Module-level cache: site key → whether it has jmix:augmentedSearchIndexableSite.
// Populated once per site per page load — never re-queried.
const siteIndexCache = new Map<string, boolean>();

type UseSearchResultsReturn = {
  hits: SearchHit[];
  totalHits: number;
  loading: boolean;
  isSiteIndexed: boolean | null;
  searchEnabled: boolean;
  /** Ref holding the query string of the last completed search. */
  currentQueryRef: MutableRefObject<string>;
  /** Immediately trigger a search, bypassing the debounce (e.g. on Enter). */
  triggerSearch: (value: string) => void;
  /** Load the next page — called by useInfiniteScroll when the sentinel is visible. */
  loadNextPage: () => void;
};

export const useSearchResults = (
  searchValue: string,
): UseSearchResultsReturn => {
  const [allHits, setAllHits] = useState<SearchHit[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isSiteIndexed, setIsSiteIndexed] = useState<boolean | null>(() => {
    const cached = siteIndexCache.get(getSiteKey());
    return cached !== undefined ? cached : null;
  });

  // Refs keep latest values accessible to the Apollo onCompleted callback and
  // the IntersectionObserver without causing them to be re-created on each render.
  const currentQueryRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingPageRef = useRef(0);

  const [runSearch, { loading }] = useLazyQuery<{
    search: { results: { totalHits: number; hits: SearchHit[] } };
  }>(SEARCH_QUERY, {
    fetchPolicy: "network-only",
    onCompleted: (result) => {
      const newHits = result?.search?.results?.hits ?? [];
      const total = result?.search?.results?.totalHits ?? 0;
      setTotalHits(total);
      setAllHits((prev) => {
        // Page 0 = fresh search → replace. Page N > 0 → append.
        const updated =
          loadingPageRef.current === 0 ? newHits : [...prev, ...newHits];
        setHasMore(updated.length < total);
        return updated;
      });
    },
  });

  const [checkSiteIndex] = useLazyQuery<{
    jcr: { nodeByPath: { isNodeType: boolean } };
  }>(SITE_INDEX_QUERY, {
    fetchPolicy: "cache-first",
    onCompleted: (result) => {
      const indexed = result?.jcr?.nodeByPath?.isNodeType ?? false;
      siteIndexCache.set(getSiteKey(), indexed);
      setIsSiteIndexed(indexed);
    },
  });

  // Check site indexing status once on mount (skip if already cached).
  useEffect(() => {
    if (isSiteIndexed === null) {
      void checkSiteIndex({ variables: { path: `/sites/${getSiteKey()}` } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerSearch = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 3) return;
    currentQueryRef.current = trimmed;
    loadingPageRef.current = 0;
    void runSearch({
      variables: {
        q: trimmed,
        siteKeys: [getSiteKey()],
        language: getSearchLanguage(),
        page: 0,
      },
    });
  };

  const loadNextPage = () => {
    if (loading || !hasMore || !currentQueryRef.current) return;
    const nextPage = loadingPageRef.current + 1;
    loadingPageRef.current = nextPage;
    void runSearch({
      variables: {
        q: currentQueryRef.current,
        siteKeys: [getSiteKey()],
        language: getSearchLanguage(),
        page: nextPage,
      },
    });
  };

  // Clears all result state when the query is too short or input is cleared.
  const resetSearch = () => {
    setAllHits([]);
    setTotalHits(0);
    setHasMore(false);
    currentQueryRef.current = "";
  };

  // Debounce: wait 300 ms after the user stops typing before firing the query.
  // If input drops below 3 chars, reset immediately without debouncing.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchValue.trim().length < 3) {
      resetSearch();
      return;
    }
    debounceRef.current = setTimeout(() => {
      triggerSearch(searchValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return {
    hits: allHits,
    totalHits,
    loading,
    isSiteIndexed,
    searchEnabled: isSiteIndexed !== false,
    currentQueryRef,
    triggerSearch,
    loadNextPage,
  };
};
