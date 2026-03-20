import { gql } from "@apollo/client";
import type { SearchHit } from "../shared/searchTypes.ts";

export const JCR_SEARCH_QUERY = gql`
  query JCRSearch($query: String!, $limit: Int!, $offset: Int!) {
    jcr {
      nodesByQuery(query: $query, limit: $limit, offset: $offset) {
        edges {
          node {
            displayName
            name
            path
            uuid
            primaryNodeType {
              name
            }
          }
        }
      }
    }
  }
`;

export const JCR_NODES_BY_CRITERIA_QUERY = gql`
  query JCRNodesByCriteria(
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
          nodeType: "jnt:page"
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
          primaryNodeType {
            name
          }
        }
      }
    }
  }
`;

export type JcrNode = {
  displayName: string;
  name: string;
  path: string;
  uuid: string;
  primaryNodeType: { name: string };
};

/** Escapes a value for embedding in a JCR-SQL2 string literal. */
export function escapeJcrSql2(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildJcrSql2(searchTerm: string): string {
  const escaped = escapeJcrSql2(searchTerm);
  return `SELECT * FROM [jmix:mainResource] as mainResource WHERE contains(mainResource.*, '${escaped}') ORDER BY mainResource.[j:lastModified] DESC`;
}

export function buildNodesByCriteriaVariables(
  searchTerm: string,
  sitePath: string,
  language: string,
  page: number,
  pageSize: number,
) {
  return {
    searchTerm,
    sitePath,
    language,
    limit: pageSize,
    offset: page * pageSize,
  };
}

export function jcrNodeToSearchHit(node: JcrNode): SearchHit {
  return {
    id: node.uuid,
    path: node.path,
    displayableName: node.displayName || node.name,
    excerpt: null,
    nodeType: node.primaryNodeType.name,
  };
}
