import { useEffect, useRef } from "react";
import { useIsAugmentedAvailable } from "./useIsAugmentedAvailable.ts";
import { useAugmentedSearch } from "../augmented/useAugmentedSearch.ts";
import { useJcrSearch } from "../jcr/useJcrSearch.ts";
import { useJcrMediaSearch } from "../jcr/useJcrMediaSearch.ts";
import { useJcrMainResourcesSearch } from "../jcr/useJcrMainResourcesSearch.ts";
import { useFeatureSearch } from "../features/useFeatureSearch.ts";
import type { ContentSearchDriver } from "./searchTypes.ts";
import type { FeatureHit } from "./searchTypes.ts";
import {
  getMinSearchChars,
  getAugmentedFindDelay,
  getJcrFindDelay,
  isJcrMediaEnabled,
  isJcrPagesEnabled,
  isJcrMainResourcesEnabled,
} from "./searchUtils.ts";

type DriverWithPagination = {
  driver: ContentSearchDriver;
  pageRef: React.MutableRefObject<number>;
  loadNextPage: () => void;
};

function useDriverPagination(
  driver: ContentSearchDriver,
  currentQueryRef: React.MutableRefObject<string>,
): DriverWithPagination {
  const pageRef = useRef(0);
  const loadNextPage = () => {
    if (driver.loading || !driver.hasMore || !currentQueryRef.current) return;
    pageRef.current += 1;
    driver.search(currentQueryRef.current, pageRef.current);
  };
  return { driver, pageRef, loadNextPage };
}

export type SearchOrchestration = {
  isAugmented: boolean;
  featureHits: FeatureHit[];
  augmented: DriverWithPagination;
  jcrMedia: DriverWithPagination;
  jcrPages: DriverWithPagination;
  jcrMainResources: DriverWithPagination;
  currentQuery: string;
  triggerSearch: (value: string) => void;
};

export const useSearchOrchestration = (
  searchValue: string,
): SearchOrchestration => {
  const { isAugmented, checkDone } = useIsAugmentedAvailable();
  const isAugmentedRef = useRef(isAugmented);
  isAugmentedRef.current = isAugmented;
  const checkDoneRef = useRef(checkDone);
  checkDoneRef.current = checkDone;

  const currentQueryRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const augmentedRaw = useAugmentedSearch();
  const jcrMediaRaw = useJcrMediaSearch();
  const jcrPagesRaw = useJcrSearch();
  const jcrMainResourcesRaw = useJcrMainResourcesSearch();
  const featureHits = useFeatureSearch(searchValue);

  const augmented = useDriverPagination(augmentedRaw, currentQueryRef);
  const jcrMedia = useDriverPagination(jcrMediaRaw, currentQueryRef);
  const jcrPages = useDriverPagination(jcrPagesRaw, currentQueryRef);
  const jcrMainResources = useDriverPagination(
    jcrMainResourcesRaw,
    currentQueryRef,
  );

  const triggerSearch = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < getMinSearchChars() || !checkDoneRef.current) return;
    currentQueryRef.current = trimmed;

    if (isJcrMediaEnabled()) {
      jcrMedia.pageRef.current = 0;
      jcrMediaRaw.search(trimmed, 0);
    }

    if (isAugmentedRef.current) {
      augmented.pageRef.current = 0;
      augmentedRaw.search(trimmed, 0);
    } else {
      if (isJcrPagesEnabled()) {
        jcrPages.pageRef.current = 0;
        jcrPagesRaw.search(trimmed, 0);
      }
      if (isJcrMainResourcesEnabled()) {
        jcrMainResources.pageRef.current = 0;
        jcrMainResourcesRaw.search(trimmed, 0);
      }
    }
  };

  const resetAll = () => {
    augmentedRaw.reset();
    jcrMediaRaw.reset();
    jcrPagesRaw.reset();
    jcrMainResourcesRaw.reset();
    currentQueryRef.current = "";
  };

  // Once the site index check completes, fire a search if the user already typed enough.
  useEffect(() => {
    if (!checkDone) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (searchValue.trim().length >= getMinSearchChars()) {
      triggerSearch(searchValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkDone]);

  // Debounce: wait after the user stops typing before firing the query.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchValue.trim().length < getMinSearchChars()) {
      resetAll();
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
    isAugmented,
    featureHits,
    augmented,
    jcrMedia,
    jcrPages,
    jcrMainResources,
    currentQuery: currentQueryRef.current,
    triggerSearch,
  };
};
