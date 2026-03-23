/**
 * Reusable section component for one search-result table.
 *
 * Renders a titled `<DataTable>` with:
 * - A loading spinner when results are pending and no hits are loaded yet.
 * - "Loading more…" caption while paginating.
 * - A "Show more" button when more results are available (locally or server-side).
 * - Auto-hides entirely when there are no results and nothing is loading,
 *   so the global "no results" in KFindPanel takes over.
 *
 * Client-side pagination (`displayedCount`) slices the `hits` array;
 * when the user exhausts the local slice, `onLoadMore` triggers the next
 * server-side page fetch in the orchestration layer.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Button, DataTable, Typography } from "@jahia/moonstone";
import type { Row } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { ResultCard } from "./ResultCard.tsx";
import type { SearchHit } from "./searchTypes.ts";
import { locateInJContent } from "./searchUtils.ts";
import hideTableHead from "./hideTableHead.module.css";
import s from "./ContentResultsSection.module.css";

const editNode = (path: string) => window.parent.CE_API?.edit({ path });

const contentColumns = [{ key: "displayableName" as const, label: "" }];

type ContentResultsSectionProps = {
  title: string;
  hits: SearchHit[];
  loading: boolean;
  hasMore: boolean;
  maxResults: number;
  trimmedQuery: string;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  inputWrapperRef: React.RefObject<HTMLDivElement>;
  onNavigate?: () => void;
  onLoadMore: () => void;
};

export const ContentResultsSection = ({
  title,
  hits,
  loading,
  hasMore,
  maxResults,
  trimmedQuery,
  scrollContainerRef,
  inputWrapperRef,
  onNavigate,
  onLoadMore,
}: ContentResultsSectionProps) => {
  const { t } = useTranslation();
  const [displayedCount, setDisplayedCount] = useState(maxResults);

  useEffect(() => {
    setDisplayedCount(maxResults);
  }, [trimmedQuery, maxResults]);

  const visibleHits = hits.slice(0, displayedCount);
  const hasMoreToShow = displayedCount < hits.length || hasMore;

  const handleShowMore = () => {
    const newCount = displayedCount + 10;
    setDisplayedCount(newCount);
    if (newCount >= hits.length && hasMore) {
      onLoadMore();
    }
  };

  const renderContentRow = useCallback(
    (row: Row<SearchHit>) => {
      const hit = row.original;
      return (
        <ResultCard
          key={row.id}
          title={hit.displayableName}
          type={hit.nodeType}
          path={hit.path}
          excerpt={hit.excerpt}
          thumbnailUrl={hit.thumbnailUrl}
          onAction={() => {
            locateInJContent(hit.path, hit.nodeType);
            onNavigate?.();
          }}
          onSecondaryAction={() => editNode(hit.path)}
          scrollContainerRef={scrollContainerRef}
          inputWrapperRef={inputWrapperRef}
        />
      );
    },
    [onNavigate, scrollContainerRef, inputWrapperRef],
  );

  // Hide the section entirely when there are no results and we're not loading.
  if (hits.length === 0 && !loading) return null;

  return (
    <div className={`${hideTableHead.section} ${s.section}`}>
      <Typography variant="heading">{title}</Typography>

      {loading && hits.length === 0 && (
        <Typography variant="body">
          {t("search.loading", "Searching…")}
        </Typography>
      )}

      {visibleHits.length > 0 && (
        <DataTable<SearchHit>
          className={hideTableHead.resultsTable}
          data={visibleHits}
          primaryKey="id"
          columns={contentColumns}
          renderRow={renderContentRow}
        />
      )}

      {loading && hits.length > 0 && (
        <Typography variant="caption">
          {t("search.loadingMore", "Loading more…")}
        </Typography>
      )}

      {!loading && hasMoreToShow && hits.length > 0 && (
        <Button
          className={hideTableHead.showMoreButton}
          variant="ghost"
          label={t("search.showMore", "Show more")}
          onClick={handleShowMore}
        />
      )}
    </div>
  );
};
