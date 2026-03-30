/**
 * Registers the JCR pages search driver.
 * Searches `jnt:page` nodes via JCR `nodesByCriteria`.
 *
 * Only active when augmented search is NOT available on the current site.
 * When augmented search IS available, the augmented driver covers pages
 * (and more) with better ranking — so this driver disables itself to avoid
 * showing duplicate results.
 */
import {registry} from '@jahia/ui-extender';
import type {KFindDriver, SearchHit} from '../../types.ts';
import {
    getSiteKey,
    locateInJContent
} from '../../../kfind/shared/navigationUtils.ts';
import {checkAugmentedAvailable} from '../../../kfind/shared/checkAugmentedAvailable.ts';
import {JCR_NODES_BY_CRITERIA_QUERY} from './query.ts';
import {createJcrSearchProvider} from '../jcrSearchProvider.ts';

const editNode = (hit: SearchHit) =>
    window.parent.CE_API?.edit({path: hit.path});

const pagesDriver: KFindDriver = {
    priority: 31,
    title: 'search.jcrPages.title',
    titleDefault: 'Pages',
    isEnabled: () => window.contextJsParameters.kfind?.jcrPagesEnabled !== false,
    maxResults: () => window.contextJsParameters.kfind?.jcrPagesMaxResults ?? 4,
    checkAvailability: client =>
        checkAugmentedAvailable(client, getSiteKey()).then(v => !v),
    createSearchProvider: client =>
        createJcrSearchProvider(client, JCR_NODES_BY_CRITERIA_QUERY),
    locate: (hit: SearchHit) => locateInJContent(hit.path, hit.nodeType),
    edit: editNode
};

registry.add('kfindDriver', 'kfind-jcr-pages', pagesDriver);
