import React, { useEffect, useRef } from "react";
import { Input, Search, Typography } from "@jahia/moonstone";
import { useTranslation } from "react-i18next";
import { getSiteKey, getSearchLanguage } from "./shared/searchUtils.ts";

type KFindHeaderProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchClear: () => void;
  onTriggerSearch: (value: string) => void;
  focusOnField?: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
};

export const KFindHeader = ({
  searchValue,
  onSearchChange,
  onSearchClear,
  onTriggerSearch,
  focusOnField,
  scrollContainerRef,
}: KFindHeaderProps) => {
  const { t } = useTranslation();
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  // Keep the moonstone clear button out of the tab order.
  useEffect(() => {
    const wrapper = inputWrapperRef.current;
    if (!wrapper) return;
    const patch = () => {
      wrapper
        .querySelectorAll<HTMLElement>(".moonstone-baseInput_clearButton")
        .forEach((el) => {
          el.tabIndex = -1;
        });
    };
    patch();
    const observer = new MutationObserver(patch);
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        flexShrink: 0,
        padding: "16px 16px 12px",
        borderBottom: "1px solid var(--color-grey_20, #e0e0e0)",
        background: "var(--color-light, #fff)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "12px",
        }}
      >
        <Typography variant="title">
          {t("search.modal.title", "Welcome to kFind")}
        </Typography>
        <Typography variant="caption" style={{ opacity: 0.6 }}>
          {t("search.modal.siteInfo", "Searching in {{site}}, {{language}}", {
            site: getSiteKey(),
            language: getSearchLanguage(),
          })}
        </Typography>
      </div>
      <div ref={inputWrapperRef}>
        <Input
          size="big"
          placeholder={t("search.placeholder", "Search…")}
          value={searchValue}
          icon={<Search />}
          focusOnField={focusOnField}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              scrollContainerRef.current
                ?.querySelector<HTMLElement>(".moonstone-tableRow[tabindex]")
                ?.focus();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter") onTriggerSearch(searchValue);
          }}
          onClear={onSearchClear}
        />
      </div>
    </div>
  );
};
