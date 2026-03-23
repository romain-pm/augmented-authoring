/**
 * Generic factory hook for JCR-based search drivers.
 *
 * All JCR search tables (pages, media, main resources) follow the same pattern:
 *   1. Accept a search term + page number
 *   2. Depending on the cfg `typeOfJCRGraphQL` setting, run either:
 *      - a `nodesByQuery` query (raw JCR-SQL2 string), or
 *      - a `nodesByCriteria` query (structured GraphQL criteria)
 *   3. Map the returned JCR nodes into `SearchHit[]`
 *   4. Track pagination state (hasMore / page offset)
 *
 * The only things that differ between tables are:
 *   - `nodesByQueryDoc`  — the GQL document for the nodesByQuery approach
 *   - `nodesByCriteriaDoc` — the GQL document for the nodesByCriteria approach
 *   - `buildSql2` — builds the JCR-SQL2 string for the nodesByQuery approach
 *
 * This hook encapsulates all the shared state management, Apollo plumbing,
 * and pagination logic so each concrete hook is a one-liner.
 */
import { useLazyQuery, type DocumentNode } from "@apollo/client";
import { useCallback, useRef, useState } from "react";
import {
  jcrNodeToSearchHit,
  type JcrNode,
  buildNodesByCriteriaVariables,
} from "./queries/jcrQueryUtils.ts";
import type { SearchHit, ContentSearchDriver } from "../shared/searchTypes.ts";
import { getSiteKey, getSearchLanguage } from "../shared/navigationUtils.ts";
import { getJcrQueryType } from "../shared/configUtils.ts";

const PAGE_SIZE = 10;

type UseJcrSearchDriverOptions = {
  /** GQL document for the `nodesByQuery` approach (raw JCR-SQL2). */
  nodesByQueryDoc: DocumentNode;
  /** GQL document for the `nodesByCriteria` approach (structured criteria). */
  nodesByCriteriaDoc: DocumentNode;
  /** Builds the JCR-SQL2 query string from a search term and site path. */
  buildSql2: (searchTerm: string, sitePath: string) => string;
};

export const useJcrSearchDriver = ({
  nodesByQueryDoc,
  nodesByCriteriaDoc,
  buildSql2,
}: UseJcrSearchDriverOptions): ContentSearchDriver => {
  // ── Accumulated results across pages ──
  const [allHits, setAllHits] = useState<SearchHit[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);

  // Converts raw JCR nodes into SearchHit[] and appends them (or replaces on page 0).
  const handleNodes = useCallback((nodes: JcrNode[], page: number) => {
    const newHits = nodes.map(jcrNodeToSearchHit);
    // If we got a full page of results, there's likely more on the server.
    setHasMore(newHits.length === PAGE_SIZE);
    setAllHits((prev) => (page === 0 ? newHits : [...prev, ...newHits]));
  }, []);

  // ── Apollo lazy queries — one per approach ──

  // nodesByQuery: takes a raw JCR-SQL2 string, returns edges[].node
  const [runNodesByQuery, { loading: loadingByQuery }] = useLazyQuery<{
    jcr: { nodesByQuery: { edges: { node: JcrNode }[] } };
  }>(nodesByQueryDoc, {
    fetchPolicy: "network-only",
    onCompleted: (result) => {
      const edges = result?.jcr?.nodesByQuery?.edges ?? [];
      handleNodes(
        edges.map((e) => e.node),
        pageRef.current,
      );
    },
  });

  // nodesByCriteria: takes structured criteria params, returns nodes[]
  const [runNodesByCriteria, { loading: loadingByCriteria }] = useLazyQuery<{
    jcr: { nodesByCriteria: { nodes: JcrNode[] } };
  }>(nodesByCriteriaDoc, {
    fetchPolicy: "network-only",
    onCompleted: (result) => {
      const nodes = result?.jcr?.nodesByCriteria?.nodes ?? [];
      handleNodes(nodes, pageRef.current);
    },
  });

  return {
    hits: allHits,
    // JCR queries don't return a total count — we report loaded count instead.
    totalHits: allHits.length,
    loading: loadingByQuery || loadingByCriteria,
    hasMore,

    // Dispatch the search to the appropriate approach based on cfg.
    search: (query, page) => {
      pageRef.current = page;
      const sitePath = `/sites/${getSiteKey()}`;

      if (getJcrQueryType() === "nodesByCriteria") {
        void runNodesByCriteria({
          variables: buildNodesByCriteriaVariables(
            query,
            sitePath,
            getSearchLanguage(),
            page,
            PAGE_SIZE,
          ),
        });
      } else {
        void runNodesByQuery({
          variables: {
            query: buildSql2(query, sitePath),
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
            language: getSearchLanguage(),
          },
        });
      }
    },

    reset: () => {
      setAllHits([]);
      setHasMore(false);
    },
  };
};
