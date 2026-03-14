import { gql, useLazyQuery } from "@apollo/client";
import {
  Button,
  Input,
  Table,
  DataTable,
  TableBody,
  TableBodyCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Tooltip,
} from "@jahia/moonstone";
import { Edit, Search } from "@jahia/moonstone";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Column } from "react-table";
import { useTable } from "react-table";

const PAGE_SIZE = 10;

const SEARCH_QUERY = gql`
  query Search($q: String!, $siteKeys: [String]!, $language: String!, $page: Int!) {
    search(
      q: $q
      siteKeys: $siteKeys
      language: $language
      workspace: EDIT
    ) {
      results(size: 10, page: $page) {
        totalHits
        took
        hits {
          id
          path
          link
          displayableName
          excerpt
          score
          lastModified
          lastModifiedBy
          createdBy
          created
          nodeType
          mimeType
        }
      }
    }
  }
`;

type SearchHit = {
  id: string;
  path: string;
  link: string;
  displayableName: string;
  excerpt: string;
  score: number;
  lastModified: string;
  lastModifiedBy: string;
  createdBy: string;
  created: string;
  nodeType: string;
  mimeType: string;
};

function getSiteKey(): string {
  if (window.contextJsParameters.siteKey) {
    return window.contextJsParameters.siteKey;
  }
  // Fallback: parse from URL pattern /administration/{siteKey}/settings/...
  const parts = window.location.pathname.split("/");
  const adminIndex = parts.indexOf("administration");
  return adminIndex !== -1 && parts[adminIndex + 1] ? parts[adminIndex + 1] : "default";
}

function getLanguage(): string {
  return window.contextJsParameters.uilang ?? "en";
}

type SearchContentProps = {
  focusOnField?: boolean;
  onNavigate?: () => void;
};

