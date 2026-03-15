import { useLazyQuery } from "@apollo/client";
import { Button, DataTable, Edit, Input, Search, TableRow, Tooltip } from "@jahia/moonstone";
import type { Row } from "@tanstack/react-table";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SEARCH_QUERY, type SearchHit } from "./searchQuery.ts";
import { getSiteKey, getLanguage, locateInJContent } from "./searchUtils.ts";
import { SearchSkeleton } from "./SearchSkeleton.tsx";


type SearchContentProps = {
  focusOnField?: boolean;
  onNavigate?: () => void;
};

// Shared styles for the empty-state and no-results centered panels.
// Defined outside the component so they are stable object references.
const stateContainer: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80%", gap: "16px", userSelect: "none" };
const stateHeading: React.CSSProperties = { fontSize: "26px", fontWeight: 800, color: "var(--color-dark)", letterSpacing: "-0.5px" };
const stateBody: React.CSSProperties = { fontSize: "14px", color: "var(--color-gray)", textAlign: "center", maxWidth: "300px", lineHeight: 1.6 };

export const SearchContent = ({ focusOnField, onNavigate }: SearchContentProps) => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const [allHits, setAllHits] = useState<SearchHit[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  // A ref (not state) so the IntersectionObserver can always read the latest
  // query string without needing to be re-created, and without triggering an
  // extra re-render when a new search starts.
  const currentQueryRef = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks which page number was requested in the most recent query call.
  // A ref (not state) is needed here because the Apollo `onCompleted` callback
  // closes over a stale state value — the ref is always current.
  const loadingPageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  // Stable ref to the "load next page" function so the IntersectionObserver
  // (mounted once) always calls the latest version without needing to be
  // re-created on every render.
  const loadNextPageFnRef = useRef<() => void>(() => {});

  const [runSearch, { loading }] = useLazyQuery<{
    search: { results: { totalHits: number; hits: SearchHit[] } };
  }>(SEARCH_QUERY, {
    fetchPolicy: "network-only",
    onCompleted: (result) => {
      const newHits = result?.search?.results?.hits ?? [];
      const total = result?.search?.results?.totalHits ?? 0;
      setTotalHits(total);
      setAllHits((prev) => {
        // Page 0 = fresh search → replace. Page N > 0 → append.
        const updated = loadingPageRef.current === 0 ? newHits : [...prev, ...newHits];
        // Derive hasMore from the freshly computed list to avoid a render lag.
        setHasMore(updated.length < total);
        return updated;
      });
    },
  });

  const triggerSearch = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 3) return;
    currentQueryRef.current = trimmed;
    loadingPageRef.current = 0;
    void runSearch({
      variables: { q: trimmed, siteKeys: [getSiteKey()], language: getLanguage(), page: 0 },
    });
  };

  // Always keep a stable ref to the latest load-next-page logic so the
  // IntersectionObserver (set up once) never needs to be re-created.
  loadNextPageFnRef.current = () => {
    if (loading || !hasMore || !currentQueryRef.current) return;
    const nextPage = loadingPageRef.current + 1;
    loadingPageRef.current = nextPage;
    void runSearch({
      variables: { q: currentQueryRef.current, siteKeys: [getSiteKey()], language: getLanguage(), page: nextPage },
    });
  };

  // Keep the moonstone clear button out of the tab order — moonstone doesn't
  // expose a prop for this, so we patch it via a MutationObserver that fires
  // whenever the button is added to (or removed from) the DOM.
  useEffect(() => {
    const wrapper = inputWrapperRef.current;
    if (!wrapper) return;
    const patch = () => {
      wrapper.querySelectorAll<HTMLElement>(".moonstone-baseInput_clearButton").forEach((el) => {
        el.tabIndex = -1;
      });
    };
    patch();
    const observer = new MutationObserver(patch);
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Set up IntersectionObserver once; it calls the ref so it never goes stale
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadNextPageFnRef.current();
      },
      { root: container, threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchValue.trim().length < 3) {
      setAllHits([]);
      setTotalHits(0);
      setHasMore(false);
      currentQueryRef.current = "";
      return;
    }
    debounceRef.current = setTimeout(() => {
      triggerSearch(searchValue);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  // `key` values must be `as const` so TypeScript narrows them to the literal
  // type required by DataTableColumn — without it the type check on `columns`
  // fails because `string` is not assignable to `keyof SearchHit`.
  // Note: DataTableColumn is not re-exported from @jahia/moonstone's public
  // index, so render() params are typed manually below.
  const columns = useMemo(
    () => [
      {
        key: "displayableName" as const,
        label: "",
        width: "calc(100% - 48px)",
        render: (_value: unknown, row: SearchHit) => (
          <div style={{ minWidth: 0, width: "100%", padding: "6px 0" }}>
            {/* Row 1: displayable name */}
            <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.displayableName.length > 80 ? row.displayableName.slice(0, 80) + "…" : row.displayableName}
            </div>
            {/* Row 2: type · path */}
            <div style={{ fontSize: "11px", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 500 }}>{row.nodeType}</span>
              <span style={{ margin: "0 5px", opacity: 0.4 }}>·</span>
              <span style={{ opacity: 0.7 }}>{row.path}</span>
            </div>
            {/* Row 3: excerpt */}
            {row.excerpt && (
              <div
                style={{
                  fontSize: "12px",
                  color: "var(--color-gray_dark)",
                  marginTop: "3px",
                  overflow: "hidden",
                  whiteSpace: "normal",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  lineHeight: "1.5",
                }}
                dangerouslySetInnerHTML={{ __html: row.excerpt }}
              />
            )}
          </div>
        ),
      },
    ],
    [t]
  );  // Memoized so DataTable gets a stable renderRow reference — prevents rows
  // from re-rendering on every keystroke while results are already visible.
  const renderRow = useCallback(
    (row: Row<SearchHit>, defaultRender: (opts?: { actions?: React.ReactNode; actionsOnHover?: React.ReactNode }) => React.ReactNode) => (
      <TableRow
        key={row.id}
        style={{ height: "96px", cursor: "pointer" }}
        onClick={() => { locateInJContent(row.original.path); onNavigate?.(); }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter") { locateInJContent(row.original.path); onNavigate?.(); return; }
          if (e.key === "e" || e.key === "E") { e.preventDefault(); (window.parent as any).CE_API?.edit({ path: row.original.path }); return; }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const rows = Array.from(
              scrollContainerRef.current?.querySelectorAll<HTMLElement>(".moonstone-tableRow[tabindex]") ?? []
            );
            const idx = rows.indexOf(e.currentTarget as HTMLElement);
            const next = e.key === "ArrowDown" ? idx + 1 : idx - 1;
            if (next >= 0 && next < rows.length) rows[next].focus();
            else if (next < 0) inputWrapperRef.current?.querySelector<HTMLElement>("input")?.focus();
          }
        }}
      >
        {defaultRender({
          actions: (
            <Tooltip label={t("search.action.edit", "Edit")}>
              <Button
                size="big"
                variant="ghost"
                icon={<Edit width={24} height={24} />}
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (window.parent as any).CE_API?.edit({ path: row.original.path });
                }}
              />
            </Tooltip>
          ),
        })}
      </TableRow>
    ),
    [t, onNavigate]
  );

  // Compute once per render; used across empty state, skeleton, no-results, and no-results text
  const trimmedQuery = searchValue.trim();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
      {/* Force Moonstone input height; sticky table header within the scroll container */}
      <style>{`
        /* Force Moonstone input to be taller and more readable */
        .augmented-search-input .moonstone-input { min-height: 36px !important; font-size: 16px !important; }

        /* Hide the auto-generated table header — we don't need column labels in the search UI */
        .augmented-search-results thead { display: none; }

        /* Allow the title/excerpt cell to overflow vertically so 2-line clamp works.
           Moonstone's moonstone-nowrap class otherwise collapses the cell to 1 line. */
        .augmented-search-results .moonstone-tableCell:first-child { overflow: visible !important; }

        /* Ensure the hover-actions cell stretches to full row height and right-aligns */
        .augmented-search-results .moonstone-tableCellActions { align-self: stretch; display: flex; align-items: center; justify-content: flex-end; }

        /* Keyboard focus ring: white gap + accent outline, rounded to match row shape */
        .augmented-search-results .moonstone-tableRow:focus,
        .augmented-search-results .moonstone-tableRow:hover { outline: none; border-radius: 6px; box-shadow: 0 0 0 2px var(--color-white), 0 0 0 4px var(--color-accent); }

        /* Highlight matched terms (Jahia wraps them in <em> inside excerpt HTML) */
        .augmented-search-results em { font-weight: 700; font-style: italic; color: var(--color-accent); }

        /* Skeleton shimmer animation for the loading state */
        @keyframes shimmer { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
        .augmented-skeleton {
          background: linear-gradient(90deg, var(--color-gray_light_plain20) 25%, var(--color-gray_plain20) 50%, var(--color-gray_light_plain20) 75%);
          background-size: 600px 100%;
          animation: shimmer 1.2s infinite linear;
          border-radius: 4px;
        }
      `}</style>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div ref={inputWrapperRef} style={{ flex: 1, fontSize: "1.5rem", minHeight: "36px" }} className="augmented-search-input">
          <Input
            size="big"
            placeholder={t("search.placeholder", "Search…")}
            value={searchValue}
            icon={<Search />}
            focusOnField={focusOnField}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                const first = scrollContainerRef.current?.querySelector<HTMLElement>(".moonstone-tableRow[tabindex]");
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

      {(allHits.length > 0 || totalHits > 0) && (
        <span style={{ fontSize: "12px", color: "var(--color-gray)" }}>
          {t("search.results", "{{count}} result(s)", { count: totalHits })}
        </span>
      )}

      <div ref={scrollContainerRef} style={{ overflowY: "auto", flex: 1, minWidth: 0, padding: "4px 4px 0" }}>
        {/* ── Empty state (shown until user types 3+ chars) ── */}
        {trimmedQuery.length < 3 && (
          <div style={stateContainer}>
            <div style={{ fontSize: "72px", lineHeight: 1 }}>🔍</div>
            <div style={stateHeading}>{t("search.empty.title", "Find anything.")}</div>
            <div style={stateBody}>{t("search.empty.hint", "Pages, content, documents, ...")}</div>
            <div style={stateBody}>{t("search.empty.hint2", "Just start typing (3 chars min).")}</div>
          </div>
        )}

        {/* ── Skeleton loader (shown while first page is fetching) ── */}
        {loading && allHits.length === 0 && trimmedQuery.length >= 3 && <SearchSkeleton />}

        {/* ── No results (only shown once the query has actually completed) ── */}
        {trimmedQuery.length >= 3 && !loading && allHits.length === 0 && currentQueryRef.current === trimmedQuery && (
          <div style={stateContainer}>
            <div style={{ fontSize: "72px", lineHeight: 1 }}>🕵️</div>
            <div style={stateHeading}>{t("search.noResults.title", "No results.")}</div>
            <div style={stateBody}>{t("search.noResults.hint", 'Nothing matched "{{q}}". Try different keywords or check for typos.', { q: trimmedQuery })}</div>
          </div>
        )}
        <DataTable<SearchHit>
          className="augmented-search-results"
          data={allHits}
          primaryKey="id"
          columns={columns}
          renderRow={renderRow}
        />
        {/* Sentinel triggers IntersectionObserver to load the next page */}
        <div ref={sentinelRef} style={{ height: "1px" }} />
        {loading && allHits.length > 0 && (
          <div style={{ textAlign: "center", padding: "8px", fontSize: "12px", color: "var(--color-gray)" }}>
            {t("search.loadingMore", "Loading more…")}
          </div>
        )}
      </div>
    </div>
  );
};

export const SearchPanel = () => <SearchContent focusOnField />;
