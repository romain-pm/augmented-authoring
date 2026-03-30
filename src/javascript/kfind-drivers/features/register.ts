/**
 * Registers the UI features search driver.
 *
 * Scans Jahia's UI extender registry for `adminRoute` and
 * `jExperienceMenuEntry` items matching the search query.
 * Results are computed synchronously (no network request) —
 * the `search()` method resolves instantly with a pre-filtered list.
 *
 * Route resolution logic:
 * - `jExperienceMenuEntry` → `/jexperience/{siteKey}/{path}`
 * - `adminRoute` targeting jcontent → `/jcontent/{siteKey}/{lang}/apps/{key}`
 * - `adminRoute` targeting server → `/administration/{key}`
 * - Other admin routes → `/administration/{siteKey}/{key}`
 */
import {registry} from '@jahia/ui-extender';
import i18n from 'i18next';
import type {KFindDriver, KFindResultsProvider, SearchHit} from '../types.ts';
import {
    getSiteKey,
    getSearchLanguage,
    pushRouteNavigation
} from '../../kfind/shared/navigationUtils.ts';

function searchFeatures(query: string): SearchHit[] {
    const trimmed = query.trim().toLowerCase();
    const uiRegistry = window.jahia?.uiExtender?.registry?.registry;
    if (!uiRegistry) {
        return [];
    }

    const results: SearchHit[] = [];
    for (const entry of Object.values(uiRegistry)) {
        if (entry.type !== 'adminRoute' && entry.type !== 'jExperienceMenuEntry') {
            continue;
        }

        const label: string = entry.label ? i18n.t(entry.label) : entry.key;
        if (
            !label.toLowerCase().includes(trimmed) &&
      !entry.key.toLowerCase().includes(trimmed)
        ) {
            continue;
        }

        const targetIds: string[] = (entry.targets ?? []).map(
            (tgt: { id: string }) => tgt.id
        );
        let path: string;
        if (entry.type === 'jExperienceMenuEntry') {
            const entryPath = ((entry.path as string) ?? entry.key).replace(
                /^\//,
                ''
            );
            path = `/jexperience/${getSiteKey()}/${entryPath}`;
        } else if (targetIds.some(id => id.startsWith('jcontent'))) {
            path = `/jcontent/${getSiteKey()}/${getSearchLanguage()}/apps/${entry.key}`;
        } else if (targetIds.some(id => id.includes('server'))) {
            path = `/administration/${entry.key}`;
        } else {
            path = `/administration/${getSiteKey()}/${entry.key}`;
        }

        const typeLabel = i18n.t('search.features.chip', 'Feature');
        results.push({
            id: entry.key,
            path,
            displayableName: label,
            excerpt: null,
            nodeType: typeLabel
        });
    }

    return results;
}

const featureDriver: KFindDriver = {
    priority: 10,
    title: 'search.features.title',
    titleDefault: 'Features',
    isEnabled: () =>
        window.contextJsParameters.kfind?.uiFeaturesEnabled !== false,
    maxResults: () => window.contextJsParameters.kfind?.uiFeaturesMaxResults ?? 2,
    createSearchProvider: (): KFindResultsProvider => ({
        search: query =>
            Promise.resolve({hits: searchFeatures(query), hasMore: false}),
        reset: () => {}
    }),
    locate: (hit: SearchHit) => pushRouteNavigation(hit.path)
};

registry.add('kfindDriver', 'kfind-features', featureDriver);
