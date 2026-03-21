/**
 * Main search panel — thin composition layer.
 *
 * Delegates search logic entirely to `useSearchOrchestration` and renders
 * five result sections in order:
 *   1. UI Features (always, if enabled)
 *   2. JCR Media (always, if enabled)
 *   3. Augmented search (only when the site has augmented indexing)
 *   4. JCR Pages (only when augmented is NOT available)
 *   5. JCR Main Resources (only when augmented is NOT available)
 *
 * A global "no results" empty state is shown when all visible sections
 * return empty after a completed query.
 */
import React, { useCallback, useRef, useState } from "react";
import { Close, EmptyData, Search } from "@jahia/moonstone";
import { useTranslation } from "react-i18next";
import { KFindHeader } from "./KFindHeader.tsx";
import { useSearchOrchestration } from "./shared/useSearchOrchestration.ts";
import { FeatureResults } from "./features/FeatureResults.tsx";
import { ContentResultsSection } from "./shared/ContentResultsSection.tsx";
import {
  getMinSearchChars,
  getDefaultDisplayedResults,
  isUiFeaturesEnabled,
  isJcrMediaEnabled,
  getJcrMediaMaxResults,
  isJcrPagesEnabled,
  getJcrPagesMaxResults,
  isJcrMainResourcesEnabled,
  getJcrMainResourcesMaxResults,
} from "./shared/searchUtils.ts";
import styles from "./shared/layout.module.css";
import s from "./KFindPanel.module.css";

type KFindPanelProps = {
  focusOnField?: boolean;
  onNavigate?: () => void;
};

export const KFindPanel = ({ focusOnField, onNavigate }: KFindPanelProps) => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  const {
    isAugmented,
    featureHits,
    augmented,
    jcrMedia,
    jcrPages,
    jcrMainResources,
    currentQuery,
    triggerSearch,
  } = useSearchOrchestration(searchValue);

  const trimmedQuery = searchValue.trim();
  const minChars = getMinSearchChars();

  // Check whether any visible section is still loading or has results,
  // so we can show a single global "no results" message instead of per-section ones.
  const isAnyContentLoading =
    (isJcrMediaEnabled() && jcrMedia.driver.loading) ||
    (isAugmented && augmented.driver.loading) ||
    (!isAugmented && isJcrPagesEnabled() && jcrPages.driver.loading) ||
    (!isAugmented &&
      isJcrMainResourcesEnabled() &&
      jcrMainResources.driver.loading);

  const hasAnyResults =
    (isUiFeaturesEnabled() && featureHits.length > 0) ||
    (isJcrMediaEnabled() && jcrMedia.driver.hits.length > 0) ||
    (isAugmented && augmented.driver.hits.length > 0) ||
    (!isAugmented && isJcrPagesEnabled() && jcrPages.driver.hits.length > 0) ||
    (!isAugmented &&
      isJcrMainResourcesEnabled() &&
      jcrMainResources.driver.hits.length > 0);

  const showGlobalNoResults =
    trimmedQuery.length >= minChars &&
    currentQuery === trimmedQuery &&
    !isAnyContentLoading &&
    !hasAnyResults;

  const handleSearchClear = useCallback(() => setSearchValue(""), []);

  return (
    <div className={s.panel}>
      <KFindHeader
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchClear={handleSearchClear}
        onTriggerSearch={triggerSearch}
        focusOnField={focusOnField}
        scrollContainerRef={scrollContainerRef}
        inputWrapperRef={inputWrapperRef}
      />

      <div ref={scrollContainerRef} className={styles.scrollContainer}>
        {/* ── Empty state ── */}
        {trimmedQuery.length < minChars && featureHits.length === 0 && (
          <EmptyData
            icon={<Search size="big" />}
            title={t("search.empty.title", "Find anything.")}
            message={t("search.empty.hint", { min: minChars })}
          />
        )}

        {/* ── 1. UI Features (always, if enabled) ── */}
        {isUiFeaturesEnabled() && (
          <FeatureResults
            trimmedQuery={trimmedQuery}
            featureHits={featureHits}
            onNavigate={onNavigate}
            scrollContainerRef={scrollContainerRef}
            inputWrapperRef={inputWrapperRef}
          />
        )}

        {/* ── 2. JCR Media (always, if enabled) ── */}
        {isJcrMediaEnabled() && trimmedQuery.length >= minChars && (
          <ContentResultsSection
            title={t("search.jcrMedia.title", "Media")}
            hits={jcrMedia.driver.hits}
            loading={jcrMedia.driver.loading}
            hasMore={jcrMedia.driver.hasMore}
            maxResults={getJcrMediaMaxResults()}
            trimmedQuery={trimmedQuery}
            scrollContainerRef={scrollContainerRef}
            inputWrapperRef={inputWrapperRef}
            onNavigate={onNavigate}
            onLoadMore={jcrMedia.loadNextPage}
          />
        )}

        {/* ── 3. Augmented search (only when augmented search is available) ── */}
        {isAugmented && trimmedQuery.length >= minChars && (
          <ContentResultsSection
            title={t(
              "search.augmented.title",
              "Pages, main resources, and documents",
            )}
            hits={augmented.driver.hits}
            loading={augmented.driver.loading}
            hasMore={augmented.driver.hasMore}
            maxResults={getDefaultDisplayedResults()}
            trimmedQuery={trimmedQuery}
            scrollContainerRef={scrollContainerRef}
            inputWrapperRef={inputWrapperRef}
            onNavigate={onNavigate}
            onLoadMore={augmented.loadNextPage}
          />
        )}

        {/* ── 4. JCR Pages (only when augmented is NOT available) ── */}
        {!isAugmented &&
          isJcrPagesEnabled() &&
          trimmedQuery.length >= minChars && (
            <ContentResultsSection
              title={t("search.jcrPages.title", "Pages")}
              hits={jcrPages.driver.hits}
              loading={jcrPages.driver.loading}
              hasMore={jcrPages.driver.hasMore}
              maxResults={getJcrPagesMaxResults()}
              trimmedQuery={trimmedQuery}
              scrollContainerRef={scrollContainerRef}
              inputWrapperRef={inputWrapperRef}
              onNavigate={onNavigate}
              onLoadMore={jcrPages.loadNextPage}
            />
          )}

        {/* ── 5. JCR Main Resources (only when augmented is NOT available) ── */}
        {!isAugmented &&
          isJcrMainResourcesEnabled() &&
          trimmedQuery.length >= minChars && (
            <ContentResultsSection
              title={t(
                "search.jcrMainResources.title",
                "Main Resource (Full page content)",
              )}
              hits={jcrMainResources.driver.hits}
              loading={jcrMainResources.driver.loading}
              hasMore={jcrMainResources.driver.hasMore}
              maxResults={getJcrMainResourcesMaxResults()}
              trimmedQuery={trimmedQuery}
              scrollContainerRef={scrollContainerRef}
              inputWrapperRef={inputWrapperRef}
              onNavigate={onNavigate}
              onLoadMore={jcrMainResources.loadNextPage}
            />
          )}

        {/* ── Global "no results" — shown only when every visible section is empty ── */}
        {showGlobalNoResults && (
          <EmptyData
            icon={<Close />}
            title={t("search.noResults.title", "No results.")}
            message={t(
              "search.noResults.hint",
              'Nothing matched "{{q}}". Try different keywords or check for typos.',
              { q: trimmedQuery },
            )}
          />
        )}
      </div>
    </div>
  );
};
