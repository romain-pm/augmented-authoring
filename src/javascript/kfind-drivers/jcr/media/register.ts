/**
 * Registers the JCR media search driver.
 * Searches `jnt:file` nodes. Independent of augmented search availability.
 */
import {registry} from '@jahia/ui-extender';
import type {KFindDriver, SearchHit} from '../../types.ts';
import {locateInJContent} from '../../../kfind/shared/navigationUtils.ts';
import {JCR_MEDIA_BY_CRITERIA_QUERY} from './query.ts';
import {createJcrSearchProvider} from '../jcrSearchProvider.ts';

const editNode = (hit: SearchHit) =>
    window.parent.CE_API?.edit({path: hit.path});

const mediaDriver: KFindDriver = {
    priority: 20,
    title: 'search.jcrMedia.title',
    titleDefault: 'Media',
    isEnabled: () => window.contextJsParameters.kfind?.jcrMediaEnabled !== false,
    maxResults: () => window.contextJsParameters.kfind?.jcrMediaMaxResults ?? 2,
    createSearchProvider: client =>
        createJcrSearchProvider(client, JCR_MEDIA_BY_CRITERIA_QUERY),
    locate: (hit: SearchHit) => locateInJContent(hit.path, hit.nodeType),
    edit: editNode
};

registry.add('kfindDriver', 'kfind-jcr-media', mediaDriver);
