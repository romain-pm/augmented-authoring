import React, { useState } from "react";
import {
  Button,
  Chip,
  Edit,
  TableRow,
  Tooltip,
  Typography,
} from "@jahia/moonstone";
import { useTranslation } from "react-i18next";
import type { SearchHit } from "./searchQuery.ts";
import { locateInJContent, sanitizeHtml } from "./searchUtils.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const editNode = (path: string) =>
  (window.parent as any).CE_API?.edit({ path });

const ROW_HEIGHT = "96px";
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
  const [hovered, setHovered] = useState(false);

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
      style={{ height: ROW_HEIGHT, cursor: "pointer" }}
      onClick={() => {
        locateInJContent(hit.path);
        onNavigate?.();
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Two-column layout: content | action */}
      <div
        style={{ display: "flex", alignItems: "center", width: "100%" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Column 1: content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            flex: 1,
            minWidth: 0,
          }}
        >
          <Typography variant="subHeading">{displayableName}</Typography>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Chip color="accent" label={hit.nodeType} />
            <Typography variant="caption">{hit.path}</Typography>
          </div>
          {hit.excerpt && (
            <Typography
              variant="body"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              <span
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(hit.excerpt) }}
              />
            </Typography>
          )}
        </div>

        {/* Column 2: edit action, fixed 32px, visible on hover */}
        <div
          style={{
            width: "32px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            visibility: hovered ? "visible" : "hidden",
          }}
        >
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
