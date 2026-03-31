---
name: jahia-graphql-frontend
description: "Use when writing GraphQL queries in a Jahia module JavaScript/TypeScript codebase. Covers gql tagged templates, imperative client.query() pattern, nodesByCriteria for JCR content searches, augmented search vs JCR tradeoffs, stale response filtering, and schema introspection setup."
---

# Jahia GraphQL — Frontend Queries

## When to Use

Load this skill when writing GraphQL query definitions or executing queries from JavaScript/TypeScript in a Jahia module.

---

## Query Definitions

Define queries in **dedicated files** (e.g. `myFeatureQuery.ts`), never inline in components or providers.

```ts
// myFeatureQuery.ts
import { gql } from "@apollo/client";

export const MY_QUERY = gql`
  query MyQuery($param: String!, $siteKey: String!) {
    jcr {
      nodesByCriteria(
        criteria: { nodeType: "jnt:page", paths: ["/sites/$siteKey"] }
      ) {
        nodes {
          uuid
          path
          name
          displayName
          primaryNodeType {
            name
          }
        }
      }
    }
  }
`;
```

---

## Executing Queries — Imperative Pattern

Use `client.query(...)` directly (not `useQuery`/`useLazyQuery`) when calling from provider factories, utility functions, or any code that runs outside a React component:

```ts
const result = await client.query<{
  jcr: { nodesByCriteria: { nodes: GqlJcrNode[] } };
}>({
  query: MY_QUERY,
  variables: { searchTerm, sitePath, language, limit, offset },
  fetchPolicy: "network-only",
});

const nodes = result.data?.jcr?.nodesByCriteria?.nodes ?? [];
```

**Always type the response** with a generic type argument — it prevents silent `any` propagation.

**Always use `fetchPolicy: 'network-only'`** for search queries — Apollo's cache returns stale data that produces incorrect search results.

`useQuery` / `useLazyQuery` are only appropriate inside **React components** that render query state directly.

---

## JCR Content Search — `nodesByCriteria`

The standard pattern for searching JCR nodes by type and free-text content:

```graphql
query SearchContent(
  $searchTerm: String!
  $sitePath: String!
  $language: String!
  $limit: Int!
  $offset: Int!
) {
  jcr {
    nodesByCriteria(
      criteria: {
        nodeType: "jnt:page"
        paths: [$sitePath]
        nodeConstraint: { contains: $searchTerm }
      }
      size: $limit
      offset: $offset
      language: $language
    ) {
      nodes {
        uuid
        path
        name
        displayName
        primaryNodeType {
          name
        }
      }
    }
  }
}
```

Standard variable shapes:

| Variable     | Value pattern                     |
| ------------ | --------------------------------- |
| `searchTerm` | The user's query string           |
| `sitePath`   | `/sites/{siteKey}`                |
| `language`   | Locale code (e.g. `en`, `fr`)     |
| `limit`      | Page size + 1 to detect `hasMore` |
| `offset`     | `page * pageSize`                 |

Request `pageSize + 1` items: if you receive more than `pageSize`, there are more pages — slice to `pageSize` before rendering.

---

## Augmented Search vs JCR

|                  | Augmented Search                                               | JCR (`nodesByCriteria`)              |
| ---------------- | -------------------------------------------------------------- | ------------------------------------ |
| **Engine**       | Elasticsearch-backed                                           | JCR repository query                 |
| **Speed**        | Fast, full-text                                                | Slower on large repos                |
| **Full-text**    | Yes (with excerpts/highlights)                                 | Limited (`contains` only)            |
| **Availability** | Requires `jmix:augmentedSearchIndexableSite` mixin on the site | Always available                     |
| **Use when**     | Site is indexed, need fast/rich full-text                      | Fallback, or structured node queries |

### Availability check

Before using augmented search, verify the site has the required mixin:

```graphql
query CheckSiteIndexed($path: String!) {
  jcr {
    nodeByPath(path: $path) {
      isNodeType(
        type: { multi: ANY, types: ["jmix:augmentedSearchIndexableSite"] }
      )
    }
  }
}
```

Cache the result per `siteKey` to avoid re-checking on every keystroke.

### Augmented search query shape

```graphql
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
```

Note: augmented search uses **page-based** pagination (`page` number), while JCR uses **offset-based** (`offset`).

---

## Stale Response Filtering

When search queries fire on every keystroke, an earlier slow response can arrive after a later fast one, rendering stale results. Guard against this with an `activeQuery` tracker:

```ts
let activeQuery = "";

async function search(query: string, page: number): Promise<SearchResult> {
  activeQuery = query;

  const result = await client.query({
    query: MY_QUERY,
    variables: { q: query, page },
    fetchPolicy: "network-only",
  });

  // Discard if a newer query replaced this one while awaiting
  if (activeQuery !== query) {
    return { hits: [], hasMore: false };
  }

  return { hits: result.data?.search?.results?.hits ?? [], hasMore: false };
}

function reset() {
  activeQuery = "";
}
```

---

## Schema Introspection Artifact

Maintain a `graphql-schema.json` introspection file in the module for IDE support (GraphQL language server, Apollo VS Code extension for autocomplete and type validation).

Generate it by running an introspection query against your development Jahia instance:

```bash
npx apollo client:download-schema --endpoint=http://localhost:8080/modules/graphql graphql-schema.json
# or via yarn apollo script if configured
```

Reference it in Apollo VS Code extension config (`apollo.config.js`):

```js
module.exports = {
  client: {
    service: { localSchemaFile: "./graphql-schema.json" },
  },
};
```
