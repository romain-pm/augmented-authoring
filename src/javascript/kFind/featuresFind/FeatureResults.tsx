import React, { memo, useCallback } from "react";
import { DataTable, EmptyData, Close, Typography } from "@jahia/moonstone";
import type { Row } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { FeatureResultCard } from "./FeatureResultCard.tsx";
import type { FeatureHit } from "../shared/searchQuery.ts";
import hideTableHead from "../shared/hideTableHead.module.css";

const featureColumns = [{ key: "label" as const, label: "" }];

type FeatureResultsProps = {
  trimmedQuery: string;
  featureHits: FeatureHit[];
  onNavigate?: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  inputWrapperRef: React.RefObject<HTMLDivElement>;
};

// Memoized so it only re-renders when featureHits/trimmedQuery/onNavigate change — not on content loading state.
export const FeatureResults = memo(
  ({
    trimmedQuery,
    featureHits,
    onNavigate,
    scrollContainerRef,
    inputWrapperRef,
  }: FeatureResultsProps) => {
    const { t } = useTranslation();
    const renderFeatureRow = useCallback(
      (row: Row<FeatureHit>) => (
        <FeatureResultCard
          key={row.id}
          hit={row.original}
          onNavigate={onNavigate}
          scrollContainerRef={scrollContainerRef}
          inputWrapperRef={inputWrapperRef}
        />
      ),
      [onNavigate, scrollContainerRef, inputWrapperRef],
    );
    if (trimmedQuery.length < 2) return null;
    return (
      <>
        <Typography variant="heading">
          {t("search.features.title", "Features")}
        </Typography>
        {featureHits.length === 0 ? (
          <EmptyData
            icon={<Close />}
            title={t("search.features.empty", "No matching features.")}
            message=""
          />
        ) : (
          <DataTable<FeatureHit>
            className={hideTableHead.resultsTable}
            data={featureHits}
            primaryKey="key"
            columns={featureColumns}
            renderRow={renderFeatureRow}
          />
        )}
      </>
    );
  },
);
