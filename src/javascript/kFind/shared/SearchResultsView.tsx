import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
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
  getDefaultDisplayedResults,
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
  hasMore: boolean;
  featureHits: FeatureHit[];
  /** The query string of the last completed search — used to gate the no-results state. */
  currentQuery: string;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  /** Ref to the input wrapper — used to refocus the input on ArrowUp from first row. */
  inputWrapperRef: React.RefObject<HTMLDivElement>;
  onNavigate?: () => void;
  onLoadMore: () => void;
};

export const SearchResultsView = ({
  trimmedQuery,
  loading,
  hits,
  totalHits,
  hasMore,
  featureHits,
  currentQuery,
  scrollContainerRef,
  inputWrapperRef,
  onNavigate,
  onLoadMore,
}: SearchResultsViewProps) => {
  const { t } = useTranslation();
  const [displayedCount, setDisplayedCount] = useState(
    getDefaultDisplayedResults,
  );

  // Reset to the default page size whenever the query changes.
  useEffect(() => {
    setDisplayedCount(getDefaultDisplayedResults());
  }, [trimmedQuery]);

  const visibleHits = hits.slice(0, displayedCount);
  const hasMoreToShow = displayedCount < hits.length || hasMore;

  const handleShowMore = () => {
    const newCount = displayedCount + getDefaultDisplayedResults();
    setDisplayedCount(newCount);
    // If we've exhausted locally loaded hits and the server has more, fetch the next page.
    if (newCount >= hits.length && hasMore) {
      onLoadMore();
    }
  };

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
        data={visibleHits}
        primaryKey="id"
        columns={contentColumns}
        renderRow={renderContentRow}
      />

      {loading && hits.length > 0 && (
        <Typography variant="caption">
          {t("search.loadingMore", "Loading more…")}
        </Typography>
      )}

      {!loading && hasMoreToShow && (
        <Button
          variant="ghost"
          label={t("search.showMore", "Show more ({{count}} results)", {
            count: totalHits,
          })}
          onClick={handleShowMore}
        />
      )}
    </div>
  );
};
