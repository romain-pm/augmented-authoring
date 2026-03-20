import React from "react";
import {
  Button,
  Chip,
  Edit,
  TableRow,
  Tooltip,
  Typography,
} from "@jahia/moonstone";
import { useTranslation } from "react-i18next";
import type { SearchHit } from "./searchTypes.ts";
import { locateInJContent, sanitizeHtml } from "./searchUtils.ts";
import s from "./ResultCard.module.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const editNode = (path: string) =>
  (window.parent as any).CE_API?.edit({ path });

const MAX_NAME_LENGTH = 80;

type ResultCardProps = {
  hit: SearchHit;
  onNavigate?: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  inputWrapperRef: React.RefObject<HTMLDivElement>;
};

export const ResultCard = ({
  hit,
  onNavigate,
  scrollContainerRef,
  inputWrapperRef,
}: ResultCardProps) => {
  const { t } = useTranslation();

  const displayableName =
    hit.displayableName.length > MAX_NAME_LENGTH
      ? hit.displayableName.slice(0, MAX_NAME_LENGTH) + "…"
      : hit.displayableName;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      locateInJContent(hit.path);
      onNavigate?.();
      return;
    }
    if (e.key === "e" || e.key === "E") {
      e.preventDefault();
      editNode(hit.path);
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
      // ArrowUp on the first row returns focus to the search input.
      else if (next < 0)
        inputWrapperRef.current?.querySelector<HTMLElement>("input")?.focus();
    }
  };

  return (
    <TableRow
      className={s.resultRow}
      onClick={() => {
        locateInJContent(hit.path);
        onNavigate?.();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className={s.resultRowContent}>
        <div className={s.resultRowInfo}>
          <Typography variant="subHeading">{displayableName}</Typography>
          <div className={s.resultRowMeta}>
            <Chip color="accent" label={hit.nodeType} />
            <Typography variant="caption">{hit.path}</Typography>
          </div>
          {hit.excerpt && (
            <Typography variant="caption" className={s.resultRowExcerpt}>
              <span
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(hit.excerpt) }}
              />
            </Typography>
          )}
        </div>

        <div className={s.resultRowAction}>
          <Tooltip label={t("search.action.edit", "Edit")}>
            <Button
              size="big"
              variant="ghost"
              icon={<Edit width={24} height={24} />}
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                editNode(hit.path);
              }}
            />
          </Tooltip>
        </div>
      </div>
    </TableRow>
  );
};
