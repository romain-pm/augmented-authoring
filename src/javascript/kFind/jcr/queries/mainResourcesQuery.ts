import { gql } from "@apollo/client";
import { escapeJcrSql2 } from "./pagesQuery.ts";

export const JCR_MAIN_RESOURCES_BY_CRITERIA_QUERY = gql`
  query JCRMainResourcesByCriteria(
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
          nodeType: "jmix:mainResource"
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

export function buildJcrMainResourcesSql2(
  searchTerm: string,
  sitePath: string,
): string {
  const escapedTerm = escapeJcrSql2(searchTerm);
  const escapedPath = escapeJcrSql2(sitePath);
  return `SELECT * FROM [jmix:mainResource] as node WHERE ISDESCENDANTNODE(node, '${escapedPath}') AND contains(node.*, '${escapedTerm}') ORDER BY node.[j:lastModified] DESC`;
}
