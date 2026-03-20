import { useLazyQuery } from "@apollo/client";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { SITE_INDEX_QUERY } from "../augmentedFind/augmentedFindQuery.ts";
import { useAugmentedSearch } from "../augmentedFind/useAugmentedSearch.ts";
import { useJcrSearch } from "../jcrFind/useJcrSearch.ts";
import {
  getSiteKey,
  getMinSearchChars,
  getAugmentedFindDelay,
  getJcrFindDelay,
} from "./searchUtils.ts";
import type { SearchHit } from "./searchTypes.ts";

// Module-level cache: site key → whether augmented search is available.
// Populated once per site per page load — never re-queried.
const siteIndexCache = new Map<string, boolean>();

type UseContentSearchReturn = {
  hits: SearchHit[];
  totalHits: number;
  loading: boolean;
  hasMore: boolean;
  currentQueryRef: MutableRefObject<string>;
  triggerSearch: (value: string) => void;
  loadNextPage: () => void;
};

export const useContentSearch = (
  searchValue: string,
): UseContentSearchReturn => {
  const [isAugmented, setIsAugmented] = useState(() => {
    const cached = siteIndexCache.get(getSiteKey());
    return cached !== undefined ? cached : true;
  });
  const isAugmentedRef = useRef(isAugmented);
  isAugmentedRef.current = isAugmented;

  const [checkDone, setCheckDone] = useState(
    () => siteIndexCache.get(getSiteKey()) !== undefined,
  );
  const checkDoneRef = useRef(checkDone);
  checkDoneRef.current = checkDone;

  const currentQueryRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageRef = useRef(0);

  const augmented = useAugmentedSearch();
  const jcr = useJcrSearch();

  // --- Site index check ---
  const [checkSiteIndex] = useLazyQuery<{
    jcr: { nodeByPath: { isNodeType: boolean } };
  }>(SITE_INDEX_QUERY, {
    fetchPolicy: "cache-first",
    onCompleted: (result) => {
      const indexed = result?.jcr?.nodeByPath?.isNodeType ?? false;
      siteIndexCache.set(getSiteKey(), indexed);
      setIsAugmented(indexed);
      setCheckDone(true);
    },
  });

  useEffect(() => {
    if (siteIndexCache.get(getSiteKey()) === undefined) {
      void checkSiteIndex({ variables: { path: `/sites/${getSiteKey()}` } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `active` is derived from state so it updates on re-render when the check resolves.
  const active = isAugmented ? augmented : jcr;

  const triggerSearch = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < getMinSearchChars() || !checkDoneRef.current) return;
    currentQueryRef.current = trimmed;
    pageRef.current = 0;
    const driver = isAugmentedRef.current ? augmented : jcr;
    driver.search(trimmed, 0);
  };

  const loadNextPage = () => {
    const driver = isAugmentedRef.current ? augmented : jcr;
    if (driver.loading || !driver.hasMore || !currentQueryRef.current) return;
    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;
    driver.search(currentQueryRef.current, nextPage);
  };

  const resetSearch = () => {
    augmented.reset();
    jcr.reset();
    currentQueryRef.current = "";
  };

  // Once the site index check completes, fire a search if the user already typed enough.
  useEffect(() => {
    if (!checkDone) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const trimmed = searchValue.trim();
    if (trimmed.length >= getMinSearchChars()) {
      triggerSearch(searchValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkDone]);

  // Debounce: wait after the user stops typing before firing the query.
  // Delay depends on whether augmented or JCR search is active.
  // If input drops below the minimum, reset immediately without debouncing.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchValue.trim().length < getMinSearchChars()) {
      resetSearch();
      return;
    }
    const delay = isAugmentedRef.current
      ? getAugmentedFindDelay()
      : getJcrFindDelay();
    debounceRef.current = setTimeout(() => {
      triggerSearch(searchValue);
    }, delay);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  return {
    hits: active.hits,
    totalHits: active.totalHits,
    loading: active.loading,
    hasMore: active.hasMore,
    currentQueryRef,
    triggerSearch,
    loadNextPage,
  };
};
