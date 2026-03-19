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
import type { SearchHit } from "./searchQuery.ts";

// Static — no render function, so a stable reference avoids unnecessary DataTable re-diffs.
const columns = [{ key: "displayableName" as const, label: "" }];

type SearchResultsViewProps = {
  isSiteIndexed: boolean | null;
  searchEnabled: boolean;
  trimmedQuery: string;
  loading: boolean;
  hits: SearchHit[];
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
  currentQuery,
  scrollContainerRef,
  sentinelRef,
  inputWrapperRef,
  onNavigate,
}: SearchResultsViewProps) => {
  const { t } = useTranslation();

  // ResultCard renders its own <TableRow>, so DataTable's defaultRender is intentionally bypassed.
  const renderRow = useCallback(
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
    <div
      ref={scrollContainerRef}
      style={{ overflowY: "auto", flex: 1, minWidth: 0, padding: "4px 8px 0" }}
    >
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

      {/* ── Empty state (shown until user types 3+ chars) ── */}
      {searchEnabled && trimmedQuery.length < 3 && (
        <EmptyData
          icon={<Search size="big" />}
          title={t("search.empty.title", "Find anything.")}
          message={t(
            "search.empty.hint",
            "Pages, content, documents — just start typing (3 chars min).",
          )}
        />
      )}

      {/* ── Skeleton loader (shown while the first page is fetching) ── */}
      {searchEnabled &&
        loading &&
        hits.length === 0 &&
        trimmedQuery.length >= 3 && (
          <EmptyData
            icon={<Loader size="big" />}
            message={t("search.loading", "Searching…")}
          />
        )}

      {/* ── No results (only shown once the query has actually completed) ── */}
      {searchEnabled &&
        trimmedQuery.length >= 3 &&
        !loading &&
        hits.length === 0 &&
        currentQuery === trimmedQuery && (
          <EmptyData
            icon={<Close size="big" />}
            title={t("search.noResults.title", "No results.")}
            message={t(
              "search.noResults.hint",
              'Nothing matched "{{q}}". Try different keywords or check for typos.',
              { q: trimmedQuery },
            )}
          />
        )}

      <style>{`.search-results-table .moonstone-tableHead { display: none; }`}</style>
      <DataTable<SearchHit>
        className="search-results-table"
        data={hits}
        primaryKey="id"
        columns={columns}
        renderRow={renderRow}
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
