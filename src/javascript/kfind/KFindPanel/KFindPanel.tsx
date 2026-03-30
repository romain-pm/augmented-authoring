/**
 * Main search panel — thin composition layer.
 *
 * Delegates search logic entirely to `useSearchOrchestration` and renders
 * result sections dynamically based on registered kfindDriver entries.
 * Has no knowledge of specific drivers (augmented, JCR, features, etc.).
 *
 * Rendering flow:
 *   1. User types in `KFindHeader` → `searchValue` state updates.
 *   2. `useSearchOrchestration` debounces, fires all active drivers,
 *      and returns `drivers[]` with per-driver state.
 *   3. Each driver maps to one `<ResultsSection>` via `.map()`.
 *   4. Empty sections auto-hide; a global "no results" empty state
 *      appears only when ALL sections are empty after a completed query.
 */
import {useCallback, useRef, useState} from 'react';
import {Close, EmptyData, Search} from '@jahia/moonstone';
import {useTranslation} from 'react-i18next';
import {KFindHeader} from '../KFindHeader/KFindHeader.tsx';
import {useSearchOrchestration} from '../shared/useSearchOrchestration.ts';
import {ResultsSection} from '../ResultsSection/ResultsSection.tsx';
import {getMinSearchChars} from '../shared/configUtils.ts';
import styles from '../shared/layout.module.css';
import s from './KFindPanel.module.css';

type KFindPanelProps = {
  readonly focusOnField?: boolean;
  readonly onNavigate?: () => void;
};

export const KFindPanel = ({focusOnField, onNavigate}: KFindPanelProps) => {
    const {t} = useTranslation();
    const [searchValue, setSearchValue] = useState('');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const inputWrapperRef = useRef<HTMLDivElement>(null);

    const {drivers, currentQuery, triggerSearch} =
    useSearchOrchestration(searchValue);

    const trimmedQuery = searchValue.trim();
    const minChars = getMinSearchChars();

    // Aggregate loading/results state across all drivers to decide whether
    // to show the global "no results" empty state.
    const isAnyLoading = drivers.some(d => d.state.loading);
    const hasAnyResults = drivers.some(d => d.state.allHits.length > 0);

    const showGlobalNoResults =
    trimmedQuery.length >= minChars &&
    currentQuery === trimmedQuery &&
    !isAnyLoading &&
    !hasAnyResults;

    const handleSearchClear = useCallback(() => setSearchValue(''), []);

    return (
        <div className={s.panel}>
            <KFindHeader
        searchValue={searchValue}
        focusOnField={focusOnField}
        scrollContainerRef={scrollContainerRef}
        inputWrapperRef={inputWrapperRef}
        onSearchChange={setSearchValue}
        onSearchClear={handleSearchClear}
        onTriggerSearch={triggerSearch}
      />

            <div ref={scrollContainerRef} className={styles.scrollContainer}>
                {/* ── Empty state ── */}
                {trimmedQuery.length < minChars && !hasAnyResults && (
                <EmptyData
            icon={<Search size="big"/>}
            title={t('search.empty.title', 'Find anything.')}
            message={t('search.empty.hint', {min: minChars})}
          />
        )}

                {/* ── Result sections — one per active driver ── */}
                {drivers.map(({key, registration, state, loadNextPage}) => (
                    <ResultsSection
            key={key}
            title={t(registration.title, registration.titleDefault)}
            hits={state.allHits}
            loading={state.loading}
            hasMore={state.hasMore}
            maxResults={registration.maxResults()}
            trimmedQuery={trimmedQuery}
            scrollContainerRef={scrollContainerRef}
            inputWrapperRef={inputWrapperRef}
            onHitAction={hit => {
              registration.locate(hit);
              onNavigate?.();
            }}
            onSecondaryAction={registration.edit ? hit => registration.edit!(hit) : undefined}
            onLoadMore={loadNextPage}
          />
        ))}

                {/* ── Global "no results" — shown only when every visible section is empty ── */}
                {showGlobalNoResults && (
                <EmptyData
            icon={<Close/>}
            title={t('search.noResults.title', 'No results.')}
            message={t(
              'search.noResults.hint',
              'Nothing matched "{{q}}". Try different keywords or check for typos.',
              {q: trimmedQuery}
            )}
          />
        )}
            </div>
        </div>
    );
};
