import { useLazyQuery } from "@apollo/client";
import { useCallback, useRef, useState } from "react";
import {
  JCR_SEARCH_QUERY,
  JCR_NODES_BY_CRITERIA_QUERY,
  buildJcrSql2,
  buildNodesByCriteriaVariables,
  jcrNodeToSearchHit,
  type JcrNode,
} from "./jcrFindQuery.ts";
import type { SearchHit, ContentSearchDriver } from "../shared/searchTypes.ts";
import { getSiteKey, getSearchLanguage } from "../shared/searchUtils.ts";

const PAGE_SIZE = 10;

function getJcrQueryType(): "nodesByQuery" | "nodesByCriteria" {
  return window.contextJsParameters.kFind?.typeOfJCRGraphQL ?? "nodesByQuery";
}

export const useJcrSearch = (): ContentSearchDriver => {
  const [allHits, setAllHits] = useState<SearchHit[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);

  // useCallback gives a stable reference so both onCompleted closures
  // in useLazyQuery always call the freshest version.
  const handleNodes = useCallback((nodes: JcrNode[], page: number) => {
    const newHits = nodes.map(jcrNodeToSearchHit);
    // Set hasMore BEFORE updating hits to avoid intermediate renders where
    // hits grew but hasMore is still false.
    setHasMore(newHits.length === PAGE_SIZE);
    setAllHits((prev) => (page === 0 ? newHits : [...prev, ...newHits]));
  }, []);

  const [runNodesByQuery, { loading: loadingByQuery }] = useLazyQuery<{
    jcr: { nodesByQuery: { edges: { node: JcrNode }[] } };
  }>(JCR_SEARCH_QUERY, {
    fetchPolicy: "network-only",
    onCompleted: (result) => {
      const edges = result?.jcr?.nodesByQuery?.edges ?? [];
      handleNodes(
        edges.map((e) => e.node),
        pageRef.current,
      );
    },
  });

  const [runNodesByCriteria, { loading: loadingByCriteria }] = useLazyQuery<{
    jcr: { nodesByCriteria: { nodes: JcrNode[] } };
  }>(JCR_NODES_BY_CRITERIA_QUERY, {
    fetchPolicy: "network-only",
    onCompleted: (result) => {
      const nodes = result?.jcr?.nodesByCriteria?.nodes ?? [];
      handleNodes(nodes, pageRef.current);
    },
  });

  return {
    hits: allHits,
    // JCR doesn't return a total count — report the number of loaded hits.
    totalHits: allHits.length,
    loading: loadingByQuery || loadingByCriteria,
    hasMore,
    search: (query, page) => {
      pageRef.current = page;
      if (getJcrQueryType() === "nodesByCriteria") {
        void runNodesByCriteria({
          variables: buildNodesByCriteriaVariables(
            query,
            `/sites/${getSiteKey()}`,
            getSearchLanguage(),
            page,
            PAGE_SIZE,
          ),
        });
      } else {
        void runNodesByQuery({
          variables: {
            query: buildJcrSql2(query),
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
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
