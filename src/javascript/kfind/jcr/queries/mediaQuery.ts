import { gql } from "@apollo/client";
import { buildJcrSql2 } from "./jcrQueryUtils.ts";

export const JCR_MEDIA_SEARCH_QUERY = gql`
  query JCRMediaSearch(
    $query: String!
    $limit: Int!
    $offset: Int!
    $language: String!
  ) {
    jcr(workspace: EDIT) {
      nodesByQuery(
        query: $query
        limit: $limit
        offset: $offset
        language: $language
      ) {
        edges {
          node {
            displayName(language: $language)
            name
            path
            uuid
            workspace
            primaryNodeType {
              name
            }
            thumbnailUrl(name: "thumbnail", checkIfExists: true)
          }
        }
      }
    }
  }
`;

export const JCR_MEDIA_BY_CRITERIA_QUERY = gql`
  query JCRMediaByCriteria(
    $limit: Int!
    $offset: Int!
    $searchTerm: String!
    $sitePath: String!
    $language: String!
  ) {
    jcr(workspace: EDIT) {
      nodesByCriteria(
        limit: $limit
        offset: $offset
        criteria: {
          nodeType: "jnt:file"
          paths: [$sitePath]
          pathType: ANCESTOR
          language: $language
          nodeConstraint: {
            any: [
              { contains: $searchTerm }
              { contains: $searchTerm, property: "j:tagList" }
            ]
          }
        }
      ) {
        nodes {
          displayName(language: $language)
          name
          path
          uuid
          workspace
          primaryNodeType {
            name
          }
          thumbnailUrl(name: "thumbnail", checkIfExists: true)
        }
      }
    }
  }
`;

export const buildMediaSql2 = (searchTerm: string, sitePath: string): string =>
  buildJcrSql2("jnt:file", searchTerm, sitePath);
