/**
 * Checks whether the current site has augmented search enabled.
 *
 * Queries the site node for the `jmix:augmentedSearchIndexableSite` mixin.
 * The result is cached at module level per site key so subsequent mounts
 * (e.g. re-opening the modal) don't re-query.
 *
 * The check is NOT fired on mount — the orchestration layer calls `trigger()`
 * once the user has typed enough characters, so no query fires before
 * `minSearchChars` is reached.
 *
 * Returns:
 * - `isAugmented` — true if the mixin is present (default true until check completes).
 * - `checkDone` — false while the query is in flight; true once resolved.
 * - `trigger` — call this to start the check (idempotent; cached after first call).
 */
import { useLazyQuery } from "@apollo/client";
import { useCallback, useState } from "react";
import { SITE_INDEX_QUERY } from "../augmented/augmentedSearchQuery.ts";
import { getSiteKey } from "./navigationUtils.ts";

// Module-level cache: site key → whether augmented search is available.
// Populated once per site per page load — never re-queried.
const siteIndexCache = new Map<string, boolean>();

export const useIsAugmentedAvailable = () => {
  const site = getSiteKey();

  const [isAugmented, setIsAugmented] = useState(() => {
    const cached = siteIndexCache.get(site);
    return cached !== undefined ? cached : true;
  });

  const [checkDone, setCheckDone] = useState(
    () => siteIndexCache.get(site) !== undefined,
  );

  const [checkSiteIndex] = useLazyQuery<{
    jcr: { nodeByPath: { isNodeType: boolean } };
  }>(SITE_INDEX_QUERY, {
    fetchPolicy: "cache-first",
    onCompleted: (result) => {
      const indexed = result?.jcr?.nodeByPath?.isNodeType ?? false;
      siteIndexCache.set(site, indexed);
      setIsAugmented(indexed);
      setCheckDone(true);
    },
  });

  /**
   * Triggers the site-index check. Safe to call multiple times — the query
   * only fires if the result isn't already cached.
   */
  const trigger = useCallback(() => {
    if (siteIndexCache.get(site) === undefined) {
      void checkSiteIndex({ variables: { path: `/sites/${site}` } });
    }
  }, [checkSiteIndex, site]);

  return { isAugmented, checkDone, trigger };
};
