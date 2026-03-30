/**
 * Registers the augmented search driver.
 *
 * Uses Jahia's augmented-search GraphQL endpoint (Elasticsearch-backed).
 * Only available on sites with the `jmix:augmentedSearchIndexableSite` mixin
 * (checked via `checkAugmentedAvailable()`).
 *
 * When augmented search IS available:
 *   - This driver handles pages, main resources, and documents.
 *   - The JCR pages and main resources drivers disable themselves
 *     (their `checkAvailability` returns `!augmented`).
 *
 * When augmented search is NOT available:
 *   - This driver is hidden; JCR pages and main resources drivers take over.
 */
import { registry } from "@jahia/ui-extender";
import type {
  ApolloClientInstance,
  KFindDriver,
  KFindResultsProvider,
  SearchHit,
} from "../types.ts";
import type { GqlSearchHitV2 } from "../searchTypes.ts";
import {
  getSiteKey,
  getSearchLanguage,
  locateInJContent,
} from "../../kfind/shared/navigationUtils.ts";
import { SEARCH_QUERY } from "./augmentedSearchQuery.ts";
import { checkAugmentedAvailable } from "../../kfind/shared/checkAugmentedAvailable.ts";

const PAGE_SIZE = 10;

function createAugmentedSearchProvider(
  client: ApolloClientInstance,
): KFindResultsProvider {
  let activeQuery = "";

  return {
    search: async (query, page) => {
      activeQuery = query;

      const result = await client.query<{
        search: { results: { totalHits: number; hits: GqlSearchHitV2[] } };
      }>({
        query: SEARCH_QUERY,
        variables: {
          q: query,
          siteKeys: [getSiteKey()],
          language: getSearchLanguage(),
          size: PAGE_SIZE,
          page,
        },
        fetchPolicy: "network-only",
      });

      // Discard stale responses — a newer search may have started while
      // this network request was in-flight.
      if (activeQuery !== query) {
        return { hits: [], hasMore: false };
      }

      const hits: SearchHit[] = result.data?.search?.results?.hits ?? [];
      const total = result.data?.search?.results?.totalHits ?? 0;

      return { hits, hasMore: hits.length + page * PAGE_SIZE < total };
    },
    reset: () => {
      activeQuery = "";
    },
  };
}

const editNode = (hit: SearchHit) =>
  window.parent.CE_API?.edit({ path: hit.path });

const augmentedDriver: KFindDriver = {
  priority: 30,
  title: "search.augmented.title",
  titleDefault: "Pages, main resources, and documents",
  isEnabled: () => true,
  maxResults: () =>
    window.contextJsParameters.kfind?.defaultDisplayedResults ?? 5,
  checkAvailability: (client) => checkAugmentedAvailable(client, getSiteKey()),
  createSearchProvider: createAugmentedSearchProvider,
  locate: (hit: SearchHit) => locateInJContent(hit.path, hit.nodeType),
  edit: editNode,
};

registry.add("kfindDriver", "kfind-augmented", augmentedDriver);
