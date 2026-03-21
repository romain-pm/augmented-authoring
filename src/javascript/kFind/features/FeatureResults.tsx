import React, { memo, useCallback, useEffect, useState } from "react";
import { Button, DataTable, Typography } from "@jahia/moonstone";
import type { Row } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import { ResultCard } from "../shared/ResultCard.tsx";
import type { FeatureHit } from "../shared/searchTypes.ts";
import {
  getUiFeaturesMaxResults,
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
      getUiFeaturesMaxResults,
    );

    // Reset to the configured max results whenever the query changes.
    useEffect(() => {
      setDisplayedCount(getUiFeaturesMaxResults());
    }, [trimmedQuery]);

    const visibleFeatureHits = featureHits.slice(0, displayedCount);
    const hasMoreFeatures = displayedCount < featureHits.length;

    const renderFeatureRow = useCallback(
      (row: Row<FeatureHit>) => {
        const hit = row.original;
        const navigate = () => {
          const routerHistory = (window.parent as Window & typeof globalThis)
            .jahia?.routerHistory;
          if (routerHistory) {
            routerHistory.push(hit.path);
          } else {
            const url = `/jahia${hit.path}`;
            const navKey = String(Date.now());
            window.parent.history.pushState({ key: navKey }, "", url);
            window.parent.dispatchEvent(
              new PopStateEvent("popstate", { state: { key: navKey } }),
            );
          }
          onNavigate?.();
        };
        return (
          <ResultCard
            key={row.id}
            title={hit.label}
            type={t("search.features.chip", "Feature")}
            path={hit.path}
            onAction={navigate}
            scrollContainerRef={scrollContainerRef}
            inputWrapperRef={inputWrapperRef}
          />
        );
      },
      [onNavigate, scrollContainerRef, inputWrapperRef, t],
    );
    if (trimmedQuery.length < getMinSearchChars()) return null;
    if (featureHits.length === 0) return null;

    return (
      <>
        <Typography variant="heading">
          {t("search.features.title", "Features")}
        </Typography>
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
              setDisplayedCount((c) => c + getUiFeaturesMaxResults())
            }
          />
        )}
      </>
    );
  },
);
