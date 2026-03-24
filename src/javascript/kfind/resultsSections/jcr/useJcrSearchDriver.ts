/**
 * Generic factory hook for JCR-based search drivers.
 *
 * All JCR search tables (pages, media, main resources) follow the same pattern:
 *   1. Accept a search term + page number
 *   2. Run a `nodesByCriteria` query (structured GraphQL criteria)
 *   3. Map the returned JCR nodes into `SearchHit[]`
 *   4. Track pagination state (hasMore / page offset)
 *
 * The only thing that differs between tables is the `queryDoc` — the GQL
 * document containing the nodesByCriteria query for that node type.
 *
 * This hook encapsulates all the shared state management, Apollo plumbing,
 * and pagination logic so each concrete hook is a one-liner.
 */
import { useLazyQuery, type DocumentNode } from "@apollo/client";
import { useCallback, useRef, useState } from "react";
import type { SearchHit, ContentSearchDriver } from "../shared/searchTypes.ts";
import { getSiteKey, getSearchLanguage } from "../shared/navigationUtils.ts";

const PAGE_SIZE = 10;

type JcrNode = {
  displayName: string;
  name: string;
  path: string;
  uuid: string;
  primaryNodeType: { name: string };
  thumbnailUrl?: string | null;
};

function jcrNodeToSearchHit(node: JcrNode): SearchHit {
  return {
    id: node.uuid,
    path: node.path,
    displayableName: node.displayName || node.name,
    excerpt: null,
    nodeType: node.primaryNodeType.name,
    thumbnailUrl: node.thumbnailUrl ?? null,
  };
}

export const useJcrSearchDriver = (
  queryDoc: DocumentNode,
): ContentSearchDriver => {
  const [allHits, setAllHits] = useState<SearchHit[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);

  const handleNodes = useCallback((nodes: JcrNode[], page: number) => {
    const newHits = nodes.map(jcrNodeToSearchHit);
    setHasMore(newHits.length === PAGE_SIZE);
    setAllHits((prev) => (page === 0 ? newHits : [...prev, ...newHits]));
  }, []);

  const [runQuery, { loading }] = useLazyQuery<{
    jcr: { nodesByCriteria: { nodes: JcrNode[] } };
  }>(queryDoc, {
    fetchPolicy: "network-only",
    onCompleted: (result) => {
      const nodes = result?.jcr?.nodesByCriteria?.nodes ?? [];
      handleNodes(nodes, pageRef.current);
    },
  });

  return {
    hits: allHits,
    totalHits: allHits.length,
    loading,
    hasMore,

    search: (query, page) => {
      pageRef.current = page;
      const sitePath = `/sites/${getSiteKey()}`;

      void runQuery({
        variables: {
          searchTerm: query,
          sitePath,
          language: getSearchLanguage(),
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
      });
    },

    reset: () => {
      setAllHits([]);
      setHasMore(false);
    },
  };
};
