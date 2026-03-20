import { gql } from "@apollo/client";

export const SEARCH_QUERY = gql`
  query Search(
    $q: String!
    $siteKeys: [String]!
    $language: String!
    $size: Int!
    $page: Int!
  ) {
    search(q: $q, siteKeys: $siteKeys, language: $language, workspace: EDIT) {
      results(size: $size, page: $page) {
        totalHits
        hits {
          id
          path
          displayableName
          excerpt
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
        uuid
        workspace
      }
    }
  }
`;
