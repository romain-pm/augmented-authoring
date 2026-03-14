import { gql, useLazyQuery } from "@apollo/client";
import { Button, DataTable, Edit, Input, Search, TableRow, Tooltip } from "@jahia/moonstone";
import type { Row } from "@tanstack/react-table";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import i18next from "i18next";
import { registry } from "@jahia/ui-extender";
import { useTranslation } from "react-i18next";

// NOTE: page size is hardcoded to 10 in the query below — keep in sync if changed.
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
        hits {
          id
          path
          displayableName
          excerpt
          lastModified
          lastModifiedBy
          nodeType
        }
      }
    }
  }
`;

type SearchHit = {
  id: string;
  path: string;
  displayableName: string;
  excerpt: string;
  lastModified: string;
  lastModifiedBy: string;
  nodeType: string;
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

// Navigates the parent jContent SPA to the given node path by pushing a new
// URL into its history and firing a synthetic popstate so React Router picks
// it up — without a full page reload.
// Defined outside the component because it only uses module-level helpers,
// making it a stable reference for useCallback deps below.
function locateInJContent(nodePath: string) {
  const site = getSiteKey();
  const language = getLanguage();
  const siteBase = `/sites/${site}`;

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
  const navKey = String(Date.now());
  // Push and fire a synthetic popstate so React Router re-renders without a
  // full page reload.
  window.parent.history.pushState({ key: navKey }, "", newUrl);
  window.parent.dispatchEvent(new PopStateEvent("popstate", { state: { key: navKey } }));
}

type SearchContentProps = {
  focusOnField?: boolean;
  onNavigate?: () => void;
};

// ─── Feature / admin-route search ─────────────────────────────────────────────

type FeatureHit = {
  key: string;
  label: string; // resolved display label (translated or humanized)
};

// Humanizes camelCase / kebab-case / snake_case strings for display.
function humanize(s: string): string {
  return s
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Tries to translate an i18n key of the form "namespace:key" using the shared
// i18next singleton (which includes all loaded module namespaces at runtime).
// Falls back to humanizing the key portion when the namespace is not loaded.
function resolveLabel(rawLabel: string | undefined, fallbackKey: string): string {
  if (!rawLabel) return humanize(fallbackKey);
  const translated = i18next.t(rawLabel);
  if (translated !== rawLabel) return translated;
  // Not translated — humanize the part after the colon
  const part = rawLabel.includes(":") ? rawLabel.split(":").pop() : rawLabel;
  return humanize(part ?? fallbackKey);
}

// Returns adminRoute entries from the shared Jahia registry that match the
// query string against both the key and the resolved display label.
// @jahia/ui-extender is a shared singleton in the federation config, so
// registry.find() reads from the same instance the host app uses.
function searchFeatures(query: string): FeatureHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return registry
    .find({ type: "adminRoute" })
    .map((e) => ({
      key: e.key,
      label: resolveLabel(e.label as string | undefined, e.key),
    }))
    .filter(({ key, label }) =>
      key.toLowerCase().includes(q) || label.toLowerCase().includes(q)
    );
}

// Finds the accordion item key that hosts a given admin route.
// Admin routes targeting "jcontent:XX" or "jcontent-X:XX" all render inside
// the "apps" accordion (appsTarget="jcontent"). Custom module accordions are
// matched by looking for an accordionItem whose appsTarget equals the route's
// direct target, or whose appsTarget is a prefix of it (nested sub-targets).
function findAccordionMode(routeKey: string): string {
  const route = registry.get("adminRoute", routeKey);
  const targets = (route?.targets ?? []) as Array<{ id: string }>;
  for (const target of targets) {
    const tid = target.id;
    const accordions = registry.find({ type: "accordionItem" });
    for (const accordion of accordions) {
      const appsTarget = accordion.appsTarget as string | undefined;
      if (!appsTarget) continue;
      if (appsTarget === tid || tid.startsWith(appsTarget + "-")) {
        return accordion.key;
      }
    }
  }
  return "apps"; // default: jcontent's generic apps accordion
}

// Navigates the parent jContent SPA to a registered admin route by its key.
// Primary path: dispatches the jcontentGoto Redux action (registered by
// jcontent) so that routing, mode, and Redux state all stay consistent.
// Fallback: pushes the URL directly and fires a synthetic popstate.
function navigateToFeature(routeKey: string) {
  const mode = findAccordionMode(routeKey);
  // Try Redux dispatch first (the canonical jcontent navigation mechanism)
  const jcGoto = registry.get("redux-action", "jcontentGoto");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jahia = (window as any).jahia ?? (window.parent as any).jahia;
  if (jcGoto?.action && jahia?.reduxStore) {
    jahia.reduxStore.dispatch(jcGoto.action({ mode, path: "/" + routeKey }));
    return;
  }
  // Fallback: construct the URL manually
  const site = getSiteKey();
  const language = getLanguage();
  const newUrl = `/jahia/jcontent/${site}/${language}/${mode}/${routeKey}`;
  const navKey = String(Date.now());
  window.parent.history.pushState({ key: navKey }, "", newUrl);
  window.parent.dispatchEvent(new PopStateEvent("popstate", { state: { key: navKey } }));
}

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
    if (!trimmed) return;
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
    debounceRef.current = setTimeout(() => {
      triggerSearch(searchValue);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  // Client-side instant filter of matching admin routes — updates on every keystroke.
  const featureHits = useMemo(() => searchFeatures(searchValue), [searchValue]);

  // Feature table: label column + key column (monospace, secondary).
  const featureColumns = useMemo(
    () => [
      {
        key: "label" as const,
        label: t("search.feature.col.name", "Feature"),
        width: "65%",
      },
      {
        key: "key" as const,
        label: t("search.feature.col.key", "Module key"),
        width: "35%",
        render: (_value: unknown, row: FeatureHit) => (
          <span style={{ fontSize: "12px"}}>
            {row.key}
          </span>
        ),
      },
    ],
    [t]
  );

  const renderFeatureRow = useCallback(
    (row: Row<FeatureHit>, defaultRender: (opts?: { actions?: React.ReactNode; actionsOnHover?: React.ReactNode }) => React.ReactNode) => (
      <TableRow
        key={row.id}
        style={{ cursor: "pointer" }}
        onClick={() => { navigateToFeature(row.original.key); onNavigate?.(); }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter") { navigateToFeature(row.original.key); onNavigate?.(); }
        }}
      >
        {defaultRender()}
      </TableRow>
    ),
    [onNavigate]
  );

  // `key` values must be `as const` so TypeScript narrows them to the literal
  // type required by DataTableColumn — without it the type check on `columns`
  // fails because `string` is not assignable to `keyof SearchHit`.
  // Note: DataTableColumn is not re-exported from @jahia/moonstone's public
  // index, so render() params are typed manually below.
  const columns = useMemo(
    () => [
      {
        key: "displayableName" as const,
        label: t("search.col.title", "Title & excerpt"),
        width: "64%",
        render: (_value: unknown, row: SearchHit) => (
          <div style={{ overflow: "hidden", maxHeight: "52px" }}>
            <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.displayableName}
            </div>
            {row.excerpt && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#374151",
                  marginTop: "2px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  display: "block",
                  lineHeight: "1.4",
                  maxHeight: "1.4em",
                }}
                dangerouslySetInnerHTML={{ __html: row.excerpt }}
              />
            )}
          </div>
        ),
      },
      { key: "nodeType" as const, label: t("search.col.type", "Type"), width: "16%" },
      {
        key: "lastModified" as const,
        label: t("search.col.lastModified", "Last modified"),
        width: "12%",
        render: (_value: unknown, row: SearchHit) => (
          <div style={{ fontSize: "12px" }}>
            <div>by {row.lastModifiedBy}</div>
            <div style={{ color: "#6b7280", marginTop: "2px" }}>on {row.lastModified}</div>
          </div>
        ),
      },
    ],
    [t]
  );  // Memoized so DataTable gets a stable renderRow reference — prevents rows
  // from re-rendering on every keystroke while results are already visible.
  const renderContentRow = useCallback(
    (row: Row<SearchHit>, defaultRender: (opts?: { actions?: React.ReactNode; actionsOnHover?: React.ReactNode }) => React.ReactNode) => (
      <TableRow
        key={row.id}
        style={{ height: "64px", cursor: "pointer" }}
        onClick={() => { locateInJContent(row.original.path); onNavigate?.(); }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter") { locateInJContent(row.original.path); onNavigate?.(); }
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
      {/* Force Moonstone input height; sticky table header within the scroll container */}
      <style>{`
        .augmented-search-input .moonstone-input { min-height: 36px !important; font-size: 16px !important; }
        .augmented-search-results thead { display: none; }
        .augmented-search-results .moonstone-tableCell { height: 64px; }
        .augmented-search-results .moonstone-tableCellActions { align-self: stretch; display: flex; align-items: center; justify-content: flex-end; }
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
            onKeyUp={(e) => {
              if (e.key === "Enter") triggerSearch(searchValue);
            }}
            onClear={() => setSearchValue("")}
          />
        </div>
      </div>

      <div ref={scrollContainerRef} style={{ overflowY: "auto", flex: 1, minWidth: 0 }}>
        {/* Features section — instant client-side filter of registered adminRoutes */}
        {searchValue.trim() && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 4px 6px" }}>
              {t("search.section.features", "Features")} · {featureHits.length}
            </div>
            {featureHits.length > 0 ? (
              <DataTable<FeatureHit>
                className="augmented-search-results"
                data={featureHits}
                primaryKey="key"
                columns={featureColumns}
                renderRow={renderFeatureRow}
              />
            ) : (
              <div style={{ fontSize: "13px", color: "#9ca3af", padding: "8px 4px" }}>
                {t("search.noFeatureResults", "No matching features")}
              </div>
            )}
          </div>
        )}

        {/* Content section — paginated GraphQL search */}
        {(allHits.length > 0 || totalHits > 0) && (
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 4px 6px" }}>
            {t("search.section.content", "Content")} · {totalHits}
          </div>
        )}
        <DataTable<SearchHit>
          className="augmented-search-results"
          data={allHits}
          primaryKey="id"
          columns={columns}
          renderRow={renderContentRow}
        />
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
