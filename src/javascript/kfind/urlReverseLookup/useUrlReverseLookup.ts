import { useLazyQuery } from "@apollo/client";
import { useCallback, useState } from "react";
import { URL_REVERSE_LOOKUP_QUERY } from "./urlReverseLookupQuery.ts";
import type { SearchHit } from "../shared/searchTypes.ts";
import { getSiteKey, getSearchLanguage } from "../shared/searchUtils.ts";

type UrlReverseLookupResult = {
  hit: SearchHit | null;
  loading: boolean;
  search: (url: string) => void;
  reset: () => void;
};

type GqlNode = {
  displayName: string;
  name: string;
  path: string;
  uuid: string;
  workspace: string;
  primaryNodeType: { name: string };
};

/**
 * Hook for the URL reverse lookup feature.
 * Given a URL string, queries the custom GraphQL endpoint to resolve
 * it to a JCR node via vanity URL or direct path matching.
 */
export const useUrlReverseLookup = (): UrlReverseLookupResult => {
  const [hit, setHit] = useState<SearchHit | null>(null);

  const [runQuery, { loading }] = useLazyQuery<{
    urlReverseLookup: GqlNode | null;
  }>(URL_REVERSE_LOOKUP_QUERY, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      const node = data?.urlReverseLookup;
      if (node) {
        setHit({
          id: node.uuid,
          path: node.path,
          displayableName: node.displayName || node.name,
          excerpt: null,
          nodeType: node.primaryNodeType.name,
        });
      } else {
        setHit(null);
      }
    },
    onError: () => {
      setHit(null);
    },
  });

  const search = useCallback(
    (url: string) => {
      void runQuery({
        variables: {
          url,
          siteKey: getSiteKey(),
          language: getSearchLanguage(),
        },
      });
    },
    [runQuery],
  );

  const reset = useCallback(() => {
    setHit(null);
  }, []);

  return { hit, loading, search, reset };
};
