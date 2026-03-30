/**
 * Registers the JCR main resources search driver.
 * Searches `jmix:mainResource` nodes via JCR `nodesByCriteria`.
 *
 * Only active when augmented search is NOT available on the current site.
 * Same mutual-exclusion logic as the pages driver: augmented search
 * covers these content types with better ranking when enabled.
 */
import {registry} from '@jahia/ui-extender';
import type {KFindDriver, SearchHit} from '../../types.ts';
import {
    getSiteKey,
    locateInJContent
} from '../../../kfind/shared/navigationUtils.ts';
import {checkAugmentedAvailable} from '../../../kfind/shared/checkAugmentedAvailable.ts';
import {JCR_MAIN_RESOURCES_BY_CRITERIA_QUERY} from './query.ts';
import {createJcrSearchProvider} from '../jcrSearchProvider.ts';

const editNode = (hit: SearchHit) =>
    window.parent.CE_API?.edit({path: hit.path});

const mainResourcesDriver: KFindDriver = {
    priority: 32,
    title: 'search.jcrMainResources.title',
    titleDefault: 'Main Resource (Full page content)',
    isEnabled: () =>
        window.contextJsParameters.kfind?.jcrMainResourcesEnabled !== false,
    maxResults: () =>
        window.contextJsParameters.kfind?.jcrMainResourcesMaxResults ?? 4,
    checkAvailability: client =>
        checkAugmentedAvailable(client, getSiteKey()).then(v => !v),
    createSearchProvider: client =>
        createJcrSearchProvider(client, JCR_MAIN_RESOURCES_BY_CRITERIA_QUERY),
    locate: (hit: SearchHit) => locateInJContent(hit.path, hit.nodeType),
    edit: editNode
};

registry.add('kfindDriver', 'kfind-jcr-main-resources', mainResourcesDriver);
