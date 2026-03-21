/**
 * Central search orchestration hook.
 *
 * Manages **all** search drivers (features, augmented, JCR media/pages/main
 * resources) from a single place so KFindPanel stays a thin rendering layer.
 *
 * Responsibilities:
 * - Instantiates every search driver hook.
 * - Debounces user input (delay differs for augmented vs JCR).
 * - Waits for the augmented-search availability check before firing the
 *   first query (so we know which drivers to activate).
 * - Exposes a stable `triggerSearch()` for imperative re-fires (e.g. Enter).
 * - Provides per-driver pagination helpers (`loadNextPage`).
 *
 * @param searchValue - The raw (unTrimmed) value from the search input.
 * @returns SearchOrchestration object consumed by KFindPanel.
 */
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

/**
 * Wraps a ContentSearchDriver with a page counter and a
 * `loadNextPage` callback. This avoids duplicating pagination
 * logic for every driver in the orchestration hook.
 */
type DriverWithPagination = {
  driver: ContentSearchDriver;
  pageRef: React.MutableRefObject<number>;
  loadNextPage: () => void;
};

/** Creates pagination helpers around a raw ContentSearchDriver. */
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
  const {
    isAugmented,
    checkDone,
    trigger: triggerAugmentedCheck,
  } = useIsAugmentedAvailable();
  // ── Keep mutable refs in sync so callbacks always read the latest value ──
  const isAugmentedRef = useRef(isAugmented);
  isAugmentedRef.current = isAugmented;
  const checkDoneRef = useRef(checkDone);
  checkDoneRef.current = checkDone;

  /** Tracks the last query that was actually sent to drivers (for UI comparison). */
  const currentQueryRef = useRef("");
  /** Handle returned by setTimeout — cleared on each keystroke. */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Instantiate all drivers (hooks must be called unconditionally) ──

  // ── Instantiate all drivers (hooks must be called unconditionally) ──
  const augmentedRaw = useAugmentedSearch();
  const jcrMediaRaw = useJcrMediaSearch();
  const jcrPagesRaw = useJcrSearch();
  const jcrMainResourcesRaw = useJcrMainResourcesSearch();
  /** Feature search is synchronous — filters the Jahia UI registry in-memory. */
  const featureHits = useFeatureSearch(searchValue);

  // ── Wrap each driver with pagination helpers ──
  const augmented = useDriverPagination(augmentedRaw, currentQueryRef);
  const jcrMedia = useDriverPagination(jcrMediaRaw, currentQueryRef);
  const jcrPages = useDriverPagination(jcrPagesRaw, currentQueryRef);
  const jcrMainResources = useDriverPagination(
    jcrMainResourcesRaw,
    currentQueryRef,
  );

  /**
   * Imperatively fire a search on all applicable drivers.
   *
   * Which drivers fire depends on:
   * - Whether augmented search is available for this site.
   * - Which tables are enabled in the OSGi cfg.
   * - Whether the query meets the minimum character threshold.
   *
   * Media always fires (independent of augmented).
   * Augmented vs JCR Pages/Main Resources are mutually exclusive.
   */
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

  /** Clears results and pagination state for every driver. */
  const resetAll = () => {
    augmentedRaw.reset();
    jcrMediaRaw.reset();
    jcrPagesRaw.reset();
    jcrMainResourcesRaw.reset();
    currentQueryRef.current = "";
  };

  // ── Effect 1: React to the augmented-check completing ──
  // Once the site index check completes, fire a search if the user already typed enough.
  // This handles the race where the user types fast and the mixin check hasn't resolved yet.
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

  // ── Effect 2: Debounce user keystrokes ──
  // Wait after the user stops typing before firing the query.
  // The delay is shorter for augmented search (server-side indexing is faster).
  // Also kicks off the site-index check the first time minSearchChars is reached
  // so no GQL query fires before the user has typed enough.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchValue.trim().length < getMinSearchChars()) {
      resetAll();
      return;
    }
    // Start the augmented-availability check now (idempotent — cached after first call).
    triggerAugmentedCheck();
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
