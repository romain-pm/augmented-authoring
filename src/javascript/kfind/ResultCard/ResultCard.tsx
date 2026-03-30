/**
 * Generic result-item component used by every search result list.
 *
 * Renders two or three lines depending on whether an excerpt is provided:
 * - Line 1: title (truncated at 80 chars)
 * - Line 2: type badge (Chip) + path
 * - Line 3 (optional): HTML excerpt with highlighted terms
 *
 * When no excerpt is present the item uses a compact height (56px vs 96px).
 *
 * Keyboard:
 * - Enter / click → onAction (navigate to the node)
 * - E → onSecondaryAction (open content editor, if available)
 * - ArrowDown / ArrowUp → move focus between result items
 * - ArrowUp on first item → return focus to the search input
 */
import React from "react";
import {
  Button,
  Chip,
  Edit,
  Subdirectory,
  Tooltip,
  Typography,
} from "@jahia/moonstone";
import { useTranslation } from "react-i18next";
import s from "./ResultCard.module.css";

const MAX_NAME_LENGTH = 80;

type ResultCardProps = {
  readonly title: string;
  readonly type: string;
  readonly path: string;
  readonly excerpt?: string | null;
  readonly thumbnailUrl?: string | null;
  readonly tabIndex?: number;
  /** Called when the row is clicked or Enter is pressed. */
  readonly onAction: () => void;
  /** Optional secondary action button (e.g. edit). Hidden by default, shown on hover. */
  readonly onSecondaryAction?: () => void;
  readonly scrollContainerRef: React.RefObject<HTMLDivElement>;
  readonly inputWrapperRef: React.RefObject<HTMLDivElement>;
};

export const ResultCard = ({
  title,
  type,
  path,
  excerpt,
  thumbnailUrl,
  tabIndex = -1,
  onAction,
  onSecondaryAction,
  scrollContainerRef,
  inputWrapperRef,
}: ResultCardProps) => {
  const { t } = useTranslation();

  const displayTitle =
    title.length > MAX_NAME_LENGTH
      ? title.slice(0, MAX_NAME_LENGTH) + "…"
      : title;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onAction();
      return;
    }

    if (onSecondaryAction && (e.key === "e" || e.key === "E")) {
      e.preventDefault();
      onSecondaryAction();
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const rows = Array.from(
        scrollContainerRef.current?.querySelectorAll<HTMLElement>(
          "[data-kfind-result][tabindex]",
        ) ?? [],
      );
      const idx = rows.indexOf(e.currentTarget as HTMLElement);
      const next = e.key === "ArrowDown" ? idx + 1 : idx - 1;
      if (next >= 0 && next < rows.length) {
        rows[next].focus();
      } else if (next < 0) {
        inputWrapperRef.current?.querySelector<HTMLElement>("input")?.focus();
      }
    }
  };

  return (
    <li
      data-kfind-result
      className={excerpt ? s.resultRow : s.resultRowCompact}
      tabIndex={tabIndex}
      onClick={onAction}
      onKeyDown={handleKeyDown}
    >
      <div className={s.resultRowContent}>
        {thumbnailUrl && (
          <img
            className={s.thumbnail}
            src={thumbnailUrl}
            alt=""
            loading="lazy"
          />
        )}
        <div className={s.resultRowInfo}>
          <Typography variant="subHeading">{displayTitle}</Typography>
          <div className={s.resultRowMeta}>
            <Chip color="accent" label={type} />
            <Typography variant="caption">{path}</Typography>
          </div>
          {excerpt && (
            <Typography variant="caption" className={s.resultRowExcerpt}>
              {/* Excerpt is sanitized upstream before rendering. */}
              {/* eslint-disable-next-line react/no-danger */}
              <span dangerouslySetInnerHTML={{ __html: excerpt }} />
            </Typography>
          )}
        </div>

        <div className={s.resultRowActions}>
          <Tooltip label="Enter">
            <Button
              size="big"
              variant="ghost"
              icon={<Subdirectory width={24} height={24} />}
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
            />
          </Tooltip>
          {onSecondaryAction && (
            <Tooltip label={t("search.action.edit", "Edit")}>
              <Button
                size="big"
                variant="ghost"
                icon={<Edit width={24} height={24} />}
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onSecondaryAction();
                }}
              />
            </Tooltip>
          )}
        </div>
      </div>
    </li>
  );
};
