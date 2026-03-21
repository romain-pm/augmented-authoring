import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  DataTable,
  EmptyData,
  Loader,
  Typography,
} from "@jahia/moonstone";
import type { Row } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { ResultCard } from "./ResultCard.tsx";
import type { SearchHit } from "./searchTypes.ts";
import { locateInJContent } from "./searchUtils.ts";
import hideTableHead from "./hideTableHead.module.css";

const contentColumns = [{ key: "displayableName" as const, label: "" }];

type ContentResultsSectionProps = {
  title: string;
  hits: SearchHit[];
  totalHits: number;
  loading: boolean;
  hasMore: boolean;
  maxResults: number;
  trimmedQuery: string;
  currentQuery: string;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  inputWrapperRef: React.RefObject<HTMLDivElement>;
  onNavigate?: () => void;
  onLoadMore: () => void;
};

export const ContentResultsSection = ({
  title,
  hits,
  totalHits,
  loading,
  hasMore,
  maxResults,
  trimmedQuery,
  currentQuery,
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
    const newCount = displayedCount + maxResults;
    setDisplayedCount(newCount);
    if (newCount >= hits.length && hasMore) {
      onLoadMore();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editNode = (path: string) =>
    (window.parent as any).CE_API?.edit({ path });

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
          onAction={() => {
            locateInJContent(hit.path);
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
    <div>
      <Typography variant="heading">{title}</Typography>

      {loading && hits.length === 0 && (
        <EmptyData
          icon={<Loader />}
          message={t("search.loading", "Searching…")}
        />
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
