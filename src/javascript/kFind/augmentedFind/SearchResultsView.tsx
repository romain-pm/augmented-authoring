import React, { useCallback } from "react";
import {
  DataTable,
  EmptyData,
  Loader,
  Search,
  Typography,
  Warning,
  Close,
} from "@jahia/moonstone";
import type { Row } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { ResultCard } from "./ResultCard.tsx";
import { FeatureResults } from "../featuresFind/FeatureResults.tsx";
import type { SearchHit, FeatureHit } from "./augmentedFindQuery.ts";
import { getSiteKey, getSearchLanguage } from "../shared/searchUtils.ts";
import styles from "./SearchResultsView.module.css";
import hideTableHead from "../shared/hideTableHead.module.css";

// Static — stable references to avoid unnecessary DataTable re-diffs.
const contentColumns = [{ key: "displayableName" as const, label: "" }];

type SearchResultsViewProps = {
  isSiteIndexed: boolean | null;
  searchEnabled: boolean;
  trimmedQuery: string;
  loading: boolean;
  hits: SearchHit[];
  totalHits: number;
  featureHits: FeatureHit[];
  /** The query string of the last completed search — used to gate the no-results state. */
  currentQuery: string;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  sentinelRef: React.RefObject<HTMLDivElement>;
  /** Ref to the input wrapper — used to refocus the input on ArrowUp from first row. */
  inputWrapperRef: React.RefObject<HTMLDivElement>;
  onNavigate?: () => void;
};

export const SearchResultsView = ({
  isSiteIndexed,
  searchEnabled,
  trimmedQuery,
  loading,
  hits,
  totalHits,
  featureHits,
  currentQuery,
  scrollContainerRef,
  sentinelRef,
  inputWrapperRef,
  onNavigate,
}: SearchResultsViewProps) => {
  const { t } = useTranslation();

  // ResultCard renders its own <TableRow>, so DataTable's defaultRender is intentionally bypassed.
  const renderContentRow = useCallback(
    (row: Row<SearchHit>) => (
      <ResultCard
        key={row.id}
        hit={row.original}
        onNavigate={onNavigate}
        scrollContainerRef={scrollContainerRef}
        inputWrapperRef={inputWrapperRef}
      />
    ),
    [onNavigate],
  );

  return (
    /*
     * Scrollable results area — also serves as the IntersectionObserver root
     * for infinite scroll. The sentinel <div> at the bottom of this container
     * triggers the next-page load when it scrolls into view.
     */
    <>
      <div ref={scrollContainerRef} className={styles.scrollContainer}>
        {/* ── Site not indexed ── */}
        {isSiteIndexed === false && (
          <EmptyData
            icon={<Warning size="big" />}
            title={t("search.notIndexed.title", "Search unavailable.")}
            message={t(
              "search.notIndexed.hint",
              "This site is not indexed for augmented search. Ask an administrator to enable it.",
            )}
          />
        )}

        {/* ── Empty state (shown until user types 3+ chars, and only when features haven't kicked in yet) ── */}
        {searchEnabled &&
          trimmedQuery.length < 3 &&
          featureHits.length === 0 && (
            <EmptyData
              icon={<Search size="big" />}
              title={t("search.empty.title", "Find anything.")}
              message={t(
                "search.empty.hint",
                "Pages, content, documents — just start typing (3 chars min).",
              )}
            />
          )}

        {/* ── Features (memoized — unaffected by content loading state) ── */}
        <FeatureResults
          trimmedQuery={trimmedQuery}
          featureHits={featureHits}
          onNavigate={onNavigate}
          scrollContainerRef={scrollContainerRef}
          inputWrapperRef={inputWrapperRef}
        />

        {/* ── Pages, content & documents ── */}
        {searchEnabled && trimmedQuery.length >= 3 && (
          <>
            <Typography variant="heading">
              {t(
                "search.content.title",
                "Pages, content and documents in {{site}}, in {{language}}",
                {
                  site: getSiteKey(),
                  language: getSearchLanguage(),
                },
              )}
            </Typography>

            {/* ── Result count ── */}
            {(hits.length > 0 || totalHits > 0) && (
              <Typography variant="caption">
                {t("search.results", "{{count}} result(s)", {
                  count: totalHits,
                })}
              </Typography>
            )}

            {/* Loading */}
            {loading && hits.length === 0 && (
              <EmptyData
                icon={<Loader />}
                message={t("search.loading", "Searching…")}
              />
            )}

            {/* No results */}
            {!loading && hits.length === 0 && currentQuery === trimmedQuery && (
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
          </>
        )}
        <DataTable<SearchHit>
          className={hideTableHead.resultsTable}
          data={hits}
          primaryKey="id"
          columns={contentColumns}
          renderRow={renderContentRow}
        />

        {/* Sentinel triggers IntersectionObserver to load the next page */}
        <div ref={sentinelRef} style={{ height: "1px" }} />

        {loading && hits.length > 0 && (
          <div>
            <Typography variant="caption">
              {t("search.loadingMore", "Loading more…")}
            </Typography>
          </div>
        )}
      </div>
    </>
  );
};
