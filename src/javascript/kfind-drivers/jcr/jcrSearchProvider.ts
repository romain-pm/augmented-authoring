/**
 * Shared factory for JCR-based search providers.
 *
 * All JCR drivers (pages, media, main resources) follow the same query pattern:
 * `nodesByCriteria` with `searchTerm`, `sitePath`, `language`, `limit`, `offset`.
 * The only difference is the GraphQL document (which encodes the node type criteria).
 *
 * This factory avoids duplicating the search/pagination/stale-response logic
 * across three nearly-identical drivers.
 */
import type {DocumentNode} from '@apollo/client';
import type {
    ApolloClientInstance,
    KFindResultsProvider,
    SearchHit
} from '../types.ts';
import type {GqlJcrNode} from '../searchTypes.ts';
import {
    getSiteKey,
    getSearchLanguage
} from '../../kfind/shared/navigationUtils.ts';

const PAGE_SIZE = 10;

/** Maps a raw GraphQL JCR node to the driver-agnostic `SearchHit` shape. */
export function jcrNodeToSearchHit(node: GqlJcrNode): SearchHit {
    return {
        id: node.uuid,
        path: node.path,
        displayableName: node.displayName || node.name,
        excerpt: null,
        nodeType: node.primaryNodeType.name,
        thumbnailUrl: node.thumbnailUrl ?? null
    };
}

/**
 * Creates an imperative JCR search provider for the given GraphQL document.
 *
 * The `activeQuery` guard ensures stale network responses are discarded:
 * each call to `search()` overwrites `activeQuery`, and the response
 * handler silently drops results whose query no longer matches.
 */
export function createJcrSearchProvider(
    client: ApolloClientInstance,
    queryDoc: DocumentNode
): KFindResultsProvider {
    let activeQuery = '';

    return {
        search: async (query, page) => {
            activeQuery = query;
            const sitePath = `/sites/${getSiteKey()}`;

            const result = await client.query<{
        jcr: { nodesByCriteria: { nodes: GqlJcrNode[] } };
      }>({
          query: queryDoc,
          variables: {
              searchTerm: query,
              sitePath,
              language: getSearchLanguage(),
              limit: PAGE_SIZE,
              offset: page * PAGE_SIZE
          },
          fetchPolicy: 'network-only'
      });

            // Discard stale responses.
            if (activeQuery !== query) {
                return {hits: [], hasMore: false};
            }

            // Determine hasMore by checking if we received a full page — JCR's
            // nodesByCriteria doesn't return totalHits, so this is the best heuristic.
            const nodes = result.data?.jcr?.nodesByCriteria?.nodes ?? [];
            const hits = nodes.map(jcrNodeToSearchHit);
            return {hits, hasMore: hits.length === PAGE_SIZE};
        },
        reset: () => {
            activeQuery = '';
        }
    };
}
