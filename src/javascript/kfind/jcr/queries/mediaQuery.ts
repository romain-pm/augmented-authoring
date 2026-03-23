import { gql } from "@apollo/client";
import { escapeJcrSql2 } from "./pagesQuery.ts";

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

export function buildJcrMediaSql2(
  searchTerm: string,
  sitePath: string,
): string {
  const escapedTerm = escapeJcrSql2(searchTerm);
  const escapedPath = escapeJcrSql2(sitePath);
  return `SELECT * FROM [jnt:file] as node WHERE ISDESCENDANTNODE(node, '${escapedPath}') AND contains(node.*, '${escapedTerm}') ORDER BY node.[j:lastModified] DESC`;
}
