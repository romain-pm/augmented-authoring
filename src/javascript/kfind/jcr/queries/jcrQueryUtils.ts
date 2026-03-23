import { gql } from "@apollo/client";
import type { SearchHit } from "../../shared/searchTypes.ts";

/** Escapes a value for embedding in a JCR-SQL2 string literal. */
export function escapeJcrSql2(value: string): string {
  return value.replace(/'/g, "''");
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

/** Builds a JCR-SQL2 full-text search query for the given node type. */
export function buildJcrSql2(
  nodeType: string,
  searchTerm: string,
  sitePath: string,
): string {
  const t = escapeJcrSql2(searchTerm);
  const p = escapeJcrSql2(sitePath);
  return `SELECT * FROM [${nodeType}] as node WHERE ISDESCENDANTNODE(node, '${p}') AND contains(node.*, '${t}') ORDER BY node.[j:lastModified] DESC`;
}

export type JcrNode = {
  displayName: string;
  name: string;
  path: string;
  uuid: string;
  primaryNodeType: { name: string };
  thumbnailUrl?: string | null;
};

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

/** Generic nodesByQuery GQL document — works for any node type since the SQL2 string itself filters. */
export const JCR_NODES_BY_QUERY = gql`
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
