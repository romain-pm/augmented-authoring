import { gql } from "@apollo/client";

// NOTE: page size is hardcoded to 10 here — keep in sync with triggerSearch / loadNextPage calls.
export const SEARCH_QUERY = gql`
  query Search(
    $q: String!
    $siteKeys: [String]!
    $language: String!
    $page: Int!
  ) {
    search(q: $q, siteKeys: $siteKeys, language: $language, workspace: EDIT) {
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

// Checks whether the site node carries the mixin that enables augmented-search indexing.
export const SITE_INDEX_QUERY = gql`
  query CheckSiteIndexed($path: String!) {
    jcr {
      nodeByPath(path: $path) {
        isNodeType(
          type: { multi: ANY, types: ["jmix:augmentedSearchIndexableSite"] }
        )
      }
    }
  }
`;

export type SearchHit = {
  id: string;
  path: string;
  displayableName: string;
  excerpt: string;
  lastModified: string;
  lastModifiedBy: string;
  nodeType: string;
};
