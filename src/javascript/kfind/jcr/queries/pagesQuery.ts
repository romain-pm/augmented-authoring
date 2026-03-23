import { gql } from "@apollo/client";
import type { SearchHit } from "../../shared/searchTypes.ts";

export const JCR_SEARCH_QUERY = gql`
  query JCRSearch(
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
  thumbnailUrl?: string | null;
};

/** Escapes a value for embedding in a JCR-SQL2 string literal. */
export function escapeJcrSql2(value: string): string {
  return value.replace(/'/g, "''");
}

export function buildJcrSql2(searchTerm: string, sitePath: string): string {
  const escapedTerm = escapeJcrSql2(searchTerm);
  const escapedPath = escapeJcrSql2(sitePath);
  return `SELECT * FROM [jnt:page] as node WHERE ISDESCENDANTNODE(node, '${escapedPath}') AND contains(node.*, '${escapedTerm}') ORDER BY node.[j:lastModified] DESC`;
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
    thumbnailUrl: node.thumbnailUrl ?? null,
  };
}
