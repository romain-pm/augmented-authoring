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

export type SearchHit = {
  id: string;
  path: string;
  displayableName: string;
  excerpt: string;
  lastModified: string;
  lastModifiedBy: string;
  nodeType: string;
};
