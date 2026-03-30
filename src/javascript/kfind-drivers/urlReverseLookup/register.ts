/**
 * Registers the URL reverse lookup search driver.
 *
 * Resolves pasted live URLs to JCR nodes via vanity URL or direct path
 * matching. Only fires when the query looks like a URL (`canHandle`).
 *
 * Unlike other drivers, this one returns at most 1 result and never
 * paginates. It is useful for editors who copy a live page URL from
 * their browser and want to quickly locate the corresponding node
 * in jContent.
 */
import {registry} from '@jahia/ui-extender';
import type {
    ApolloClientInstance,
    KFindDriver,
    KFindResultsProvider,
    SearchHit
} from '../types.ts';
import type {GqlJcrNode} from '../searchTypes.ts';
import {
    getSiteKey,
    getSearchLanguage,
    locateInJContent
} from '../../kfind/shared/navigationUtils.ts';
import {URL_REVERSE_LOOKUP_QUERY} from './urlReverseLookupQuery.ts';

/** Heuristic: does the input look like a URL or an absolute path? */
function looksLikeUrl(input: string): boolean {
    if (input.startsWith('http://') || input.startsWith('https://')) {
        return true;
    }

    if (input.startsWith('/') && input.length > 1) {
        return true;
    }

    if (/^[\w-]+\.[\w.-]+\//.test(input)) {
        return true;
    }

    return false;
}

function createUrlReverseLookupProvider(
    client: ApolloClientInstance
): KFindResultsProvider {
    return {
        search: async query => {
            const result = await client.query<{
        urlReverseLookup: GqlJcrNode | null;
      }>({
          query: URL_REVERSE_LOOKUP_QUERY,
          variables: {
              url: query,
              siteKey: getSiteKey(),
              language: getSearchLanguage()
          },
          fetchPolicy: 'network-only'
      });

            const node = result.data?.urlReverseLookup;
            if (!node) {
                return {hits: [], hasMore: false};
            }

            const hit: SearchHit = {
                id: node.uuid,
                path: node.path,
                displayableName: node.displayName || node.name,
                excerpt: null,
                nodeType: node.primaryNodeType.name
            };
            return {hits: [hit], hasMore: false};
        },
        reset: () => {}
    };
}

const editNode = (hit: SearchHit) =>
    window.parent.CE_API?.edit({path: hit.path});

const urlReverseLookupDriver: KFindDriver = {
    priority: 5,
    title: 'search.urlReverseLookup.title',
    titleDefault: 'Direct URL match',
    isEnabled: () =>
        window.contextJsParameters.kfind?.urlReverseLookupEnabled !== false,
    maxResults: () => 1,
    canHandle: looksLikeUrl,
    createSearchProvider: createUrlReverseLookupProvider,
    locate: (hit: SearchHit) => locateInJContent(hit.path, hit.nodeType),
    edit: editNode
};

registry.add('kfindDriver', 'kfind-url-reverse-lookup', urlReverseLookupDriver);