export const SearchContent = ({ focusOnField, onNavigate }: SearchContentProps) => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState("");
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [allHits, setAllHits] = useState<SearchHit[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentQuery, setCurrentQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingPageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadNextPageFnRef = useRef<() => void>(() => {});

  const locateInJContent = (nodePath: string) => {
    const site = getSiteKey();
    const language = getLanguage();
    const siteBase = `/sites/${site}`;

    //let parentPath = nodePath.substring(0, nodePath.lastIndexOf("/"));
    let parentPath = nodePath;

    if (!parentPath || !parentPath.startsWith(siteBase)) {
      parentPath = siteBase;
    }

    let mode: string;
    let urlPath: string;
    if (parentPath.startsWith(`${siteBase}/files`)) {
      mode = "media";
      urlPath = parentPath.replace(siteBase, "");
    } else if (parentPath.startsWith(`${siteBase}/contents`)) {
      mode = "content-folders";
      urlPath = parentPath.replace(siteBase, "");
    } else {
      mode = "pages";
      urlPath = parentPath.replace(siteBase, "") || "/";
    }

    const encodedPath = urlPath
      .split("/")
      .map((s) => (s ? encodeURIComponent(s) : ""))
      .join("/");

    const newUrl = `/jahia/jcontent/${site}/${language}/${mode}${encodedPath}`;
    // Push the new URL into the parent SPA's history and fire a popstate event
    // so React Router re-renders without triggering a full page reload.
    window.parent.history.pushState({ key: String(Date.now()) }, "", newUrl);
    window.parent.dispatchEvent(new PopStateEvent("popstate", { state: { key: String(Date.now()) } }));
  };

  const [runSearch, { loading }] = useLazyQuery<{
    search: { results: { totalHits: number; hits: SearchHit[] } };
  }>(SEARCH_QUERY, {
    fetchPolicy: "network-only",
    onCompleted: (result) => {
      const newHits = result?.search?.results?.hits ?? [];
      const total = result?.search?.results?.totalHits ?? 0;
      setTotalHits(total);
      setAllHits((prev) => {
        const updated = loadingPageRef.current === 0 ? newHits : [...prev, ...newHits];
        setHasMore(updated.length < total);
        return updated;
      });
    },
  });

  const triggerSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setCurrentQuery(trimmed);
    setCurrentPage(0);
    loadingPageRef.current = 0;
    void runSearch({
      variables: { q: trimmed, siteKeys: [getSiteKey()], language: getLanguage(), page: 0 },
    });
  };

  // Always keep a stable ref to the latest load-next-page logic so the
  // IntersectionObserver (set up once) never needs to be re-created.
  loadNextPageFnRef.current = () => {
    if (loading || !hasMore || !currentQuery) return;
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadingPageRef.current = nextPage;
    void runSearch({
      variables: { q: currentQuery, siteKeys: [getSiteKey()], language: getLanguage(), page: nextPage },
    });
  };

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
    debounceRef.current = setTimeout(() => {
      triggerSearch(searchValue);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const columns = useMemo<Column<SearchHit>[]>(
    () => [
      {
        Header: t("search.col.title", "Title & excerpt"),
        accessor: "displayableName",
        // Other fixed cols: 120 + 160 + 56 = 336 → set this to 336 for ~50/50 split
        width: 336,
        Cell: ({ row }: { row: { original: SearchHit } }) => (
          <div style={{ overflow: "hidden", maxHeight: "52px" }}>
            <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.original.displayableName}
            </div>
            {row.original.excerpt && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#374151",
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  // Prevent any injected block elements from expanding the row
                  display: "block",
                  lineHeight: "1.4",
                  maxHeight: "1.4em",
                }}
                dangerouslySetInnerHTML={{ __html: row.original.excerpt }}
              />
            )}
          </div>
        ),
      },
      { Header: t("search.col.type", "Type"), accessor: "nodeType", width: 120 },
      {
        Header: t("search.col.lastModified", "Last modified"),
        accessor: "lastModified",
        width: 160,
        Cell: ({ row }: { row: { original: SearchHit } }) => (
          <div style={{ fontSize: "12px" }}>
            <div>by {row.original.lastModifiedBy}</div>
            <div style={{ color: "#6b7280", marginTop: "2px" }}>on {row.original.lastModified}</div>
          </div>
        ),
      },
    ],
    [t]
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable<SearchHit>({ columns, data: allHits });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
      {/* Force Moonstone input height */}
      <style>{`.augmented-search-input .moonstone-input { min-height: 36px !important; font-size: 16px !important; }`}</style>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ flex: 1, fontSize: "1.5rem", minHeight: "36px" }} className="augmented-search-input">
          <Input
            size="big"
            placeholder={t("search.placeholder", "Search…")}
            value={searchValue}
            icon={<Search />}
            focusOnField={focusOnField}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === "Enter") triggerSearch(searchValue);
            }}
            onClear={() => setSearchValue("")}
          />
        </div>
      </div>

      {(allHits.length > 0 || totalHits > 0) && (
        <span style={{ fontSize: "12px", color: "#6b7280" }}>
          {t("search.results", "{{count}} result(s)", { count: totalHits })}
        </span>
      )}

      <div ref={scrollContainerRef} style={{ overflowY: "auto", flex: 1, minWidth: 0 }}>
      <Table {...getTableProps()} style={{ tableLayout: "fixed", width: "100%" }}>
        <TableHead>
          {headerGroups.map((headerGroup) => (
            <TableRow {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <TableHeadCell
                  {...column.getHeaderProps()}
                  width={column.width ? `${column.width}px` : undefined}
                >
                  {column.Header as string}
                </TableHeadCell>
              ))}
              <TableHeadCell width="56px" />
            </TableRow>
          ))}
        </TableHead>
        <TableBody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            const isHovered = hoveredRowId === row.original.id;
            return (
              <TableRow
                {...row.getRowProps()}
                style={{ height: "64px", cursor: "pointer" }}
                onMouseEnter={() => setHoveredRowId(row.original.id)}
                onMouseLeave={() => setHoveredRowId(null)}
                onClick={() => { locateInJContent(row.original.path); onNavigate?.(); }}
              >
                {row.cells.map((cell) => (
                  <TableBodyCell
                    {...cell.getCellProps()}
                    style={{
                      verticalAlign: "middle",
                      overflow: "hidden",
                      width: cell.column.width ? `${cell.column.width}px` : undefined,
                    }}
                  >
                    {cell.render("Cell")}
                  </TableBodyCell>
                ))}
                <TableBodyCell style={{ verticalAlign: "middle", textAlign: "right" }}>
                  {isHovered && (
                    <Tooltip label={t("search.action.edit", "Edit")}>
                      <Button
                        size="big"
                        variant="ghost"
                        icon={<Edit width={24} height={24} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (window.parent as any).CE_API?.edit({ path: row.original.path });
                        }}
                      />
                    </Tooltip>
                  )}
                </TableBodyCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {/* Sentinel triggers IntersectionObserver to load the next page */}
      <div ref={sentinelRef} style={{ height: "1px" }} />
      {loading && allHits.length > 0 && (
        <div style={{ textAlign: "center", padding: "8px", fontSize: "12px", color: "#6b7280" }}>
          {t("search.loadingMore", "Loading more…")}
        </div>
      )}
      </div>
    </div>
  );
};

export const SearchPanel = () => <SearchContent focusOnField />;
