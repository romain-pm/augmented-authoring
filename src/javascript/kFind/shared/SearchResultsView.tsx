import React, { useCallback } from "react";
import {
  DataTable,
  EmptyData,
  Loader,
  Search,
  Typography,
  Close,
} from "@jahia/moonstone";
import type { Row } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { ResultCard } from "./ResultCard.tsx";
import { FeatureResults } from "../featuresFind/FeatureResults.tsx";
import type { SearchHit, FeatureHit } from "./searchTypes.ts";
import {
  getSiteKey,
  getSearchLanguage,
  getMinSearchChars,
} from "./searchUtils.ts";
import styles from "./SearchResultsView.module.css";
import hideTableHead from "./hideTableHead.module.css";

// Static — stable references to avoid unnecessary DataTable re-diffs.
const contentColumns = [{ key: "displayableName" as const, label: "" }];

type SearchResultsViewProps = {
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
    [onNavigate, scrollContainerRef, inputWrapperRef],
  );

  return (
    /*
     * Scrollable results area — also serves as the IntersectionObserver root
     * for infinite scroll. The sentinel <div> at the bottom of this container
     * triggers the next-page load when it scrolls into view.
     */
    <div ref={scrollContainerRef} className={styles.scrollContainer}>
      {/* ── Empty state (shown until user types enough chars, and only when features haven't kicked in yet) ── */}
      {trimmedQuery.length < getMinSearchChars() &&
        featureHits.length === 0 && (
          <EmptyData
            icon={<Search size="big" />}
            title={t("search.empty.title", "Find anything.")}
            message={t(
              "search.empty.hint",
              "Pages, content, documents — just start typing ({{min}} chars min).",
              { min: getMinSearchChars() },
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
      {trimmedQuery.length >= getMinSearchChars() && (
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
  );
};
