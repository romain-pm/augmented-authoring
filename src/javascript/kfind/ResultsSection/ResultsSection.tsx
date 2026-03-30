/**
 * Reusable section component for one search-result list.
 *
 * Renders a titled result list with:
 * - A loading spinner when results are pending and no hits are loaded yet.
 * - "Loading more…" caption while paginating.
 * - A "Show more" button when more results are available (locally or server-side).
 * - Auto-hides entirely when there are no results and nothing is loading,
 *   so the global "no results" in KFindPanel takes over.
 *
 * Two-tier pagination:
 *   1. Client-side: `displayedCount` slices the `hits` array, starting
 *      at `maxResults` (the driver's configured initial count).
 *   2. Server-side: when the user exhausts the local slice, `onLoadMore`
 *      triggers the next server-side page fetch in the orchestration layer.
 *
 * This component is fully driver-agnostic — it receives callbacks
 * (`onHitAction`, `onSecondaryAction`) from KFindPanel, which itself
 * delegates to the driver's `locate()` and `edit()` methods.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button, Typography } from "@jahia/moonstone";
import { useTranslation } from "react-i18next";
import { ResultCard } from "../ResultCard/ResultCard.tsx";
import type { SearchHit } from "../../kfind-drivers/types.ts";
import resultsLayout from "../shared/resultsTableLayout.module.css";
import s from "./ResultsSection.module.css";

type ResultsSectionProps = {
  readonly title: string;
  readonly hits: SearchHit[];
  readonly loading: boolean;
  readonly hasMore: boolean;
  readonly maxResults: number;
  readonly trimmedQuery: string;
  readonly scrollContainerRef: React.RefObject<HTMLDivElement>;
  readonly inputWrapperRef: React.RefObject<HTMLDivElement>;
  readonly onHitAction: (hit: SearchHit) => void;
  readonly onSecondaryAction?: (hit: SearchHit) => void;
  readonly onLoadMore: () => void;
};

export const ResultsSection = ({
  title,
  hits,
  loading,
  hasMore,
  maxResults,
  trimmedQuery,
  scrollContainerRef,
  inputWrapperRef,
  onHitAction,
  onSecondaryAction,
  onLoadMore,
}: ResultsSectionProps) => {
  const { t } = useTranslation();
  const [displayedCount, setDisplayedCount] = useState(maxResults);
  const sectionRef = useRef<HTMLDivElement>(null);
  const focusFirstNewRef = useRef<number | null>(null);

  useEffect(() => {
    setDisplayedCount(maxResults);
  }, [trimmedQuery, maxResults]);

  const visibleHits = hits.slice(0, displayedCount);
  const hasMoreToShow = displayedCount < hits.length || hasMore;

  const handleShowMore = () => {
    focusFirstNewRef.current = visibleHits.length;
    const newCount = displayedCount + 10;
    setDisplayedCount(newCount);
    if (newCount >= hits.length && hasMore) {
      onLoadMore();
    }
  };

  // After new items appear in the DOM, focus the first one that was just loaded.
  useEffect(() => {
    if (focusFirstNewRef.current === null) {
      return;
    }

    const prevLength = focusFirstNewRef.current;
    if (visibleHits.length <= prevLength) {
      return;
    }

    const items =
      sectionRef.current?.querySelectorAll<HTMLElement>(
        "[data-kfind-result][tabindex]",
      ) ?? [];
    const firstNew = items[prevLength];
    if (firstNew) {
      firstNew.focus();
      focusFirstNewRef.current = null;
    }
  }, [visibleHits.length]);

  const renderRows = useCallback(
    () =>
      visibleHits.map((hit, index) => (
        <ResultCard
          key={hit.id}
          title={hit.displayableName}
          type={hit.nodeType}
          path={hit.path}
          excerpt={hit.excerpt}
          thumbnailUrl={hit.thumbnailUrl}
          tabIndex={index === 0 ? 0 : -1}
          scrollContainerRef={scrollContainerRef}
          inputWrapperRef={inputWrapperRef}
          onAction={() => onHitAction(hit)}
          onSecondaryAction={
            onSecondaryAction ? () => onSecondaryAction(hit) : undefined
          }
        />
      )),
    [
      visibleHits,
      onHitAction,
      onSecondaryAction,
      scrollContainerRef,
      inputWrapperRef,
    ],
  );

  // Hide the section entirely when there are no results and we're not loading.
  if (hits.length === 0 && !loading) {
    return null;
  }

  return (
    <div ref={sectionRef} className={`${resultsLayout.section} ${s.section}`}>
      <Typography variant="heading">{title}</Typography>

      {loading && hits.length === 0 && (
        <Typography variant="body">
          {t("search.loading", "Searching…")}
        </Typography>
      )}

      {visibleHits.length > 0 && (
        <ul className={resultsLayout.resultsList}>{renderRows()}</ul>
      )}

      {loading && hits.length > 0 && (
        <Typography variant="caption">
          {t("search.loadingMore", "Loading more…")}
        </Typography>
      )}

      {!loading && hasMoreToShow && hits.length > 0 && (
        <Button
          className={resultsLayout.showMoreButton}
          variant="ghost"
          label={t("search.showMore", "Show more")}
          onClick={handleShowMore}
        />
      )}
    </div>
  );
};
