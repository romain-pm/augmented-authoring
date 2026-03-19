import React, { useEffect, useRef, useState } from "react";
import { Input, Search } from "@jahia/moonstone";
import { useTranslation } from "react-i18next";
import { useSearchResults } from "./augmentedFind/useSearchResults.ts";
import { useInfiniteScroll } from "./augmentedFind/useInfiniteScroll.ts";
import { useFeatureSearch } from "./featuresFind/useFeatureSearch.ts";
import { SearchResultsView } from "./augmentedFind/SearchResultsView.tsx";

type KFindPanelProps = {
  focusOnField?: boolean;
  onNavigate?: () => void;
};

export const KFindPanel = ({ focusOnField, onNavigate }: KFindPanelProps) => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  const {
    hits,
    totalHits,
    loading,
    isSiteIndexed,
    searchEnabled,
    currentQueryRef,
    triggerSearch,
    loadNextPage,
  } = useSearchResults(searchValue);

  const { scrollContainerRef, sentinelRef } = useInfiniteScroll(loadNextPage);

  const featureHits = useFeatureSearch(searchValue);

  // Keep the moonstone clear button out of the tab order — moonstone doesn't
  // expose a prop for this, so we patch it via a MutationObserver that fires
  // whenever the button is added to (or removed from) the DOM.
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

  const trimmedQuery = searchValue.trim();

  return (
    // Outer flex column — fills the full height of the ModalBody
    <div>
      {/* ── Search input ── */}
      <div style={{ marginBottom: "16px" }}>
        <div ref={inputWrapperRef}>
          <Input
            size="big"
            placeholder={t("search.placeholder", "Search…")}
            value={searchValue}
            icon={<Search />}
            focusOnField={focusOnField && searchEnabled}
            onChange={(e) => {
              if (searchEnabled) setSearchValue(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                const first =
                  scrollContainerRef.current?.querySelector<HTMLElement>(
                    ".moonstone-tableRow[tabindex]",
                  );
                first?.focus();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === "Enter") triggerSearch(searchValue);
            }}
            onClear={() => setSearchValue("")}
          />
        </div>
      </div>

      <SearchResultsView
        isSiteIndexed={isSiteIndexed}
        searchEnabled={searchEnabled}
        trimmedQuery={trimmedQuery}
        loading={loading}
        hits={hits}
        totalHits={totalHits}
        featureHits={featureHits}
        currentQuery={currentQueryRef.current}
        scrollContainerRef={scrollContainerRef}
        sentinelRef={sentinelRef}
        inputWrapperRef={inputWrapperRef}
        onNavigate={onNavigate}
      />
    </div>
  );
};
