# kFind — Workspace Instructions

## Project Overview

Jahia OSGi module (frontend-only, no Java backend) providing a Spotlight-style search modal (⌘K / Ctrl+K) for Jahia CMS. Searches content via augmented search with a JCR fallback.

## Stack

- **React 18** + **TypeScript 5.9**, bundled with **Vite 7** (Module Federation via `@jahia/vite-federation-plugin`)
- **Apollo Client 3** for GraphQL queries
- **@jahia/moonstone** design system (custom local build, non-singleton)
- **react-i18next** for i18n (namespace `kFind`, locales: en/fr/de)
- **CSS Modules** for styling (`.module.css`)
- Java 17, Maven 3, Node LTS, Yarn 4 (managed via `mise.toml`)

## Build & Deploy

```bash
yarn build          # Vite build → src/main/resources/javascript/apps/
mvn clean install   # Full build → target/augmented-authoring-*.jar
./deploy.sh         # Deploy JAR to Jahia (requires .env with JAHIA_URL, JAHIA_USER, JAHIA_PASS)
npx tsc --noEmit    # Type-check (1 pre-existing error in vite.config.ts is expected)
```

No test runner is configured yet.

## Architecture

```
src/javascript/
  init.ts                     → Entry: registers i18n + routes via @jahia/ui-extender
  globals.d.ts                → Window augmentation (contextJsParameters, jahia registry)
  kFind/
    KFindModal.tsx             → Modal wrapper, ⌘K shortcut, ApolloProvider bridge
    KFindPanel.tsx             → Search input + orchestrator
    apolloClientBridge.ts      → Shares jcontent's Apollo client across React roots
    routes.tsx                 → Jahia registry entry, mounts modal + NavSearchButton
    shared/                    → Reusable: ResultCard, SearchResultsView, searchTypes, searchUtils, useContentSearch
    augmentedFind/             → Augmented search driver + GQL queries
    jcrFind/                   → JCR fallback driver + GQL queries
    featuresFind/              → Feature search (filters window.jahia registry)
```

- `useContentSearch` orchestrates search: checks site index → delegates to augmented or JCR driver
- Runtime config from `window.contextJsParameters.kFind` (populated from OSGi `.cfg` file)
- The Apollo client is captured from jcontent via `useApolloClient()` and bridged to separate React roots

## Conventions

- **Imports**: Always include `.ts`/`.tsx` extensions (e.g., `import { foo } from "./bar.ts"`)
- **CSS**: Use CSS Modules — import as `import s from "./Component.module.css"`
- **Components**: `.tsx` for React components, `.ts` for hooks/utilities/queries
- **GraphQL**: Queries in dedicated `*Query.ts` files; use `useLazyQuery` / `useApolloClient`
- **i18n**: Nested keys (e.g., `search.placeholder`), always provide fallback string in `t()` calls, keep en/fr/de in sync
- **Types**: Prefer inline types + `searchTypes.ts` for shared types; augment `Window` in `globals.d.ts`
- **No `index.ts` barrel files** — import from specific files directly
- **Hooks**: Custom hooks encapsulate search logic per driver (`useAugmentedSearch`, `useJcrSearch`)

## Code Quality

- ESLint with `@jahia` preset; boolean props use `is*`/`has*` naming
- No credentials in source code
- Sanitize HTML from external sources (`sanitizeHtml` in `searchUtils.ts`)
- Escape user input in JCR-SQL2 queries (`escapeJcrSql2`)
