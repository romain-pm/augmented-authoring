/**
 * Renders the "Direct URL Matches" result section.
 *
 * When the user's search input looks like a URL, this fires a GraphQL query
 * to resolve it to a JCR node via vanity URL or direct path matching.
 * The result is displayed in a single-row DataTable at the top of the results.
 */
import React, { useCallback } from "react";
import { DataTable, Typography } from "@jahia/moonstone";
import type { Row } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { ResultCard } from "../shared/ResultCard.tsx";
import type { SearchHit } from "../shared/searchTypes.ts";
import { locateInJContent } from "../shared/navigationUtils.ts";
import tableLayout from "../shared/resultsTableLayout.module.css";
import s from "../shared/ContentResultsSection.module.css";

const editNode = (path: string) => window.parent.CE_API?.edit({ path });

const columns = [{ key: "displayableName" as const, label: "" }];

type UrlReverseLookupResultsProps = {
  hit: SearchHit | null;
  loading: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  inputWrapperRef: React.RefObject<HTMLDivElement>;
  onNavigate?: () => void;
};

export const UrlReverseLookupResults = ({
  hit,
  loading,
  scrollContainerRef,
  inputWrapperRef,
  onNavigate,
}: UrlReverseLookupResultsProps) => {
  const { t } = useTranslation();

  const renderRow = useCallback(
    (row: Row<SearchHit>) => {
      const h = row.original;
      return (
        <ResultCard
          key={row.id}
          title={h.displayableName}
          type={h.nodeType}
          path={h.path}
          excerpt={h.excerpt}
          thumbnailUrl={h.thumbnailUrl}
          onAction={() => {
            locateInJContent(h.path, h.nodeType);
            onNavigate?.();
          }}
          onSecondaryAction={() => editNode(h.path)}
          scrollContainerRef={scrollContainerRef}
          inputWrapperRef={inputWrapperRef}
        />
      );
    },
    [onNavigate, scrollContainerRef, inputWrapperRef],
  );

  if (!hit && !loading) return null;

  const data = hit ? [hit] : [];

  return (
    <div className={`${tableLayout.section} ${s.section}`}>
      <Typography variant="heading">
        {t("search.urlReverseLookup.title", "Direct URL match")}
      </Typography>

      {loading && !hit && (
        <Typography variant="body">
          {t("search.loading", "Searching…")}
        </Typography>
      )}

      {data.length > 0 && (
        <DataTable<SearchHit>
          className={tableLayout.resultsTable}
          data={data}
          primaryKey="id"
          columns={columns}
          renderRow={renderRow}
        />
      )}
    </div>
  );
};
