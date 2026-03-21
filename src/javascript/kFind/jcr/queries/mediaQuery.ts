import { gql } from "@apollo/client";
import { escapeJcrSql2 } from "./pagesQuery.ts";

export const JCR_MEDIA_SEARCH_QUERY = gql`
  query JCRMediaSearch($query: String!, $limit: Int!, $offset: Int!) {
    jcr(workspace: EDIT) {
      nodesByQuery(query: $query, limit: $limit, offset: $offset) {
        edges {
          node {
            displayName
            name
            path
            uuid
            workspace
            primaryNodeType {
              name
            }
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
          nodeConstraint: { any: [{ contains: $searchTerm }] }
        }
      ) {
        nodes {
          displayName
          name
          path
          uuid
          workspace
          primaryNodeType {
            name
          }
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
