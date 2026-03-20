import React, { memo, useCallback, useEffect, useState } from "react";
import {
  Button,
  DataTable,
  EmptyData,
  Close,
  Typography,
} from "@jahia/moonstone";
import type { Row } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { FeatureResultCard } from "./FeatureResultCard.tsx";
import type { FeatureHit } from "../shared/searchTypes.ts";
import {
  getDefaultDisplayedResults,
  getMinSearchChars,
} from "../shared/searchUtils.ts";
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
    const [displayedCount, setDisplayedCount] = useState(
      getDefaultDisplayedResults,
    );

    // Reset to the default page size whenever the query changes.
    useEffect(() => {
      setDisplayedCount(getDefaultDisplayedResults());
    }, [trimmedQuery]);

    const visibleFeatureHits = featureHits.slice(0, displayedCount);
    const hasMoreFeatures = displayedCount < featureHits.length;

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
    if (trimmedQuery.length < getMinSearchChars()) return null;
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
          <>
            <DataTable<FeatureHit>
              className={hideTableHead.resultsTable}
              data={visibleFeatureHits}
              primaryKey="key"
              columns={featureColumns}
              renderRow={renderFeatureRow}
            />
            {hasMoreFeatures && (
              <Button
                variant="ghost"
                label={t("search.showMore", "Show more ({{count}} results)", {
                  count: featureHits.length,
                })}
                onClick={() =>
                  setDisplayedCount((c) => c + getDefaultDisplayedResults())
                }
              />
            )}
          </>
        )}
      </>
    );
  },
);
