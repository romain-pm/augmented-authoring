import React from "react";
import { Chip, TableRow, Typography } from "@jahia/moonstone";
import { useTranslation } from "react-i18next";
import type { FeatureHit } from "../augmentedFind/augmentedFindQuery.ts";
import styles from "./FeatureResultCard.module.css";

type FeatureResultCardProps = {
  hit: FeatureHit;
  onNavigate?: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  inputWrapperRef: React.RefObject<HTMLDivElement>;
};

export const FeatureResultCard = ({
  hit,
  onNavigate,
  scrollContainerRef,
  inputWrapperRef,
}: FeatureResultCardProps) => {
  const { t } = useTranslation();
  const navigate = () => {
    // Use the Jahia router history for in-app navigation (no full page reload).
    // The history basename is /jahia, so entry.path is relative to it.
    const routerHistory = (window.parent as Window & typeof globalThis).jahia
      ?.routerHistory;
    if (routerHistory) {
      routerHistory.push(hit.path);
    } else {
      // Fallback: push + popstate so React Router picks it up.
      const url = `/jahia${hit.path}`;
      const navKey = String(Date.now());
      window.parent.history.pushState({ key: navKey }, "", url);
      window.parent.dispatchEvent(
        new PopStateEvent("popstate", { state: { key: navKey } }),
      );
    }
    onNavigate?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      navigate();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const rows = Array.from(
        scrollContainerRef.current?.querySelectorAll<HTMLElement>(
          ".moonstone-tableRow[tabindex]",
        ) ?? [],
      );
      const idx = rows.indexOf(e.currentTarget as HTMLElement);
      const next = e.key === "ArrowDown" ? idx + 1 : idx - 1;
      if (next >= 0 && next < rows.length) rows[next].focus();
      else if (next < 0)
        inputWrapperRef.current?.querySelector<HTMLElement>("input")?.focus();
    }
  };

  return (
    <TableRow
      className={styles.featureRow}
      onClick={navigate}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.featureRowContent}>
        <Chip color="default" label={t("search.features.chip", "Feature")} />
        <Typography variant="subHeading">{hit.label}</Typography>
      </div>
    </TableRow>
  );
};
